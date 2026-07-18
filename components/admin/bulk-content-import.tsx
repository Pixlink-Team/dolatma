"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Layers, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";
import { BillboardCreateAssignmentDialog } from "@/components/admin/billboard-create-assignment-dialog";
import { SocialPostFormDialog } from "@/components/admin/social-post-form-dialog";
import { ActivityFormDialog } from "@/components/admin/activity-form-dialog";
import {
  CONTENT_PACKAGE_TYPE_OPTIONS,
  detectSocialPlatformFromText,
  type ContentPackageDraftItem,
  type ContentPackageItemType,
} from "@/lib/services/content-package-parser";
import type { AdminUser } from "@/lib/types";
import { stripFileAccessToken } from "@/lib/uploads";

interface BulkContentImportProps {
  users: AdminUser[];
}

function BulkContentTypeSwitcher({
  value,
  onChange,
}: {
  value: ContentPackageItemType;
  onChange: (next: ContentPackageItemType) => void;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
      <Label>بخش مقصد</Label>
      <Select value={value} onValueChange={(next) => onChange(next as ContentPackageItemType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONTENT_PACKAGE_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        اگر نوع از Excel اشتباه تشخیص داده شده، اینجا عوض کنید تا مودال همان بخش باز شود.
      </p>
    </div>
  );
}

export function BulkContentImport({ users }: BulkContentImportProps) {
  const router = useRouter();
  const { campaignId, currentCampaign } = useAdminCampaign();
  const zipRef = useRef<HTMLInputElement>(null);
  const closingByFinishRef = useRef(false);
  const advancingRef = useRef(false);
  const switchingTypeRef = useRef(false);

  const [ownerUserId, setOwnerUserId] = useState("");
  const [parsing, setParsing] = useState(false);
  const [drafts, setDrafts] = useState<ContentPackageDraftItem[]>([]);
  const [index, setIndex] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const ownerOptions = useMemo(
    () =>
      [...users].sort((a, b) => a.name.localeCompare(b.name, "fa", { sensitivity: "base" })),
    [users]
  );

  const selectedOwner = ownerOptions.find((user) => user.id === ownerUserId) ?? null;
  const current = reviewOpen && drafts[index] ? drafts[index] : null;
  const queueLabel = current ? `مورد ${index + 1} از ${drafts.length}` : undefined;

  const resetWizard = () => {
    setDrafts([]);
    setIndex(0);
    setReviewOpen(false);
    setSavedCount(0);
    setSkippedCount(0);
    if (zipRef.current) zipRef.current.value = "";
  };

  const finishIfDone = (nextSaved: number, nextSkipped: number, nextIndex: number) => {
    if (nextIndex >= drafts.length) {
      closingByFinishRef.current = true;
      setReviewOpen(false);
      toast.success(`افزودن گروهی تمام شد — ثبت: ${nextSaved} | رد شده: ${nextSkipped}`);
      startTransition(() => router.refresh());
      resetWizard();
      return;
    }
    setIndex(nextIndex);
  };

  const handleParseZip = async (file: File) => {
    if (!ownerUserId) {
      toast.error("ابتدا کاربر مالک محتوا را انتخاب کنید");
      return;
    }
    if (!campaignId) {
      toast.error("اقدام فعال مشخص نیست");
      return;
    }

    setParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/content-package/parse", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "خواندن ZIP ناموفق بود");
        return;
      }

      const items = (result.drafts ?? []) as ContentPackageDraftItem[];
      if (items.length === 0) {
        toast.error("موردی برای ورود پیدا نشد");
        return;
      }

      if (result.errors?.length) {
        toast.message(`${result.errors.length} ردیف با خطا رد شد`);
      }

      setDrafts(items);
      setSavedCount(0);
      setSkippedCount(0);
      setIndex(0);
      setReviewOpen(true);
      toast.success(`${items.length} مورد آماده تأیید شد — مودال بخش مربوطه باز می‌شود`);
    } catch {
      toast.error("خطا در آپلود ZIP");
    } finally {
      setParsing(false);
      if (zipRef.current) zipRef.current.value = "";
    }
  };

  const handleSkip = () => {
    advancingRef.current = true;
    const nextSkipped = skippedCount + 1;
    setSkippedCount(nextSkipped);
    finishIfDone(savedCount, nextSkipped, index + 1);
  };

  const handleSaved = () => {
    advancingRef.current = true;
    const nextSaved = savedCount + 1;
    setSavedCount(nextSaved);
    finishIfDone(nextSaved, skippedCount, index + 1);
  };

  const handleContentTypeChange = (nextType: ContentPackageItemType) => {
    if (!current || current.contentType === nextType) return;
    switchingTypeRef.current = true;
    setDrafts((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return {
          ...item,
          contentType: nextType,
          platform:
            nextType === "social"
              ? item.platform ?? detectSocialPlatformFromText(item.location)
              : null,
        };
      })
    );
    // Ignore Dialog unmount close events from the previous section modal.
    window.setTimeout(() => {
      switchingTypeRef.current = false;
    }, 0);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      setReviewOpen(true);
      return;
    }
    if (switchingTypeRef.current) {
      return;
    }
    if (closingByFinishRef.current || advancingRef.current) {
      closingByFinishRef.current = false;
      advancingRef.current = false;
      return;
    }
    toast.message("افزودن گروهی لغو شد");
    resetWizard();
  };

  if (!currentCampaign) return null;

  const imageUrl = current ? stripFileAccessToken(current.imageUrl) : "";
  const typeSwitcher = current ? (
    <BulkContentTypeSwitcher value={current.contentType} onChange={handleContentTypeChange} />
  ) : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            افزودن گروهی محتوا
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            یک ZIP شامل <span className="font-medium">فهرست.xlsx</span> و پوشه{" "}
            <span className="font-medium">images</span> آپلود کنید. برای هر ردیف، مودال همان بخش
            (تبلیغات محیطی / شبکه اجتماعی / اقدام) باز می‌شود؛ فیلدهای Excel از قبل پر هستند و بقیه را
            تکمیل می‌کنید. اگر نوع اشتباه بود، داخل مودال بخش مقصد را عوض کنید.
          </p>

          <div className="space-y-2">
            <Label>کاربر مالک محتوا</Label>
            <Select value={ownerUserId || undefined} onValueChange={setOwnerUserId}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب کاربر (مثلاً سازمان انرژی اتمی)" />
              </SelectTrigger>
              <SelectContent>
                {ownerOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                    {user.province ? ` — ${user.province}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={parsing || isPending || !ownerUserId}
              onClick={() => zipRef.current?.click()}
            >
              {parsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              انتخاب ZIP و شروع
            </Button>
            <input
              ref={zipRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleParseZip(file);
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            ستون‌ها: عنوان، مکان، نوع (بیلبورد / شبکه اجتماعی / اقدام)، نام_فایل_عکس
          </p>
        </CardContent>
      </Card>

      {current?.contentType === "billboard" ? (
        <BillboardCreateAssignmentDialog
          open={reviewOpen}
          onOpenChange={handleDialogOpenChange}
          campaignId={campaignId}
          contentPlans={currentCampaign.contentPlans}
          contentTopics={currentCampaign.contentTopics}
          mode="admin"
          ownerUserId={ownerUserId}
          initialValuesKey={current.key}
          initialValues={{
            axis: current.title,
            address: current.location,
            province: current.province || selectedOwner?.province || "تهران",
            city: current.city || selectedOwner?.city || "تهران",
            notes: current.description || current.device || "",
            periods: [
              {
                title: current.location || current.title,
                startDate: current.date,
                endDate: current.date,
                existingBillboardImageUrl: imageUrl,
              },
            ],
          }}
          onCreated={handleSaved}
          onSkip={handleSkip}
          skipLabel="رد کردن این مورد"
          bulkTypeSwitcher={typeSwitcher}
        />
      ) : null}

      {current?.contentType === "social" ? (
        <SocialPostFormDialog
          open={reviewOpen}
          onOpenChange={handleDialogOpenChange}
          campaignId={campaignId}
          ownerUserId={ownerUserId}
          initialValuesKey={current.key}
          contentPlans={currentCampaign.contentPlans}
          contentTopics={currentCampaign.contentTopics}
          queueLabel={queueLabel}
          initialValues={{
            platform: current.platform || "other",
            title: current.title,
            coverImageUrl: imageUrl,
            mediaUrl: imageUrl,
            description: current.description || current.location,
            publishedDate: current.date,
          }}
          onSaved={handleSaved}
          onSkip={handleSkip}
          bulkTypeSwitcher={typeSwitcher}
        />
      ) : null}

      {current?.contentType === "activity" ? (
        <ActivityFormDialog
          open={reviewOpen}
          onOpenChange={handleDialogOpenChange}
          campaignId={campaignId}
          ownerUserId={ownerUserId}
          initialValuesKey={current.key}
          contentPlans={currentCampaign.contentPlans}
          contentTopics={currentCampaign.contentTopics}
          queueLabel={queueLabel}
          initialValues={{
            title: current.title,
            activityType: "field",
            activityDate: current.date,
            location: current.location,
            description: current.description,
            imageUrl,
          }}
          onSaved={handleSaved}
          onSkip={handleSkip}
          bulkTypeSwitcher={typeSwitcher}
        />
      ) : null}
    </>
  );
}
