"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  appendPeriodFilesToFormData,
  BillboardDisplayPeriodsEditor,
  buildPeriodsFormPayload,
  createDisplayPeriod,
  type DisplayPeriodDraft,
} from "@/components/admin/billboard-display-periods-editor";
import { getBillboardAssignmentId, getBillboardExternalMapId } from "@/lib/billboards";
import type { Billboard } from "@/lib/types";

interface BillboardAddPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  externalCampaignId: string;
  billboard: Billboard | null;
  onAdded?: () => void;
}

function createInitialPeriod(): DisplayPeriodDraft {
  return createDisplayPeriod();
}

export function BillboardAddPeriodDialog({
  open,
  onOpenChange,
  campaignId,
  externalCampaignId,
  billboard,
  onAdded,
}: BillboardAddPeriodDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [periods, setPeriods] = useState<DisplayPeriodDraft[]>([createInitialPeriod()]);

  useEffect(() => {
    if (!open) return;
    setPeriods([createInitialPeriod()]);
  }, [open, billboard?.id]);

  const handleSubmit = () => {
    if (!billboard) return;

    const period = periods[0];
    if (!period?.billboardImageFile) {
      toast.error("عکس بیلبورد الزامی است");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("campaignId", campaignId);
      formData.append("externalCampaignId", externalCampaignId);
      formData.append("assignmentId", getBillboardAssignmentId(billboard) ?? "");
      formData.append("billboardExternalId", getBillboardExternalMapId(billboard) ?? "");
      formData.append("periods", JSON.stringify(buildPeriodsFormPayload([period])));
      appendPeriodFilesToFormData(formData, [period]);

      const response = await fetch("/api/billboard/designs", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error ?? "افزودن دوره ناموفق بود");
        return;
      }

      toast.success("دوره نمایش اضافه شد");
      onOpenChange(false);
      onAdded?.();
    });
  };

  if (!billboard) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>افزودن دوره نمایش</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {billboard.title}
            {billboard.code ? ` (${billboard.code})` : ""}
          </p>
        </DialogHeader>

        <BillboardDisplayPeriodsEditor
          periods={periods}
          onChange={setPeriods}
          singlePeriod
          requireBillboardImage
        />

        <Button type="button" className="w-full" disabled={isPending} onClick={handleSubmit}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال ثبت...
            </>
          ) : (
            "ثبت دوره‌ها"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
