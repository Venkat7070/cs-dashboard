import {
  AccountRaw,
  BlockerType,
  ChampionStatus,
  ExpansionStage,
  Health,
  RenewalStatus,
  Tier,
} from "./types";
import { FieldKey, mapHeaders } from "./headerMap";
import { parseDate, parseEnum, parseNumber, parseYesNo } from "./parse";

const TIERS: readonly Tier[] = ["Enterprise", "Platinum", "Gold", "Silver"];
const RENEWAL_STATUSES: readonly RenewalStatus[] = [
  "Committed",
  "Likely",
  "In Negotiation",
  "At Risk",
  "Churned",
];
const CHAMPION_STATUSES: readonly ChampionStatus[] = ["Active", "At Risk", "Departed"];
const BLOCKER_TYPES: readonly BlockerType[] = [
  "None",
  "Customer IT",
  "Integration",
  "Scope",
  "Budget",
  "Adoption",
  "Competitive",
  "Product Gap",
];
const EXPANSION_STAGES: readonly ExpansionStage[] = [
  "None",
  "Identified",
  "Qualified",
  "Proposed",
];

/** Accepts G/A/R single-letter RAG codes as well as full Green/Amber/Red names. */
function parseManualHealth(raw: string): Health | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value === "g" || value === "green") return "Green";
  if (value === "a" || value === "amber") return "Amber";
  if (value === "r" || value === "red") return "Red";
  return null;
}

/**
 * Tier comes either from a literal tier name column, or from a P+V ARR Band
 * string like "5. >$100K" (bands 4-5 -> Enterprise, 3 -> Platinum, 2 -> Gold,
 * 1/blank -> Silver).
 */
function parseTier(raw: string): Tier {
  const value = raw.trim();
  const literal = TIERS.find((t) => t.toLowerCase() === value.toLowerCase());
  if (literal) return literal;
  if (/^[45]\./.test(value)) return "Enterprise";
  if (/^3\./.test(value)) return "Platinum";
  if (/^2\./.test(value)) return "Gold";
  return "Silver";
}

export interface MapRowsResult {
  rows: AccountRaw[];
  skippedCount: number;
  skippedReasons: string[];
}

/**
 * Maps a raw sheet header row + data rows into AccountRaw records.
 * Rows missing both accountId and accountName are skipped (counted, not thrown).
 */
export function mapRows(headerRow: string[], dataRows: string[][]): MapRowsResult {
  const fieldIndex = mapHeaders(headerRow);
  const rows: AccountRaw[] = [];
  const skippedReasons: string[] = [];

  dataRows.forEach((row, i) => {
    const rowIndex = i + 2; // header occupies row 1
    const isBlank = row.every((cell) => !String(cell ?? "").trim());
    if (isBlank) return; // silently skip fully blank rows, not a diagnostic

    const get = (field: FieldKey): string => {
      const idx = fieldIndex[field];
      if (idx === undefined) return "";
      return (row[idx] ?? "").toString().trim();
    };

    const accountName = get("accountName");
    const accountId = get("accountId") || accountName;

    if (!accountId && !accountName) {
      skippedReasons.push(`Row ${rowIndex}: missing account name/id`);
      return;
    }

    const paymentStatus = get("paymentStatus");

    rows.push({
      accountId,
      accountName: accountName || accountId,
      region: get("region"),
      industry: get("industry"),
      tier: parseTier(get("tier")),
      aoOwner: get("aoOwner"),
      fdePod: get("fdePod"),
      arr: parseNumber(get("arr")),
      totalArr: parseNumber(get("totalArr")),
      contractStart: parseDate(get("contractStart")),
      renewalDate: parseDate(get("renewalDate")),
      lastEbrDate: parseDate(get("lastEbrDate")),
      actionDueDate: parseDate(get("actionDueDate")),
      renewalStatus: parseEnum(get("renewalStatus"), RENEWAL_STATUSES, "Likely"),
      paymentStatus,
      paymentLate: /late/i.test(paymentStatus),
      committedConversations: parseNumber(get("committedConversations")),
      consumedConversations: parseNumber(get("consumedConversations")),
      containmentPct: parseNumber(get("containmentPct")),
      botCsat: parseNumber(get("botCsat")),
      liveUseCases: parseNumber(get("liveUseCases")),
      contractedUseCases: parseNumber(get("contractedUseCases")),
      channelsLive: parseNumber(get("channelsLive")),
      primaryUseCase: get("primaryUseCase"),
      championStatus: parseEnum(get("championStatus"), CHAMPION_STATUSES, "Active"),
      execSponsorEngaged: parseYesNo(get("execSponsorEngaged")),
      keyStakeholders: get("keyStakeholders"),
      healthReason: get("healthReason"),
      internalBlockers: get("internalBlockers"),
      externalBlockers: get("externalBlockers"),
      nextAction: get("nextAction"),
      actionOwner: get("actionOwner"),
      blockerType: parseEnum(get("blockerType"), BLOCKER_TYPES, "None"),
      manualHealth: parseManualHealth(get("health")),
      expansionStage: parseEnum(get("expansionStage"), EXPANSION_STAGES, "None"),
      expansionValue: parseNumber(get("expansionValue")),
      churned: parseYesNo(get("churned")),
      rowIndex,
    });
  });

  return { rows, skippedCount: skippedReasons.length, skippedReasons };
}
