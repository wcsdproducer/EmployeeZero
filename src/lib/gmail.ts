import { google } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Types ─── */
interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number | null;
}

/* ─── Token Management ─── */

async function getGmailClient(userId: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured on server");
  }

  // Load tokens from Firestore
  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Gmail first");

  const data = snap.data() as Record<string, any>;
  const gmail = data?.gmail;

  if (!gmail?.connected || !gmail?.refreshToken) {
    throw new Error("Gmail is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: gmail.accessToken,
    refresh_token: gmail.refreshToken,
    expiry_date: gmail.expiryDate,
  });

  // Auto-refresh: listen for token refresh events and persist
  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["gmail.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["gmail.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["gmail.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[Gmail] Failed to persist refreshed tokens:", err);
    }
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/* ─── Helper: decode email body ─── */
function decodeBody(payload: any): string {
  // Try direct body
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  // Try parts (multipart)
  if (payload.parts) {
    // Prefer text/plain, fall back to text/html
    const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
    const htmlPart = payload.parts.find((p: any) => p.mimeType === "text/html");
    const part = textPart || htmlPart;

    if (part?.body?.data) {
      let text = Buffer.from(part.body.data, "base64url").toString("utf-8");

      // Strip HTML tags if we fell back to HTML
      if (part.mimeType === "text/html") {
        text = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }
      return text;
    }

    // Nested multipart
    for (const p of payload.parts) {
      if (p.parts) {
        const nested = decodeBody(p);
        if (nested) return nested;
      }
    }
  }

  return "(no readable body)";
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

/* ─── Gmail Operations ─── */

export async function listEmails(
  userId: string,
  query?: string,
  maxResults: number = 10
): Promise<{ id: string; threadId: string; snippet: string; from: string; subject: string; date: string; unread: boolean }[]> {
  const client = await getGmailClient(userId);

  const res = await client.users.messages.list({
    userId: "me",
    q: query || "in:inbox",
    maxResults: Math.min(maxResults, 20),
  });

  if (!res.data.messages?.length) return [];

  // Fetch headers for each message (batch)
  const results = await Promise.all(
    res.data.messages.map(async (msg) => {
      const detail = await client.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });

      const headers = detail.data.payload?.headers || [];
      return {
        id: msg.id!,
        threadId: msg.threadId!,
        snippet: detail.data.snippet || "",
        from: getHeader(headers, "From"),
        subject: getHeader(headers, "Subject"),
        date: getHeader(headers, "Date"),
        unread: detail.data.labelIds?.includes("UNREAD") || false,
      };
    })
  );

  return results;
}

export async function getEmail(
  userId: string,
  messageId: string
): Promise<{ id: string; from: string; to: string; subject: string; date: string; body: string; labels: string[] }> {
  const client = await getGmailClient(userId);

  const res = await client.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const headers = res.data.payload?.headers || [];
  return {
    id: res.data.id!,
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    subject: getHeader(headers, "Subject"),
    date: getHeader(headers, "Date"),
    body: decodeBody(res.data.payload).substring(0, 3000), // Cap at 3k chars
    labels: res.data.labelIds || [],
  };
}

export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; threadId: string }> {
  const client = await getGmailClient(userId);

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");

  const encoded = Buffer.from(message).toString("base64url");

  const res = await client.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });

  return { id: res.data.id!, threadId: res.data.threadId! };
}

export async function replyToEmail(
  userId: string,
  messageId: string,
  body: string
): Promise<{ id: string; threadId: string }> {
  const client = await getGmailClient(userId);

  // Get original message for threading
  const original = await client.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
    metadataHeaders: ["From", "Subject", "Message-ID", "References"],
  });

  const headers = original.data.payload?.headers || [];
  const replyTo = getHeader(headers, "From");
  let subject = getHeader(headers, "Subject");
  if (!subject.toLowerCase().startsWith("re:")) subject = `Re: ${subject}`;
  const messageIdHeader = getHeader(headers, "Message-ID");
  const references = getHeader(headers, "References");

  const message = [
    `To: ${replyTo}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${messageIdHeader}`,
    `References: ${references ? references + " " : ""}${messageIdHeader}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");

  const encoded = Buffer.from(message).toString("base64url");

  const res = await client.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encoded,
      threadId: original.data.threadId!,
    },
  });

  return { id: res.data.id!, threadId: res.data.threadId! };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const client = await getGmailClient(userId);

  const res = await client.users.messages.list({
    userId: "me",
    q: "is:unread in:inbox",
    maxResults: 1,
  });

  return res.data.resultSizeEstimate || 0;
}

export async function archiveEmail(userId: string, messageId: string): Promise<void> {
  const client = await getGmailClient(userId);
  await client.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["INBOX"] },
  });
}

export async function trashEmail(userId: string, messageId: string): Promise<void> {
  const client = await getGmailClient(userId);
  await client.users.messages.trash({
    userId: "me",
    id: messageId,
  });
}
