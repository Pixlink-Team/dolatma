"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CapacityDetailsFields,
  resetDetailsForType,
} from "@/components/admin/capacity-details-fields";
import {
  deleteMyCapacityAction,
  saveMyCapacityAction,
} from "@/lib/actions/capacity-actions";
import {
  formatCapacityDetailsSummary,
  getCapacityExternalUrl,
  normalizeCapacityDetails,
  type CapacityDetails,
} from "@/lib/capacity-details";
import { DEVICE_CAPACITY_TYPE_LABELS } from "@/lib/device-labels";
import {
  DEVICE_CAPACITY_TYPES,
  type DeviceCapacityType,
  type UserCapacity,
} from "@/lib/types";

interface UserPassportCapacitiesProps {
  initialCapacities: UserCapacity[];
}

type CapacityForm = {
  capacityType: DeviceCapacityType;
  title: string;
  description: string;
  ownerName: string;
  coverageScope: string;
  province: string;
  city: string;
  address: string;
  details: CapacityDetails;
  isActive: boolean;
};

function defaultFormValues(
  capacityType: DeviceCapacityType = "website"
): CapacityForm {
  return {
    capacityType,
    title: "",
    description: "",
    ownerName: "",
    coverageScope: "",
    province: "",
    city: "",
    address: "",
    details: resetDetailsForType(capacityType),
    isActive: true,
  };
}

export function UserPassportCapacities({ initialCapacities }: UserPassportCapacitiesProps) {
  const [capacities, setCapacities] = useState(initialCapacities);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CapacityForm>({
    defaultValues: defaultFormValues(),
  });

  const typeOptions = useMemo(() => DEVICE_CAPACITY_TYPES, []);

  const watchedType = form.watch("capacityType");
  const watchedDetails = form.watch("details");
  const watchedProvince = form.watch("province");
  const watchedCity = form.watch("city");
  const watchedAddress = form.watch("address");

  const openCreate = () => {
    setEditingId(null);
    form.reset(defaultFormValues());
    setOpen(true);
  };

  const onSave = form.handleSubmit((data) => {
    startTransition(async () => {
      const details = normalizeCapacityDetails(data.capacityType, data.details);
      const result = await saveMyCapacityAction({
        id: editingId ?? undefined,
        capacityType: data.capacityType,
        title: data.title,
        description: data.description,
        ownerName: data.ownerName,
        coverageScope: data.coverageScope,
        province: data.province,
        city: data.city,
        address: data.address,
        details: details as Record<string, unknown>,
        isActive: data.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "دارایی به‌روز شد" : "دارایی ثبت شد");
      setOpen(false);
      const nextFields = {
        capacityType: data.capacityType,
        title: data.title.trim(),
        description: data.description.trim() || null,
        ownerName: data.ownerName.trim() || null,
        coverageScope: data.coverageScope.trim() || null,
        province: data.province.trim() || null,
        city: data.city.trim() || null,
        address: data.address.trim() || null,
        details: details as UserCapacity["details"],
        isActive: data.isActive,
      };
      if (editingId) {
        setCapacities((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...nextFields,
                  lastUpdatedAt: new Date().toISOString(),
                }
              : item
          )
        );
      } else {
        setCapacities((prev) => [
          {
            id: result.id,
            userId: "",
            ...nextFields,
            lastUpdatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    });
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">دارایی‌ها و ظرفیت من</h2>
          <p className="text-xs text-muted-foreground">
            وب‌سایت، اپ، کانال‌های شبکه اجتماعی، شبکه‌های تبلیغاتی و خبری را جداگانه ثبت کنید.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="ml-1 h-4 w-4" />
          ثبت دارایی
        </Button>
      </div>

      {capacities.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز دارایی‌ای ثبت نکرده‌اید.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {capacities.map((item) => {
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
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {DEVICE_CAPACITY_TYPE_LABELS[item.capacityType]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.coverageScope ? `پوشش: ${item.coverageScope} · ` : ""}
                    {item.isActive ? "فعال" : "غیرفعال"}
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
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(item.id);
                      form.reset({
                        capacityType: item.capacityType,
                        title: item.title,
                        description: item.description ?? "",
                        ownerName: item.ownerName ?? "",
                        coverageScope: item.coverageScope ?? "",
                        province: item.province ?? "",
                        city: item.city ?? "",
                        address: item.address ?? "",
                        details,
                        isActive: item.isActive,
                      });
                      setOpen(true);
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
                        const result = await deleteMyCapacityAction(item.id);
                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("دارایی حذف شد");
                        setCapacities((prev) => prev.filter((c) => c.id !== item.id));
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "ویرایش دارایی" : "ثبت دارایی"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={onSave}>
            <div className="space-y-1.5">
              <Label>نوع</Label>
              <Select
                value={watchedType}
                onValueChange={(value) => {
                  const nextType = value as DeviceCapacityType;
                  form.setValue("capacityType", nextType);
                  form.setValue("details", resetDetailsForType(nextType));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((key) => (
                    <SelectItem key={key} value={key}>
                      {DEVICE_CAPACITY_TYPE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>عنوان</Label>
              <Input {...form.register("title", { required: true })} />
            </div>
            <CapacityDetailsFields
              capacityType={watchedType}
              details={watchedDetails}
              province={watchedProvince}
              city={watchedCity}
              address={watchedAddress}
              onDetailsChange={(details) => form.setValue("details", details)}
              onProvinceChange={(province) => form.setValue("province", province)}
              onCityChange={(city) => form.setValue("city", city)}
              onAddressChange={(address) => form.setValue("address", address)}
            />
            <div className="space-y-1.5">
              <Label>توضیح تکمیلی</Label>
              <Textarea rows={2} {...form.register("description")} />
            </div>
            <div className="space-y-1.5">
              <Label>مسئول</Label>
              <Input {...form.register("ownerName")} />
            </div>
            <div className="space-y-1.5">
              <Label>محدوده پوشش</Label>
              <Input {...form.register("coverageScope")} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label>فعال</Label>
              <Switch
                checked={form.watch("isActive")}
                onCheckedChange={(checked) => form.setValue("isActive", checked)}
              />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              ذخیره
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
