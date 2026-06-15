import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * WhatsApp Webhook
 * Handles both GET (verification) and POST (incoming messages/status updates)
 * Setup: In Meta Developer Portal → WhatsApp → Configuration → Webhooks
 * Set callback URL to: https://employeezero.app/api/webhooks/whatsapp
 * Subscribe to "messages" field
 */

// GET — Webhook verification handshake
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "employee-zero-webhook";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Verified successfully");
    return new Response(challenge, { status: 200 });
  }

  console.warn("[WhatsApp Webhook] Verification failed — token mismatch");
  return new Response("Forbidden", { status: 403 });
}

// POST — Incoming messages and status updates
export async function POST(request: Request) {
  const bodyText = await request.text();

  // Verify payload signature using Meta App Secret
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const sig = request.headers.get("x-hub-signature-256") ?? "";
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", appSecret).update(bodyText).digest("hex");

    if (sig !== expected) {
      console.warn("[WhatsApp Webhook] Signature mismatch — rejecting");
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // Always return 200 immediately — Meta retries if no fast response
  const payload = JSON.parse(bodyText);

  // Process async (don't await)
  processWhatsAppWebhook(payload).catch((err) =>
    console.error("[WhatsApp Webhook] Processing error:", err)
  );

  return new Response("OK", { status: 200 });
}

async function processWhatsAppWebhook(payload: any) {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;

      // Handle incoming messages
      for (const msg of value.messages || []) {
        const from = msg.from;
        const msgType = msg.type;
        const contact = value.contacts?.find((c: any) => c.wa_id === from);
        const contactName = contact?.profile?.name || from;

        let content = "";
        if (msgType === "text") content = msg.text?.body || "";
        else if (msgType === "image") content = `[Image] ${msg.image?.caption || ""}`;
        else if (msgType === "document") content = `[Document: ${msg.document?.filename || "file"}]`;
        else if (msgType === "audio") content = "[Voice message]";
        else if (msgType === "video") content = `[Video] ${msg.video?.caption || ""}`;
        else content = `[${msgType}]`;

        console.log(
          `[WhatsApp Webhook] Message from ${contactName} (${from}): "${content}" via phone ${phoneNumberId}`
        );

        // TODO: Route incoming messages to agent or notification system
        // Example: trigger an agent workflow, save to Firestore, send notification, etc.
      }

      // Handle status updates (sent/delivered/read/failed)
      for (const status of value.statuses || []) {
        console.log(
          `[WhatsApp Webhook] Status update — message ${status.id}: ${status.status} for ${status.recipient_id}`
        );
      }
    }
  }
}
