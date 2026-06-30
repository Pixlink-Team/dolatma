"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { BillboardLocationMapPicker } from "@/components/admin/billboard-location-map-picker";
import {
  appendPeriodFilesToFormData,
  BillboardDisplayPeriodsEditor,
  buildPeriodsFormPayload,
  type DisplayPeriodDraft,
} from "@/components/admin/billboard-display-periods-editor";
import { getCityCoordinates } from "@/lib/iran-city-coordinates";
import { getCitiesForProvince, IRAN_PROVINCES } from "@/lib/iran-locations";

interface ContributorProfile {
  province?: string | null;
  city?: string | null;
  email: string;
  name: string;
}

interface BillboardCreateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  externalCampaignId: string;
  mode: "admin" | "client";
  contributorProfile?: ContributorProfile | null;
  onCreated?: () => void;
}

export function BillboardCreateAssignmentDialog({
  open,
  onOpenChange,
  campaignId,
  externalCampaignId,
  mode,
  contributorProfile = null,
  onCreated,
}: BillboardCreateAssignmentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [axis, setAxis] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [executionImage, setExecutionImage] = useState<File | null>(null);
  const [coords, setCoords] = useState({ latitude: 35.6892, longitude: 51.389 });
  const [periods, setPeriods] = useState<DisplayPeriodDraft[]>([]);

  useEffect(() => {
    if (!open) return;

    const defaultProvince =
      mode === "client" ? contributorProfile?.province ?? "" : "";
    const defaultCity = mode === "client" ? contributorProfile?.city ?? "" : "";
    const [latitude, longitude] = getCityCoordinates(defaultCity);

    setProvince(defaultProvince);
    setCity(defaultCity);
    setAxis("");
    setAreaSqm("");
    setAddress("");
    setNotes("");
    setExecutionImage(null);
    setCoords({ latitude, longitude });
    setPeriods([]);
  }, [open, mode, contributorProfile]);

  const cities = province ? getCitiesForProvince(province) : [];

  const handleSubmit = () => {
    if (axis.trim().length < 2) {
      toast.error("محور باید حداقل ۲ کاراکتر باشد");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("campaignId", campaignId);
      formData.append("externalCampaignId", externalCampaignId);
      formData.append("axis", axis.trim());
      formData.append("address", address.trim());
      formData.append("area_sqm", areaSqm.trim());
      formData.append("latitude", String(coords.latitude));
      formData.append("longitude", String(coords.longitude));
      if (mode === "admin") {
        if (province) formData.append("province", province);
        if (city) formData.append("city", city);
        if (notes.trim()) formData.append("notes", notes.trim());
        if (executionImage) formData.append("execution_image", executionImage);
      }
      if (periods.length > 0) {
        formData.append("periods", JSON.stringify(buildPeriodsFormPayload(periods)));
        appendPeriodFilesToFormData(formData, periods);
      }

      const response = await fetch("/api/billboard/create-assign", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "ثبت بیلبورد ناموفق بود");
        return;
      }

      toast.success("بیلبورد جدید ثبت و به کمپین وصل شد");
      onOpenChange(false);
      onCreated?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ثبت بیلبورد جدید</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "client"
              ? `بیلبورد جدید در map-bilboard ساخته می‌شود. استان و شهر از پروفایل ${contributorProfile?.name ?? "شما"} ارسال می‌شود. دوره نمایش را می‌توانید بعداً هم اضافه کنید.`
              : "بیلبورد جدید در map-bilboard ساخته و به کمپین وصل می‌شود. دوره نمایش اختیاری است و بعداً هم قابل افزودن است."}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "admin" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>استان</Label>
                <Select value={province} onValueChange={setProvince}>
                  <SelectTrigger>
                    <SelectValue placeholder="استان" />
                  </SelectTrigger>
                  <SelectContent>
                    {IRAN_PROVINCES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>شهر</Label>
                <Select value={city} onValueChange={setCity} disabled={!province}>
                  <SelectTrigger>
                    <SelectValue placeholder={province ? "شهر" : "ابتدا استان را انتخاب کنید"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              استان: {contributorProfile?.province ?? "—"} — شهر: {contributorProfile?.city ?? "—"}
            </div>
          )}

          <div className="space-y-2">
            <Label>محور / خیابان / بزرگراه *</Label>
            <Input value={axis} onChange={(event) => setAxis(event.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>متراژ (متر مربع)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={areaSqm}
                onChange={(event) => setAreaSqm(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>آدرس توصیفی</Label>
              <Input value={address} onChange={(event) => setAddress(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>موقعیت روی نقشه *</Label>
            <BillboardLocationMapPicker
              latitude={coords.latitude}
              longitude={coords.longitude}
              city={city || contributorProfile?.city}
              onChange={setCoords}
            />
          </div>

          {mode === "admin" && (
            <>
              <div className="space-y-2">
                <Label>یادداشت داخلی</Label>
                <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>تصویر تأییدیه اجرا</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setExecutionImage(event.target.files?.[0] ?? null)}
                />
              </div>
            </>
          )}

          <BillboardDisplayPeriodsEditor periods={periods} onChange={setPeriods} />

          <Button type="button" className="w-full" disabled={isPending} onClick={handleSubmit}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ثبت...
              </>
            ) : (
              "ثبت و اتصال به کمپین"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
