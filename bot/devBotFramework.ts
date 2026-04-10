/**
 * Dev Bot Framework — shared by all workspace dev bots
 * 
 * Features:
 * - Ops mode (default): read-only status queries
 * - Dev mode: full file editing, builds, git operations
 * - User ID verification (only Jack can interact)
 * - Auto-lock after 60 min inactivity
 * - File system sandboxing to workspace root
 * - Command whitelisting
 * - Per-workspace memory (SQLite + FTS5)
 */

import { Bot, Context } from "grammy";
import { execSync, exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { createMemoryStore, MemoryStore } from "./memoryStore.js";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface DevBotConfig {
  token: string;
  ownerId: number;
  workspaceRoot: string;
  workspaceName: string;
  devPassphrase?: string;       // defaults to "gravity"
  autoLockMinutes?: number;     // defaults to 60
  firebaseProjectId?: string;
}

type BotMode = "ops" | "dev";

interface BotState {
  mode: BotMode;
  lastDevActivity: number;
  autoLockTimer: NodeJS.Timeout | null;
  conversationHistory: Array<{ role: string; content: string }>;
}

// ──────────────────────────────────────────────
// Whitelisted commands
// ──────────────────────────────────────────────

const WHITELISTED_COMMANDS = [
  "npm", "npx", "node", "tsx",
  "git", "tsc",
  "cat", "ls", "find", "grep", "head", "tail", "wc",
  "echo", "pwd",
  "firebase",
];

const BLOCKED_PATTERNS = [
  /rm\s+(-rf?|--recursive)/i,
  /sudo/i,
  /chmod\s+777/i,
  />\s*\/dev/i,
  /mkfs/i,
  /dd\s+if=/i,
  /:(){ :\|:& };:/,     // fork bomb
  /curl.*\|.*sh/i,       // pipe to shell
  /wget.*\|.*sh/i,
];

// ──────────────────────────────────────────────
// Core Framework
// ──────────────────────────────────────────────

export function createDevBot(config: DevBotConfig): Bot {
  const bot = new Bot(config.token);
  const passphrase = config.devPassphrase ?? "gravity";
  const autoLockMs = (config.autoLockMinutes ?? 60) * 60 * 1000;

  // Initialize per-workspace memory
  const memory = createMemoryStore(config.workspaceRoot);
  console.log(`🧠 Memory initialized for ${config.workspaceName} (${memory.count()} memories)`);

  // Load soul.md if it exists
  const soulPath = path.join(config.workspaceRoot, "bot", "soul.md");
  let soulPrompt = `You are the ${config.workspaceName} Dev Bot. You help Jack Freeman manage this workspace.`;
  try {
    if (fs.existsSync(soulPath)) {
      soulPrompt = fs.readFileSync(soulPath, "utf-8");
      console.log(`👻 Soul loaded for ${config.workspaceName}`);
    }
  } catch { /* use default */ }

  const state: BotState = {
    mode: "ops",
    lastDevActivity: 0,
    autoLockTimer: null,
    conversationHistory: [],
  };

  // ── Auth middleware ──
  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (userId !== config.ownerId) {
      console.warn(`⚠️ Unauthorized: User ${userId} tried to access ${config.workspaceName} bot`);
      return; // silent ignore
    }
    return next();
  });

  // ── /start ──
  bot.command("start", async (ctx) => {
    await ctx.reply(
      `🤖 *${config.workspaceName} Dev Bot*\n\n` +
      `Mode: \`${state.mode}\`\n` +
      `Workspace: \`${config.workspaceRoot}\`\n` +
      (config.firebaseProjectId ? `Firebase: \`${config.firebaseProjectId}\`\n` : "") +
      `\nCommands:\n` +
      `  /status — Project status\n` +
      `  /dev <passphrase> — Enter dev mode\n` +
      `  /lock — Return to ops mode\n` +
      `  /mode — Current mode\n` +
      `  /run <cmd> — Run command (dev mode)\n` +
      `  /read <file> — Read file contents\n` +
      `  /build — Run build\n` +
      `  /git <args> — Git operations (dev mode)\n` +
      `\n🧠 Memory:\n` +
      `  /remember <text> — Store a memory\n` +
      `  /recall <query> — Search memories\n` +
      `  /memories — List recent memories\n` +
      `  /forget <id> — Delete a memory`,
      { parse_mode: "Markdown" }
    );
  });

  // ── /mode ──
  bot.command("mode", async (ctx) => {
    const emoji = state.mode === "dev" ? "🔓" : "🔒";
    await ctx.reply(`${emoji} Current mode: *${state.mode.toUpperCase()}*`, { parse_mode: "Markdown" });
  });

  // ── /dev <passphrase> ──
  bot.command("dev", async (ctx) => {
    const input = ctx.match?.trim();
    if (input !== passphrase) {
      await ctx.reply("❌ Wrong passphrase.");
      return;
    }
    state.mode = "dev";
    state.lastDevActivity = Date.now();
    resetAutoLock(state, autoLockMs, ctx);
    await ctx.reply(
      `🔓 *DEV MODE ACTIVATED*\n` +
      `Auto-lock in ${config.autoLockMinutes ?? 60} minutes of inactivity.\n` +
      `Use /lock to return to ops mode.`,
      { parse_mode: "Markdown" }
    );
  });

  // ── /lock ──
  bot.command("lock", async (ctx) => {
    state.mode = "ops";
    if (state.autoLockTimer) clearTimeout(state.autoLockTimer);
    state.autoLockTimer = null;
    await ctx.reply("🔒 *OPS MODE* — Dev features locked.", { parse_mode: "Markdown" });
  });

  // ── /status ──
  bot.command("status", async (ctx) => {
    try {
      const gitStatus = safeExec("git status --short", config.workspaceRoot);
      const gitBranch = safeExec("git branch --show-current", config.workspaceRoot);
      const nodeModules = fs.existsSync(path.join(config.workspaceRoot, "node_modules"));
      const packageJson = fs.existsSync(path.join(config.workspaceRoot, "package.json"));

      let status = `📊 *${config.workspaceName} Status*\n\n`;
      status += `Branch: \`${gitBranch.trim() || "unknown"}\`\n`;
      status += `Node modules: ${nodeModules ? "✅" : "❌"}\n`;
      status += `package.json: ${packageJson ? "✅" : "❌"}\n`;
      status += `Mode: \`${state.mode}\`\n`;

      if (gitStatus.trim()) {
        status += `\nUncommitted changes:\n\`\`\`\n${gitStatus.slice(0, 1000)}\n\`\`\``;
      } else {
        status += `\n✅ Working tree clean`;
      }

      await ctx.reply(status, { parse_mode: "Markdown" });
    } catch (e: any) {
      await ctx.reply(`❌ Error: ${e.message}`);
    }
  });

  // ── /read <file> ──
  bot.command("read", async (ctx) => {
    const filePath = ctx.match?.trim();
    if (!filePath) {
      await ctx.reply("Usage: `/read <filepath>`", { parse_mode: "Markdown" });
      return;
    }

    const resolved = resolveSafePath(config.workspaceRoot, filePath);
    if (!resolved) {
      await ctx.reply("❌ Path is outside workspace boundary.");
      return;
    }

    try {
      const content = fs.readFileSync(resolved, "utf-8");
      const truncated = content.slice(0, 3500);
      const suffix = content.length > 3500 ? `\n\n... (truncated, ${content.length} chars total)` : "";
      await ctx.reply(`📄 \`${filePath}\`\n\`\`\`\n${truncated}${suffix}\n\`\`\``, { parse_mode: "Markdown" });
    } catch (e: any) {
      await ctx.reply(`❌ ${e.message}`);
    }
  });

  // ── /build ──
  bot.command("build", async (ctx) => {
    if (!requireDev(state, ctx)) return;
    touchDevActivity(state, autoLockMs, ctx);

    await ctx.reply("🔨 Starting build...");
    try {
      const output = safeExec("npm run build 2>&1", config.workspaceRoot, 120_000);
      const truncated = output.slice(-2000);
      await ctx.reply(`✅ Build complete:\n\`\`\`\n${truncated}\n\`\`\``, { parse_mode: "Markdown" });
    } catch (e: any) {
      const errOutput = e.stdout?.toString()?.slice(-2000) || e.message;
      await ctx.reply(`❌ Build failed:\n\`\`\`\n${errOutput}\n\`\`\``, { parse_mode: "Markdown" });
    }
  });

  // ── /run <command> ──
  bot.command("run", async (ctx) => {
    if (!requireDev(state, ctx)) return;
    touchDevActivity(state, autoLockMs, ctx);

    const cmd = ctx.match?.trim();
    if (!cmd) {
      await ctx.reply("Usage: `/run <command>`", { parse_mode: "Markdown" });
      return;
    }

    if (!isCommandSafe(cmd)) {
      await ctx.reply("❌ Command blocked — contains unsafe pattern.");
      return;
    }

    try {
      const output = safeExec(cmd + " 2>&1", config.workspaceRoot, 30_000);
      const truncated = output.slice(-3000);
      await ctx.reply(`\`$ ${cmd}\`\n\`\`\`\n${truncated}\n\`\`\``, { parse_mode: "Markdown" });
    } catch (e: any) {
      const errOutput = e.stdout?.toString()?.slice(-2000) || e.message;
      await ctx.reply(`❌ Failed:\n\`\`\`\n${errOutput}\n\`\`\``, { parse_mode: "Markdown" });
    }
  });

  // ── /git <args> ──
  bot.command("git", async (ctx) => {
    if (!requireDev(state, ctx)) return;
    touchDevActivity(state, autoLockMs, ctx);

    const args = ctx.match?.trim();
    if (!args) {
      await ctx.reply("Usage: `/git <args>`\nExamples: `status`, `add -A`, `commit -m \"msg\"`, `push`", { parse_mode: "Markdown" });
      return;
    }

    // Block destructive git operations
    if (/force|--force|-f.*push|push.*-f|reset\s+--hard/i.test(args)) {
      await ctx.reply("❌ Force operations blocked. Do these manually.");
      return;
    }

    try {
      const output = safeExec(`git ${args} 2>&1`, config.workspaceRoot, 30_000);
      const truncated = output.slice(-3000);
      await ctx.reply(`\`$ git ${args}\`\n\`\`\`\n${truncated}\n\`\`\``, { parse_mode: "Markdown" });
    } catch (e: any) {
      const errOutput = e.stdout?.toString()?.slice(-2000) || e.message;
      await ctx.reply(`❌ Failed:\n\`\`\`\n${errOutput}\n\`\`\``, { parse_mode: "Markdown" });
    }
  });

  // ── /remember <text> ──
  bot.command("remember", async (ctx) => {
    const content = ctx.match?.trim();
    if (!content) {
      await ctx.reply("Usage: `/remember <what to remember>`", { parse_mode: "Markdown" });
      return;
    }

    // Auto-categorize based on keywords
    let category = "general";
    if (/prefer|always|never|style|like|hate/i.test(content)) category = "preference";
    else if (/bug|error|fix|issue|broke/i.test(content)) category = "issue";
    else if (/deploy|release|version/i.test(content)) category = "deploy";
    else if (/password|key|token|secret/i.test(content)) {
      await ctx.reply("⚠️ Don't store credentials in memory. Use .env files.");
      return;
    }

    const id = memory.store(content, category);
    await ctx.reply(`🧠 Remembered (ID: ${id}, category: ${category}):\n"${content}"`);
  });

  // ── /recall <query> ──
  bot.command("recall", async (ctx) => {
    const query = ctx.match?.trim();
    if (!query) {
      await ctx.reply("Usage: `/recall <search query>`", { parse_mode: "Markdown" });
      return;
    }

    const results = memory.search(query);
    if (results.length === 0) {
      await ctx.reply("No matching memories found.");
      return;
    }

    const formatted = results
      .map(r => `*#${r.id}* [${r.category}] ${r.content}\n_${r.created_at}_`)
      .join("\n\n");
    await ctx.reply(`🧠 Found ${results.length} memories:\n\n${formatted}`, { parse_mode: "Markdown" });
  });

  // ── /memories ──
  bot.command("memories", async (ctx) => {
    const count = memory.count();
    if (count === 0) {
      await ctx.reply("No memories stored yet. Use /remember to add one.");
      return;
    }

    const recent = memory.list(15);
    const formatted = recent
      .map(r => `*#${r.id}* [${r.category}] ${r.content.slice(0, 80)}`)
      .join("\n");
    await ctx.reply(
      `🧠 *${config.workspaceName} Memory* (${count} total)\n\n${formatted}`,
      { parse_mode: "Markdown" }
    );
  });

  // ── /forget <id> ──
  bot.command("forget", async (ctx) => {
    const idStr = ctx.match?.trim();
    if (!idStr || isNaN(parseInt(idStr))) {
      await ctx.reply("Usage: `/forget <memory_id>`", { parse_mode: "Markdown" });
      return;
    }

    const deleted = memory.forget(parseInt(idStr));
    await ctx.reply(deleted ? `🗑️ Memory #${idStr} deleted.` : `❌ Memory #${idStr} not found.`);
  });

  // ── Free text → Gemini AI chat ──
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) return;

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      await ctx.reply("⚠️ GOOGLE_GENAI_API_KEY not set in .env — AI chat unavailable.");
      return;
    }

    // Build context from recent memories
    let memoryContext = "";
    try {
      const relevantMemories = memory.search(text);
      if (relevantMemories.length > 0) {
        memoryContext = "\n\nRelevant memories:\n" +
          relevantMemories.map(m => `- [${m.category}] ${m.content}`).join("\n");
      }
    } catch { /* ignore */ }

    // Build workspace status context
    let statusContext = "";
    try {
      const branch = safeExec("git branch --show-current", config.workspaceRoot).trim();
      statusContext = `\nCurrent branch: ${branch}, Mode: ${state.mode}`;
    } catch { /* ignore */ }

    // Add user message to history (keep last 20 messages)
    state.conversationHistory.push({ role: "user", content: text });
    if (state.conversationHistory.length > 20) {
      state.conversationHistory = state.conversationHistory.slice(-20);
    }

    // Build Gemini request
    const systemInstruction = soulPrompt +
      `\n\nWorkspace: ${config.workspaceRoot}` +
      `\nFirebase: ${config.firebaseProjectId || "unknown"}` +
      `\nMode: ${state.mode} (${state.mode === "dev" ? "can edit files and run commands" : "read-only ops"})` +
      memoryContext +
      statusContext +
      `\n\nKeep responses concise for Telegram. Use markdown formatting.`;

    const contents = state.conversationHistory.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    try {
      await ctx.replyWithChatAction("typing");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: {
              maxOutputTokens: 1500,
              temperature: 0.7,
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("Gemini API error:", response.status, err);
        await ctx.reply("❌ AI error — try again.");
        return;
      }

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiText) {
        await ctx.reply("🤔 Got an empty response. Try rephrasing.");
        return;
      }

      // Add AI response to history
      state.conversationHistory.push({ role: "model", content: aiText });

      // Telegram has a 4096 char limit
      if (aiText.length > 4000) {
        const chunks = aiText.match(/.{1,4000}/gs) || [aiText];
        for (const chunk of chunks) {
          await ctx.reply(chunk, { parse_mode: "Markdown" }).catch(() =>
            ctx.reply(chunk) // fallback without markdown if parsing fails
          );
        }
      } else {
        await ctx.reply(aiText, { parse_mode: "Markdown" }).catch(() =>
          ctx.reply(aiText) // fallback without markdown
        );
      }
    } catch (e: any) {
      console.error("AI chat error:", e.message);
      await ctx.reply(`❌ ${e.message}`);
    }
  });

  return bot;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function requireDev(state: BotState, ctx: Context): boolean {
  if (state.mode !== "dev") {
    ctx.reply("🔒 This command requires *dev mode*. Use `/dev <passphrase>` first.", { parse_mode: "Markdown" });
    return false;
  }
  return true;
}

