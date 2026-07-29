"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BreakdownRow } from "@/lib/breakdowns";
import { formatCurrency, formatCurrencyFull } from "@/lib/format";

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

export default function ArrBreakdownChart({
  title,
  data,
  defaultColor = "#6C8CFF",
}: {
  title: string;
  data: BreakdownRow[];
  defaultColor?: string;
}) {
  const rotateLabels = data.length > 6;
  return (
    <div className="rounded-lg border border-border bg-panel p-3 shadow-sm shadow-black/20">
      <h2 className="mb-2 px-1 text-sm font-medium text-text/80">{title}</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: rotateLabels ? 24 : 8 }}>
            <CartesianGrid stroke="#2A2F3A" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8A8F9C", fontSize: 11 }}
              axisLine={{ stroke: "#2A2F3A" }}
              tickLine={false}
              interval={0}
              angle={rotateLabels ? -30 : 0}
              textAnchor={rotateLabels ? "end" : "middle"}
              height={rotateLabels ? 50 : 30}
            />
            <YAxis
              tick={{ fill: "#8A8F9C", fontSize: 12 }}
              axisLine={{ stroke: "#2A2F3A" }}
              tickLine={false}
              tickFormatter={(v: number) => formatCurrency(v)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.color ?? defaultColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
