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

/* ─── Helpers ─── */

/** Extract spreadsheet ID from a full URL or return as-is if already an ID */
function extractSpreadsheetId(input: string): string {
  // Handle full URLs like https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // Already an ID
  return input.trim();
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
  spreadsheetIdOrUrl: string,
  range?: string
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

  // If no range provided, get the first sheet name and read all data
  if (!range) {
    try {
      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "sheets.properties.title",
      });
      const firstSheet = meta.data.sheets?.[0]?.properties?.title || "Sheet1";
      range = firstSheet;
    } catch {
      range = "Sheet1";
    }
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return {
    spreadsheetId,
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

/** Get spreadsheet metadata — title, all tab names, their IDs and row/col counts */
export async function getSpreadsheetInfo(
  userId: string,
  spreadsheetIdOrUrl: string
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "spreadsheetId,properties.title,spreadsheetUrl,sheets.properties",
  });

  return {
    id: res.data.spreadsheetId,
    title: res.data.properties?.title,
    link: res.data.spreadsheetUrl,
    sheets: (res.data.sheets || []).map((s) => ({
      id: s.properties?.sheetId,
      title: s.properties?.title,
      index: s.properties?.index,
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

/** Add a new tab (sheet) to an existing spreadsheet */
export async function addSheet(
  userId: string,
  spreadsheetIdOrUrl: string,
  sheetTitle: string,
  index?: number
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

  const addSheetRequest: any = {
    properties: { title: sheetTitle },
  };
  if (index !== undefined) addSheetRequest.properties.index = index;

  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: addSheetRequest }],
    },
  });

  const newSheet = res.data.replies?.[0]?.addSheet?.properties;
  return {
    spreadsheetId,
    sheetId: newSheet?.sheetId,
    title: newSheet?.title,
    index: newSheet?.index,
    message: `Tab "${sheetTitle}" added successfully.`,
  };
}

/** Delete a tab (sheet) from a spreadsheet by tab name */
export async function deleteSheet(
  userId: string,
  spreadsheetIdOrUrl: string,
  sheetTitle: string
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

  // First get the sheetId from the tab title
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const tab = (meta.data.sheets || []).find(
    (s) => s.properties?.title?.toLowerCase() === sheetTitle.toLowerCase()
  );
  if (!tab?.properties?.sheetId === undefined) {
    throw new Error(`Tab "${sheetTitle}" not found in this spreadsheet.`);
  }
  const sheetId = tab!.properties!.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ deleteSheet: { sheetId } }],
    },
  });

  return {
    spreadsheetId,
    message: `Tab "${sheetTitle}" deleted successfully.`,
  };
}

/** Rename an existing tab in a spreadsheet */
export async function renameSheet(
  userId: string,
  spreadsheetIdOrUrl: string,
  currentTitle: string,
  newTitle: string
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

  // Resolve sheetId from current title
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const tab = (meta.data.sheets || []).find(
    (s) => s.properties?.title?.toLowerCase() === currentTitle.toLowerCase()
  );
  if (!tab?.properties?.sheetId === undefined) {
    throw new Error(`Tab "${currentTitle}" not found in this spreadsheet.`);
  }
  const sheetId = tab!.properties!.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId, title: newTitle },
            fields: "title",
          },
        },
      ],
    },
  });

  return {
    spreadsheetId,
    message: `Tab renamed from "${currentTitle}" to "${newTitle}" successfully.`,
  };
}

/** Clear all values from a sheet tab without deleting the tab itself */
export async function clearSheet(
  userId: string,
  spreadsheetIdOrUrl: string,
  sheetTitle: string
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

  const res = await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: sheetTitle,
  });

  return {
    spreadsheetId,
    clearedRange: res.data.clearedRange,
    message: `All data in tab "${sheetTitle}" cleared successfully.`,
  };
}

/** Duplicate an existing tab within the same spreadsheet */
export async function duplicateSheet(
  userId: string,
  spreadsheetIdOrUrl: string,
  sourceTitle: string,
  newTitle: string,
  insertIndex?: number
): Promise<any> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);

  // Resolve sheetId from title
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const tab = (meta.data.sheets || []).find(
    (s) => s.properties?.title?.toLowerCase() === sourceTitle.toLowerCase()
  );
  if (!tab?.properties?.sheetId === undefined) {
    throw new Error(`Tab "${sourceTitle}" not found in this spreadsheet.`);
  }
  const sheetId = tab!.properties!.sheetId;
  const tabCount = meta.data.sheets?.length || 1;

  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          duplicateSheet: {
            sourceSheetId: sheetId,
            insertSheetIndex: insertIndex ?? tabCount,
            newSheetName: newTitle,
          },
        },
      ],
    },
  });

  const newSheet = res.data.replies?.[0]?.duplicateSheet?.properties;
  return {
    spreadsheetId,
    sheetId: newSheet?.sheetId,
    title: newSheet?.title,
    message: `Tab "${sourceTitle}" duplicated as "${newTitle}" successfully.`,
  };
}

