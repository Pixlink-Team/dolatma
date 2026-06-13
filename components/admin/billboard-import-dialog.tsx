"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import {
  fetchExternalBillboardsAction,
  fetchExternalCampaignsAction,
  importExternalBillboardsAction,
} from "@/lib/actions/billboard-import-actions";
import { getExternalBillboardTag } from "@/lib/models/billboard-api";
import type { ExternalBillboard, ExternalCampaign } from "@/lib/models/billboard-api";
import type { Billboard } from "@/lib/types";

interface BillboardImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  existingBillboards: Billboard[];
  onImported: () => void;
}

export function BillboardImportDialog({
  open,
  onOpenChange,
  campaignId,
  existingBillboards,
  onImported,
}: BillboardImportDialogProps) {
  const [campaigns, setCampaigns] = useState<ExternalCampaign[]>([]);
  const [billboards, setBillboards] = useState<ExternalBillboard[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingBillboards, setLoadingBillboards] = useState(false);
  const [isPending, startTransition] = useTransition();

  const importedTagSet = useMemo(
    () =>
      new Set(
        existingBillboards.flatMap((billboard) =>
          billboard.tags.filter((tag) => tag.startsWith("map:"))
        )
      ),
    [existingBillboards]
  );

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    const result = await fetchExternalCampaignsAction();
    setLoadingCampaigns(false);

    if (!result.success || !result.campaigns) {
      toast.error(result.error ?? "دریافت کمپین‌ها ناموفق بود");
      return;
    }

    setCampaigns(result.campaigns);
    setSelectedCampaignId((current) => current || result.campaigns?.[0]?.id || "");
  }, []);

  const loadBillboards = useCallback(async (externalCampaignId: string) => {
    if (!externalCampaignId) return;

    setLoadingBillboards(true);
    const result = await fetchExternalBillboardsAction(externalCampaignId);
    setLoadingBillboards(false);

    if (!result.success || !result.billboards) {
      toast.error(result.error ?? "دریافت بیلبوردها ناموفق بود");
      setBillboards([]);
      setSelectedIds(new Set());
      return;
    }

    setBillboards(result.billboards);
    const importableIds = result.billboards
      .filter((item) => !importedTagSet.has(getExternalBillboardTag(item.id)))
      .map((item) => item.id);
    setSelectedIds(new Set(importableIds));
  }, [importedTagSet]);

  useEffect(() => {
    if (!open) return;
    void loadCampaigns();
  }, [open, loadCampaigns]);

  useEffect(() => {
    if (!open || !selectedCampaignId) return;
    void loadBillboards(selectedCampaignId);
  }, [open, selectedCampaignId, loadBillboards]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const importable = billboards.filter(
      (item) => !importedTagSet.has(getExternalBillboardTag(item.id))
    );
    const allSelected = importable.every((item) => selectedIds.has(item.id));
    setSelectedIds(allSelected ? new Set() : new Set(importable.map((item) => item.id)));
  };

  const handleImport = () => {
    if (!selectedCampaignId || selectedIds.size === 0) {
      toast.error("حداقل یک بیلبورد انتخاب کنید");
      return;
    }

    startTransition(async () => {
      const result = await importExternalBillboardsAction({
        campaignId,
        externalCampaignId: selectedCampaignId,
        externalBillboardIds: Array.from(selectedIds),
        existingBillboards,
        campaignEndDate: selectedCampaign?.end_date,
      });

      if (!result.success) {
        toast.error(result.error ?? "واردات ناموفق بود");
        return;
      }

      toast.success(`${result.imported} بیلبورد وارد شد${result.skipped ? `، ${result.skipped} مورد تکراری رد شد` : ""}`);
      onImported();
      onOpenChange(false);
    });
  };

  const importableCount = billboards.filter(
    (item) => !importedTagSet.has(getExternalBillboardTag(item.id))
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>دریافت بیلبورد از Map Bilboard</DialogTitle>
          <DialogDescription>
            کمپین را از سامانه بیلبورد انتخاب کنید و بیلبوردهای موردنظر را به داشبورد فعلی وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>کمپین Map Bilboard</Label>
              <Select
                value={selectedCampaignId}
                onValueChange={setSelectedCampaignId}
                disabled={loadingCampaigns || campaigns.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCampaigns ? "در حال بارگذاری..." : "انتخاب کمپین"} />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                void loadCampaigns();
                if (selectedCampaignId) void loadBillboards(selectedCampaignId);
              }}
              disabled={loadingCampaigns || loadingBillboards}
            >
              <RefreshCw className={`h-4 w-4 ${loadingCampaigns || loadingBillboards ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {selectedCampaign && (
            <div className="rounded-lg border p-3 text-sm text-muted-foreground space-y-1">
              <p>{selectedCampaign.description}</p>
              <p>بازه: {selectedCampaign.date_range_shamsi}</p>
              <p>مشتری: {selectedCampaign.client_name ?? "—"}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loadingBillboards
                ? "در حال دریافت بیلبوردها..."
                : `${billboards.length} بیلبورد — ${importableCount} مورد قابل واردات`}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={toggleAll} disabled={loadingBillboards}>
              {selectedIds.size === importableCount ? "لغو انتخاب همه" : "انتخاب همه"}
            </Button>
          </div>

          <div className="rounded-lg border divide-y max-h-80 overflow-y-auto">
            {loadingBillboards ? (
              <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال بارگذاری...
              </div>
            ) : billboards.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">بیلبوردی یافت نشد</p>
            ) : (
              billboards.map((item) => {
                const isImported = importedTagSet.has(getExternalBillboardTag(item.id));
                const isSelected = selectedIds.has(item.id);

                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 ${
                      isImported ? "opacity-60" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={isSelected}
                      disabled={isImported}
                      onChange={() => toggleSelection(item.id)}
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{item.code}</span>
                        <Badge variant="outline">{item.axis}</Badge>
                        {isImported && <Badge variant="secondary">قبلاً وارد شده</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.address}</p>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={handleImport}
            disabled={isPending || loadingBillboards || selectedIds.size === 0}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال واردات...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                واردات {selectedIds.size} بیلبورد
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
