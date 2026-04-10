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
bot.start({
  onStart: () => console.log("✅ @EmployeeZeroDevBot is running"),
});
