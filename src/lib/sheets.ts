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

/* ─────────────────────────────────────────
   FORMATTING FUNCTIONS
   All use spreadsheets.batchUpdate
   ───────────────────────────────────────── */

/** Internal helper: resolve a tab name → numeric sheetId */
async function resolveSheetId(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string
): Promise<number> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const tab = (meta.data.sheets || []).find(
    (s) => s.properties?.title?.toLowerCase() === tabName.toLowerCase()
  );
  if (!tab?.properties) {
    throw new Error(`Tab "${tabName}" not found. Available tabs: ${(meta.data.sheets || []).map(s => s.properties?.title).join(", ")}`);
  }
  return tab.properties.sheetId!;
}

/**
 * Format a range of cells — bold, italic, underline, font family, font size,
 * foreground color (text), background color.
 *
 * range format: "A1:Z1" or "A1" — relative to the given tab.
 * colors are hex strings like "#FF0000" or named: "red","white","black","yellow","green","blue","gray".
 */
export async function formatCells(
  userId: string,
  spreadsheetIdOrUrl: string,
  tabName: string,
  range: string,                   // e.g. "A1:Z1" or "1:1" (entire row 1)
  options: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    fontSize?: number;             // pt, e.g. 11
    fontFamily?: string;           // e.g. "Arial"
    foregroundColor?: string;      // hex "#RRGGBB" or named color
    backgroundColor?: string;      // hex "#RRGGBB" or named color
    horizontalAlignment?: "LEFT" | "CENTER" | "RIGHT";
    verticalAlignment?: "TOP" | "MIDDLE" | "BOTTOM";
    wrapStrategy?: "OVERFLOW_CELL" | "CLIP" | "WRAP";
    numberFormat?: { type: string; pattern: string }; // e.g. {type:"CURRENCY", pattern:"$#,##0.00"}
  }
): Promise<{ message: string }> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const sheetId = await resolveSheetId(sheets, spreadsheetId, tabName);

  // Parse A1 notation range to GridRange
  const gridRange = a1ToGridRange(range, sheetId);

  // Build CellFormat
  const cellFormat: sheets_v4.Schema$CellFormat = {};
  const fields: string[] = [];

  // Text format
  const textFormat: sheets_v4.Schema$TextFormat = {};
  if (options.bold !== undefined) { textFormat.bold = options.bold; fields.push("userEnteredFormat.textFormat.bold"); }
  if (options.italic !== undefined) { textFormat.italic = options.italic; fields.push("userEnteredFormat.textFormat.italic"); }
  if (options.underline !== undefined) { textFormat.underline = options.underline; fields.push("userEnteredFormat.textFormat.underline"); }
  if (options.strikethrough !== undefined) { textFormat.strikethrough = options.strikethrough; fields.push("userEnteredFormat.textFormat.strikethrough"); }
  if (options.fontSize !== undefined) { textFormat.fontSize = options.fontSize; fields.push("userEnteredFormat.textFormat.fontSize"); }
  if (options.fontFamily !== undefined) { textFormat.fontFamily = options.fontFamily; fields.push("userEnteredFormat.textFormat.fontFamily"); }
  if (options.foregroundColor !== undefined) {
    textFormat.foregroundColorStyle = { rgbColor: hexToRgb(options.foregroundColor) };
    fields.push("userEnteredFormat.textFormat.foregroundColorStyle");
  }
  if (Object.keys(textFormat).length > 0) cellFormat.textFormat = textFormat;

  // Background color
  if (options.backgroundColor !== undefined) {
    cellFormat.backgroundColorStyle = { rgbColor: hexToRgb(options.backgroundColor) };
    fields.push("userEnteredFormat.backgroundColorStyle");
  }

  // Alignment
  if (options.horizontalAlignment !== undefined) {
    cellFormat.horizontalAlignment = options.horizontalAlignment;
    fields.push("userEnteredFormat.horizontalAlignment");
  }
  if (options.verticalAlignment !== undefined) {
    cellFormat.verticalAlignment = options.verticalAlignment;
    fields.push("userEnteredFormat.verticalAlignment");
  }
  if (options.wrapStrategy !== undefined) {
    cellFormat.wrapStrategy = options.wrapStrategy;
    fields.push("userEnteredFormat.wrapStrategy");
  }

  // Number format
  if (options.numberFormat !== undefined) {
    cellFormat.numberFormat = options.numberFormat;
    fields.push("userEnteredFormat.numberFormat");
  }

  if (fields.length === 0) return { message: "No formatting options provided." };

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        repeatCell: {
          range: gridRange,
          cell: { userEnteredFormat: cellFormat },
          fields: fields.join(","),
        },
      }],
    },
  });

  return { message: `Formatted ${range} on "${tabName}" successfully.` };
}

/**
 * Format an entire row by row number (1-indexed).
 * Convenience wrapper around formatCells that targets "1:1" style range.
 */
