"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OnboardingProgress } from "@/lib/onboarding/types";
import { cn, formatPersianNumber } from "@/lib/utils";

type ProgressFilter = "all" | "incomplete" | "complete";

interface OnboardingAuditPanelProps {
  rows: OnboardingProgress[];
  campaignTitle?: string | null;
}

export function OnboardingAuditPanel({ rows, campaignTitle }: OnboardingAuditPanelProps) {
  const [filter, setFilter] = useState<ProgressFilter>("all");

  const stepKeys = useMemo(() => {
    const first = rows[0];
    return first?.steps.map((step) => ({ key: step.stepKey, title: step.title })) ?? [];
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "complete") return rows.filter((row) => row.percent === 100);
    if (filter === "incomplete") return rows.filter((row) => row.percent < 100);
    return rows;
  }, [filter, rows]);

  const completeCount = rows.filter((row) => row.percent === 100).length;
  const incompleteCount = rows.length - completeCount;

  return (
    <Card className="text-right" dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">پیشرفت راه‌اندازی دستگاه‌ها</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              وضعیت تکمیل مراحل راه‌اندازی برای هر دستگاه
              {campaignTitle ? ` — راستا: ${campaignTitle}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              کل: {formatPersianNumber(rows.length)}
            </Badge>
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              کامل: {formatPersianNumber(completeCount)}
            </Badge>
            <Badge variant="outline">
              ناقص: {formatPersianNumber(incompleteCount)}
            </Badge>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: "همه" },
              { id: "incomplete", label: "ناقص" },
              { id: "complete", label: "کامل" },
            ] as const
          ).map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={filter === item.id ? "default" : "outline"}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" style={{ minWidth: "860px", direction: "rtl" }}>
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="border-b px-3 py-3 text-right font-medium whitespace-nowrap">دستگاه</th>
                <th className="border-b px-3 py-3 text-right font-medium whitespace-nowrap">پیشرفت</th>
                {stepKeys.map((step) => (
                  <th
                    key={step.key}
                    className="border-b px-3 py-3 text-center font-medium whitespace-nowrap"
                  >
                    {step.title}
                  </th>
                ))}
                <th className="border-b px-3 py-3 text-right font-medium whitespace-nowrap">شناسنامه</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + stepKeys.length}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    موردی برای نمایش نیست.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.deviceId} className="hover:bg-muted/30">
                    <td className="border-b px-3 py-3 font-medium">{row.deviceName}</td>
                    <td className="border-b px-3 py-3">
                      <div className="flex min-w-[120px] flex-col gap-1">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            row.percent === 100 ? "text-emerald-700" : "text-muted-foreground"
                          )}
                        >
                          {formatPersianNumber(row.completedCount)}/{formatPersianNumber(row.totalCount)} (
                          {formatPersianNumber(row.percent)}٪)
                        </span>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    {row.steps.map((step) => (
                      <td key={step.stepKey} className="border-b px-3 py-3 text-center" title={step.detail}>
                        {step.done ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Minus className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="border-b px-3 py-3">
                      <Link
                        href={`/admin/devices/${row.deviceId}`}
                        className="text-xs text-primary hover:underline"
                      >
                        مشاهده
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
