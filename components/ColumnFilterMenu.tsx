"use client";

import { useEffect, useRef, useState } from "react";
import { ColumnFilterOption } from "@/lib/columnFilters";

interface ColumnFilterMenuProps {
  options: ColumnFilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

export default function ColumnFilterMenu({ options, selected, onChange }: ColumnFilterMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const active = selected.size > 0;
  // An empty selection means "no filter" — treat every option as checked in that state, matching Excel's default.
  const effectiveSelected = active ? selected : new Set(options.map((o) => o.key));

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const toggle = (key: string) => {
    const next = new Set(effectiveSelected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next.size === options.length ? new Set() : next);
  };

  return (
    <details ref={detailsRef} className="relative inline-block normal-case">
      <summary
        className={`cursor-pointer select-none list-none rounded px-1 leading-none [&::-webkit-details-marker]:hidden ${
          active ? "text-accent" : "text-text/40 hover:text-text/70"
        }`}
        onClick={(e) => e.stopPropagation()}
        aria-label="Filter column"
      >
        ▾
      </summary>
      <div
        className="absolute left-0 z-30 mt-1 w-56 rounded-md border border-border bg-panel p-2 text-xs font-normal shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="mb-1.5 w-full rounded border border-border bg-bg px-2 py-1 text-xs text-text placeholder:text-text/40"
        />
        {active && (
          <button
            onClick={() => onChange(new Set())}
            className="mb-1.5 text-accent hover:underline"
          >
            Clear filter
          </button>
        )}
        <div className="max-h-56 overflow-y-auto">
          {filtered.length === 0 && <div className="px-1 py-1 text-text/50">No matches</div>}
          {filtered.map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer items-center justify-between gap-2 rounded px-1 py-1 hover:bg-white/5"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={effectiveSelected.has(opt.key)}
                  onChange={() => toggle(opt.key)}
                  className="h-3 w-3 shrink-0 accent-accent"
                />
                <span className="truncate">{opt.label}</span>
              </span>
              <span className="shrink-0 text-text/40 num">{opt.count}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}
