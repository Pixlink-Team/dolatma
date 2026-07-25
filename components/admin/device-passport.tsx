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
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
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
  deleteDeviceStaffAction,
  saveDeviceAction,
  saveDeviceCapacityAction,
  saveDeviceStaffAction,
} from "@/lib/actions/device-actions";
import {
  CapacityDetailsFields,
  resetDetailsForType,
} from "@/components/admin/capacity-details-fields";
import { ProvinceCityFields } from "@/components/admin/province-city-fields";
import {
  formatCapacityDetailsSummary,
  getCapacityExternalUrl,
  normalizeCapacityDetails,
} from "@/lib/capacity-details";
import {
  DEVICE_CAPACITY_TYPE_LABELS,
  DEVICE_READINESS_LABELS,
  DEVICE_SCOPE_LABELS,
  DEVICE_STAFF_EDUCATION_LABELS,
  DEVICE_STAFF_GENDER_LABELS,
  DEVICE_STATUS_LABELS,
  DEVICE_TYPE_LABELS,
} from "@/lib/device-labels";
import { ORG_ROLES, type OrgRole } from "@/lib/org-roles";
import {
  DEVICE_CAPACITY_TYPES,
  type AdminUser,
  type DeviceActivityScope,
  type DeviceCapacityType,
  type DevicePassport,
  type DeviceStaff,
  type DeviceStaffEducation,
  type DeviceStaffGender,
  type DeviceStatus,
  type DeviceType,
} from "@/lib/types";
import { getUserRoleDisplayLabel } from "@/lib/user-roles";
import {
  composeLandline,
  extractLocalLandline,
  getIranAreaCode,
} from "@/lib/iran-phone-area-codes";
import { adminHref } from "@/lib/utils";
import { useAdminCampaign } from "@/components/admin/admin-campaign-provider";
import { PersianDateInput } from "@/components/ui/persian-date-input";
import { MediaUpload } from "@/components/ui/media-upload";
import { stripFileAccessToken } from "@/lib/uploads";

const ORG_ROLE_SORT_ORDER: Record<OrgRole, number> = {
  primary: 0,
  supervisor: 1,
  deputy: 2,
  pr: 3,
};

function isUserOnDevice(user: AdminUser, deviceId: string): boolean {
  const homeId = user.deviceId ?? user.organizationId ?? user.ministryId ?? null;
  return homeId === deviceId;
}

function sortContactUsers(users: AdminUser[]): AdminUser[] {
  return [...users].sort((a, b) => {
    const aRole = a.orgRole && ORG_ROLES.includes(a.orgRole) ? a.orgRole : null;
    const bRole = b.orgRole && ORG_ROLES.includes(b.orgRole) ? b.orgRole : null;
    const aOrder = aRole != null ? ORG_ROLE_SORT_ORDER[aRole] : 99;
    const bOrder = bRole != null ? ORG_ROLE_SORT_ORDER[bRole] : 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, "fa");
  });
}

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
  status: z.enum(["active", "inactive", "suspended"]),
});

const staffSchema = z.object({
  firstName: z.string().min(1, "نام الزامی است"),
  lastName: z.string().min(1, "نام خانوادگی الزامی است"),
  mobile: z.string().min(1, "شماره موبایل الزامی است"),
  gender: z.enum(["male", "female"]),
  birthDate: z.string().optional(),
  position: z.string().min(1, "سمت الزامی است"),
  education: z.enum([
    "below_diploma",
    "diploma",
    "associate",
    "bachelor",
    "master",
    "doctorate",
    "seminary",
    "other",
  ]),
  isActive: z.boolean(),
});

