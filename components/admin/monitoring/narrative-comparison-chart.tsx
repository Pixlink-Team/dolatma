"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { formatPersianNumber } from "@/lib/utils";

export function NarrativeComparisonChart({
  data,
  markers = [],
}: {
  data: Array<{ label: string; negativeReach: number; responseReach: number }>;
  markers?: Array<{ label: string; x: string }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        هنوز داده نموداری ثبت نشده است.
      </div>
    );
  }

  return (
    <div className="h-80 w-full rounded-xl border bg-card p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatPersianNumber(Number(v))} />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatPersianNumber(value),
              name === "negativeReach" ? "خبر منفی" : "پاسخ رسمی",
            ]}
          />
          <Legend
            formatter={(value) => (value === "negativeReach" ? "رشد خبر منفی" : "رشد روایت رسمی")}
          />
          <Line
            type="monotone"
            dataKey="negativeReach"
            stroke="#dc2626"
            strokeWidth={2.5}
            dot={false}
            name="negativeReach"
          />
          <Line
            type="monotone"
            dataKey="responseReach"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={false}
            name="responseReach"
          />
          {markers.map((marker) => (
            <ReferenceLine
              key={marker.label}
              x={marker.x}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: marker.label, position: "insideTop", fontSize: 10 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
