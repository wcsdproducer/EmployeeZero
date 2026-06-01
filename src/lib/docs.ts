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

  // Proactively refresh token if expired or about to expire (within 5 min)
  const now = Date.now();
  if (!docs.expiryDate || docs.expiryDate < now + 5 * 60_000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
    } catch (err) {
      console.warn("[Docs] Token refresh failed, proceeding with existing token:", err);
    }
  }

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

export async function prependText(userId: string, documentId: string, text: string) {
  const docs = await getAuthenticatedDocs(userId);
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 }, // Index 1 is the start of the document body
            text,
          },
        },
      ],
    },
  });
  return { success: true, documentId, action: "text_prepended" };
}

export async function insertTextAt(userId: string, documentId: string, text: string, index: number) {
  const docs = await getAuthenticatedDocs(userId);
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: Math.max(1, index) },
            text,
          },
        },
      ],
    },
  });
  return { success: true, documentId, action: "text_inserted", atIndex: index };
}

export async function replaceText(userId: string, documentId: string, findText: string, replaceWith: string) {
  const docs = await getAuthenticatedDocs(userId);
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          replaceAllText: {
            containsText: {
              text: findText,
              matchCase: true,
            },
            replaceText: replaceWith,
          },
        },
      ],
    },
  });
  return { success: true, documentId, action: "text_replaced", found: findText, replacedWith: replaceWith };
}

export async function deleteText(userId: string, documentId: string, findText: string) {
  // Replace the target text with an empty string to delete it
  return await replaceText(userId, documentId, findText, "");
}

export async function clearDocument(userId: string, documentId: string) {
  const docs = await getAuthenticatedDocs(userId);
  const doc = await docs.documents.get({ documentId });
  const endIndex = doc.data.body?.content?.reduce((max, el) => {
    return Math.max(max, el.endIndex || 0);
  }, 1) || 1;

  if (endIndex <= 2) return { success: true, documentId, action: "already_empty" };

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          deleteContentRange: {
            range: { startIndex: 1, endIndex: endIndex - 1 },
          },
        },
      ],
    },
  });
  return { success: true, documentId, action: "document_cleared" };
}

export async function updateDocTitle(userId: string, documentId: string, newTitle: string) {
  // Google Docs API doesn't have a direct title update — use Drive API
  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found");
  const data = snap.data() as Record<string, any>;
  const docsConn = data?.docs;
  if (!docsConn?.connected || !docsConn?.refreshToken) {
    throw new Error("Google Docs is not connected.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: docsConn.accessToken,
    refresh_token: docsConn.refreshToken,
    expiry_date: docsConn.expiryDate,
  });

  const drive = google.drive({ version: "v3", auth: oauth2Client });
  await drive.files.update({
    fileId: documentId,
    requestBody: { name: newTitle },
  });
  return { success: true, documentId, action: "title_updated", newTitle };
}

export async function writeDocument(userId: string, documentId: string, content: string) {
  // Clear document and write fresh content — useful for complete rewrites
  await clearDocument(userId, documentId);
  const docs = await getAuthenticatedDocs(userId);
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    },
  });
  return { success: true, documentId, action: "document_written" };
}