const capacitySchema = z.object({
  capacityType: z.enum(DEVICE_CAPACITY_TYPES as [DeviceCapacityType, ...DeviceCapacityType[]]),
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

const CHILD_DEVICE_TYPES = (Object.keys(DEVICE_TYPE_LABELS) as DeviceType[]).filter(
  (key) => key !== "ministry"
);

interface DevicePassportViewProps {
  initialPassport: DevicePassport;
  /** Own-device user may manage staff registry. */
  canManageStaff?: boolean;
  /** Own-device user may manage capacities and profile. */
  canManageAdminSections?: boolean;
  /** Only full admin may change ministry placement / root ministry type. */
  canChangeMinistry?: boolean;
}

export function DevicePassportView({
  initialPassport,
  canManageStaff = true,
  canManageAdminSections = true,
  canChangeMinistry = false,
}: DevicePassportViewProps) {
  const { campaignId } = useAdminCampaign();
  const passport = initialPassport;
  const [profileOpen, setProfileOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [capacityOpen, setCapacityOpen] = useState(false);
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canEditProfile = canManageStaff || canManageAdminSections;
  const device = passport.device;
  const isRootMinistry = !device.parentId;
  const lockTypeField = !canChangeMinistry && isRootMinistry;
  const profileTypeOptions = canChangeMinistry
    ? (Object.keys(DEVICE_TYPE_LABELS) as DeviceType[])
    : isRootMinistry
      ? (["ministry"] as DeviceType[])
      : CHILD_DEVICE_TYPES;
  const initialAreaCode = getIranAreaCode(device.province, device.city);

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
      phones: extractLocalLandline(device.phones[0] ?? "", initialAreaCode),
      status: device.status,
    },
  });

  const watchedProvince = profileForm.watch("province");
  const watchedCity = profileForm.watch("city");
  const phoneAreaCode = getIranAreaCode(watchedProvince, watchedCity);

  const staffForm = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      mobile: "",
      gender: "male" as DeviceStaffGender,
      birthDate: "",
      position: "",
      education: "bachelor" as DeviceStaffEducation,
      isActive: true,
    },
  });

  const capacityForm = useForm({
    resolver: zodResolver(capacitySchema),
    defaultValues: {
      capacityType: "website" as DeviceCapacityType,
      title: "",
      description: "",
      ownerName: "",
      coverageScope: "",
      province: "",
      city: "",
      address: "",
      details: resetDetailsForType("website") as Record<string, unknown>,
      isActive: true,
    },
  });

  const watchedCapacityType = capacityForm.watch("capacityType");
  const watchedCapacityDetails = capacityForm.watch("details");
  const watchedCapacityProvince = capacityForm.watch("province");
  const watchedCapacityCity = capacityForm.watch("city");
  const watchedCapacityAddress = capacityForm.watch("address");

  const contactUsers = useMemo(
    () =>
      sortContactUsers(
        passport.users.filter((user) => isUserOnDevice(user, device.id))
      ),
    [passport.users, device.id]
  );
  const staffMembers = passport.staff ?? [];

  const openStaffDialog = (item?: DeviceStaff) => {
    if (item) {
      setEditingStaffId(item.id);
      staffForm.reset({
        firstName: item.firstName,
        lastName: item.lastName,
        mobile: item.mobile,
        gender: item.gender,
        birthDate: item.birthDate ?? "",
        position: item.position,
        education: item.education,
        isActive: item.isActive,
      });
    } else {
      setEditingStaffId(null);
      staffForm.reset({
        firstName: "",
        lastName: "",
        mobile: "",
        gender: "male",
        birthDate: "",
        position: "",
        education: "bachelor",
        isActive: true,
      });
    }
    setStaffOpen(true);
  };

  const refresh = () => window.location.reload();

  const onSaveProfile = profileForm.handleSubmit((data) => {
    startTransition(async () => {
      const result = await saveDeviceAction({
        id: device.id,
        name: data.name,
        shortName: data.shortName || null,
        logoUrl: stripFileAccessToken(data.logoUrl || "") || null,
        type: data.type as DeviceType,
        parentId: device.parentId,
        province: data.province || null,
        city: data.city || null,
        activityScope: data.activityScope as DeviceActivityScope,
        mission: data.mission || null,
        address: data.address || null,
        phones: (() => {
          const full = composeLandline(
            getIranAreaCode(data.province, data.city),
            data.phones || ""
          );
          return full ? [full] : [];
        })(),
        website: device.website ?? null,
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

  const onSaveStaff = staffForm.handleSubmit((data) => {
    startTransition(async () => {
      const result = await saveDeviceStaffAction({
        id: editingStaffId ?? undefined,
        deviceId: device.id,
        firstName: data.firstName,
        lastName: data.lastName,
        mobile: data.mobile,
        gender: data.gender as DeviceStaffGender,
        birthDate: data.birthDate || null,
        position: data.position,
        education: data.education as DeviceStaffEducation,
        isActive: data.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editingStaffId ? "اطلاعات کارمند به‌روز شد" : "کارمند ثبت شد");
      setStaffOpen(false);
      setEditingStaffId(null);
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
      toast.success("دارایی ذخیره شد");
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
            {canEditProfile ? (
              <Button size="sm" variant="outline" onClick={() => setProfileOpen(true)}>
                <Pencil className="ml-1 h-4 w-4" />
                ویرایش اطلاعات
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                فقط مشاهده — تکمیل شناسنامه با مسئول همین دستگاه است.
              </p>
            )}
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
          <div className="sm:col-span-2">
            <InfoItem label="حوزه مأموریت" value={device.mission || "—"} />
          </div>
        </dl>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            مسئولان و راه‌های ارتباطی
          </h2>
          <Button size="sm" variant="outline" asChild>
            <Link href={adminHref("/admin/users", campaignId)}>مدیریت کاربران</Link>
          </Button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          کاربران این دستگاه با سمت‌های سازمانی (مدیر، ناظر، معاون، روابط عمومی).
        </p>
        {contactUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            کاربری با نقش سازمانی به این دستگاه متصل نیست.
          </p>
        ) : (
          <div className="space-y-2">
            {contactUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{user.name}</p>
                    <Badge variant="secondary">{getUserRoleDisplayLabel(user)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[user.phone, user.email, user.province].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {user.accountManagerName ? (
                    <p className="text-xs text-muted-foreground">
                      مسئول اکانت: {user.accountManagerName}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">کارکنان</h2>
          {canManageStaff ? (
            <Button size="sm" onClick={() => openStaffDialog()}>
              <Plus className="ml-1 h-4 w-4" />
              افزودن کارمند
            </Button>
          ) : null}
        </div>
        {staffMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">کارمندی ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="pb-2 font-medium">نام و نام خانوادگی</th>
                  <th className="pb-2 font-medium">موبایل</th>
                  <th className="pb-2 font-medium">جنسیت</th>
                  <th className="pb-2 font-medium">تاریخ تولد</th>
                  <th className="pb-2 font-medium">سمت</th>
                  <th className="pb-2 font-medium">مدرک تحصیلی</th>
                  <th className="pb-2 font-medium">وضعیت</th>
                  <th className="pb-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {staffMembers.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">
                      {item.firstName} {item.lastName}
                    </td>
                    <td className="py-2.5">{item.mobile}</td>
                    <td className="py-2.5">{DEVICE_STAFF_GENDER_LABELS[item.gender]}</td>
                    <td className="py-2.5">
                      {item.birthDate
                        ? new Date(`${item.birthDate}T12:00:00`).toLocaleDateString("fa-IR")
                        : "—"}
                    </td>
                    <td className="py-2.5">{item.position}</td>
                    <td className="py-2.5">{DEVICE_STAFF_EDUCATION_LABELS[item.education]}</td>
                    <td className="py-2.5">
                      <Badge variant={item.isActive ? "secondary" : "outline"}>
                        {item.isActive ? "فعال" : "غیرفعال"}
                      </Badge>
                    </td>
                    <td className="py-2.5">
                      {canManageStaff ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => openStaffDialog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                const result = await deleteDeviceStaffAction(item.id, device.id);
                                if (!result.success) {
                                  toast.error(result.error);
                                  return;
                                }
                                toast.success("کارمند حذف شد");
                                refresh();
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">ساختار و ارتباط</h2>
        <div className="space-y-0">
          {(passport.ancestors ?? []).map((ancestor, index) => (
            <div key={ancestor.id}>
              <div
                className="rounded-lg border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50"
                style={{ marginRight: index * 20 }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={adminHref(`/admin/devices/${ancestor.id}`, campaignId)}
                    className="font-medium text-primary hover:underline"
                  >
                    {ancestor.shortName || ancestor.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {DEVICE_TYPE_LABELS[ancestor.type]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">سطح {index + 1}</span>
                  </div>
                </div>
                {ancestor.shortName && ancestor.name !== ancestor.shortName ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{ancestor.name}</p>
                ) : null}
              </div>
              <div
                className="flex items-center py-1"
                style={{ marginRight: index * 20 + 16 }}
                aria-hidden
              >
                <div className="h-4 w-px bg-border" />
              </div>
            </div>
          ))}

          <div
            className="rounded-lg border-2 border-primary/40 bg-primary/5 px-3 py-2.5"
            style={{ marginRight: (passport.ancestors?.length ?? 0) * 20 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {device.shortName || device.name}
                </p>
                {device.shortName && device.name !== device.shortName ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{device.name}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  دستگاه فعلی
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {DEVICE_TYPE_LABELS[device.type]}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  سطح {(passport.ancestors?.length ?? 0) + 1}
                </span>
              </div>
            </div>
          </div>

          {passport.children.length > 0 ? (
            <>
              <div
                className="flex items-center py-1"
                style={{ marginRight: (passport.ancestors?.length ?? 0) * 20 + 16 }}
                aria-hidden
              >
                <div className="h-4 w-px bg-border" />
              </div>
              <div
                className="space-y-2"
                style={{ marginRight: (passport.ancestors?.length ?? 0) * 20 + 20 }}
              >
                <p className="text-xs text-muted-foreground">زیرمجموعه‌ها</p>
                <ul className="space-y-2">
                  {passport.children.map((child) => (
                    <li key={child.id}>
                      <div className="rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link
                            href={adminHref(`/admin/devices/${child.id}`, campaignId)}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {child.shortName || child.name}
                          </Link>
                          <Badge variant="outline" className="text-[10px]">
                            {DEVICE_TYPE_LABELS[child.type]}
                          </Badge>
                        </div>
                        {child.shortName && child.name !== child.shortName ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{child.name}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p
              className="mt-3 text-sm text-muted-foreground"
              style={{ marginRight: (passport.ancestors?.length ?? 0) * 20 }}
            >
              زیرمجموعه‌ای ثبت نشده است.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border-2 border-primary/20 bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">دارایی‌ها و ظرفیت‌ها</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              وب‌سایت، اپلیکیشن، شبکه‌های اجتماعی، شبکه‌های تبلیغاتی و خبری و سایر دارایی‌های رسانه‌ای را اینجا ثبت کنید.
            </p>
          </div>
          {canManageAdminSections ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingCapacityId(null);
                capacityForm.reset({
                  capacityType: "website",
                  title: "",
                  description: "",
                  ownerName: "",
                  coverageScope: "",
                  province: "",
                  city: "",
                  address: "",
                  details: resetDetailsForType("website") as Record<string, unknown>,
                  isActive: true,
                });
                setCapacityOpen(true);
              }}
            >
              <Plus className="ml-1 h-4 w-4" />
              ثبت دارایی
            </Button>
          ) : null}
        </div>
        {passport.capacities.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
            <p className="text-sm font-medium">هنوز دارایی‌ای ثبت نشده است</p>
            <p className="mt-1 text-xs text-muted-foreground">
              سایت، اپ، کانال‌های شبکه اجتماعی و شبکه‌های تبلیغ/خبر را به‌صورت جداگانه ثبت کنید.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {passport.capacities.map((item) => {
              const details = normalizeCapacityDetails(item.capacityType, item.details);
              const summary = formatCapacityDetailsSummary(
                item.capacityType,
                details,
                {
                  province: item.province,
                  city: item.city,
                  address: item.address,
                }
              );
              const externalUrl = getCapacityExternalUrl(item.capacityType, details);
              return (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border bg-background p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {DEVICE_CAPACITY_TYPE_LABELS[item.capacityType]}
                    </Badge>
                    <Badge
                      variant={item.isActive ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {item.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.ownerName ? `مسئول: ${item.ownerName}` : ""}
                    {item.ownerName && item.coverageScope ? " · " : ""}
                    {item.coverageScope ? `پوشش: ${item.coverageScope}` : ""}
                  </p>
                  {summary ? (
                    <p className="mt-1 text-xs text-foreground/80">{summary}</p>
                  ) : null}
                  {externalUrl ? (
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      dir="ltr"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {externalUrl}
                    </a>
                  ) : null}
                </div>
                {canManageAdminSections ? (
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
                          details: details as Record<string, unknown>,
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
                          toast.success("دارایی حذف شد");
                          refresh();
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : null}
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
            <Field label="لوگو">
              <MediaUpload
                value={profileForm.watch("logoUrl") || ""}
                onChange={(url) => profileForm.setValue("logoUrl", url)}
                kind="image"
                accept="image/jpeg,image/png,image/webp"
                showLinkInput={false}
                optimizeBeforeUpload={{ maxEdge: 512, targetMaxBytes: 150 * 1024 }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                تصویر را بکشید و رها کنید؛ اندازه و حجم به‌صورت خودکار بهینه می‌شود.
              </p>
            </Field>
            {!canChangeMinistry ? (
              <Field label="وزارتخانه / محل قرارگیری">
                <Input
                  value={
                    passport.parent
                      ? `زیرمجموعهٔ ${passport.parent.shortName || passport.parent.name}`
                      : DEVICE_TYPE_LABELS.ministry
                  }
                  disabled
                  readOnly
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  وزارتخانه توسط مدیر سامانه تعیین می‌شود و قابل تغییر نیست.
                </p>
              </Field>
            ) : null}
            <Field label="نوع">
              <Select
                value={profileForm.watch("type")}
                onValueChange={(value) => profileForm.setValue("type", value as DeviceType)}
                disabled={lockTypeField}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {profileTypeOptions.map((key) => (
                    <SelectItem key={key} value={key}>{DEVICE_TYPE_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lockTypeField ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  نوع وزارتخانه ریشه قابل تغییر نیست.
                </p>
              ) : null}
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
            <ProvinceCityFields
              province={watchedProvince ?? ""}
              city={watchedCity ?? ""}
              onProvinceChange={(value) => {
                profileForm.setValue("province", value);
                const nextCode = getIranAreaCode(value, "");
                const currentLocal = profileForm.getValues("phones") ?? "";
                profileForm.setValue(
                  "phones",
                  extractLocalLandline(currentLocal, nextCode)
                );
              }}
              onCityChange={(value) => {
                profileForm.setValue("city", value);
                const nextCode = getIranAreaCode(
                  profileForm.getValues("province"),
                  value
                );
                const currentLocal = profileForm.getValues("phones") ?? "";
                profileForm.setValue(
                  "phones",
                  extractLocalLandline(currentLocal, nextCode)
                );
              }}
            />
            <Field label="آدرس"><Input {...profileForm.register("address")} /></Field>
            <Field label="شماره تماس با کد شهر">
              <div className="flex items-center gap-2" dir="ltr">
                <span
                  className="inline-flex h-9 shrink-0 items-center rounded-md border bg-muted px-3 font-mono text-sm tabular-nums text-muted-foreground"
                  title={
                    phoneAreaCode
                      ? "کد شهر بر اساس استان انتخاب‌شده"
                      : "برای تعیین کد شهر، استان را انتخاب کنید"
                  }
                >
                  {phoneAreaCode ?? "—"}
                </span>
                <Input
                  inputMode="tel"
                  className="text-left"
                  placeholder={phoneAreaCode ? "شماره محلی" : "ابتدا استان را انتخاب کنید"}
                  disabled={!phoneAreaCode}
                  {...profileForm.register("phones")}
                />
              </div>
            </Field>
            <Field label="مأموریت"><Textarea rows={3} {...profileForm.register("mission")} /></Field>
            <Button type="submit" disabled={isPending} className="w-full">ذخیره</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={staffOpen}
        onOpenChange={(open) => {
          setStaffOpen(open);
          if (!open) setEditingStaffId(null);
        }}
      >
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStaffId ? "ویرایش کارمند" : "افزودن کارمند"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onSaveStaff}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نام">
                <Input {...staffForm.register("firstName")} />
              </Field>
              <Field label="نام خانوادگی">
                <Input {...staffForm.register("lastName")} />
              </Field>
            </div>
            <Field label="شماره موبایل">
              <Input
                inputMode="tel"
                dir="ltr"
                className="text-left"
                {...staffForm.register("mobile")}
              />
            </Field>
            <Field label="جنسیت">
              <Select
                value={staffForm.watch("gender")}
                onValueChange={(value) =>
                  staffForm.setValue("gender", value as DeviceStaffGender)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_STAFF_GENDER_LABELS) as DeviceStaffGender[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {DEVICE_STAFF_GENDER_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="تاریخ تولد">
              <PersianDateInput
                allowEmpty
                placeholder="انتخاب تاریخ تولد"
                value={staffForm.watch("birthDate") || undefined}
                onChange={(isoDate) => staffForm.setValue("birthDate", isoDate)}
              />
            </Field>
            <Field label="سمت">
              <Input {...staffForm.register("position")} />
            </Field>
            <Field label="مدرک تحصیلی">
              <Select
                value={staffForm.watch("education")}
                onValueChange={(value) =>
                  staffForm.setValue("education", value as DeviceStaffEducation)
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DEVICE_STAFF_EDUCATION_LABELS) as DeviceStaffEducation[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {DEVICE_STAFF_EDUCATION_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between gap-2">
              <Label>فعال</Label>
              <Switch
                checked={staffForm.watch("isActive")}
                onCheckedChange={(checked) => staffForm.setValue("isActive", checked)}
              />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">ذخیره</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={capacityOpen} onOpenChange={setCapacityOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCapacityId ? "ویرایش دارایی" : "ثبت دارایی"}</DialogTitle>
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
                  {(DEVICE_CAPACITY_TYPES as DeviceCapacityType[]).map((key) => (
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
