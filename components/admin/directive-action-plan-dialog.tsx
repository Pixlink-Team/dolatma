"use client";

import { useEffect, useState, useTransition } from "react";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersianDateInput } from "@/components/ui/persian-date-input";
import { Textarea } from "@/components/ui/textarea";
import {
  getDirectiveActionPlanByIdAction,
  getMyDirectiveActionPlanAction,
  submitDirectiveActionPlanAction,
} from "@/lib/actions/directive-action-plan-actions";
import { DEVICE_CAPACITY_TYPE_LABELS } from "@/lib/device-labels";
import type { DeviceCapacityType, DirectiveActionPlan } from "@/lib/types";
import { formatPersianDate, formatPersianDateTime } from "@/lib/utils";

interface CapacityOption {
  id: string;
  title: string;
  capacityType: string;
}

interface DirectiveActionPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directiveId: string;
  campaignId: string;
  directiveTitle: string;
  mode: "edit" | "view";
  planId?: string | null;
  onSaved?: (plan: DirectiveActionPlan) => void;
}

function emptyForm() {
  return {
    studiedAcknowledged: true,
    isExecutable: true as boolean | null,
    notExecutableReason: "",
    plannedActions: "",
    capacityIds: [] as string[],
    capacityNotes: "",
    volumeDescription: "",
    scheduleStart: "",
    scheduleEnd: "",
    scheduleNotes: "",
    executorName: "",
    executorRole: "",
    executorPhone: "",
    obstacles: "",
    supportNeeded: "",
  };
}

