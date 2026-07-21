"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight,
  Building2,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteDeviceCapacityAction,
  endDeviceOfficialAction,
  saveDeviceAction,
  saveDeviceCapacityAction,
  saveDeviceOfficialAction,
} from "@/lib/actions/device-actions";
import {
  CapacityDetailsFields,
  resetDetailsForType,
} from "@/components/admin/capacity-details-fields";
import {
  formatCapacityDetailsSummary,
  normalizeCapacityDetails,
} from "@/lib/capacity-details";
import {
  DEVICE_CAPACITY_TYPE_LABELS,
  DEVICE_OFFICIAL_ROLE_LABELS,
  DEVICE_READINESS_LABELS,
  DEVICE_SCOPE_LABELS,
  DEVICE_STATUS_LABELS,
  DEVICE_TYPE_LABELS,
} from "@/lib/device-labels";
import { IRAN_PROVINCES } from "@/lib/iran-locations";
import type {
  DeviceActivityScope,
  DeviceCapacityType,
  DeviceOfficialRole,
  DevicePassport,
  DeviceStatus,
  DeviceType,
} from "@/lib/types";
import { adminHref } from "@/lib/utils";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";

const profileSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().optional(),
  logoUrl: z.string().optional(),
  type: z.enum([
    "ministry",
    "organization",
    "directorate",
    "company",
    "governorate",
    "municipality",
    "other",
  ]),
  province: z.string().optional(),
  city: z.string().optional(),
  activityScope: z.enum(["national", "provincial", "city", "regional"]),
  mission: z.string().optional(),
  address: z.string().optional(),
  phones: z.string().optional(),
  website: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]),
});

const officialSchema = z.object({
  roleType: z.enum(["primary", "deputy", "pr", "campaign_exec", "supervisor"]),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  contactNote: z.string().optional(),
});

