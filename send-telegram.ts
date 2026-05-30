import { sendAdminNotification } from "./src/lib/telegram";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function main() {
  const msg = "<b>Update Complete!</b>\n\n" +
              "I have completed the structural overhaul and successfully deployed the <b>Custom LLM Webhook</b> architecture to production.\n\n" +
              "The ElevenLabs Voice Agent now shares the exact same capabilities, memory persistence, SOUL logic, and Tool routing logic as the text chat!\n\n" +
              "<i>Action Required:</i> Please go to your Settings > SOUL page and click <b>Save SOUL</b> to reprovision the voice agent with the new webhook.";
  const res = await sendAdminNotification(msg);
  console.log("Notification sent:", res);
}

main().catch(console.error);
