import { Bot, Context } from "grammy";
import { execSync, exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
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
  conversationHistory: Array<{ role: string; content: string; parts?: any[] }>;
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
    return lines.length > 0 ? lines.join("\n") : "No results found on DuckDuckGo. Try a direct URL.";
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
        description: "Search the web for information using DuckDuckGo",
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
        description: "Fetch the text content of a specific webpage URL",
        parameters: {
          type: "object",
          properties: {
            url: { type: "string", description: "The full URL to fetch" }
          },
          required: ["url"]
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
// Main Framework
// ──────────────────────────────────────────────

export async function createDevBot(config: DevBotConfig) {
  const bot = new Bot(config.token);
  const memory = createMemoryStore(config.workspaceName);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error(`[${config.workspaceName}] ❌ Missing GEMINI_API_KEY`);
  }

  const state: BotState = {
    mode: "ops",
    lastDevActivity: Date.now(),
    autoLockTimer: null,
    conversationHistory: [],
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

  // ── Helper: reset auto-lock ──
  function resetAutoLock() {
    if (state.autoLockTimer) clearTimeout(state.autoLockTimer);
    state.autoLockTimer = setTimeout(() => {
      state.mode = "ops";
      console.log(`🔒 Auto-locked ${config.workspaceName} due to inactivity`);
    }, autoLockMs);
  }

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
      await ctx.reply(`\`\`\`\n${output.slice(0, 4000)}\n\`\`\``, { parse_mode: "Markdown" });
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
      await ctx.reply(`📄 *${filePath}*\n\n\`\`\`\n${content.slice(0, 4000)}\n\`\`\``, { parse_mode: "Markdown" });
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
        ctx.reply(`❌ Build failed:\n\`\`\`\n${stderr.slice(0, 1000)}\n\`\`\``, { parse_mode: "Markdown" });
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
      await ctx.reply(`\`\`\`\n${output.slice(0, 4000)}\n\`\`\``, { parse_mode: "Markdown" });
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
      .map(r => `*#${r.id}* [${r.category}] ${r.content}\n_${r.created_at}_`)
      .join("\n\n");
    await ctx.reply(`🧠 Found ${results.length} memories:\n\n${formatted.slice(0, 4000)}`, { parse_mode: "Markdown" });
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
      `\n\nWorkspace Name: ${config.workspaceName}` +
      `\nFirebase Project: ${config.firebaseProjectId || "unknown"}` +
      `\nMode: ${state.mode} (${state.mode === "dev" ? "can edit files and run commands" : "read-only ops"})` +
      memoryContext +
      statusContext +
      `\n\nKeep responses concise for Telegram. Use markdown formatting. You have access to browser tools to search or fetch live information. ALWAYS use these tools if you need to look up current events, news, documentation, or facts outside your internal training data.`;

    let turnCount = 0;
    const maxTurns = 5;

    try {
      await ctx.replyWithChatAction("typing");

      while (turnCount < maxTurns) {
        turnCount++;

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: state.conversationHistory.map(m => ({ role: m.role === "user" ? "user" : "model", parts: m.parts })),
            tools: BROWSER_TOOLS,
            generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
          },
          { headers: { "Content-Type": "application/json" } }
        );

        const candidate = response.data.candidates?.[0];
        if (!candidate) throw new Error("No candidate in Gemini response");

        const messagePart = candidate.content.parts?.[0];
        
        // Handle normal text response
        if (messagePart.text) {
          state.conversationHistory.push({ role: "model", content: messagePart.text, parts: [messagePart] });
          await ctx.reply(messagePart.text, { parse_mode: "Markdown" });
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
      console.error(`❌ Chat error in ${config.workspaceName}:`, err.response?.data || err.message);
      await ctx.reply(`⚠️ Sorry, I encountered an error: ${err.message}`);
    }
  });

  return bot;
}
