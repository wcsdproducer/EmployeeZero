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

/* ─── Operations ─── */

export async function listFiles(
  userId: string,
  searchQuery?: string,
  maxResults = 10
): Promise<any[]> {
  const driveClient = await getAuthenticatedDrive(userId);
  const q = searchQuery
    ? `name contains '${searchQuery.replace(/'/g, "\\'")}' and trashed = false`
    : "trashed = false";

  const res = await driveClient.files.list({
    q,
    pageSize: maxResults,
    fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, parents)",
    orderBy: "modifiedTime desc",
  });

  return (res.data.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    type: f.mimeType,
    size: f.size ? `${Math.round(Number(f.size) / 1024)} KB` : "unknown",
    modified: f.modifiedTime,
    link: f.webViewLink,
  }));
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
    type: res.data.mimeType,
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
