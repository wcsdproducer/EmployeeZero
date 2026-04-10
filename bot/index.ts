import "dotenv/config";
import { createDevBot } from "./devBotFramework.js";

const bot = createDevBot({
  token: process.env.TELEGRAM_BOT_TOKEN!,
  ownerId: parseInt(process.env.TELEGRAM_OWNER_ID!, 10),
  workspaceRoot: process.env.WORKSPACE_ROOT || "/Volumes/SAMSUNG 500gb/Antigravity/Employee Zero",
  workspaceName: "Employee Zero",
  firebaseProjectId: "employee-zero-production",
});

console.log("👤 Employee Zero Dev Bot starting...");

// Retry-aware startup — handles 409 conflicts from killed long-poll sessions
async function startWithRetry(maxRetries = 5, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await bot.start({
        onStart: () => console.log("✅ @EmployeeZeroDevBot is running"),
      });
      return;
    } catch (err: any) {
      if (err?.error_code === 409 && attempt < maxRetries) {
        console.warn(`⚠️ 409 conflict (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
}

startWithRetry().catch((err) => {
  console.error("❌ Bot failed after retries:", err.message || err);
  process.exit(1);
});
