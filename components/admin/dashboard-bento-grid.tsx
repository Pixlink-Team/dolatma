import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Award,
  ClipboardX,
  Medal,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminHref, cn, formatPersianNumber } from "@/lib/utils";

export type DashboardBentoPreviewItem = {
  id: string;
  title: string;
  meta?: string | null;
};

export type DashboardBentoScores = {
  activityScore: number;
  ratingScore: number;
  totalUploads: number;
  rank: number | null;
};

interface DashboardBentoGridProps {
  campaignId: string;
  /** When false, hides the best-practices card (user lacks section permission). */
  showBestPractices?: boolean;
  directivesSlot: ReactNode;
  bestPractices: {
    count: number;
    items: DashboardBentoPreviewItem[];
  };
  scores: DashboardBentoScores | null;
  returnedContent: {
    count: number;
    items: DashboardBentoPreviewItem[];
  };
  messages: {
    unreadCount: number;
    totalCount: number;
    items: DashboardBentoPreviewItem[];
  };
}

function BentoCardShell({
  title,
  icon: Icon,
  href,
  badge,
  emptyText,
  items,
  className,
  children,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  badge?: ReactNode;
  emptyText: string;
  items: DashboardBentoPreviewItem[];
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Card className={cn("flex h-full min-h-[11rem] flex-col", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            {title}
            {badge}
          </CardTitle>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href={href}>مشاهده</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        {children}
        {items.length === 0 ? (
          <div className="mt-auto rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <ul className="mt-auto space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border bg-background/80 px-3 py-2 text-sm"
              >
                <p className="line-clamp-1 font-medium">{item.title}</p>
                {item.meta ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {item.meta}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          مشاهده همه
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function DashboardBentoGrid({
  campaignId,
  showBestPractices = true,
  directivesSlot,
  bestPractices,
  scores,
  returnedContent,
  messages,
}: DashboardBentoGridProps) {
  const scoresHref = adminHref("/admin/my-performance", campaignId);
  const hasScores =
    scores != null &&
    (scores.activityScore > 0 || scores.ratingScore > 0 || scores.totalUploads > 0);

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 xl:grid-rows-[minmax(0,auto)_minmax(0,auto)]">
      <div className="min-w-0 md:col-span-2 xl:col-span-2 xl:row-span-2">
        {directivesSlot}
      </div>

      <div className="min-w-0 xl:col-span-2">
        {showBestPractices ? (
          <BentoCardShell
            title="بهترین اقدامات"
            icon={Award}
            href={adminHref("/admin/best-practices", campaignId)}
            badge={
              <Badge variant="secondary">
                {formatPersianNumber(bestPractices.count)} مورد
              </Badge>
            }
            emptyText="هنوز اقدام برتری ثبت نشده است"
            items={bestPractices.items}
          />
        ) : null}
      </div>

      <div className="min-w-0">
        <Card className="flex h-full min-h-[11rem] flex-col">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <Medal className="h-5 w-5 shrink-0 text-muted-foreground" />
              امتیازها
            </CardTitle>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href={scoresHref}>مشاهده</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 pt-0">
            {!hasScores ? (
              <div className="mt-auto rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                هنوز امتیازی ثبت نشده است
              </div>
            ) : (
              <div className="mt-auto grid grid-cols-2 gap-2">
                <div className="rounded-lg border bg-background/80 px-3 py-2">
                  <p className="text-xs text-muted-foreground">امتیاز محتوا</p>
                  <p className="text-lg font-bold">
                    {formatPersianNumber(scores!.ratingScore)}
                  </p>
                </div>
                <div className="rounded-lg border bg-background/80 px-3 py-2">
                  <p className="text-xs text-muted-foreground">امتیاز فعالیت</p>
                  <p className="text-lg font-bold">
                    {formatPersianNumber(scores!.activityScore)}
                  </p>
                </div>
                <div className="rounded-lg border bg-background/80 px-3 py-2">
                  <p className="text-xs text-muted-foreground">تعداد محتوا</p>
                  <p className="text-lg font-bold">
                    {formatPersianNumber(scores!.totalUploads)}
                  </p>
                </div>
                <div className="rounded-lg border bg-background/80 px-3 py-2">
                  <p className="text-xs text-muted-foreground">رتبه</p>
                  <p className="text-lg font-bold">
                    {scores!.rank && scores!.rank > 0
                      ? formatPersianNumber(scores!.rank)
                      : "—"}
                  </p>
                </div>
              </div>
            )}
            <Link
              href={scoresHref}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              گزارش عملکرد
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0">
        <BentoCardShell
          title="محتواهای رد شده"
          icon={ClipboardX}
          href={adminHref("/admin/returned-content", campaignId)}
          badge={
            returnedContent.count > 0 ? (
              <Badge variant="destructive">
                {formatPersianNumber(returnedContent.count)}
              </Badge>
            ) : (
              <Badge variant="secondary">۰</Badge>
            )
          }
          emptyText="محتوای برگشتی ندارید"
          items={returnedContent.items}
          className={
            returnedContent.count > 0
              ? "border-amber-500/30 bg-amber-500/[0.04]"
              : undefined
          }
        />
      </div>

      <div className="min-w-0 md:col-span-2 xl:col-span-4">
        <BentoCardShell
          title="پیام‌ها"
          icon={MessageSquare}
          href={adminHref("/admin/messages", campaignId)}
          badge={
            messages.unreadCount > 0 ? (
              <Badge variant="destructive">
                {formatPersianNumber(messages.unreadCount)} خوانده‌نشده
              </Badge>
            ) : (
              <Badge variant="secondary">
                {formatPersianNumber(messages.totalCount)} پیام
              </Badge>
            )
          }
          emptyText="پیامی برای شما ثبت نشده است"
          items={messages.items}
          className={
            messages.unreadCount > 0
              ? "border-primary/25 bg-primary/[0.03]"
              : undefined
          }
        />
      </div>
    </section>
  );
}
