import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPersianNumber } from "@/lib/utils";

export interface DashboardGroupCardData {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  total: number;
  items: Array<{
    label: string;
    value: number;
    href: string;
  }>;
}

interface DashboardGroupCardsProps {
  groups: DashboardGroupCardData[];
}

export function DashboardGroupCards({ groups }: DashboardGroupCardsProps) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">گزارش‌گیری سه‌ستونه</h2>
        <p className="text-sm text-muted-foreground">
          دارایی‌ها، تولید و نشر به‌صورت جداگانه برای نمایش پایدار روی دیتای حجیم.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.key} className="h-full">
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      <Link href={group.href} className="hover:text-primary">
                        {group.label}
                      </Link>
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{formatPersianNumber(group.total)}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <span>{item.label}</span>
                    <span className="font-medium">{formatPersianNumber(item.value)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
