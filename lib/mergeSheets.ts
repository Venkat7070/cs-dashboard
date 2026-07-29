import { FieldKey, mapHeaders, normalizeHeader } from "./headerMap";
import { SheetTable } from "./sheets";

/** Every FieldKey's own normalized form is already a registered alias in headerMap.ts,
 *  so this list can be fed back through mapHeaders() as a normal header row. */
const CANONICAL_HEADER: FieldKey[] = [
  "accountId",
  "accountName",
  "region",
  "industry",
  "tier",
  "aoOwner",
  "fdePod",
  "arr",
  "totalArr",
  "contractStart",
  "renewalDate",
  "lastEbrDate",
  "actionDueDate",
  "renewalStatus",
  "paymentStatus",
  "committedConversations",
  "consumedConversations",
  "containmentPct",
  "botCsat",
  "liveUseCases",
  "contractedUseCases",
  "channelsLive",
  "primaryUseCase",
  "championStatus",
  "execSponsorEngaged",
  "keyStakeholders",
  "healthReason",
  "internalBlockers",
  "externalBlockers",
  "nextAction",
  "actionOwner",
  "blockerType",
  "relationshipHealth",
  "deliveryHealth",
  "expansionStage",
  "expansionValue",
  "churned",
];

/**
 * Keyed by Account Name, not Account ID — different sheets in the same CS workflow
 * often don't share an ID column (e.g. an account-brief doc keyed only by name), so
 * name is the one field reliably common across sources. Falls back to Account ID
 * only when a sheet has no Account Name column at all.
 */
function rowKey(fieldIndex: Partial<Record<FieldKey, number>>, row: string[]): string | null {
  const name = fieldIndex.accountName !== undefined ? (row[fieldIndex.accountName] ?? "").toString().trim() : "";
  const id = fieldIndex.accountId !== undefined ? (row[fieldIndex.accountId] ?? "").toString().trim() : "";
  const key = name || id;
  return key ? normalizeHeader(key) : null;
}

/**
 * Merges two sheet tables keyed by Account Name (see rowKey) into one table with the
 * canonical field set as its header. Rows appear in `primary`'s original order first
 * (so AccountRaw.rowIndex still lines up with primary's sheet rows for the "Open in
 * Sheet" deep link), with accounts only present in `secondary` appended after. Where
 * both sheets set the same field for the same account, `primary` wins.
 */
export function mergeSheetTables(primary: SheetTable, secondary: SheetTable): SheetTable {
  const primaryFields = mapHeaders(primary.header);
  const secondaryFields = mapHeaders(secondary.header);

  const merged = new Map<string, Partial<Record<FieldKey, string>>>();
  const order: string[] = [];

  function ingest(table: SheetTable, fieldIndex: Partial<Record<FieldKey, number>>, overwrite: boolean) {
    for (const row of table.rows) {
      const key = rowKey(fieldIndex, row);
      if (!key) continue;

      let record = merged.get(key);
      if (!record) {
        record = {};
        merged.set(key, record);
        order.push(key);
      }

      for (const [field, idx] of Object.entries(fieldIndex) as [FieldKey, number][]) {
        const value = (row[idx] ?? "").toString().trim();
        if (!value) continue;
        if (overwrite || !record[field]) {
          record[field] = value;
        }
      }
    }
  }

  ingest(primary, primaryFields, true);
  ingest(secondary, secondaryFields, false);

  const rows = order.map((key) => {
    const record = merged.get(key)!;
    return CANONICAL_HEADER.map((field) => record[field] ?? "");
  });

  return { header: CANONICAL_HEADER, rows };
}