function PlanView({ plan }: { plan: DirectiveActionPlan }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {plan.isExecutable ? "قابل اجرا" : "غیرقابل اجرا"}
        </Badge>
        {plan.deviceName && <Badge variant="outline">{plan.deviceName}</Badge>}
        {plan.userName && <Badge variant="outline">{plan.userName}</Badge>}
      </div>

      {!plan.isExecutable ? (
        <FieldBlock label="دلیل غیرقابل‌اجرا بودن">{plan.notExecutableReason || "—"}</FieldBlock>
      ) : (
        <>
          <FieldBlock label="اقدامات برنامه‌ریزی‌شده">{plan.plannedActions || "—"}</FieldBlock>
          <FieldBlock label="حجم اجرا">{plan.volumeDescription || "—"}</FieldBlock>
          <FieldBlock label="زمان‌بندی">
            {[
              plan.scheduleStart ? `شروع: ${formatPersianDate(plan.scheduleStart)}` : null,
              plan.scheduleEnd ? `پایان: ${formatPersianDate(plan.scheduleEnd)}` : null,
              plan.scheduleNotes || null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </FieldBlock>
          <FieldBlock label="مسئول اجرا">
            {[plan.executorName, plan.executorRole, plan.executorPhone]
              .filter(Boolean)
              .join(" · ") || "—"}
          </FieldBlock>
          <FieldBlock label="ظرفیت‌های مورد استفاده">
            {plan.capacityTitles.length > 0
              ? plan.capacityTitles.join("، ")
              : "ظرفیتی انتخاب نشده"}
            {plan.capacityNotes ? `\n${plan.capacityNotes}` : ""}
          </FieldBlock>
        </>
      )}

      <FieldBlock label="موانع">{plan.obstacles || "—"}</FieldBlock>
      <FieldBlock label="حمایت / فایل مورد نیاز">{plan.supportNeeded || "—"}</FieldBlock>
      <p className="text-xs text-muted-foreground">
        ثبت: {formatPersianDateTime(plan.submittedAt)}
      </p>
    </div>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap leading-6">{children}</p>
    </div>
  );
}

export function DirectiveActionPlanDialog({
  open,
  onOpenChange,
  directiveId,
  campaignId,
  directiveTitle,
  mode,
  planId,
  onSaved,
}: DirectiveActionPlanDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [capacities, setCapacities] = useState<CapacityOption[]>([]);
  const [existingPlan, setExistingPlan] = useState<DirectiveActionPlan | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!open) return;

    startTransition(async () => {
      if (mode === "view" && planId) {
        const result = await getDirectiveActionPlanByIdAction(planId, campaignId);
        if (!result.success || !result.plan) {
          toast.error(result.error ?? "بارگذاری برنامه اقدام ناموفق بود");
          return;
        }
        setExistingPlan(result.plan);
        return;
      }

      const result = await getMyDirectiveActionPlanAction(directiveId, campaignId);
      if (!result.success) {
        toast.error(result.error ?? "بارگذاری ناموفق بود");
        return;
      }

      setCapacities(result.capacities);
      setExistingPlan(result.plan);
      if (result.plan) {
        setForm({
          studiedAcknowledged: result.plan.studiedAcknowledged,
          isExecutable: result.plan.isExecutable,
          notExecutableReason: result.plan.notExecutableReason,
          plannedActions: result.plan.plannedActions,
          capacityIds: result.plan.capacityIds,
          capacityNotes: result.plan.capacityNotes,
          volumeDescription: result.plan.volumeDescription,
          scheduleStart: result.plan.scheduleStart ?? "",
          scheduleEnd: result.plan.scheduleEnd ?? "",
          scheduleNotes: result.plan.scheduleNotes,
          executorName: result.plan.executorName,
          executorRole: result.plan.executorRole,
          executorPhone: result.plan.executorPhone,
          obstacles: result.plan.obstacles,
          supportNeeded: result.plan.supportNeeded,
        });
      } else {
        setForm(emptyForm());
      }
    });
  }, [open, mode, planId, directiveId, campaignId]);

  const toggleCapacity = (id: string) => {
    setForm((prev) => ({
      ...prev,
      capacityIds: prev.capacityIds.includes(id)
        ? prev.capacityIds.filter((item) => item !== id)
        : [...prev.capacityIds, id],
    }));
  };

  const submit = () => {
    if (form.isExecutable == null) {
      toast.error("مشخص کنید آیا دستور قابل اجراست");
      return;
    }
    const isExecutable = form.isExecutable;

    startTransition(async () => {
      const result = await submitDirectiveActionPlanAction(directiveId, campaignId, {
        studiedAcknowledged: form.studiedAcknowledged,
        isExecutable,
        notExecutableReason: form.notExecutableReason,
        plannedActions: form.plannedActions,
        capacityIds: form.capacityIds,
        capacityNotes: form.capacityNotes,
        volumeDescription: form.volumeDescription,
        scheduleStart: form.scheduleStart || null,
        scheduleEnd: form.scheduleEnd || null,
        scheduleNotes: form.scheduleNotes,
        executorName: form.executorName,
        executorRole: form.executorRole,
        executorPhone: form.executorPhone,
        obstacles: form.obstacles,
        supportNeeded: form.supportNeeded,
      });

      if (!result.success) {
        toast.error(result.error ?? "ثبت برنامه اقدام ناموفق بود");
        return;
      }

      setExistingPlan(result.plan);
      onSaved?.(result.plan);
      toast.success("تعهد و برنامه اقدام ثبت شد");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            {mode === "view" ? "مشاهده برنامه اقدام" : "تعهد و برنامه اقدام"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          دستورکار: <span className="font-medium text-foreground">{directiveTitle}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          این برنامه مبنای ارزیابی اجرای دستور است؛ صرفاً آپلود محتوا کافی نیست.
        </p>

        {mode === "view" ? (
          existingPlan ? (
            <PlanView plan={existingPlan} />
          ) : (
            <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
          )
        ) : (
          <div className="space-y-4">
            <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.studiedAcknowledged}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    studiedAcknowledged: event.target.checked,
                  }))
                }
              />
              <span>دستور را دریافت و مطالعه کرده‌ام.</span>
            </label>

            <div className="space-y-2">
              <Label>آیا این دستور برای دستگاه شما قابل اجراست؟</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={form.isExecutable === true ? "default" : "outline"}
                  onClick={() => setForm((prev) => ({ ...prev, isExecutable: true }))}
                >
                  بله، قابل اجراست
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.isExecutable === false ? "default" : "outline"}
                  onClick={() => setForm((prev) => ({ ...prev, isExecutable: false }))}
                >
                  خیر، قابل اجرا نیست
                </Button>
              </div>
            </div>

            {form.isExecutable === false && (
              <div className="space-y-2">
                <Label>دلیل غیرقابل‌اجرا بودن</Label>
                <Textarea
                  value={form.notExecutableReason}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notExecutableReason: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="مثلاً خارج از حوزه مأموریت / نبود ظرفیت"
                />
              </div>
            )}

            {form.isExecutable === true && (
              <>
                <div className="space-y-2">
                  <Label>چه اقداماتی انجام خواهید داد؟</Label>
                  <Textarea
                    value={form.plannedActions}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, plannedActions: event.target.value }))
                    }
                    rows={4}
                    placeholder="فهرست اقدامات اجرایی"
                  />
                </div>

                <div className="space-y-2">
                  <Label>از کدام ظرفیت‌ها استفاده می‌کنید؟</Label>
                  {capacities.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      ظرفیتی در شناسنامه دستگاه ثبت نشده؛ در صورت نیاز توضیح دهید.
                    </p>
                  ) : (
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                      {capacities.map((capacity) => (
                        <label key={capacity.id} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={form.capacityIds.includes(capacity.id)}
                            onChange={() => toggleCapacity(capacity.id)}
                          />
                          <span>
                            {capacity.title}
                            <span className="block text-xs text-muted-foreground">
                              {DEVICE_CAPACITY_TYPE_LABELS[
                                capacity.capacityType as DeviceCapacityType
                              ] ?? capacity.capacityType}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <Textarea
                    value={form.capacityNotes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, capacityNotes: event.target.value }))
                    }
                    rows={2}
                    placeholder="توضیح تکمیلی درباره ظرفیت‌ها (اختیاری)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>حجم اجرا</Label>
                  <Textarea
                    value={form.volumeDescription}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        volumeDescription: event.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="مثلاً ۲۰ بیلبورد در ۵ شهر / ۳ پست در هفته"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>شروع زمان‌بندی</Label>
                    <PersianDateInput
                      allowEmpty
                      value={form.scheduleStart}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, scheduleStart: value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>پایان زمان‌بندی</Label>
                    <PersianDateInput
                      allowEmpty
                      value={form.scheduleEnd}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, scheduleEnd: value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>توضیح زمان‌بندی</Label>
                  <Input
                    value={form.scheduleNotes}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, scheduleNotes: event.target.value }))
                    }
                    placeholder="مثلاً طی دو هفته اول کمپین"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-1">
                    <Label>مسئول اجرا</Label>
                    <Input
                      value={form.executorName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, executorName: event.target.value }))
                      }
                      placeholder="نام و نام خانوادگی"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>سمت</Label>
                    <Input
                      value={form.executorRole}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, executorRole: event.target.value }))
                      }
                      placeholder="مثلاً روابط عمومی"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تماس</Label>
                    <Input
                      value={form.executorPhone}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, executorPhone: event.target.value }))
                      }
                      placeholder="موبایل"
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>چه مانعی دارید؟</Label>
              <Textarea
                value={form.obstacles}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, obstacles: event.target.value }))
                }
                rows={2}
                placeholder="موانع احتمالی (اختیاری در صورت نبود مانع)"
              />
            </div>

            <div className="space-y-2">
              <Label>به چه حمایت یا فایلی نیاز دارید؟</Label>
              <Textarea
                value={form.supportNeeded}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, supportNeeded: event.target.value }))
                }
                rows={2}
                placeholder="فایل، مجوز، بودجه، هماهنگی مرکزی و …"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="button" disabled={isPending} onClick={submit}>
                {existingPlan ? "به‌روزرسانی تعهد" : "ثبت تعهد و برنامه اقدام"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
