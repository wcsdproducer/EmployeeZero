import { google, drive_v3 } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Auth helper (same pattern as gmail.ts) ─── */

export async function getAuthenticatedDrive(userId: string): Promise<drive_v3.Drive> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured on server");
  }

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Google Drive first");

  const data = snap.data() as Record<string, any>;
  const drive = data?.drive;

  if (!drive?.connected || !drive?.refreshToken) {
    throw new Error("Google Drive is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: drive.accessToken,
    refresh_token: drive.refreshToken,
    expiry_date: drive.expiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["drive.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["drive.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["drive.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[Drive] Failed to persist refreshed tokens:", err);
    }
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

/* ─── Helpers ─── */

function readableMimeType(mime: string | null | undefined): string {
  const map: Record<string, string> = {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.google-apps.folder": "Folder",
    "application/vnd.google-apps.form": "Google Form",
    "application/pdf": "PDF",
    "image/png": "Image (PNG)",
    "image/jpeg": "Image (JPEG)",
    "text/plain": "Text File",
    "text/csv": "CSV File",
    "application/zip": "ZIP Archive",
    "video/mp4": "Video (MP4)",
  };
  return map[mime || ""] || mime?.split("/").pop() || "File";
}

/* ─── Operations ─── */

export async function listFiles(
  userId: string,
  searchQuery?: string,
  maxResults = 10
): Promise<any[]> {
  const driveClient = await getAuthenticatedDrive(userId);

  let q: string;
  if (searchQuery) {
    // Use fullText search first (searches content + name), fall back to name-only
    const escaped = searchQuery.replace(/'/g, "\\'");
    q = `fullText contains '${escaped}' and trashed = false`;
  } else {
    q = "trashed = false";
  }

  try {
    const res = await driveClient.files.list({
      q,
      pageSize: maxResults,
      fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, parents, shared)",
      orderBy: "modifiedTime desc",
    });

    const files = (res.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      type: readableMimeType(f.mimeType),
      size: f.size ? `${Math.round(Number(f.size) / 1024)} KB` : "unknown",
      modified: f.modifiedTime,
      link: f.webViewLink,
      shared: f.shared || false,
    }));

    // If fullText returned results, return them
    if (files.length > 0 || !searchQuery) return files;

    // Fallback: try name-only search with individual keywords
    const keywords = searchQuery.split(/\s+/).filter(w => w.length > 2);
    const nameFilters = keywords.map(k => `name contains '${k.replace(/'/g, "\\'")}'`).join(" or ");
    const fallbackQ = `(${nameFilters}) and trashed = false`;

    const fallbackRes = await driveClient.files.list({
      q: fallbackQ,
      pageSize: maxResults,
      fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, parents, shared)",
      orderBy: "modifiedTime desc",
    });

    return (fallbackRes.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      type: readableMimeType(f.mimeType),
      size: f.size ? `${Math.round(Number(f.size) / 1024)} KB` : "unknown",
      modified: f.modifiedTime,
      link: f.webViewLink,
      shared: f.shared || false,
    }));
  } catch (err: any) {
    // If fullText search isn't supported, fall back to name-only
    console.error("[Drive] Search error, falling back to name search:", err.message);
    const escaped = searchQuery ? searchQuery.replace(/'/g, "\\'") : "";
    const fallbackQ = searchQuery
      ? `name contains '${escaped}' and trashed = false`
      : "trashed = false";

    const res = await driveClient.files.list({
      q: fallbackQ,
      pageSize: maxResults,
      fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, parents)",
      orderBy: "modifiedTime desc",
    });

    return (res.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      type: readableMimeType(f.mimeType),
      size: f.size ? `${Math.round(Number(f.size) / 1024)} KB` : "unknown",
      modified: f.modifiedTime,
      link: f.webViewLink,
    }));
  }
}

export async function getFile(userId: string, fileId: string): Promise<any> {
  const driveClient = await getAuthenticatedDrive(userId);

  const res = await driveClient.files.get({
    fileId,
    fields: "id, name, mimeType, size, modifiedTime, webViewLink, description, parents",
  });

  return {
    id: res.data.id,
    name: res.data.name,
    type: readableMimeType(res.data.mimeType),
    size: res.data.size ? `${Math.round(Number(res.data.size) / 1024)} KB` : "unknown",
    modified: res.data.modifiedTime,
    link: res.data.webViewLink,
    description: res.data.description || "",
  };
}

export async function readFileContent(userId: string, fileId: string): Promise<string> {
  const driveClient = await getAuthenticatedDrive(userId);

  // First get file metadata to check type
  const meta = await driveClient.files.get({ fileId, fields: "mimeType, name" });
  const mimeType = meta.data.mimeType || "";

  // Google Docs/Sheets/Slides — export as plain text
  if (mimeType.startsWith("application/vnd.google-apps.")) {
    let exportMime = "text/plain";
    if (mimeType.includes("spreadsheet")) exportMime = "text/csv";
    if (mimeType.includes("presentation")) exportMime = "text/plain";

    const res = await driveClient.files.export(
      { fileId, mimeType: exportMime },
      { responseType: "text" }
    );
    return String(res.data).slice(0, 10000); // Cap at 10K chars
  }

  // Regular files — download content
  const res = await driveClient.files.get(
    { fileId, alt: "media" },
    { responseType: "text" }
  );
  return String(res.data).slice(0, 10000);
}

export async function uploadFile(
  userId: string,
  name: string,
  content: string,
  mimeType = "text/plain",
  folderId?: string
): Promise<any> {
  const driveClient = await getAuthenticatedDrive(userId);

  const fileMetadata: any = { name };
  if (folderId) fileMetadata.parents = [folderId];

  const media = {
    mimeType,
    body: require("stream").Readable.from([content]),
  };

  const res = await driveClient.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, webViewLink",
  });

  return {
    id: res.data.id,
    name: res.data.name,
    link: res.data.webViewLink,
  };
}

export async function createFolder(userId: string, name: string, parentId?: string): Promise<any> {
  const driveClient = await getAuthenticatedDrive(userId);

  const fileMetadata: any = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) fileMetadata.parents = [parentId];

  const res = await driveClient.files.create({
    requestBody: fileMetadata,
    fields: "id, name, webViewLink",
  });

  return {
    id: res.data.id,
    name: res.data.name,
    link: res.data.webViewLink,
  };
}
