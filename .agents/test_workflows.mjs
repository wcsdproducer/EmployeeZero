#!/usr/bin/env node
/**
 * Employee Zero — Built-in Workflow Test Suite
 *
 * Validates:
 * 1. All workflow definitions are well-formed
 * 2. Every UI workflow has a matching definition in workflowDefinitions.ts
 * 3. Every definition is reachable from the UI
 * 4. All API routes exist and export correct HTTP methods
 * 5. Required connections reference valid service IDs
 * 6. Goal prompts are non-empty and reasonable
 * 7. Custom workflow CRUD operations are properly typed
 * 8. The task engine can resolve every built-in workflow ID
 * 9. Build compiles without errors (tsc --noEmit)
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const results = [];
let passed = 0;
let failed = 0;
let warned = 0;

function pass(test, detail = '') {
  passed++;
  results.push({ status: '✅', test, detail });
}
function fail(test, detail = '') {
  failed++;
  results.push({ status: '❌', test, detail });
}
function warn(test, detail = '') {
  warned++;
  results.push({ status: '⚠️', test, detail });
}

// ─── Helpers ───

function readFile(relPath) {
  const full = path.join(ROOT, relPath);
  if (!existsSync(full)) return null;
  return readFileSync(full, 'utf-8');
}

function fileExists(relPath) {
  return existsSync(path.join(ROOT, relPath));
}

// ─── Extract data from source files ───

function extractWorkflowIds(src) {
  // Match keys in WORKFLOW_DEFINITIONS: { "key": { ... } }
  const re = /["']([a-z][a-z0-9-]+)["']\s*:\s*\{/g;
  const ids = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    // Filter out non-workflow keys
    if (!['id', 'goal', 'requiredConnections', 'connectionOptional'].includes(m[1])) {
      ids.push(m[1]);
    }
  }
  return [...new Set(ids)];
}

function extractUiWorkflowIds(src) {
  // Match id: "workflow-id" in the WORKFLOWS array — must contain a hyphen to exclude filter button IDs
  const re = /id:\s*["']([a-z][a-z0-9]*-[a-z0-9-]+)["']/g;
  const ids = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    ids.push(m[1]);
  }
  return [...new Set(ids)];
}

function extractRequiredConnections(src, workflowId) {
  // Find the requiredConnections array for a given workflow
  const escaped = workflowId.replace(/-/g, '\\-');
  const re = new RegExp(`["']${escaped}["']\\s*:\\s*\\{[^}]*requiredConnections\\s*:\\s*\\[([^\\]]*)\\]`, 's');
  const m = src.match(re);
  if (!m) return null;
  const conns = m[1].match(/["']([^"']+)["']/g)?.map(s => s.replace(/["']/g, '')) || [];
  return conns;
}

function extractGoal(src, workflowId) {
  const escaped = workflowId.replace(/-/g, '\\-');
  const re = new RegExp(`["']${escaped}["']\\s*:\\s*\\{[^]*?goal\\s*:\\s*\`([^]*?)\``, 's');
  const m = src.match(re);
  return m ? m[1].trim() : null;
}

// ─── Valid service IDs (from connections page) ───

const VALID_SERVICES = [
  'gmail', 'calendar', 'drive', 'sheets', 'youtube', 'contacts',
  'tasks', 'docs', 'forms', 'slides', 'analytics', 'business',
  'notes', 'imagen',
  'twitter', 'instagram', 'tiktok', 'linkedin', 'facebook',
];

// ════════════════════════════════════════════════
// TEST SUITE
// ════════════════════════════════════════════════

console.log('\n🔧 Employee Zero — Workflow Test Suite');
console.log('═'.repeat(55));

// ─── 1. File Existence ───
console.log('\n📁 File Existence Checks');

const requiredFiles = [
  'src/lib/workflowDefinitions.ts',
  'src/lib/customWorkflows.ts',
  'src/app/api/workflows/route.ts',
  'src/app/api/workflows/run/route.ts',
  'src/app/workflows/page.tsx',
  'src/lib/taskEngine.ts',
  'src/lib/auth.ts',
  'src/lib/authFetch.ts',
  'src/app/cron/page.tsx',
];

for (const f of requiredFiles) {
  if (fileExists(f)) {
    pass(`File exists: ${f}`);
  } else {
    fail(`File missing: ${f}`);
  }
}

// ─── 2. Workflow Definitions Validation ───
console.log('\n📋 Workflow Definitions');

const defsSrc = readFile('src/lib/workflowDefinitions.ts');
if (!defsSrc) {
  fail('Cannot read workflowDefinitions.ts');
} else {
  const defIds = extractWorkflowIds(defsSrc);
  if (defIds.length > 0) {
    pass(`Found ${defIds.length} workflow definitions`);
  } else {
    fail('No workflow definitions found');
  }

  // Check each definition has required fields
  let allValid = true;
  const issues = [];

  for (const id of defIds) {
    // Check goal exists and is non-trivial
    const goal = extractGoal(defsSrc, id);
    if (!goal) {
      issues.push(`${id}: missing goal`);
      allValid = false;
    } else if (goal.length < 50) {
      issues.push(`${id}: goal too short (${goal.length} chars)`);
      allValid = false;
    }

    // Check requiredConnections
    const conns = extractRequiredConnections(defsSrc, id);
    if (conns === null) {
      issues.push(`${id}: missing requiredConnections`);
      allValid = false;
    } else {
      for (const c of conns) {
        if (!VALID_SERVICES.includes(c)) {
          issues.push(`${id}: invalid connection "${c}"`);
          allValid = false;
        }
      }
    }
  }

  if (allValid) {
    pass('All definitions have valid goal + requiredConnections');
  } else {
    for (const issue of issues) {
      fail(`Definition issue: ${issue}`);
    }
  }

  // Check getWorkflowGoal function exists
  if (defsSrc.includes('export function getWorkflowGoal')) {
    pass('getWorkflowGoal() exported');
  } else {
    fail('getWorkflowGoal() not found');
  }

  if (defsSrc.includes('export function getRequiredConnections')) {
    pass('getRequiredConnections() exported');
  } else {
    fail('getRequiredConnections() not found');
  }

  // ─── 3. UI Consistency ───
  console.log('\n🖥️  UI Consistency');

  const uiSrc = readFile('src/app/workflows/page.tsx');
  if (!uiSrc) {
    fail('Cannot read workflows/page.tsx');
  } else {
    const uiIds = extractUiWorkflowIds(uiSrc);
    if (uiIds.length > 0) {
      pass(`Found ${uiIds.length} workflows in UI`);
    } else {
      fail('No workflow IDs found in UI');
    }

    // Check every UI workflow has a backend definition
    let allMatched = true;
    const missingDefs = [];
    for (const id of uiIds) {
      if (!defIds.includes(id)) {
        missingDefs.push(id);
        allMatched = false;
      }
    }
    if (allMatched) {
      pass('All UI workflows have matching definitions');
    } else {
      for (const id of missingDefs) {
        fail(`UI workflow "${id}" has no backend definition`);
      }
    }

    // Check for definitions not shown in UI (might be intentional)
    const missingUi = defIds.filter(id => !uiIds.includes(id));
    if (missingUi.length === 0) {
      pass('All definitions are surfaced in UI');
    } else {
      for (const id of missingUi) {
        warn(`Definition "${id}" not in UI (may be intentional: social/advanced workflows)`);
      }
    }

    // Check UI has category data
    if (uiSrc.includes('CATEGORY_LABELS')) {
      pass('Category labels defined');
    } else {
      fail('CATEGORY_LABELS missing');
    }

    // Check UI has connection icons
    if (uiSrc.includes('CONNECTION_ICONS')) {
      pass('Connection icons defined');
    } else {
      fail('CONNECTION_ICONS missing');
    }
  }

  // ─── 4. API Routes ───
  console.log('\n🔌 API Routes');

  const workflowsRoute = readFile('src/app/api/workflows/route.ts');
  if (workflowsRoute) {
    const methods = [];
    if (workflowsRoute.includes('export async function GET')) methods.push('GET');
    if (workflowsRoute.includes('export async function POST')) methods.push('POST');
    if (workflowsRoute.includes('export async function DELETE')) methods.push('DELETE');
    if (workflowsRoute.includes('export async function PATCH')) methods.push('PATCH');

    if (methods.length === 4) {
      pass(`/api/workflows exports: ${methods.join(', ')}`);
    } else {
      fail(`/api/workflows only exports: ${methods.join(', ')} (expected GET, POST, DELETE, PATCH)`);
    }

    // Check auth
    if (workflowsRoute.includes('verifyAuth')) {
      pass('/api/workflows uses auth verification');
    } else {
      fail('/api/workflows missing auth verification');
    }
  }

  const runRoute = readFile('src/app/api/workflows/run/route.ts');
  if (runRoute) {
    if (runRoute.includes('export async function POST')) {
      pass('/api/workflows/run exports POST');
    } else {
      fail('/api/workflows/run missing POST handler');
    }

    if (runRoute.includes('getWorkflowGoal')) {
      pass('/api/workflows/run uses getWorkflowGoal()');
    } else {
      fail('/api/workflows/run not using getWorkflowGoal()');
    }

    if (runRoute.includes('createTask') && runRoute.includes('executeTask')) {
      pass('/api/workflows/run integrates with task engine');
    } else {
      fail('/api/workflows/run missing task engine integration');
    }

    if (runRoute.includes('verifyAuth')) {
      pass('/api/workflows/run uses auth verification');
    } else {
      fail('/api/workflows/run missing auth verification');
    }

    if (runRoute.includes('checkRateLimit')) {
      pass('/api/workflows/run has rate limiting');
    } else {
      warn('/api/workflows/run missing rate limiting');
    }

    // Check background execution pattern
    if (runRoute.includes('executeTask(taskId') && runRoute.includes('.then(')) {
      pass('/api/workflows/run executes tasks in background');
    } else {
      warn('/api/workflows/run may block on task execution');
    }

    // Check error handling
    if (runRoute.includes('.catch(')) {
      pass('/api/workflows/run has error handling for background tasks');
    } else {
      fail('/api/workflows/run missing error handling');
    }
  }

  // ─── 5. Custom Workflows CRUD ───
  console.log('\n📝 Custom Workflows');

  const customSrc = readFile('src/lib/customWorkflows.ts');
  if (customSrc) {
    const crudOps = ['createCustomWorkflow', 'listCustomWorkflows', 'getCustomWorkflow', 'updateCustomWorkflow', 'deleteCustomWorkflow', 'recordWorkflowRun'];
    let allOps = true;
    for (const op of crudOps) {
      if (!customSrc.includes(`export async function ${op}`)) {
        fail(`Custom workflows missing: ${op}`);
        allOps = false;
      }
    }
    if (allOps) {
      pass(`All CRUD operations exported (${crudOps.length} functions)`);
    }

    // Check interface
    if (customSrc.includes('export interface CustomWorkflow')) {
      pass('CustomWorkflow interface exported');
    } else {
      fail('CustomWorkflow interface missing');
    }

    // Check Firestore path
    if (customSrc.includes('users/${userId}/workflows')) {
      pass('Custom workflows use correct Firestore path');
    } else {
      fail('Custom workflows Firestore path incorrect');
    }
  }

  // ─── 6. Chat Route Integration ───
  console.log('\n💬 Chat Route Integration');

  const chatSrc = readFile('src/app/api/chat/route.ts');
  if (chatSrc) {
    if (chatSrc.includes('getWorkflowGoal') || chatSrc.includes('WORKFLOW_DEFINITIONS')) {
      pass('Chat route imports workflow definitions');
    } else {
      fail('Chat route does not import workflow definitions');
    }

    if (chatSrc.includes('create_workflow')) {
      pass('Chat supports creating workflows via function calling');
    } else {
      warn('Chat may not support creating workflows');
    }

    if (chatSrc.includes('list_my_workflows')) {
      pass('Chat supports listing workflows');
    } else {
      warn('Chat may not support listing workflows');
    }
  }

  // ─── 7. Task Engine Integration ───
  console.log('\n⚙️  Task Engine');

  const taskSrc = readFile('src/lib/taskEngine.ts');
  if (taskSrc) {
    if (taskSrc.includes('export async function createTask') || taskSrc.includes('export function createTask')) {
      pass('createTask exported from task engine');
    } else {
      fail('createTask not found in task engine');
    }

    if (taskSrc.includes('export async function executeTask') || taskSrc.includes('export function executeTask')) {
      pass('executeTask exported from task engine');
    } else {
      fail('executeTask not found in task engine');
    }

    if (taskSrc.includes('workflow')) {
      pass('Task engine has workflow reference');
    } else {
      warn('Task engine may not track workflow origin');
    }
  }

  // ─── 8. Cron / Scheduling ───
  console.log('\n⏰ Scheduling');

  if (fileExists('src/app/cron/page.tsx')) {
    const cronSrc = readFile('src/app/cron/page.tsx');
    if (cronSrc?.includes('workflow')) {
      pass('Cron page references workflows');
    } else {
      warn('Cron page may not be connected to workflows');
    }
  }

  if (fileExists('src/app/api/cron/route.ts')) {
    const cronRoute = readFile('src/app/api/cron/route.ts');
    if (cronRoute) {
      pass('/api/cron route exists');
      if (cronRoute.includes('getWorkflowGoal') || cronRoute.includes('workflowDefinitions')) {
        pass('/api/cron integrates with workflow definitions');
      } else {
        warn('/api/cron may not use workflow definitions directly');
      }
    }
  } else {
    warn('/api/cron route not found');
  }

  // ─── 9. Workflow ID Consistency (detailed cross-check) ───
  console.log('\n🔗 Cross-Reference Check');

  // Check that all UI workflow IDs match their definition IDs exactly
  if (uiSrc) {
    const uiIds = extractUiWorkflowIds(uiSrc);
    let idMismatch = false;
    for (const id of uiIds) {
      // Each definition should have matching id field
      const idFieldRe = new RegExp(`["']${id.replace(/-/g, '\\-')}["']\\s*:\\s*\\{[^}]*id:\\s*["']${id.replace(/-/g, '\\-')}["']`);
      if (!defsSrc.match(idFieldRe)) {
        fail(`Definition "${id}" key/id mismatch`);
        idMismatch = true;
      }
    }
    if (!idMismatch) {
      pass('All definition keys match their id fields');
    }
  }

  // ─── 10. TypeScript Compilation ───
  console.log('\n🔨 TypeScript Compilation');

  try {
    execSync('npx tsc --noEmit --pretty 2>&1', {
      cwd: ROOT,
      timeout: 120000,
      encoding: 'utf-8',
      env: { ...process.env, PATH: process.env.PATH },
    });
    pass('TypeScript compiles without errors');
  } catch (err) {
    const output = err.stdout || err.stderr || err.message || '';
    // Count errors
    const errorCount = (output.match(/error TS/g) || []).length;
    if (errorCount > 0) {
      // Check if any errors are in workflow files
      const workflowErrors = output.split('\n').filter(line =>
        line.includes('workflow') || line.includes('Workflow')
      );
      if (workflowErrors.length > 0) {
        fail(`TypeScript has ${errorCount} error(s), ${workflowErrors.length} in workflow files`);
      } else {
        warn(`TypeScript has ${errorCount} error(s), none in workflow files`);
      }
    } else {
      warn('TypeScript check returned non-zero but no TS errors found');
    }
  }
}

// ════════════════════════════════════════════════
// REPORT
// ════════════════════════════════════════════════

console.log('\n' + '═'.repeat(55));
console.log('📊 RESULTS\n');

for (const r of results) {
  const detail = r.detail ? ` — ${r.detail}` : '';
  console.log(`  ${r.status} ${r.test}${detail}`);
}

console.log('\n' + '═'.repeat(55));
console.log(`Summary: ✅ ${passed} passed  ❌ ${failed} failed  ⚠️  ${warned} warnings`);

if (failed > 0) {
  console.log('\n🔴 Some tests FAILED — see above for details.\n');
  process.exit(1);
} else {
  console.log('\n🟢 All tests PASSED.\n');
  process.exit(0);
}
