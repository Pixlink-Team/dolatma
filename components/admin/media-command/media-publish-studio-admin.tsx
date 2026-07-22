"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MediaCommandShell } from "@/components/admin/media-command/media-command-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMediaPlatform, getMediaPlatformLabel, type MediaPlatformId } from "@/lib/media-command/platforms";
import { MEDIA_CONTENT_STATUS_LABELS, MEDIA_PUBLISH_MODE_LABELS } from "@/lib/media-command/labels";
import type {
  MediaAccount,
  MediaContent,
  MediaContentStatus,
  MediaPublishMode,
} from "@/lib/media-command/types";
import {
  upsertMediaContentAction,
} from "@/lib/actions/media-command-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

interface Props {
  campaignId: string;
  accounts: MediaAccount[];
  contents: MediaContent[];
  editId?: string | null;
}

type VariantForm = {
  platform: MediaPlatformId;
  bodyText: string;
  title: string;
  description: string;
  hashtags: string;
  link: string;
  coverImageUrl: string;
  scheduledAt: string;
  previewNote: string;
};

export function MediaPublishStudioAdmin({ campaignId, accounts, contents, editId }: Props) {
  const existing = contents.find((c) => c.id === editId) ?? null;
  const connectedAccounts = accounts.filter((a) => a.status === "connected" || a.status === "pending_approval");

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [contentId, setContentId] = useState<string | undefined>(existing?.id);
  const [internalTitle, setInternalTitle] = useState(existing?.internalTitle ?? "");
  const [topic, setTopic] = useState(existing?.topic ?? "");
  const [audience, setAudience] = useState(existing?.audience ?? "");
  const [mainMessage, setMainMessage] = useState(existing?.mainMessage ?? "");
  const [baseText, setBaseText] = useState(existing?.baseText ?? "");
  const [link, setLink] = useState(existing?.link ?? "");
  const [hashtags, setHashtags] = useState((existing?.hashtags ?? []).join(" "));
  const [callToAction, setCallToAction] = useState(existing?.callToAction ?? "");
  const [sensitivityLevel, setSensitivityLevel] = useState(existing?.sensitivityLevel ?? "medium");
  const [expiresAt, setExpiresAt] = useState(existing?.expiresAt?.slice(0, 16) ?? "");
  const [publishMode, setPublishMode] = useState<MediaPublishMode>(existing?.publishMode ?? "normal");
  const [scheduledAt, setScheduledAt] = useState(existing?.scheduledAt?.slice(0, 16) ?? "");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    existing?.targets.map((t) => t.accountId) ?? []
  );
  const [qualityNotes, setQualityNotes] = useState<string[]>([]);

  const selectedPlatforms = useMemo(() => {
    const set = new Set<MediaPlatformId>();
    for (const id of selectedAccountIds) {
      const account = accounts.find((a) => a.id === id);
      if (account) set.add(account.platform);
    }
    return [...set];
  }, [accounts, selectedAccountIds]);

  const [variants, setVariants] = useState<VariantForm[]>(() => {
    if (existing?.variants.length) {
      return existing.variants.map((v) => ({
        platform: v.platform,
        bodyText: v.bodyText,
        title: v.title,
        description: v.description,
        hashtags: v.hashtags.join(" "),
        link: v.link ?? "",
        coverImageUrl: v.coverImageUrl ?? "",
        scheduledAt: v.scheduledAt?.slice(0, 16) ?? "",
        previewNote: v.previewNote ?? "",
      }));
    }
    return [];
  });

  const syncVariants = (accountIds: string[]) => {
    const platforms = new Set<MediaPlatformId>();
    for (const id of accountIds) {
      const account = accounts.find((a) => a.id === id);
      if (account) platforms.add(account.platform);
    }
    setVariants((prev) => {
      const next: VariantForm[] = [];
      for (const platform of platforms) {
        const found = prev.find((v) => v.platform === platform);
        next.push(
          found ?? {
            platform,
            bodyText: baseText,
            title: internalTitle,
            description: mainMessage,
            hashtags,
            link,
            coverImageUrl: "",
            scheduledAt: scheduledAt,
            previewNote: `پیش‌نمایش تقریبی برای ${getMediaPlatformLabel(platform)}`,
          }
        );
      }
      return next;
    });
  };

  const runQualityCheck = () => {
    const notes: string[] = [];
    if (!mainMessage.trim()) notes.push("پیام اصلی کمپین خالی است.");
    if (!callToAction.trim()) notes.push("فراخوان مشخصی تعریف نشده است.");
    if (!baseText.trim()) notes.push("متن پایه ناقص است.");
    if (selectedAccountIds.length === 0) notes.push("هیچ حساب مقصدی انتخاب نشده است.");
    for (const variant of variants) {
      const caps = getMediaPlatform(variant.platform)?.capabilities;
      if (caps?.maxTextLength && variant.bodyText.length > caps.maxTextLength) {
        notes.push(
          `متن ${getMediaPlatformLabel(variant.platform)} از محدودیت طول (${caps.maxTextLength}) بیشتر است.`
        );
      }
    }
    if (expiresAt && new Date(expiresAt) < new Date()) {
      notes.push("تاریخ انقضای محتوا گذشته است؛ انتشار بدون هشدار توصیه نمی‌شود.");
    }
    if (notes.length === 0) notes.push("بررسی اولیه مشکلی نشان نداد. تصمیم نهایی با کاربر مجاز است.");
    setQualityNotes(notes);
  };

  const persist = async (status: MediaContentStatus) => {
    if (!internalTitle.trim()) {
      toast.error("عنوان داخلی را وارد کنید");
      return;
    }
    setSaving(true);
    const result = await upsertMediaContentAction({
      id: contentId,
      campaignId,
      internalTitle,
      topic,
      audience,
      mainMessage,
      baseText,
      mediaUrls: [],
      videoUrl: null,
      attachmentUrls: [],
      link: link || null,
      hashtags: hashtags.split(/[\s,]+/).filter(Boolean),
      callToAction,
      sensitivityLevel,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      status,
      publishMode,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      accountIds: selectedAccountIds,
      variants: variants.map((v) => ({
        platform: v.platform,
        bodyText: v.bodyText,
        title: v.title,
        description: v.description,
        hashtags: v.hashtags.split(/[\s,]+/).filter(Boolean),
        link: v.link || null,
        mediaUrls: [],
        coverImageUrl: v.coverImageUrl || null,
        scheduledAt: v.scheduledAt ? new Date(v.scheduledAt).toISOString() : null,
        previewNote: v.previewNote || null,
      })),
      eventSummary: `ذخیره محتوا با وضعیت ${MEDIA_CONTENT_STATUS_LABELS[status]}`,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error ?? "ذخیره ناموفق بود");
      return;
    }
    setContentId(result.id);
    toast.success(`محتوا به‌عنوان «${MEDIA_CONTENT_STATUS_LABELS[status]}» ذخیره شد`);
  };

  const publishConfirm = async () => {
    await persist("published");
    setConfirmPublish(false);
  };

  return (
    <MediaCommandShell
      campaignId={campaignId}
      title="انتشار محتوا"
      description="استودیوی تولید، نسخه‌بندی شبکه‌ای و توزیع چندحسابی"
    >
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((n) => (
          <Button
            key={n}
            size="sm"
            variant={step === n ? "default" : "outline"}
            onClick={() => setStep(n)}
          >
            {n === 1 ? "مشخصات عمومی" : n === 2 ? "حساب‌ها و نسخه‌ها" : "بازبینی و انتشار"}
          </Button>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مشخصات عمومی محتوا</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>عنوان داخلی</Label>
              <Input value={internalTitle} onChange={(e) => setInternalTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>موضوع</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>مخاطب</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>پیام اصلی</Label>
              <Textarea value={mainMessage} onChange={(e) => setMainMessage(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>متن پایه</Label>
              <Textarea value={baseText} onChange={(e) => setBaseText(e.target.value)} rows={5} />
            </div>
            <div className="space-y-2">
              <Label>لینک</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>هشتگ‌ها</Label>
              <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#راستا #کمپین" />
            </div>
            <div className="space-y-2">
              <Label>فراخوان به اقدام</Label>
              <Input value={callToAction} onChange={(e) => setCallToAction(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>سطح حساسیت</Label>
              <Select
                value={sensitivityLevel}
                onValueChange={(v) =>
                  setSensitivityLevel(v as "low" | "medium" | "high" | "critical")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">کم</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="high">بالا</SelectItem>
                  <SelectItem value="critical">بحرانی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نوع انتشار</Label>
              <Select
                value={publishMode}
                onValueChange={(v) => setPublishMode(v as MediaPublishMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEDIA_PUBLISH_MODE_LABELS) as MediaPublishMode[]).map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {MEDIA_PUBLISH_MODE_LABELS[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تاریخ انقضا</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>زمان‌بندی انتشار</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button
                onClick={() => {
                  syncVariants(selectedAccountIds);
                  setStep(2);
                }}
              >
                ادامه: حساب‌ها و نسخه‌ها
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">انتخاب حساب‌های مقصد</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {connectedAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  ابتدا از بخش حساب‌های متصل، حسابی را متصل کنید.
                </p>
              ) : (
                connectedAccounts.map((account) => {
                  const checked = selectedAccountIds.includes(account.id);
                  return (
                    <label key={account.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selectedAccountIds, account.id]
                            : selectedAccountIds.filter((id) => id !== account.id);
                          setSelectedAccountIds(next);
                          syncVariants(next);
                        }}
                      />
                      <span>
                        <span className="font-medium">{account.accountName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {getMediaPlatformLabel(account.platform)} · {account.organizationName}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </CardContent>
          </Card>

          {selectedPlatforms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">نسخه‌های اختصاصی شبکه</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={selectedPlatforms[0]}>
                  <TabsList className="mb-3 flex h-auto flex-wrap justify-start gap-1">
                    {selectedPlatforms.map((platform) => (
                      <TabsTrigger key={platform} value={platform}>
                        {getMediaPlatformLabel(platform)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {variants.map((variant) => {
                    const caps = getMediaPlatform(variant.platform)?.capabilities;
                    return (
                      <TabsContent key={variant.platform} value={variant.platform} className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label>
                              متن مخصوص شبکه
                              {caps?.maxTextLength ? ` (حداکثر ${caps.maxTextLength})` : ""}
                            </Label>
                            <Textarea
                              rows={5}
                              value={variant.bodyText}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((v) =>
                                    v.platform === variant.platform
                                      ? { ...v, bodyText: e.target.value }
                                      : v
                                  )
                                )
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              طول فعلی: {variant.bodyText.length}
                              {!caps?.publishVideo ? " · این شبکه ویدیو را پشتیبانی نمی‌کند" : ""}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>عنوان</Label>
                            <Input
                              value={variant.title}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((v) =>
                                    v.platform === variant.platform
                                      ? { ...v, title: e.target.value }
                                      : v
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>لینک</Label>
                            <Input
                              value={variant.link}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((v) =>
                                    v.platform === variant.platform
                                      ? { ...v, link: e.target.value }
                                      : v
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>توضیحات</Label>
                            <Textarea
                              rows={3}
                              value={variant.description}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((v) =>
                                    v.platform === variant.platform
                                      ? { ...v, description: e.target.value }
                                      : v
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>هشتگ</Label>
                            <Input
                              value={variant.hashtags}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((v) =>
                                    v.platform === variant.platform
                                      ? { ...v, hashtags: e.target.value }
                                      : v
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>زمان انتشار این نسخه</Label>
                            <Input
                              type="datetime-local"
                              value={variant.scheduledAt}
                              disabled={!caps?.scheduling}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((v) =>
                                    v.platform === variant.platform
                                      ? { ...v, scheduledAt: e.target.value }
                                      : v
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="rounded-lg border bg-muted/30 p-3 text-sm md:col-span-2">
                            <p className="mb-1 font-medium">پیش‌نمایش تقریبی</p>
                            <p className="whitespace-pre-wrap text-muted-foreground">
                              {variant.bodyText || "متن نسخه هنوز وارد نشده است."}
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              بازگشت
            </Button>
            <Button
              onClick={() => {
                runQualityCheck();
                setStep(3);
              }}
            >
              ادامه: بازبینی
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">کنترل روایت و کیفیت محتوا</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {qualityNotes.map((note) => (
                <p key={note} className="rounded-md border px-3 py-2 text-sm">
                  {note}
                </p>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={runQualityCheck}>
                اجرای مجدد بررسی
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">خلاصه انتشار</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>عنوان: {internalTitle || "—"}</p>
              <p>نوع انتشار: {MEDIA_PUBLISH_MODE_LABELS[publishMode]}</p>
              <p>تعداد حساب مقصد: {selectedAccountIds.length}</p>
              <p>شبکه‌ها: {selectedPlatforms.map(getMediaPlatformLabel).join("، ") || "—"}</p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              بازگشت
            </Button>
            <Button variant="secondary" disabled={saving} onClick={() => persist("draft")}>
              ذخیره پیش‌نویس
            </Button>
            <Button variant="outline" disabled={saving} onClick={() => persist("pending_review")}>
              ارسال برای تأیید
            </Button>
            <Button
              variant="outline"
              disabled={saving || !scheduledAt}
              onClick={() => persist("scheduled")}
            >
              زمان‌بندی
            </Button>
            <Button disabled={saving} onClick={() => setConfirmPublish(true)}>
              انتشار فوری
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title="تأیید انتشار فوری"
        description="محتوا روی حساب‌های انتخاب‌شده منتشر می‌شود. ادامه می‌دهید؟"
        onConfirm={publishConfirm}
      />
    </MediaCommandShell>
  );
}
