import { Account } from "./types";
import { SortColumn } from "./sort";
import { formatCurrency, formatDate } from "./format";

export interface ColumnValue {
  key: string;
  label: string;
  sortKey: number | string;
}

/** column -> set of allowed value keys; an absent/empty set means "no filter, show all" for that column. */
export type ColumnFilterState = Partial<Record<SortColumn, Set<string>>>;

const EXTRACTORS: Record<SortColumn, (a: Account) => ColumnValue> = {
  accountName: (a) => ({ key: a.accountName, label: a.accountName, sortKey: a.accountName }),
  tier: (a) => ({ key: a.tier, label: a.tier, sortKey: a.tier }),
  aoOwner: (a) => {
    const v = a.aoOwner || "—";
    return { key: v, label: v, sortKey: v };
  },
  arr: (a) => ({ key: String(a.arr), label: formatCurrency(a.arr), sortKey: a.arr }),
  health: (a) => ({ key: a.computedHealth, label: a.computedHealth, sortKey: a.computedHealth }),
  containmentPct: (a) => {
    const v = Math.round(a.containmentPct);
    return { key: String(v), label: `${v}%`, sortKey: v };
  },
  consumptionPct: (a) => {
    const v = Math.round(a.consumptionPct);
    return { key: String(v), label: `${v}%`, sortKey: v };
  },
  botCsat: (a) => {
    const v = Math.round(a.botCsat);
    return { key: String(v), label: String(v), sortKey: v };
  },
  renewalDate: (a) => {
    const v = a.renewalDate ?? "—";
    return { key: v, label: formatDate(a.renewalDate), sortKey: v };
  },
  renewalStatus: (a) => ({ key: a.renewalStatus, label: a.renewalStatus, sortKey: a.renewalStatus }),
  expansionValue: (a) => {
    if (a.expansionValue <= 0) return { key: "—", label: "—", sortKey: -1 };
    return { key: String(a.expansionValue), label: formatCurrency(a.expansionValue), sortKey: a.expansionValue };
  },
};

export interface ColumnFilterOption {
  key: string;
  label: string;
  count: number;
}

export function getDistinctColumnValues(accounts: Account[], column: SortColumn): ColumnFilterOption[] {
  const extractor = EXTRACTORS[column];
  const map = new Map<string, { label: string; count: number; sortKey: number | string }>();
  for (const a of accounts) {
    const { key, label, sortKey } = extractor(a);
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else map.set(key, { label, count: 1, sortKey });
  }
  return [...map.entries()]
    .sort(([, x], [, y]) => {
      if (typeof x.sortKey === "number" && typeof y.sortKey === "number") return x.sortKey - y.sortKey;
      return String(x.sortKey).localeCompare(String(y.sortKey));
    })
    .map(([key, v]) => ({ key, label: v.label, count: v.count }));
}

export function applyColumnFilters(accounts: Account[], filters: ColumnFilterState): Account[] {
  const activeCols = (Object.keys(filters) as SortColumn[]).filter((c) => (filters[c]?.size ?? 0) > 0);
  if (activeCols.length === 0) return accounts;
  return accounts.filter((a) => activeCols.every((c) => filters[c]!.has(EXTRACTORS[c](a).key)));
}

export function isColumnFilterActive(filters: ColumnFilterState): boolean {
  return Object.values(filters).some((s) => (s?.size ?? 0) > 0);
}

export function activeColumnFilterCount(filters: ColumnFilterState): number {
  return Object.values(filters).filter((s) => (s?.size ?? 0) > 0).length;
}
