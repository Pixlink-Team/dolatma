"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPersianNumber, getStatusLabel } from "@/lib/utils";

interface BarChartCardProps {
  data: { label: string; value: number }[];
  title: string;
  color?: string;
}

function truncateLabel(label: string, max = 18): string {
  const trimmed = label.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function BarChartCard({ data, title, color = "#2563eb" }: BarChartCardProps) {
  const chartData = data.map((d) => {
    const fullName = getStatusLabel(d.label) !== d.label ? getStatusLabel(d.label) : d.label;
    return {
      name: truncateLabel(fullName),
      fullName,
      value: d.value,
    };
  });

  const chartHeight = Math.max(260, chartData.length * 42 + 40);
  const yAxisWidth = Math.min(
    160,
    Math.max(96, ...chartData.map((item) => Math.min(item.name.length * 8, 160)))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            داده‌ای برای نمایش وجود ندارد.
          </div>
        ) : (
          <div className="w-full min-w-0" style={{ height: chartHeight }} dir="ltr">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                barCategoryGap="28%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => formatPersianNumber(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={yAxisWidth}
                  interval={0}
                />
                <Tooltip
                  formatter={(value: number) => formatPersianNumber(value)}
                  labelFormatter={(_, payload) => {
                    const fullName = payload?.[0]?.payload?.fullName;
                    return typeof fullName === "string" ? fullName : "";
                  }}
                />
                <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
