import { google, docs_v1 } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Auth helper ─── */

async function getAuthenticatedDocs(userId: string): Promise<docs_v1.Docs> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured on server");

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Google Docs first");
  const data = snap.data() as Record<string, any>;
  const docs = data?.docs;
  if (!docs?.connected || !docs?.refreshToken) {
    throw new Error("Google Docs is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: docs.accessToken,
    refresh_token: docs.refreshToken,
    expiry_date: docs.expiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["docs.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["docs.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["docs.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[Docs] Failed to persist refreshed tokens:", err);
    }
  });

  return google.docs({ version: "v1", auth: oauth2Client });
}

/* ─── Operations ─── */

export async function createDocument(userId: string, title: string) {
  const docs = await getAuthenticatedDocs(userId);
  const res = await docs.documents.create({ requestBody: { title } });
  return {
    documentId: res.data.documentId,
    title: res.data.title,
    url: `https://docs.google.com/document/d/${res.data.documentId}/edit`,
  };
}

export async function getDocument(userId: string, documentId: string) {
  const docs = await getAuthenticatedDocs(userId);
  const res = await docs.documents.get({ documentId });
  const body = res.data.body;
  let text = "";
  if (body?.content) {
    for (const element of body.content) {
      if (element.paragraph?.elements) {
        for (const el of element.paragraph.elements) {
          if (el.textRun?.content) text += el.textRun.content;
        }
      }
    }
  }
  return {
    documentId: res.data.documentId,
    title: res.data.title,
    text: text.slice(0, 5000), // Cap to avoid token overflow
    url: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

export async function appendText(userId: string, documentId: string, text: string) {
  const docs = await getAuthenticatedDocs(userId);
  // Get current document length
  const doc = await docs.documents.get({ documentId });
  const endIndex = doc.data.body?.content?.reduce((max, el) => {
    return Math.max(max, el.endIndex || 0);
  }, 1) || 1;

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: endIndex - 1 },
            text,
          },
        },
      ],
    },
  });
  return { success: true, documentId, action: "text_appended" };
}
