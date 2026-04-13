import { Bot, Context } from "grammy";
import { execSync, exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import cron from "node-cron";
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

interface Reminder {
  id: number;
  message: string;
  cronExpr: string;
  task: cron.ScheduledTask;
  createdAt: string;
}

interface BotState {
  mode: BotMode;
  lastDevActivity: number;
  autoLockTimer: NodeJS.Timeout | null;
  conversationHistory: Array<{ role: string; content: string; parts?: any[] }>;
  reminders: Reminder[];
  nextReminderId: number;
}

// ──────────────────────────────────────────────
// Browser Tools Implementation
// ──────────────────────────────────────────────

async function webSearch(query: string): Promise<string> {
  try {
    const resp = await axios.get("https://api.duckduckgo.com/", {
      params: { q: query, format: "json", no_redirect: 1, no_html: 1, skip_disambig: 1 },
      timeout: 8000,
    });
    const data = resp.data;
    const lines: string[] = [];
    if (data.AbstractText) lines.push(`📋 Summary: ${data.AbstractText}`);
    if (data.Answer) lines.push(`✅ Answer: ${data.Answer}`);
    
    const results = (data.RelatedTopics || [])
      .filter((t: any) => t.FirstURL && t.Text)
      .slice(0, 6)
      .map((t: any) => `• ${t.Text}\n  🔗 ${t.FirstURL}`);
    
    if (results.length > 0) lines.push("\nTop results:\n" + results.join("\n\n"));
    
    if (lines.length === 0) {
      return `No instant results found for "${query}". I'll try to refine the search or use a direct URL if you have one.`;
    }
    
    return lines.join("\n");
  } catch (err: any) {
    return `Search failed: ${err.message}`;
  }
}

async function fetchPage(url: string): Promise<string> {
  try {
    const resp = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36" },
      maxContentLength: 500_000,
    });
    const $ = cheerio.load(resp.data);
    $("script, style, nav, footer, header, iframe, noscript").remove();
    const title = $("title").text().trim();
    const body = $("body").text().replace(/\s+/g, " ").trim().slice(0, 4000);
    return `📄 **${title}**\n\n${body}\n\n🔗 Source: ${url}`;
  } catch (err: any) {
    return `Failed to fetch ${url}: ${err.message}`;
  }
}

const BROWSER_TOOLS = [
  {
    function_declarations: [
      {
        name: "web_search",
        description: "Search the web for real-time information, news, documentation, or facts.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query" }
          },
          required: ["query"]
        }
      },
      {
        name: "fetch_page",
        description: "Extract text content from a specific URL to read documentation or articles.",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "The full URL to fetch" }
          },
          required: ["url"]
        }
      },
      {
        name: "set_reminder",
        description: "Schedule a reminder message to be sent to the user at a specific time. Supports one-time or recurring reminders. Time must be in 24h format (HH:MM) EST.",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string", description: "The reminder message to send" },
            time: { type: "string", description: "Time in HH:MM format (24h, EST). e.g. '08:00' for 8 AM, '14:30' for 2:30 PM" },
            recurring: { type: "string", enum: ["once", "daily", "weekdays"], description: "How often to repeat. 'once' for one-time, 'daily' for every day, 'weekdays' for Mon-Fri" }
          },
          required: ["message", "time"]
        }
      },
      {
        name: "list_reminders",
        description: "List all active reminders for this bot.",
        parameters: { type: "object", properties: {} }
      },
      {
        name: "cancel_reminder",
        description: "Cancel an active reminder by its ID.",
        parameters: {
          type: "object",
          properties: {
            id: { type: "number", description: "The reminder ID to cancel" }
          },
          required: ["id"]
        }
      }
    ]
  }
];

// ──────────────────────────────────────────────
// Whitelisted commands
// ──────────────────────────────────────────────

const WHITELISTED_COMMANDS = [
  "npm", "npx", "node", "tsx",
  "git", "tsc",
  "cat", "ls", "find", "grep", "head", "tail", "wc",
  "echo", "pwd",
  "firebase",
  "pm2",
];

function safeExec(cmd: string, cwd: string): string {
  const parts = cmd.split(" ");
  const base = parts[0];
  if (!WHITELISTED_COMMANDS.includes(base)) {
    throw new Error(`Command not allowed: ${base}`);
  }
  return execSync(cmd, { cwd }).toString();
}

// ──────────────────────────────────────────────
// Safe reply helper — falls back to plain text if Markdown parse fails
// ──────────────────────────────────────────────