function touchDevActivity(state: BotState, autoLockMs: number, ctx: Context): void {
  state.lastDevActivity = Date.now();
  resetAutoLock(state, autoLockMs, ctx);
}

function resetAutoLock(state: BotState, autoLockMs: number, ctx: Context): void {
  if (state.autoLockTimer) clearTimeout(state.autoLockTimer);
  state.autoLockTimer = setTimeout(async () => {
    state.mode = "ops";
    state.autoLockTimer = null;
    try {
      await ctx.reply("🔒 *Auto-locked* — 60 min inactivity. Use /dev to re-enter.", { parse_mode: "Markdown" });
    } catch { /* chat may be unavailable */ }
  }, autoLockMs);
}

function resolveSafePath(root: string, filePath: string): string | null {
  const resolved = path.resolve(root, filePath);
  if (!resolved.startsWith(path.resolve(root))) return null;
  return resolved;
}

function isCommandSafe(cmd: string): boolean {
  // Check against blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cmd)) return false;
  }

  // Extract the base command
  const baseCmd = cmd.trim().split(/\s+/)[0];
  const cmdName = path.basename(baseCmd);

  // Check whitelist
  return WHITELISTED_COMMANDS.includes(cmdName);
}

function safeExec(cmd: string, cwd: string, timeout = 15_000): string {
  return execSync(cmd, {
    cwd,
    timeout,
    maxBuffer: 10 * 1024 * 1024, // 10MB
    encoding: "utf-8",
    env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.HOME}/.nvm/versions/node/v22.22.1/bin:${process.env.PATH}` },
  });
}
