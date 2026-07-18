"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Layers, Loader2, SkipForward, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";
import { MediaUpload } from "@/components/ui/media-upload";
import { PersianDateInput } from "@/components/ui/persian-date-input";
import { saveBillboardAction } from "@/lib/actions/admin-actions";
import { saveCampaignActivityAction, saveSocialPostAction } from "@/lib/actions/extended-actions";
import { getActivityTypeLabel } from "@/lib/activity-types";
import { getSocialPlatformLabel } from "@/components/public/social-platform-icon";
import type { ContentPackageDraftItem } from "@/lib/services/content-package-parser";
import type { AdminUser, SocialPlatform, SocialPostPlatform } from "@/lib/types";
import { stripFileAccessToken } from "@/lib/uploads";

const socialPlatforms: SocialPostPlatform[] = [
  "instagram",
  "x",
  "telegram",
  "linkedin",
  "youtube",
  "aparat",
  "rubika",
  "eitaa",
  "soroush",
  "bale",
  "site",
  "other",
];

const contentTypeLabels: Record<ContentPackageDraftItem["contentType"], string> = {
  billboard: "تبلیغات محیطی",
  social: "شبکه اجتماعی / سایت",
  activity: "اقدام",
};

interface BulkContentImportProps {
  users: AdminUser[];
}

type EditableDraft = ContentPackageDraftItem;

