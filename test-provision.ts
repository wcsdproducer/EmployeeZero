import { adminDb } from "./src/lib/admin";
import * as dotenv from "dotenv";
dotenv.config();

async function test() {
  const userId = "7w549w7YFhV2u19Z2N6o1fLp3n13"; // Wait, I need the actual userId.
  // Let's get the first user
  const users = await adminDb.collection("users").limit(1).get();
  if (users.empty) {
    console.log("No users found");
    return;
  }
  const uid = users.docs[0].id;
  const snap = await adminDb.doc(`users/${uid}/settings/connections`).get();
  const conn = snap.data();
  const apiKey = conn?.elevenlabs?.apiSecret || conn?.elevenlabs?.apiKey;
  
  if (!apiKey) {
    console.log("No elevenlabs API key found for user", uid);
    return;
  }
  
  const payload = {
    name: "Employee Zero",
    conversation_config: {
      agent: {
        prompt: {
          prompt: "Test prompt",
          llm: "custom_llm",
          custom_llm: {
            url: "https://employeezero.app/api/elevenlabs/llm/v1/chat/completions"
          }
        },
        first_message: "Hello"
      }
    }
  };

  const res = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

test().catch(console.error);
