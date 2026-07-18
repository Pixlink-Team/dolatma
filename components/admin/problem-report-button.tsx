"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, MessageSquareReply } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listMyProblemReportsAction,
  submitProblemReportAction,
} from "@/lib/actions/problem-report-actions";
import {
  PROBLEM_REPORT_CATEGORY_LABELS,
  PROBLEM_REPORT_STATUS_LABELS,
  type ProblemReport,
  type ProblemReportCategory,
} from "@/lib/audit/problem-types";
import { formatPersianDateTime } from "@/lib/utils";

const CATEGORIES = Object.keys(PROBLEM_REPORT_CATEGORY_LABELS) as ProblemReportCategory[];

const STATUS_BADGE: Record<
  ProblemReport["status"],
  "warning" | "default" | "success" | "outline"
> = {
  pending: "warning",
  in_progress: "default",
  resolved: "success",
  dismissed: "outline",
};

export function ProblemReportButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "mine">("new");
  const [category, setCategory] = useState<ProblemReportCategory>("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myReports, setMyReports] = useState<ProblemReport[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [mineLoaded, setMineLoaded] = useState(false);

  const reset = () => {
    setCategory("other");
    setTitle("");
    setDescription("");
    setTab("new");
  };

  const loadMyReports = useCallback(async () => {
    setLoadingMine(true);
    try {
      const result = await listMyProblemReportsAction();
      if (!result.success) {
        toast.error(result.error ?? "بارگذاری گزارش‌ها ناموفق بود");
        return;
      }
      setMyReports(result.reports ?? []);
      setMineLoaded(true);
    } catch {
      toast.error("بارگذاری گزارش‌ها با خطا مواجه شد");
    } finally {
      setLoadingMine(false);
    }
  }, []);

  useEffect(() => {
    if (!open || tab !== "mine" || mineLoaded || loadingMine) return;
    void loadMyReports();
  }, [open, tab, mineLoaded, loadingMine, loadMyReports]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const campaignId = searchParams.get("campaign");
      const query = searchParams.toString();
      const path = query ? `${pathname}?${query}` : pathname;

      const result = await submitProblemReportAction({
        category,
        title,
        description,
        path,
        campaignId,
      });

      if (!result.success) {
        toast.error(result.error ?? "ارسال گزارش ناموفق بود");
        return;
      }

      toast.success("گزارش مشکل ثبت شد. ادمین رسیدگی می‌کند.");
      setCategory("other");
      setTitle("");
      setDescription("");
      setMineLoaded(false);
      setTab("mine");
      void loadMyReports();
    } catch {
      toast.error("ارسال گزارش با خطا مواجه شد");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="fixed bottom-5 left-5 z-[80] gap-2 shadow-md lg:left-6"
        data-audit-label="گزارش مشکل"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        گزارش مشکل
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            reset();
            setMineLoaded(false);
            setMyReports([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>گزارش مشکل</DialogTitle>
            <DialogDescription>
              مشکل جدید ثبت کنید یا وضعیت و پاسخ ادمین برای گزارش‌های قبلی را ببینید.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as "new" | "mine")}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="new">گزارش جدید</TabsTrigger>
              <TabsTrigger value="mine">گزارش‌های من</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">نوع مشکل</label>
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as ProblemReportCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب نوع مشکل" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((key) => (
                      <SelectItem key={key} value={key}>
                        {PROBLEM_REPORT_CATEGORY_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">عنوان کوتاه</label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="مثلاً: دکمه ذخیره کار نمی‌کند"
                  maxLength={160}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">توضیح مشکل</label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="چه کاری می‌خواستید انجام دهید و چه اتفاقی افتاد؟"
                  className="min-h-[120px]"
                  maxLength={4000}
                />
              </div>

              <p className="text-xs text-muted-foreground" dir="ltr">
                صفحه فعلی: {pathname}
                {searchParams.toString() ? `?${searchParams.toString()}` : ""}
              </p>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  data-audit-label="ارسال گزارش مشکل"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال ارسال…
                    </>
                  ) : (
                    "ارسال گزارش"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="mine" className="space-y-3 py-2">
              {loadingMine ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال بارگذاری…
                </div>
              ) : myReports.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  هنوز گزارشی ثبت نکرده‌اید.
                </p>
              ) : (
                <div className="space-y-3">
                  {myReports.map((report) => (
                    <div key={report.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={STATUS_BADGE[report.status]}>
                          {PROBLEM_REPORT_STATUS_LABELS[report.status]}
                        </Badge>
                        <Badge variant="outline">
                          {PROBLEM_REPORT_CATEGORY_LABELS[report.category]}
                        </Badge>
                        <span className="text-xs text-muted-foreground ms-auto">
                          {formatPersianDateTime(report.createdAt)}
                        </span>
                      </div>
                      <h3 className="font-medium text-sm">{report.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                        {report.description}
                      </p>
                      {report.adminNote ? (
                        <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2 text-sm space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-primary">
                            <MessageSquareReply className="h-3.5 w-3.5" />
                            پاسخ ادمین
                          </div>
                          <p className="whitespace-pre-wrap">{report.adminNote}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">هنوز پاسخی ثبت نشده است.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingMine}
                  onClick={() => {
                    setMineLoaded(false);
                    void loadMyReports();
                  }}
                >
                  بروزرسانی
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
