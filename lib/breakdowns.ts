import { Account, Health, Tier } from "./types";
import { HEALTH_HEX } from "./format";

export interface BreakdownRow {
  label: string;
  value: number;
  color?: string;
}

function sumBy(accounts: Account[], amount: (a: Account) => number, key: (a: Account) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of accounts) {
    const k = key(a) || "Unknown";
    map.set(k, (map.get(k) ?? 0) + amount(a));
  }
  return map;
}

function sortedRows(map: Map<string, number>): BreakdownRow[] {
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function totalArrByRegion(accounts: Account[]): BreakdownRow[] {
  return sortedRows(sumBy(accounts, (a) => a.totalArr, (a) => a.region));
}

export function totalArrByOwner(accounts: Account[]): BreakdownRow[] {
  return sortedRows(sumBy(accounts, (a) => a.totalArr, (a) => a.aoOwner));
}

const HEALTH_ORDER: readonly Health[] = ["Green", "Amber", "Red"];

export function totalArrByHealth(accounts: Account[]): BreakdownRow[] {
  const map = sumBy(accounts, (a) => a.totalArr, (a) => a.computedHealth);
  return HEALTH_ORDER.map((h) => ({ label: h, value: map.get(h) ?? 0, color: HEALTH_HEX[h] }));
}

const TIER_ORDER: readonly Tier[] = ["Enterprise", "Platinum", "Gold", "Silver"];

export function totalArrByTier(accounts: Account[]): BreakdownRow[] {
  const map = sumBy(accounts, (a) => a.totalArr, (a) => a.tier);
  return TIER_ORDER.map((t) => ({ label: t, value: map.get(t) ?? 0 }));
}

export function totalArrByChurn(accounts: Account[]): BreakdownRow[] {
  let churned = 0;
  let active = 0;
  for (const a of accounts) {
    if (a.churned) churned += a.totalArr;
    else active += a.totalArr;
  }
  return [
    { label: "Active", value: active, color: HEALTH_HEX.Green },
    { label: "Churned", value: churned, color: HEALTH_HEX.Red },
  ];
}