export async function formatRow(
  userId: string,
  spreadsheetIdOrUrl: string,
  tabName: string,
  rowNumber: number,           // 1-indexed
  options: Parameters<typeof formatCells>[4]
): Promise<{ message: string }> {
  // "1:1" means entire row 1 in Sheets A1 notation
  return formatCells(userId, spreadsheetIdOrUrl, tabName, `${rowNumber}:${rowNumber}`, options);
}

/** Freeze the top N rows of a tab */
export async function freezeRows(
  userId: string,
  spreadsheetIdOrUrl: string,
  tabName: string,
  rowCount: number    // number of rows to freeze (1 = freeze row 1, 0 = unfreeze)
): Promise<{ message: string }> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const sheetId = await resolveSheetId(sheets, spreadsheetId, tabName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: { frozenRowCount: rowCount },
          },
          fields: "gridProperties.frozenRowCount",
        },
      }],
    },
  });

  return { message: rowCount > 0 ? `Froze top ${rowCount} row(s) on "${tabName}".` : `Unfroze rows on "${tabName}".` };
}

/** Freeze the left N columns of a tab */
export async function freezeColumns(
  userId: string,
  spreadsheetIdOrUrl: string,
  tabName: string,
  columnCount: number   // number of columns to freeze (0 = unfreeze)
): Promise<{ message: string }> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const sheetId = await resolveSheetId(sheets, spreadsheetId, tabName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: { frozenColumnCount: columnCount },
          },
          fields: "gridProperties.frozenColumnCount",
        },
      }],
    },
  });

  return { message: columnCount > 0 ? `Froze left ${columnCount} column(s) on "${tabName}".` : `Unfroze columns on "${tabName}".` };
}

/**
 * Set the width of one or more columns.
 * startColumn / endColumn are 0-indexed (A=0, B=1, ...).
 * width is in pixels.
 */
export async function setColumnWidth(
  userId: string,
  spreadsheetIdOrUrl: string,
  tabName: string,
  startColumnIndex: number,   // 0-indexed
  endColumnIndex: number,     // 0-indexed exclusive (so col A only = 0,1)
  pixelSize: number
): Promise<{ message: string }> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const sheetId = await resolveSheetId(sheets, spreadsheetId, tabName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: "COLUMNS",
            startIndex: startColumnIndex,
            endIndex: endColumnIndex,
          },
          properties: { pixelSize },
          fields: "pixelSize",
        },
      }],
    },
  });

  return { message: `Set columns ${startColumnIndex}–${endColumnIndex - 1} width to ${pixelSize}px on "${tabName}".` };
}

/**
 * Set the height of one or more rows.
 * startRow / endRow are 0-indexed.
 */
export async function setRowHeight(
  userId: string,
  spreadsheetIdOrUrl: string,
  tabName: string,
  startRowIndex: number,   // 0-indexed
  endRowIndex: number,     // 0-indexed exclusive
  pixelSize: number
): Promise<{ message: string }> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const sheetId = await resolveSheetId(sheets, spreadsheetId, tabName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: startRowIndex,
            endIndex: endRowIndex,
          },
          properties: { pixelSize },
          fields: "pixelSize",
        },
      }],
    },
  });

  return { message: `Set rows ${startRowIndex}–${endRowIndex - 1} height to ${pixelSize}px on "${tabName}".` };
}

/** Auto-resize columns to fit their content */
export async function autoResizeColumns(
  userId: string,
  spreadsheetIdOrUrl: string,
  tabName: string,
  startColumnIndex: number = 0,
  endColumnIndex: number = 26    // default: columns A–Z
): Promise<{ message: string }> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const sheetId = await resolveSheetId(sheets, spreadsheetId, tabName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: "COLUMNS",
            startIndex: startColumnIndex,
            endIndex: endColumnIndex,
          },
        },
      }],
    },
  });

  return { message: `Auto-resized columns ${startColumnIndex}–${endColumnIndex - 1} on "${tabName}".` };
}

/**
 * Merge cells in a range. mergeType: "MERGE_ALL" | "MERGE_COLUMNS" | "MERGE_ROWS"
 * Use unmerge=true to unmerge instead.
 */
export async function mergeCells(
  userId: string,
  spreadsheetIdOrUrl: string,
  tabName: string,
  range: string,                                          // e.g. "A1:D1"
  mergeType: "MERGE_ALL" | "MERGE_COLUMNS" | "MERGE_ROWS" = "MERGE_ALL",
  unmerge: boolean = false
): Promise<{ message: string }> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const sheetId = await resolveSheetId(sheets, spreadsheetId, tabName);
  const gridRange = a1ToGridRange(range, sheetId);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [unmerge
        ? { unmergeCells: { range: gridRange } }
        : { mergeCells: { range: gridRange, mergeType } }
      ],
    },
  });

  return { message: unmerge ? `Unmerged ${range} on "${tabName}".` : `Merged ${range} on "${tabName}" (${mergeType}).` };
}

/**
 * Add or update a named range for a specific cell range in a tab.
 * Useful for creating structured references that agents and users can refer to by name.
 */
