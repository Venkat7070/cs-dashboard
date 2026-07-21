"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { BreakdownRow } from "@/lib/breakdowns";
import { formatCurrency, formatCurrencyFull } from "@/lib/format";

const PALETTE = ["#6C8CFF", "#3ECF8E", "#F5A623", "#F0554E", "#9B7EDE", "#4FB8C4", "#E37EC6", "#C4A24F"];

interface TooltipPayloadItem {
  payload: BreakdownRow;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-md border border-border bg-bg px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-text">{row.label}</div>
      <div className="num text-text/80">{formatCurrencyFull(row.value)}</div>
    </div>
  );
}

interface PieLabelProps {
  name?: string;
  value?: number;
  percent?: number;
}

function renderLabel({ name, value, percent }: PieLabelProps): string {
  const pct = percent != null ? ` (${Math.round(percent * 100)}%)` : "";
  return `${name ?? ""}: ${formatCurrency(value ?? 0)}${pct}`;
}

export default function ArrBreakdownPieChart({ title, data }: { title: string; data: BreakdownRow[] }) {
  const nonZero = data.filter((d) => d.value > 0);
  return (
    <div className="rounded-lg border border-border bg-panel p-3">
      <h2 className="mb-2 px-1 text-sm font-medium text-text/80">{title}</h2>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <Pie
              data={nonZero}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="45%"
              outerRadius="65%"
              label={renderLabel}
              labelLine
            >
              {nonZero.map((d, i) => (
                <Cell key={d.label} fill={d.color ?? PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8A8F9C" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