async function safeReply(ctx: Context, text: string) {
  try {
    await ctx.reply(text, { parse_mode: "Markdown" });
  } catch {
    // Markdown parse failure — send as plain text
    await ctx.reply(text);
  }
}

// ──────────────────────────────────────────────
// Main Framework
// ──────────────────────────────────────────────

export async function createDevBot(config: DevBotConfig) {
  const bot = new Bot(config.token);

  // Global error handler — prevents silent crashes
  bot.catch((err) => {
    console.error(`❌ [${config.workspaceName}] Unhandled bot error:`, err.message || err);
  });

  const memory = createMemoryStore(config.workspaceName);
  // Check for both possible env var names
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  if (!apiKey) {
    console.error(`[${config.workspaceName}] ❌ Missing GEMINI_API_KEY or GOOGLE_GENAI_API_KEY`);
  }

  const state: BotState = {
    mode: "ops",
    lastDevActivity: Date.now(),
    autoLockTimer: null,
    conversationHistory: [],
    reminders: [],
    nextReminderId: 1,
  };

  const autoLockMs = (config.autoLockMinutes || 60) * 60 * 1000;
  const soulPath = path.join(config.workspaceRoot, "soul.md");
  let soulPrompt = `You are the ${config.workspaceName} Dev Bot. You help John Freeman manage this workspace.`;
  
  if (fs.existsSync(soulPath)) {
    try {
      soulPrompt = fs.readFileSync(soulPath, "utf-8");
    } catch (err) {
      console.error(`[${config.workspaceName}] ❌ Failed to read soul.md:`, err);
    }
  }

  // ── Helper: reset auto-lock ──
  function resetAutoLock() {
    if (state.autoLockTimer) clearTimeout(state.autoLockTimer);
    state.autoLockTimer = setTimeout(() => {
      state.mode = "ops";
      console.log(`🔒 Auto-locked ${config.workspaceName} due to inactivity`);
    }, autoLockMs);
  }

  // ── /start ──
  bot.command("start", async (ctx) => {
    await ctx.reply(`👋 *${config.workspaceName} Dev Bot* active.\nMode: \`${state.mode}\`\n\nUse \`/dev <passphrase>\` to enable dev tools.`, { parse_mode: "Markdown" });
  });

  // ── /dev <passphrase> ──
  bot.command("dev", async (ctx) => {
    const pass = ctx.match?.trim();
    const target = config.devPassphrase || "gravity";
    
    if (pass === target) {
      state.mode = "dev";
      resetAutoLock();
      await ctx.reply("🔓 *Dev mode enabled.* You now have full file system access and terminal commands.", { parse_mode: "Markdown" });
    } else {
      await ctx.reply("❌ Incorrect passphrase.");
    }
  });

  // ── /ops ──
  bot.command("ops", async (ctx) => {
    state.mode = "ops";
    if (state.autoLockTimer) clearTimeout(state.autoLockTimer);
    await ctx.reply("🔒 *Dev mode disabled.* Returned to ops mode.", { parse_mode: "Markdown" });
  });

  // ── /mode ──
  bot.command("mode", async (ctx) => {
    await ctx.reply(`Current mode: \`${state.mode}\``, { parse_mode: "Markdown" });
  });

  // ── /run <cmd> ──
  bot.command("run", async (ctx) => {
    if (state.mode !== "dev") {
      await ctx.reply("🔒 Please enter dev mode first: `/dev <passphrase>`", { parse_mode: "Markdown" });
      return;
    }
    const cmd = ctx.match?.trim();
    if (!cmd) return;

    resetAutoLock();
    try {
      await ctx.replyWithChatAction("typing");
      const output = safeExec(cmd, config.workspaceRoot);
      await safeReply(ctx, `\`\`\`\n${output.slice(0, 4000)}\n\`\`\``);
    } catch (err: any) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // ── /read <file> ──
  bot.command("read", async (ctx) => {
    const filePath = ctx.match?.trim();
    if (!filePath) return;

    const fullPath = path.resolve(config.workspaceRoot, filePath);
    if (!fullPath.startsWith(path.resolve(config.workspaceRoot))) {
      await ctx.reply("❌ Access denied: Path outside workspace.");
      return;
    }

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      await safeReply(ctx, `📄 *${filePath}*\n\n\`\`\`\n${content.slice(0, 4000)}\n\`\`\``);
    } catch (err: any) {
      await ctx.reply(`❌ Error: ${err.message}`);
    }
  });

  // ── /build ──
  bot.command("build", async (ctx) => {
    if (state.mode !== "dev") {
      await ctx.reply("🔒 Please enter dev mode first.");
      return;
    }
    resetAutoLock();
    await ctx.reply("🏗️ Starting build...");
    exec("npm run build", { cwd: config.workspaceRoot }, (err, stdout, stderr) => {
      if (err) {
        safeReply(ctx, `❌ Build failed:\n\`\`\`\n${stderr.slice(0, 1000)}\n\`\`\``);
      } else {
        ctx.reply("✅ Build completed successfully.");
      }
    });
  });

  // ── /git <args> ──
  bot.command("git", async (ctx) => {
    if (state.mode !== "dev") {
      await ctx.reply("🔒 Please enter dev mode first.");
      return;
    }
    const args = ctx.match?.trim();
    if (!args) return;

    resetAutoLock();
    try {
      const output = safeExec(`git ${args}`, config.workspaceRoot);
      await safeReply(ctx, `\`\`\`\n${output.slice(0, 4000)}\n\`\`\``);
    } catch (err: any) {
      await ctx.reply(`❌ Git error: ${err.message}`);
    }
  });

  // ── /remember <text> ──
  bot.command("remember", async (ctx) => {
    const content = ctx.match?.trim();
    if (!content) return;
    
    let category = "general";
    if (content.toLowerCase().includes("note:")) category = "note";
    if (content.toLowerCase().includes("todo:")) category = "todo";
    if (content.toLowerCase().includes("fix:")) category = "bug";

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
      .map(r => `#${r.id} [${r.category}] ${r.content}`)
      .join("\n\n");
    await safeReply(ctx, `🧠 Found ${results.length} memories:\n\n${formatted.slice(0, 4000)}`);
  });

  // ── Main Chat Handler ──
  bot.on("message:text", async (ctx) => {
    if (ctx.from?.id !== config.ownerId) return;

    const text = ctx.message.text;
    if (text.startsWith("/")) return; // handle commands separately

    const memoryContext = memory.search(text).map(m => `\nMemory #${m.id}: ${m.content}`).join("");
    let statusContext = "";
    try {
      const branch = execSync("git branch --show-current", { cwd: config.workspaceRoot }).toString().trim();
      statusContext = `\nCurrent branch: ${branch}, Mode: ${state.mode}`;
    } catch { /* ignore */ }

    // Add user message to history
    state.conversationHistory.push({ role: "user", content: text, parts: [{ text }] });
    if (state.conversationHistory.length > 20) {
      state.conversationHistory = state.conversationHistory.slice(-20);
    }

    const systemInstruction = soulPrompt +
      `\n\nWorkspace: ${config.workspaceRoot}` +
      `\nFirebase: ${config.firebaseProjectId || "unknown"}` +
      `\nMode: ${state.mode} (${state.mode === "dev" ? "can edit files and run commands" : "read-only ops"})` +
      memoryContext +
      statusContext +
      `\n\nKeep responses concise for Telegram. Use markdown formatting. You have access to browser tools to search or fetch live information. ALWAYS use these tools if you need to look up current events, news, documentation, or facts outside your internal training data.`;

    let turnCount = 0;
    const maxTurns = 5;

    try {
      if (!apiKey) {
        throw new Error("Missing GEMINI_API_KEY. Please set it in your environment.");
      }
      
      // Immediate acknowledgment — so user knows bot is alive
      await ctx.replyWithChatAction("typing");
      const ack = await ctx.reply("🚗 On it...");

      while (turnCount < maxTurns) {
        turnCount++;

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: state.conversationHistory.map(m => ({ 
              role: (m.role === "function") ? "function" : (m.role === "user" ? "user" : "model"), 
              parts: m.parts 
            })),
            tools: BROWSER_TOOLS,
            generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
          },
          { headers: { "Content-Type": "application/json" } }
        );

        const candidate = response.data.candidates?.[0];
        if (!candidate) throw new Error("No candidate in Gemini response");

        const messagePart = candidate.content?.parts?.[0];

        // Guard: if no parts at all (thinking model exhausted token budget)
        if (!messagePart) {
          console.warn(`⚠️ [${config.workspaceName}] Gemini returned no parts (finishReason: ${candidate.finishReason})`);
          try { await ctx.api.deleteMessage(ctx.chat!.id, ack.message_id); } catch {}
          await ctx.reply("⚠️ I thought about it but couldn't formulate a response. Please try again.");
          return;
        }
        
        // Handle normal text response
        if (messagePart.text) {
          state.conversationHistory.push({ role: "model", content: messagePart.text, parts: [messagePart] });
          // Delete the "On it..." ack now that we have a real response
          try { await ctx.api.deleteMessage(ctx.chat!.id, ack.message_id); } catch {}
          await safeReply(ctx, messagePart.text);
          return;
        }

        // Handle tool calls
        if (messagePart.functionCall) {
          const call = messagePart.functionCall;
          console.log(`🤖 [${config.workspaceName}] Tool Call: ${call.name}`, call.args);
          
          let result = "";
          if (call.name === "web_search") {
            result = await webSearch(call.args.query);
          } else if (call.name === "fetch_page") {
            result = await fetchPage(call.args.url);
          } else if (call.name === "set_reminder") {
            const { message, time, recurring } = call.args;
            const [hours, minutes] = (time || "08:00").split(":").map(Number);
            const freq = recurring || "daily";
            let cronExpr: string;
            if (freq === "weekdays") {
              cronExpr = `${minutes} ${hours} * * 1-5`;
            } else if (freq === "once") {
              // One-time: schedule for today/tomorrow, cancel after firing
              cronExpr = `${minutes} ${hours} * * *`;
            } else {
              cronExpr = `${minutes} ${hours} * * *`;
            }
            const reminderId = state.nextReminderId++;
            const task = cron.schedule(cronExpr, async () => {
              try {
                await bot.api.sendMessage(config.ownerId, `⏰ *Reminder*\n\n${message}`, { parse_mode: "Markdown" });
              } catch {
                await bot.api.sendMessage(config.ownerId, `⏰ Reminder\n\n${message}`);
              }
              // Cancel one-time reminders after firing
              if (freq === "once") {
                task.stop();
                const idx = state.reminders.findIndex(r => r.id === reminderId);
                if (idx >= 0) state.reminders.splice(idx, 1);
              }
            }, { timezone: "America/New_York" });
            state.reminders.push({ id: reminderId, message, cronExpr, task, createdAt: new Date().toISOString() });
            result = `Reminder #${reminderId} set: "${message}" at ${time} EST (${freq}). I'll proactively message you at that time.`;
          } else if (call.name === "list_reminders") {
            if (state.reminders.length === 0) {
              result = "No active reminders.";
            } else {
              result = state.reminders.map(r => `#${r.id}: "${r.message}" (cron: ${r.cronExpr})`).join("\n");
            }
          } else if (call.name === "cancel_reminder") {
            const idx = state.reminders.findIndex(r => r.id === call.args.id);
            if (idx >= 0) {
              state.reminders[idx].task.stop();
              state.reminders.splice(idx, 1);
              result = `Reminder #${call.args.id} cancelled.`;
            } else {
              result = `Reminder #${call.args.id} not found.`;
            }
          } else {
            result = `Error: Unknown tool ${call.name}`;
          }

          // Add model's tool call to history
          state.conversationHistory.push({ role: "model", content: "", parts: [messagePart] });
          
          // Add tool response to history
          state.conversationHistory.push({ 
            role: "function", 
            content: result, 
            parts: [{ 
              functionResponse: { 
                name: call.name, 
                response: { content: result } 
              } 
            }] 
          });

          await ctx.replyWithChatAction("typing");
          continue; // Loop for next Gemini turn
        }

        break;
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      console.error(`❌ Chat error in ${config.workspaceName}:`, errorMsg);
      await ctx.reply(`⚠️ Sorry, I encountered an error: ${errorMsg}`);
    }
  });

  // ── Daily Workspace Digest (8 AM EST) ──
  scheduleWorkspaceDigest(bot, config);

  return bot;
}

