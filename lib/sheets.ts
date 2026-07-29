import { google } from "googleapis";

export interface SheetTable {
  header: string[];
  rows: string[][];
}

export interface SheetRef {
  sheetId: string;
  tab: string;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error("Missing Google Sheets credentials: set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.");
  }

  return new google.auth.JWT({
    email,
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

/** Reads one tab of one spreadsheet. The sheet must be shared with GOOGLE_SERVICE_ACCOUNT_EMAIL as Viewer. */
export async function fetchTable({ sheetId, tab }: SheetRef): Promise<SheetTable> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: tab,
  });

  const values = res.data.values ?? [];
  const [header, ...rows] = values;
  return {
    header: (header ?? []).map((c) => String(c ?? "")),
    rows: rows.map((row) => row.map((c) => String(c ?? ""))),
  };
}

export function primarySheetRef(): SheetRef {
  const sheetId = process.env.SHEET_ID;
  if (!sheetId) throw new Error("Missing Google Sheets credentials: set SHEET_ID.");
  return { sheetId, tab: process.env.SHEET_TAB || "Data" };
}

/** The secondary sheet is optional — set SHEET2_ID to enable merging a second source by account key. */
export function secondarySheetRef(): SheetRef | null {
  const sheetId = process.env.SHEET2_ID;
  if (!sheetId) return null;
  return { sheetId, tab: process.env.SHEET2_TAB || "Data" };
}

export async function fetchSheetRows(): Promise<SheetTable> {
  return fetchTable(primarySheetRef());
}

export async function fetchSecondarySheetRows(): Promise<SheetTable | null> {
  const ref = secondarySheetRef();
  return ref ? fetchTable(ref) : null;
}