export function BulkContentImport({ users }: BulkContentImportProps) {
  const router = useRouter();
  const { campaignId, currentCampaign } = useAdminCampaign();
  const zipRef = useRef<HTMLInputElement>(null);

  const [ownerUserId, setOwnerUserId] = useState("");
  const [parsing, setParsing] = useState(false);
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);
  const [index, setIndex] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [current, setCurrent] = useState<EditableDraft | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const closingByFinishRef = useRef(false);

  const ownerOptions = useMemo(
    () =>
      [...users].sort((a, b) => a.name.localeCompare(b.name, "fa", { sensitivity: "base" })),
    [users]
  );

  const selectedOwner = ownerOptions.find((user) => user.id === ownerUserId) ?? null;

  const resetWizard = () => {
    setDrafts([]);
    setIndex(0);
    setCurrent(null);
    setReviewOpen(false);
    setSavedCount(0);
    setSkippedCount(0);
    if (zipRef.current) zipRef.current.value = "";
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

      const items = (result.drafts ?? []) as EditableDraft[];
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
      setCurrent({ ...items[0] });
      setReviewOpen(true);
      toast.success(`${items.length} مورد آماده تأیید شد`);
    } catch {
      toast.error("خطا در آپلود ZIP");
    } finally {
      setParsing(false);
      if (zipRef.current) zipRef.current.value = "";
    }
  };

  const finishIfDone = (nextSaved: number, nextSkipped: number, nextIndex: number) => {
    if (nextIndex >= drafts.length) {
      closingByFinishRef.current = true;
      setReviewOpen(false);
      setCurrent(null);
      toast.success(`افزودن گروهی تمام شد — ثبت: ${nextSaved} | رد شده: ${nextSkipped}`);
      startTransition(() => router.refresh());
      resetWizard();
      return;
    }
    setIndex(nextIndex);
    setCurrent({ ...drafts[nextIndex] });
  };

  const handleSkip = () => {
    const nextSkipped = skippedCount + 1;
    setSkippedCount(nextSkipped);
    finishIfDone(savedCount, nextSkipped, index + 1);
  };

  const handleSave = () => {
    if (!current || !ownerUserId || !campaignId) return;

    const title = current.title.trim();
    if (!title) {
      toast.error("عنوان الزامی است");
      return;
    }
    if (!current.imageUrl.trim()) {
      toast.error("تصویر الزامی است");
      return;
    }

    startTransition(async () => {
      const imageUrl = stripFileAccessToken(current.imageUrl);
      const location = current.location.trim();
      const displayTitle = location ? `${title} — ${location}` : title;

      let result: { success?: boolean; error?: string } | undefined;

      if (current.contentType === "billboard") {
        result = await saveBillboardAction({
          campaignId,
          ownerUserId,
          title: displayTitle,
          description: current.description.trim() || "نصب طرح گرافیکی",
          province: current.province.trim() || null,
          city: current.city.trim() || selectedOwner?.city || "تهران",
          location: location || current.city || "تهران",
          date: current.date,
          thumbnailUrl: imageUrl,
          imageUrl,
          externalUrl: "",
          status: "published",
          tags: current.device ? [current.device] : [],
          published: true,
        });
      } else if (current.contentType === "social") {
        const platform = current.platform ?? "other";
        result = await saveSocialPostAction({
          campaignId,
          ownerUserId,
          platform,
          title: displayTitle,
          coverImageUrl: imageUrl,
          mediaUrl: imageUrl,
          description: current.description.trim() || location || null,
          link: "",
          contentType: "image",
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          publishedDate: current.date,
          published: true,
        });
      } else {
        result = await saveCampaignActivityAction({
          campaignId,
          ownerUserId,
          title: displayTitle,
          activityType: "field",
          activityDate: current.date,
          location: location || current.city || "تهران",
          imageUrl,
          mediaItems: [{ id: crypto.randomUUID(), type: "image", url: imageUrl }],
          description: current.description.trim() || "انتشار طرح گرافیکی",
          published: true,
        });
      }

      if (!result?.success) {
        toast.error(result?.error ?? "ثبت مورد ناموفق بود");
        return;
      }

      const nextSaved = savedCount + 1;
      setSavedCount(nextSaved);
      toast.success(`ثبت شد (${nextSaved} از ${drafts.length})`);
      finishIfDone(nextSaved, skippedCount, index + 1);
    });
  };

  if (!currentCampaign) return null;

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
            <span className="font-medium">images</span> آپلود کنید. برای هر ردیف مودال تأیید باز
            می‌شود تا ویرایش یا رد کنید، بعد ثبت شود.
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

      <Dialog
        open={reviewOpen && Boolean(current)}
        onOpenChange={(open) => {
          if (!open) {
            if (closingByFinishRef.current) {
              closingByFinishRef.current = false;
              return;
            }
            toast.message("افزودن گروهی لغو شد");
            resetWizard();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {current && (
            <>
              <DialogHeader>
                <DialogTitle>
                  تأیید مورد {index + 1} از {drafts.length}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">نوع: </span>
                  {contentTypeLabels[current.contentType]}
                  {current.contentType === "activity" ? ` (${getActivityTypeLabel("field")})` : ""}
                  {selectedOwner ? (
                    <>
                      <span className="mx-2 text-muted-foreground">|</span>
                      <span className="text-muted-foreground">مالک: </span>
                      {selectedOwner.name}
                    </>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>عنوان</Label>
                  <Input
                    value={current.title}
                    onChange={(event) =>
                      setCurrent((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>مکان</Label>
                    <Input
                      value={current.location}
                      onChange={(event) =>
                        setCurrent((prev) =>
                          prev ? { ...prev, location: event.target.value } : prev
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاریخ</Label>
                    <PersianDateInput
                      value={current.date}
                      onChange={(value) =>
                        setCurrent((prev) => (prev ? { ...prev, date: value } : prev))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>استان</Label>
                    <Input
                      value={current.province}
                      onChange={(event) =>
                        setCurrent((prev) =>
                          prev ? { ...prev, province: event.target.value } : prev
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>شهر</Label>
                    <Input
                      value={current.city}
                      onChange={(event) =>
                        setCurrent((prev) => (prev ? { ...prev, city: event.target.value } : prev))
                      }
                    />
                  </div>
                </div>

                {current.contentType === "social" && (
                  <div className="space-y-2">
                    <Label>پلتفرم</Label>
                    <Select
                      value={current.platform ?? "other"}
                      onValueChange={(value) =>
                        setCurrent((prev) =>
                          prev
                            ? { ...prev, platform: value as SocialPostPlatform }
                            : prev
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {socialPlatforms.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform === "site"
                              ? "سایت / پورتال"
                              : getSocialPlatformLabel(platform as SocialPlatform)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>توضیح</Label>
                  <Textarea
                    value={current.description}
                    onChange={(event) =>
                      setCurrent((prev) =>
                        prev ? { ...prev, description: event.target.value } : prev
                      )
                    }
                    rows={3}
                  />
                </div>

                <MediaUpload
                  label="تصویر"
                  kind="image"
                  value={current.imageUrl}
                  onChange={(url) =>
                    setCurrent((prev) => (prev ? { ...prev, imageUrl: url } : prev))
                  }
                />

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={handleSkip}
                  >
                    <SkipForward className="h-4 w-4" />
                    رد کردن
                  </Button>
                  <Button type="button" disabled={isPending} onClick={handleSave}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    تأیید و ثبت
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
