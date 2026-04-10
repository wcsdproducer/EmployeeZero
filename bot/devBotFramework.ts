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

import { Bot, Context, InputFile } from "grammy";
import { execSync, exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import puppeteer, { Browser } from "puppeteer";
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
  browser: Browser | null;
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
    browser: null,
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
      `  /browse <url> — Screenshot & extract page text\n` +
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

  // ── /browse <url> ──
  bot.command("browse", async (ctx) => {
    const url = ctx.match?.trim();
    if (!url) {
      await ctx.reply("Usage: `/browse <url>`\nExample: `/browse https://example.com`", { parse_mode: "Markdown" });
      return;
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      await ctx.reply("❌ Invalid URL.");
      return;
    }

    await ctx.replyWithChatAction("upload_photo");

    try {
      // Launch browser if not already open
      if (!state.browser || !state.browser.connected) {
        state.browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
      }

      const page = await state.browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });

      // Navigate with timeout
      await page.goto(parsedUrl.href, { waitUntil: "networkidle2", timeout: 20_000 });

      // Take screenshot
      const screenshotBuffer = await page.screenshot({ type: "png", fullPage: false }) as Buffer;

      // Extract page text (truncated)
      const pageText = await page.evaluate(() => {
        return document.body?.innerText?.slice(0, 2000) || "(no text content)";
      });
      const title = await page.title();

      await page.close();

      // Send screenshot
      await ctx.replyWithPhoto(new InputFile(screenshotBuffer, "screenshot.png"), {
        caption: `🌐 *${title}*\n${parsedUrl.href}`,
        parse_mode: "Markdown",
      });

      // Send extracted text
      if (pageText.trim()) {
        const textPreview = pageText.slice(0, 3000);
        await ctx.reply(`📄 *Page Text:*\n\`\`\`\n${textPreview}\n\`\`\``, { parse_mode: "Markdown" }).catch(() =>
          ctx.reply(`📄 Page Text:\n${textPreview}`)
        );
      }
    } catch (e: any) {
      console.error("Browse error:", e.message);
      await ctx.reply(`❌ Browser error: ${e.message.slice(0, 500)}`);
    }
  });

  // ── Free text → Gemini AI chat (with tools + acknowledgment) ──
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) return;

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      await ctx.reply("⚠️ GOOGLE_GENAI_API_KEY not set in .env — AI chat unavailable.");
      return;
    }

    // Immediately acknowledge receipt
    await ctx.replyWithChatAction("typing");
    await ctx.reply("✅ Got it — working on this now...").catch(() => {});

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

    // Build Gemini request with tool instructions
    const systemInstruction = soulPrompt +
      `\n\nWorkspace: ${config.workspaceRoot}` +
      `\nFirebase: ${config.firebaseProjectId || "unknown"}` +
      `\nMode: ${state.mode} (${state.mode === "dev" ? "can edit files and run commands" : "read-only ops"})` +
      memoryContext +
      statusContext +
      `\n\nYou have tool access: use web_search to find information and browse_url to read web pages. When asked to research something, DO NOT refuse — use your tools to search the web and browse relevant sites. Synthesize findings into a clear report.` +
      `\n\nKeep responses concise for Telegram. Use markdown formatting.`;

    const contents = state.conversationHistory.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Tool declarations for function calling
    const toolDeclarations = [
      {
        name: "web_search",
        description: "Search the web for information. Returns results with titles, URLs, and snippets. Use this to research competitors, find industry news, or look up any information.",
        parameters: {
          type: "OBJECT",
          properties: { query: { type: "STRING", description: "Search query" } },
          required: ["query"],
        },
      },
      {
        name: "browse_url",
        description: "Fetch and read the text content of any web page. Returns the page title and extracted text. Use for articles, competitor sites, docs, or any URL.",
        parameters: {
          type: "OBJECT",
          properties: {
            url: { type: "STRING", description: "The URL to browse" },
            extract_links: { type: "BOOLEAN", description: "Set true to extract links" },
          },
          required: ["url"],
        },
      },
    ];

    try {
      // Tool execution loop (max 5 rounds)
      let currentContents = [...contents];
      let finalText = "";

      for (let round = 0; round < 5; round++) {
        await ctx.replyWithChatAction("typing").catch(() => {});

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstruction }] },
              contents: currentContents,
              tools: [{ function_declarations: toolDeclarations }],
              generationConfig: { maxOutputTokens: 3000, temperature: 0.7 },
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
        const parts = data.candidates?.[0]?.content?.parts || [];
        const functionCalls = parts.filter((p: any) => p.functionCall);
        const textParts = parts.filter((p: any) => p.text);

        if (functionCalls.length === 0) {
          finalText = textParts.map((p: any) => p.text).join("\n");
          break;
        }

        // Show user we're researching on first tool call
        if (round === 0) await ctx.reply("🔍 Researching...").catch(() => {});

        // Execute tool calls
        const functionResponses: any[] = [];
        for (const part of functionCalls) {
          const { name, args } = part.functionCall;
          let result: any;
          try {
            if (name === "web_search") result = await webSearchLight(args.query);
            else if (name === "browse_url") result = await browseUrlLight(args.url, { extractLinks: args.extract_links });
            else result = { error: `Unknown tool: ${name}` };
          } catch (e: any) {
            result = { error: e.message };
          }
          functionResponses.push({ functionResponse: { name, response: result } });
        }

        // Append model response + tool results
        currentContents.push({ role: "model", parts });
        currentContents.push({ role: "user", parts: functionResponses });
      }

      if (!finalText) {
        await ctx.reply("🤔 Got an empty response. Try rephrasing.");
        return;
      }

      // Add AI response to history
      state.conversationHistory.push({ role: "model", content: finalText });

      // Telegram has a 4096 char limit
      if (finalText.length > 4000) {
        const chunks = finalText.match(/.{1,4000}/gs) || [finalText];
        for (const chunk of chunks) {
          await ctx.reply(chunk, { parse_mode: "Markdown" }).catch(() =>
            ctx.reply(chunk)
          );
        }
      } else {
        await ctx.reply(finalText, { parse_mode: "Markdown" }).catch(() =>
          ctx.reply(finalText)
        );
      }
    } catch (e: any) {
      console.error("AI chat error:", e.message);
      await ctx.reply(`❌ ${e.message}`);
    }
  });

  // Cleanup browser on bot stop
  const originalStop = bot.stop.bind(bot);
  bot.stop = async () => {
    if (state.browser) {
      await state.browser.close().catch(() => {});
      state.browser = null;
    }
    return originalStop();
  };

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