export async function addNamedRange(
  userId: string,
  spreadsheetIdOrUrl: string,
  tabName: string,
  namedRangeName: string,
  range: string
): Promise<{ message: string }> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const sheetId = await resolveSheetId(sheets, spreadsheetId, tabName);
  const gridRange = a1ToGridRange(range, sheetId);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        addNamedRange: {
          namedRange: {
            name: namedRangeName,
            range: gridRange,
          },
        },
      }],
    },
  });

  return { message: `Named range "${namedRangeName}" added for ${range} on "${tabName}".` };
}

/**
 * Sort a range of rows by one or more columns.
 * sortSpecs: array of { dimensionIndex (0-based col index), sortOrder: "ASCENDING"|"DESCENDING" }
 */
export async function sortRange(
  userId: string,
  spreadsheetIdOrUrl: string,
  tabName: string,
  range: string,
  sortSpecs: { dimensionIndex: number; sortOrder: "ASCENDING" | "DESCENDING" }[]
): Promise<{ message: string }> {
  const { sheets } = await getAuthenticatedSheets(userId);
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const sheetId = await resolveSheetId(sheets, spreadsheetId, tabName);
  const gridRange = a1ToGridRange(range, sheetId);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        sortRange: {
          range: gridRange,
          sortSpecs,
        },
      }],
    },
  });

  return { message: `Sorted ${range} on "${tabName}" by ${sortSpecs.map(s => `col ${s.dimensionIndex} ${s.sortOrder}`).join(", ")}.` };
}

/* ─── Helpers ─── */

/** Convert A1 notation range to GridRange object */
function a1ToGridRange(range: string, sheetId: number): sheets_v4.Schema$GridRange {
  // Handle whole-row notation like "1:3" (rows 1 to 3)
  const rowOnlyMatch = range.match(/^(\d+):(\d+)$/);
  if (rowOnlyMatch) {
    return {
      sheetId,
      startRowIndex: parseInt(rowOnlyMatch[1]) - 1,
      endRowIndex: parseInt(rowOnlyMatch[2]),
    };
  }

  // Handle whole-column notation like "A:C"
  const colOnlyMatch = range.match(/^([A-Za-z]+):([A-Za-z]+)$/);
  if (colOnlyMatch) {
    return {
      sheetId,
      startColumnIndex: colLetterToIndex(colOnlyMatch[1]),
      endColumnIndex: colLetterToIndex(colOnlyMatch[2]) + 1,
    };
  }

  // Handle standard A1:Z100 notation
  const parts = range.toUpperCase().split(":");
  const start = parseA1Cell(parts[0]);
  const end = parts[1] ? parseA1Cell(parts[1]) : start;

  return {
    sheetId,
    startRowIndex: start.row,
    endRowIndex: end.row + 1,
    startColumnIndex: start.col,
    endColumnIndex: end.col + 1,
  };
}

function parseA1Cell(cell: string): { row: number; col: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid cell reference: ${cell}`);
  return {
    col: colLetterToIndex(match[1]),
    row: parseInt(match[2]) - 1,
  };
}

function colLetterToIndex(letters: string): number {
  return letters.toUpperCase().split("").reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1;
}

const NAMED_COLORS: Record<string, { red: number; green: number; blue: number }> = {
  white: { red: 1, green: 1, blue: 1 },
  black: { red: 0, green: 0, blue: 0 },
  red: { red: 1, green: 0, blue: 0 },
  green: { red: 0, green: 0.502, blue: 0 },
  blue: { red: 0, green: 0, blue: 1 },
  yellow: { red: 1, green: 1, blue: 0 },
  orange: { red: 1, green: 0.647, blue: 0 },
  gray: { red: 0.502, green: 0.502, blue: 0.502 },
  lightgray: { red: 0.827, green: 0.827, blue: 0.827 },
  purple: { red: 0.502, green: 0, blue: 0.502 },
  pink: { red: 1, green: 0.753, blue: 0.796 },
  cyan: { red: 0, green: 1, blue: 1 },
  navy: { red: 0, green: 0, blue: 0.502 },
  darkblue: { red: 0, green: 0, blue: 0.545 },
  darkgreen: { red: 0, green: 0.392, blue: 0 },
  gold: { red: 1, green: 0.843, blue: 0 },
};

/** Convert hex "#RRGGBB" or named color to Sheets RGB object (0-1 scale) */
function hexToRgb(color: string): sheets_v4.Schema$Color {
  const named = NAMED_COLORS[color.toLowerCase()];
  if (named) return named;

  const hex = color.replace("#", "");
  if (hex.length === 6) {
    return {
      red: parseInt(hex.slice(0, 2), 16) / 255,
      green: parseInt(hex.slice(2, 4), 16) / 255,
      blue: parseInt(hex.slice(4, 6), 16) / 255,
    };
  }
  // fallback to black
  return { red: 0, green: 0, blue: 0 };
}
