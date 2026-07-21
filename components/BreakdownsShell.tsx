"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AccountsResponse } from "@/lib/types";
import { totalArrByChurn, totalArrByHealth, totalArrByOwner, totalArrByRegion, totalArrByTier } from "@/lib/breakdowns";
import { DEFAULT_FILTERS, FilterState, filterAccounts, filtersFromSearchParams, filtersToSearchParams, uniqueSorted } from "@/lib/filters";
import ArrBreakdownChart from "./ArrBreakdownChart";
import ArrBreakdownPieChart from "./ArrBreakdownPieChart";
import FilterBar from "./FilterBar";
import StaleBanner from "./StaleBanner";
import EmptyState from "./EmptyState";

export default function BreakdownsShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  const setFilters = useCallback(
    (next: FilterState) => {
      const params = filtersToSearchParams(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const load = useCallback(async (fresh: boolean) => {
    if (fresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts${fresh ? "?fresh=1" : ""}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setData(json as AccountsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const accounts = useMemo(() => data?.accounts ?? [], [data]);
  const filtered = useMemo(() => filterAccounts(accounts, filters), [accounts, filters]);

  const regionOptions = useMemo(() => uniqueSorted(accounts.map((a) => a.region)), [accounts]);
  const aoOwnerOptions = useMemo(() => uniqueSorted(accounts.map((a) => a.aoOwner)), [accounts]);
  const fdePodOptions = useMemo(() => uniqueSorted(accounts.map((a) => a.fdePod)), [accounts]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-text">ARR Breakdowns</h1>
          <p className="text-sm text-text/50">Total ARR sliced by region, health, owner, tier, and churn</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="rounded-md border border-border bg-panel px-3 py-1.5 text-sm text-text hover:border-accent/60 disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {data?.stale && (
        <div className="mb-4">
          <StaleBanner reason={data.staleReason} fetchedAt={data.fetchedAt} />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-health-red/40 bg-health-red/10 px-3 py-2 text-sm text-health-red">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-text/50">Loading accounts…</div>
      ) : accounts.length === 0 ? (
        <EmptyState sheetTab={data?.sheetTab} />
      ) : (
        <div className="space-y-5">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            regionOptions={regionOptions}
            aoOwnerOptions={aoOwnerOptions}
            fdePodOptions={fdePodOptions}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ArrBreakdownPieChart title="Total ARR by region" data={totalArrByRegion(filtered)} />
            <ArrBreakdownPieChart title="Total ARR by health" data={totalArrByHealth(filtered)} />
            <ArrBreakdownChart title="Total ARR by CSM owner" data={totalArrByOwner(filtered)} />
            <ArrBreakdownPieChart title="Total ARR by tier" data={totalArrByTier(filtered)} />
            <ArrBreakdownPieChart title="Active vs. churned ARR" data={totalArrByChurn(filtered)} />
          </div>
        </div>
      )}
    </div>
  );
}