// ──────────────────────────────────────────────
// Lightweight web tools (fetch-based, no Puppeteer)
// ──────────────────────────────────────────────

const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function webSearchLight(query: string): Promise<{ results: { title: string; url: string; snippet: string }[] }> {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=8`;
  const res = await fetch(searchUrl, {
    headers: { "User-Agent": WEB_UA, Accept: "text/html" },
    signal: AbortSignal.timeout(10000),
  });
  const html = await res.text();
  const results: { title: string; url: string; snippet: string }[] = [];
  const blocks = html.split('<div class="g"');
  for (const block of blocks.slice(1, 9)) {
    const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/);
    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    const snippetMatch = block.match(/<span[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/span>/);
    if (urlMatch && titleMatch) {
      results.push({
        title: titleMatch[1].replace(/<[^>]*>/g, "").trim(),
        url: urlMatch[1],
        snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim().substring(0, 300) : "",
      });
    }
  }
  return { results };
}

async function browseUrlLight(
  url: string,
  options?: { extractLinks?: boolean }
): Promise<{ title: string; url: string; text: string; links?: { text: string; href: string }[] }> {
  const res = await fetch(url, {
    headers: { "User-Agent": WEB_UA, Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : "";
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  let links: { text: string; href: string }[] | undefined;
  if (options?.extractLinks) {
    const linkRegex = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    links = [];
    let match;
    while ((match = linkRegex.exec(cleaned)) !== null && links.length < 30) {
      const href = match[1];
      const linkText = match[2].replace(/<[^>]*>/g, "").trim();
      if (href && linkText && !href.startsWith("#") && !href.startsWith("javascript:")) {
        try { links.push({ text: linkText.substring(0, 100), href: new URL(href, url).toString() }); } catch {}
      }
    }
  }
  const text = cleaned
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim()
    .substring(0, 6000);
  return { title, url: res.url, text, links };
}