const capacitySchema = z.object({
  capacityType: z.enum([
    "branches",
    "website_app",
    "social",
    "sms_panel",
    "billboards",
    "urban_tv",
    "venues",
    "pr_team",
    "creative_team",
    "field_staff",
    "call_center",
    "contractors",
    "other",
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  ownerName: z.string().optional(),
  coverageScope: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean(),
});

function readinessBadgeClass(status: DevicePassport["readiness"]["status"]) {
  switch (status) {
    case "ready":
      return "bg-emerald-600 text-white hover:bg-emerald-600";
    case "needs_completion":
      return "bg-amber-500 text-white hover:bg-amber-500";
    case "high_risk":
      return "bg-destructive text-destructive-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

interface DevicePassportViewProps {
  initialPassport: DevicePassport;
}

export function DevicePassportView({ initialPassport }: DevicePassportViewProps) {
  const { campaignId } = useAdminCampaign();
  const passport = initialPassport;
  const [profileOpen, setProfileOpen] = useState(false);
  const [officialOpen, setOfficialOpen] = useState(false);
  const [capacityOpen, setCapacityOpen] = useState(false);
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [showOfficialHistory, setShowOfficialHistory] = useState(false);
  const [isPending, startTransition] = useTransition();

  const device = passport.device;

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: device.name,
      shortName: device.shortName ?? "",
      logoUrl: device.logoUrl ?? "",
      type: device.type,
      province: device.province ?? "",
      city: device.city ?? "",
      activityScope: device.activityScope,
      mission: device.mission ?? "",
      address: device.address ?? "",
      phones: device.phones.join("، "),
      website: device.website ?? "",
      status: device.status,
    },
  });

  const officialForm = useForm({
    resolver: zodResolver(officialSchema),
    defaultValues: {
      roleType: "primary" as DeviceOfficialRole,
      fullName: "",
      phone: "",
      email: "",
      contactNote: "",
    },
  });

  const capacityForm = useForm({
    resolver: zodResolver(capacitySchema),
    defaultValues: {
      capacityType: "other" as DeviceCapacityType,
      title: "",
      description: "",
      ownerName: "",
      coverageScope: "",
      province: "",
      city: "",
      address: "",
      details: resetDetailsForType("other") as Record<string, unknown>,
      isActive: true,
    },
  });

  const watchedCapacityType = capacityForm.watch("capacityType");
  const watchedCapacityDetails = capacityForm.watch("details");
  const watchedCapacityProvince = capacityForm.watch("province");
  const watchedCapacityCity = capacityForm.watch("city");
  const watchedCapacityAddress = capacityForm.watch("address");

  const activeOfficials = useMemo(
    () => passport.officials.filter((item) => item.isActive),
    [passport.officials]
  );
  const historyOfficials = useMemo(
    () => passport.officials.filter((item) => !item.isActive),
    [passport.officials]
  );

  const refresh = () => window.location.reload();

  const onSaveProfile = profileForm.handleSubmit((data) => {
    startTransition(async () => {
      const result = await saveDeviceAction({
        id: device.id,
        name: data.name,
        shortName: data.shortName || null,
        logoUrl: data.logoUrl || null,
        type: data.type as DeviceType,
        parentId: device.parentId,
        province: data.province || null,
        city: data.city || null,
        activityScope: data.activityScope as DeviceActivityScope,
        mission: data.mission || null,
        address: data.address || null,
        phones: (data.phones || "")
          .split(/[،,]/)
          .map((item) => item.trim())
          .filter(Boolean),
        website: data.website || null,
        socialLinks: device.socialLinks,
        status: data.status as DeviceStatus,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("اطلاعات دستگاه ذخیره شد");
      setProfileOpen(false);
      refresh();
    });
  });

  const onSaveOfficial = officialForm.handleSubmit((data) => {
    startTransition(async () => {
      const result = await saveDeviceOfficialAction({
        deviceId: device.id,
        roleType: data.roleType as DeviceOfficialRole,
        fullName: data.fullName,
        phone: data.phone || null,
        email: data.email || null,
        contactNote: data.contactNote || null,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("مسئول ثبت شد");
      setOfficialOpen(false);
      refresh();
    });
  });

  const onSaveCapacity = capacityForm.handleSubmit((data) => {
    startTransition(async () => {
      const details = normalizeCapacityDetails(
        data.capacityType as DeviceCapacityType,
        data.details ?? {}
      );
      const result = await saveDeviceCapacityAction({
        id: editingCapacityId ?? undefined,
        deviceId: device.id,
        capacityType: data.capacityType as DeviceCapacityType,
        title: data.title,
        description: data.description || null,
        ownerName: data.ownerName || null,
        coverageScope: data.coverageScope || null,
        province: data.province || null,
        city: data.city || null,
        address: data.address || null,
        details: details as Record<string, unknown>,
        isActive: data.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("ظرفیت ذخیره شد");
      setCapacityOpen(false);
      setEditingCapacityId(null);
      refresh();
    });
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={adminHref("/admin/ministries", campaignId)}>
            <ArrowRight className="ml-1 h-4 w-4" />
            بازگشت به فهرست دستگاه‌ها
          </Link>
        </Button>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {device.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={device.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-bold leading-tight">
                {device.shortName || device.name}
              </h1>
              <p className="text-sm text-muted-foreground">{device.name}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{DEVICE_TYPE_LABELS[device.type]}</Badge>
                <Badge variant="outline">{DEVICE_STATUS_LABELS[device.status]}</Badge>
                <Badge variant="outline">{DEVICE_SCOPE_LABELS[device.activityScope]}</Badge>
                {passport.parent && (
                  <Badge variant="outline">
                    زیرمجموعهٔ {passport.parent.shortName || passport.parent.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="max-w-md space-y-2 text-left sm:text-right">
            <Badge className={readinessBadgeClass(passport.readiness.status)}>
              آمادگی: {DEVICE_READINESS_LABELS[passport.readiness.status]}
              {" · "}
              {passport.readiness.score}
            </Badge>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {passport.readiness.reason}
            </p>
            <Button size="sm" variant="outline" onClick={() => setProfileOpen(true)}>
              <Pencil className="ml-1 h-4 w-4" />
              ویرایش اطلاعات
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "دستورهای دریافتی", value: passport.directiveStats.received },
          { label: "دیده‌شده", value: passport.directiveStats.seen },
          { label: "تأییدشده", value: passport.directiveStats.confirmed },
          { label: "برنامه اقدام", value: passport.directiveStats.actionPlans },
          { label: "آپلود محتوا", value: passport.contentStats.totalUploads },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">اطلاعات اصلی</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <InfoItem label="استان / شهر" value={[device.province, device.city].filter(Boolean).join(" / ") || "—"} />
          <InfoItem label="آدرس" value={device.address || "—"} />
          <InfoItem label="تماس" value={device.phones.join("، ") || "—"} />
          <InfoItem label="وب‌سایت" value={device.website || "—"} />
          <div className="sm:col-span-2">
            <InfoItem label="حوزه مأموریت" value={device.mission || "—"} />
          </div>
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">مسئولان و راه‌های ارتباطی</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOfficialHistory((prev) => !prev)}
            >
              {showOfficialHistory ? "مخفی کردن سابقه" : "نمایش سابقه"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                officialForm.reset({
                  roleType: "primary",
                  fullName: "",
                  phone: "",
                  email: "",
                  contactNote: "",
                });
                setOfficialOpen(true);
              }}
            >
              <Plus className="ml-1 h-4 w-4" />
              تعیین مسئول
            </Button>
          </div>
        </div>
        {activeOfficials.length === 0 ? (
          <p className="text-sm text-muted-foreground">مسئول فعالی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {activeOfficials.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{item.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {DEVICE_OFFICIAL_ROLE_LABELS[item.roleType]}
                    {item.phone ? ` · ${item.phone}` : ""}
                    {item.email ? ` · ${item.email}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await endDeviceOfficialAction(item.id, device.id);
                      if (!result.success) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success("مسئولیت پایان یافت (سابقه حفظ شد)");
                      refresh();
                    });
                  }}
                >
                  <UserMinus className="ml-1 h-4 w-4" />
                  پایان مسئولیت
                </Button>
              </div>
            ))}
          </div>
        )}
        {showOfficialHistory && historyOfficials.length > 0 && (
          <div className="mt-4 space-y-2 border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground">سوابق قبلی</p>
            {historyOfficials.map((item) => (
              <div key={item.id} className="rounded-lg border border-dashed p-3 text-sm">
                <span className="font-medium">{item.fullName}</span>
                {" — "}
                {DEVICE_OFFICIAL_ROLE_LABELS[item.roleType]}
                <span className="text-muted-foreground">
                  {" · "}
                  {new Date(item.startedAt).toLocaleDateString("fa-IR")}
                  {" تا "}
                  {item.endedAt
                    ? new Date(item.endedAt).toLocaleDateString("fa-IR")
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            کاربران دستگاه
          </h2>
          <Button size="sm" variant="outline" asChild>
            <Link href={adminHref("/admin/users", campaignId)}>مدیریت کاربران</Link>
          </Button>
        </div>
        {passport.users.length === 0 ? (
          <p className="text-sm text-muted-foreground">کاربری به این دستگاه متصل نیست.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="p-2 text-right font-medium">نام</th>
                  <th className="p-2 text-right font-medium">نقش</th>
                  <th className="p-2 text-right font-medium">تماس</th>
                  <th className="p-2 text-right font-medium">استان</th>
                </tr>
              </thead>
              <tbody>
                {passport.users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="p-2">{user.name}</td>
                    <td className="p-2">{user.role}</td>
                    <td className="p-2">{user.phone || "—"}</td>
                    <td className="p-2">{user.province || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">ساختار و ارتباط</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">دستگاه بالادستی</p>
            {passport.parent ? (
              <Link
                href={adminHref(`/admin/devices/${passport.parent.id}`, campaignId)}
                className="font-medium text-primary hover:underline"
              >
                {passport.parent.shortName || passport.parent.name}
              </Link>
            ) : (
              <p className="text-sm">— (دستگاه ریشه)</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">زیرمجموعه‌ها</p>
            {passport.children.length === 0 ? (
              <p className="text-sm">—</p>
            ) : (
              <ul className="space-y-1">
                {passport.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={adminHref(`/admin/devices/${child.id}`, campaignId)}
                      className="text-sm text-primary hover:underline"
                    >
                      {child.shortName || child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">ظرفیت‌ها و دارایی‌ها</h2>
          <Button
            size="sm"
            onClick={() => {
              setEditingCapacityId(null);
              capacityForm.reset({
                capacityType: "other",
                title: "",
                description: "",
                ownerName: "",
                coverageScope: "",
                province: "",
                city: "",
                address: "",
                details: resetDetailsForType("other") as Record<string, unknown>,
                isActive: true,
              });
              setCapacityOpen(true);
            }}
          >
            <Plus className="ml-1 h-4 w-4" />
            ثبت ظرفیت
          </Button>
        </div>
        {passport.capacities.length === 0 ? (
          <p className="text-sm text-muted-foreground">ظرفیتی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {passport.capacities.map((item) => {
              const summary = formatCapacityDetailsSummary(
                item.capacityType,
                normalizeCapacityDetails(item.capacityType, item.details),
                {
                  province: item.province,
                  city: item.city,
                  address: item.address,
                }
              );
              return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {DEVICE_CAPACITY_TYPE_LABELS[item.capacityType]}
                    {item.ownerName ? ` · مسئول: ${item.ownerName}` : ""}
                    {item.coverageScope ? ` · پوشش: ${item.coverageScope}` : ""}
                    {" · "}
                    {item.isActive ? "فعال" : "غیرفعال"}
                  </p>
                  {summary ? (
                    <p className="mt-1 text-xs text-foreground/80">{summary}</p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingCapacityId(item.id);
                      capacityForm.reset({
                        capacityType: item.capacityType,
                        title: item.title,
                        description: item.description ?? "",
                        ownerName: item.ownerName ?? "",
                        coverageScope: item.coverageScope ?? "",
                        province: item.province ?? "",
                        city: item.city ?? "",
                        address: item.address ?? "",
                        details: normalizeCapacityDetails(
                          item.capacityType,
                          item.details
                        ) as Record<string, unknown>,
                        isActive: item.isActive,
                      });
                      setCapacityOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await deleteDeviceCapacityAction(item.id, device.id);
                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("ظرفیت حذف شد");
                        refresh();
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">سوابق کمپین و دستور</h2>
          <Button size="sm" variant="outline" asChild>
            <Link href={adminHref("/admin/directives", campaignId)}>دستورکارها</Link>
          </Button>
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <InfoItem label="بیلبورد" value={String(passport.contentStats.billboards)} />
          <InfoItem label="پوستر / ویدیو" value={`${passport.contentStats.posters} / ${passport.contentStats.videos}`} />
          <InfoItem label="امتیاز محتوا" value={String(passport.contentStats.score)} />
        </div>
        {passport.campaignHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">سابقه‌ای ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="p-2 text-right font-medium">کمپین</th>
                  <th className="p-2 text-right font-medium">دستور</th>
                  <th className="p-2 text-right font-medium">دیده‌شده</th>
                  <th className="p-2 text-right font-medium">تأیید</th>
                  <th className="p-2 text-right font-medium">تعهد</th>
                  <th className="p-2 text-right font-medium">محتوا</th>
                </tr>
              </thead>
              <tbody>
                {passport.campaignHistory.map((item) => (
                  <tr key={item.campaignId} className="border-b last:border-0">
                    <td className="p-2">
                      <Link
                        href={`/campaign/${item.campaignSlug}`}
                        className="text-primary hover:underline"
                        target="_blank"
                      >
                        {item.campaignTitle}
                      </Link>
                    </td>
                    <td className="p-2">{item.directivesReceived}</td>
                    <td className="p-2">{item.directivesSeen}</td>
                    <td className="p-2">{item.directivesConfirmed}</td>
                    <td className="p-2">{item.actionPlans}</td>
                    <td className="p-2">{item.contentUploads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>ویرایش اطلاعات دستگاه</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onSaveProfile}>
            <Field label="نام کامل"><Input {...profileForm.register("name")} /></Field>
            <Field label="نام کوتاه"><Input {...profileForm.register("shortName")} /></Field>
            <Field label="آدرس لوگو"><Input {...profileForm.register("logoUrl")} /></Field>
            <Field label="نوع">
              <Select
                value={profileForm.watch("type")}
                onValueChange={(value) => profileForm.setValue("type", value as DeviceType)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).map((key) => (
                    <SelectItem key={key} value={key}>{DEVICE_TYPE_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="محدوده فعالیت">
              <Select
                value={profileForm.watch("activityScope")}
                onValueChange={(value) =>
                  profileForm.setValue("activityScope", value as DeviceActivityScope)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_SCOPE_LABELS) as DeviceActivityScope[]).map((key) => (
                    <SelectItem key={key} value={key}>{DEVICE_SCOPE_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="وضعیت">
              <Select
                value={profileForm.watch("status")}
                onValueChange={(value) => profileForm.setValue("status", value as DeviceStatus)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_STATUS_LABELS) as DeviceStatus[]).map((key) => (
                    <SelectItem key={key} value={key}>{DEVICE_STATUS_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="استان">
              <Select
                value={profileForm.watch("province") || "__none__"}
                onValueChange={(value) =>
                  profileForm.setValue("province", value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger><SelectValue placeholder="انتخاب استان" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {IRAN_PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>{province}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="شهر"><Input {...profileForm.register("city")} /></Field>
            <Field label="آدرس"><Input {...profileForm.register("address")} /></Field>
            <Field label="شماره‌های تماس (با ویرگول)">
              <Input {...profileForm.register("phones")} />
            </Field>
            <Field label="وب‌سایت"><Input {...profileForm.register("website")} /></Field>
            <Field label="مأموریت"><Textarea rows={3} {...profileForm.register("mission")} /></Field>
            <Button type="submit" disabled={isPending} className="w-full">ذخیره</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={officialOpen} onOpenChange={setOfficialOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعیین مسئول</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onSaveOfficial}>
            <Field label="نقش">
              <Select
                value={officialForm.watch("roleType")}
                onValueChange={(value) =>
                  officialForm.setValue("roleType", value as DeviceOfficialRole)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_OFFICIAL_ROLE_LABELS) as DeviceOfficialRole[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {DEVICE_OFFICIAL_ROLE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="نام"><Input {...officialForm.register("fullName")} /></Field>
            <Field label="تلفن"><Input {...officialForm.register("phone")} /></Field>
            <Field label="ایمیل"><Input {...officialForm.register("email")} /></Field>
            <Field label="یادداشت ارتباطی">
              <Textarea rows={2} {...officialForm.register("contactNote")} />
            </Field>
            <p className="text-xs text-muted-foreground">
              با ثبت مسئول جدید برای همان نقش، مسئول قبلی به‌صورت خودکار در سوابق آرشیو می‌شود.
            </p>
            <Button type="submit" disabled={isPending} className="w-full">ثبت</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={capacityOpen} onOpenChange={setCapacityOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCapacityId ? "ویرایش ظرفیت" : "ثبت ظرفیت"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onSaveCapacity}>
            <Field label="نوع">
              <Select
                value={watchedCapacityType}
                onValueChange={(value) => {
                  const nextType = value as DeviceCapacityType;
                  capacityForm.setValue("capacityType", nextType);
                  capacityForm.setValue(
                    "details",
                    resetDetailsForType(nextType) as Record<string, unknown>
                  );
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_CAPACITY_TYPE_LABELS) as DeviceCapacityType[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {DEVICE_CAPACITY_TYPE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="عنوان"><Input {...capacityForm.register("title")} /></Field>
            <CapacityDetailsFields
              capacityType={watchedCapacityType as DeviceCapacityType}
              details={normalizeCapacityDetails(
                watchedCapacityType as DeviceCapacityType,
                watchedCapacityDetails ?? {}
              )}
              province={watchedCapacityProvince ?? ""}
              city={watchedCapacityCity ?? ""}
              address={watchedCapacityAddress ?? ""}
              onDetailsChange={(details) =>
                capacityForm.setValue(
                  "details",
                  details as Record<string, unknown>
                )
              }
              onProvinceChange={(province) =>
                capacityForm.setValue("province", province)
              }
              onCityChange={(city) => capacityForm.setValue("city", city)}
              onAddressChange={(address) =>
                capacityForm.setValue("address", address)
              }
            />
            <Field label="توضیح تکمیلی">
              <Textarea rows={2} {...capacityForm.register("description")} />
            </Field>
            <Field label="مسئول"><Input {...capacityForm.register("ownerName")} /></Field>
            <Field label="محدوده پوشش"><Input {...capacityForm.register("coverageScope")} /></Field>
            <div className="flex items-center justify-between gap-2">
              <Label>فعال</Label>
              <Switch
                checked={capacityForm.watch("isActive")}
                onCheckedChange={(checked) => capacityForm.setValue("isActive", checked)}
              />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">ذخیره</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