// ──────────────────────────────────────────────
// Daily Workspace Digest
// ──────────────────────────────────────────────

function buildWorkspaceDigest(config: DevBotConfig): string {
  const lines: string[] = [];
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const wsRoot = config.workspaceRoot;

  // 1. Git commits (last 24h)
  try {
    const gitLog = execSync(
      `git log --since="${since24h}" --pretty=format:"%h %s" --no-merges -n 20`,
      { cwd: wsRoot, timeout: 5000, encoding: "utf-8" }
    ).trim();
    if (gitLog) {
      const commits = gitLog.split("\n");
      lines.push(`🔧 <b>Code Changes</b> (${commits.length} commits)`);
      commits.slice(0, 10).forEach(c => lines.push(`  • ${escHtml(c)}`));
      if (commits.length > 10) lines.push(`  ... and ${commits.length - 10} more`);
    }
  } catch { /* no git or no commits */ }

  // 2. Modified source files (last 24h)
  try {
    const cutoffSec = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const srcDirs = ["src", "bot", "app"].map(d => path.join(wsRoot, d)).filter(d => fs.existsSync(d));
    if (srcDirs.length > 0) {
      const findCmd = `find ${srcDirs.map(d => `"${d}"`).join(" ")} \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \\) -newer /dev/null 2>/dev/null | xargs stat -f "%m %N" 2>/dev/null | awk -v c=${cutoffSec} '$1 > c {print $2}' | wc -l`;
      const count = parseInt(execSync(findCmd, { timeout: 5000, encoding: "utf-8" }).trim(), 10);
      if (count > 0) {
        lines.push(`📁 <b>Files Modified</b>: ${count} source files`);
      }
    }
  } catch { /* skip */ }

  // 3. Antigravity conversation artifacts (walkthroughs about this workspace)
  try {
    const brainDir = "/Users/johnfreeman/.gemini/antigravity/brain";
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const wsNameLower = config.workspaceName.toLowerCase();
    let completedTasks = 0;
    const walkthroughSnippets: string[] = [];

    if (fs.existsSync(brainDir)) {
      for (const convId of fs.readdirSync(brainDir)) {
        const convDir = path.join(brainDir, convId);
        try { if (!fs.statSync(convDir).isDirectory()) continue; } catch { continue; }

        // Check walkthrough.md for mentions of this workspace
        const wp = path.join(convDir, "walkthrough.md");
        if (fs.existsSync(wp) && fs.statSync(wp).mtimeMs >= cutoff) {
          const content = fs.readFileSync(wp, "utf-8");
          if (content.toLowerCase().includes(wsNameLower)) {
            const title = content.match(/^#\s+(.+)/m)?.[1] || "Untitled";
            walkthroughSnippets.push(escHtml(title));
          }
        }

        // Check task.md for completed tasks mentioning this workspace
        const tp = path.join(convDir, "task.md");
        if (fs.existsSync(tp) && fs.statSync(tp).mtimeMs >= cutoff) {
          const content = fs.readFileSync(tp, "utf-8");
          if (content.toLowerCase().includes(wsNameLower)) {
            completedTasks += (content.match(/\[x\]/g) || []).length;
          }
        }
      }
    }

    if (walkthroughSnippets.length > 0) {
      lines.push(`🧠 <b>Agent Sessions</b>`);
      walkthroughSnippets.slice(0, 5).forEach(s => lines.push(`  📋 ${s}`));
    }
    if (completedTasks > 0) {
      lines.push(`✅ <b>Completed Tasks</b>: ${completedTasks}`);
    }
  } catch { /* skip */ }

  // 4. Build status check
  try {
    const pkgPath = path.join(wsRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const hasBuild = !!pkg.scripts?.build;
      if (hasBuild) {
        lines.push(`📦 <b>Build</b>: ${pkg.name || config.workspaceName} v${pkg.version || "?"}`);
      }
    }
  } catch { /* skip */ }

  if (lines.length === 0) {
    return `📰 <b>${escHtml(config.workspaceName)} Daily Digest</b>\n\n<i>No changes recorded in the last 24 hours.</i>`;
  }

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    timeZone: "America/New_York",
  });

  return `📰 <b>${escHtml(config.workspaceName)} Daily Digest</b>\n📅 ${escHtml(date)}\n\n${lines.join("\n")}\n\n<i>${lines.length} items tracked</i>`;
}

function escHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function scheduleWorkspaceDigest(bot: Bot, config: DevBotConfig) {
  cron.schedule("0 8 * * *", async () => {
    console.log(`📰 [${config.workspaceName}] Sending daily workspace digest...`);
    try {
      const digest = buildWorkspaceDigest(config);
      await bot.api.sendMessage(config.ownerId, digest, { parse_mode: "HTML" });
      console.log(`✅ [${config.workspaceName}] Daily digest sent.`);
    } catch (err: any) {
      console.error(`❌ [${config.workspaceName}] Digest failed:`, err.message);
    }
  }, { timezone: "America/New_York" });

  console.log(`📰 [${config.workspaceName}] Daily digest scheduled: 8:00 AM EST`);
}
