import { google, sheets_v4 } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Auth helper ─── */

export async function getAuthenticatedSheets(userId: string): Promise<{ sheets: sheets_v4.Sheets; drive: any }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured on server");
  }

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Google Sheets first");

  const data = snap.data() as Record<string, any>;
  const sheetsConn = data?.sheets;

  if (!sheetsConn?.connected || !sheetsConn?.refreshToken) {
    throw new Error("Google Sheets is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: sheetsConn.accessToken,
    refresh_token: sheetsConn.refreshToken,
    expiry_date: sheetsConn.expiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["sheets.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["sheets.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["sheets.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[Sheets] Failed to persist refreshed tokens:", err);
    }
  });

  return {
    sheets: google.sheets({ version: "v4", auth: oauth2Client }),
    drive: google.drive({ version: "v3", auth: oauth2Client }),
  };
}

/* ─── Operations ─── */

export async function listSpreadsheets(userId: string, maxResults = 10): Promise<any[]> {
  const { drive } = await getAuthenticatedSheets(userId);

  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed = false",
    pageSize: maxResults,
    fields: "files(id, name, modifiedTime, webViewLink)",
    orderBy: "modifiedTime desc",
  });

  return (res.data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modified: f.modifiedTime,
    link: f.webViewLink,
  }));
}

export async function readSheet(
  userId: string,
  spreadsheetId: string,
  range: string
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return {
    range: res.data.range,
    values: res.data.values || [],
    rowCount: (res.data.values || []).length,
  };
}

export async function writeSheet(
  userId: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);

  const res = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  return {
    updatedRange: res.data.updatedRange,
    updatedRows: res.data.updatedRows,
    updatedCells: res.data.updatedCells,
  };
}

export async function appendRows(
  userId: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  return {
    updatedRange: res.data.updates?.updatedRange,
    updatedRows: res.data.updates?.updatedRows,
    updatedCells: res.data.updates?.updatedCells,
  };
}

export async function createSpreadsheet(
  userId: string,
  title: string,
  sheetNames?: string[]
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);

  const sheetsConfig = (sheetNames || ["Sheet1"]).map((name) => ({
    properties: { title: name },
  }));

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: sheetsConfig,
    },
  });

  return {
    id: res.data.spreadsheetId,
    title: res.data.properties?.title,
    link: res.data.spreadsheetUrl,
    sheets: (res.data.sheets || []).map((s) => s.properties?.title),
  };
}
