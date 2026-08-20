"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listPublishableProductionsAction } from "@/lib/actions/production-source-actions";
import {
  PRODUCTION_SOURCE_TYPE_LABELS,
  PRODUCTION_SOURCE_TYPES,
  type ProductionSourceType,
  type PublishableProductionItem,
} from "@/lib/production-source-shared";
import { cn } from "@/lib/utils";

export interface ProductionSourcePickerProps {
  campaignId: string;
  valueType: ProductionSourceType | null;
  valueId: string | null;
  allowedTypes?: ProductionSourceType[];
  onChange: (item: PublishableProductionItem | null) => void;
  required?: boolean;
  label?: string;
}

type ModalFilter = ProductionSourceType | "all";

export function ProductionSourcePicker({
  campaignId,
  valueType,
  valueId,
  allowedTypes = PRODUCTION_SOURCE_TYPES,
  onChange,
  required = false,
  label = "محتوای تولیدشده",
}: ProductionSourcePickerProps) {
  const [items, setItems] = useState<PublishableProductionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalFilter, setModalFilter] = useState<ModalFilter | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPublishableProductionsAction(campaignId)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setItems([]);
          setError(result.error ?? "بارگذاری تولیدات ناموفق بود");
          return;
        }
        setItems(result.items);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setError("بارگذاری تولیدات ناموفق بود");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const allowedSet = useMemo(() => new Set(allowedTypes), [allowedTypes]);

  const typeChips = useMemo(
    () => PRODUCTION_SOURCE_TYPES.filter((type) => allowedSet.has(type)),
    [allowedSet]
  );

  const filtered = useMemo(() => {
    if (!modalFilter) return [];
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!allowedSet.has(item.type)) return false;
      if (modalFilter !== "all" && item.type !== modalFilter) return false;
      if (q && !item.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allowedSet, items, modalFilter, search]);

  const selected = useMemo(() => {
    if (!valueType || !valueId) return null;
    return items.find((item) => item.type === valueType && item.id === valueId) ?? null;
  }, [items, valueId, valueType]);

  const modalTitle =
    modalFilter === "all" || modalFilter == null
      ? "انتخاب تولید"
      : `انتخاب از ${PRODUCTION_SOURCE_TYPE_LABELS[modalFilter]}`;

  function openModal(filter: ModalFilter) {
    setSearch("");
    setModalFilter(filter);
  }

  function closeModal() {
    setModalFilter(null);
    setSearch("");
  }

  function selectItem(item: PublishableProductionItem) {
    onChange(item);
    closeModal();
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label}
          {required ? <span className="mr-1 text-destructive">*</span> : null}
        </Label>
        {valueType && valueId ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => onChange(null)}
          >
            پاک کردن
          </Button>
        ) : null}
      </div>

      {selected ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <div className="font-medium">{selected.title}</div>
          <div className="text-xs text-muted-foreground">
            {PRODUCTION_SOURCE_TYPE_LABELS[selected.type]}
            {selected.subtitle ? ` — ${selected.subtitle}` : ""}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          یک قسمت را انتخاب کنید تا فهرست تولیدات باز شود
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => openModal("all")}
          className={cn(
            "rounded-md border px-2 py-1 text-xs transition-colors",
            "border-border bg-card hover:bg-accent"
          )}
        >
          همه
        </button>
        {typeChips.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => openModal(type)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs transition-colors",
              valueType === type
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-accent"
            )}
          >
            {PRODUCTION_SOURCE_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {error && !modalFilter ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        اگر چیزی نیست، اول در تولیدات ثبت کنید
      </p>

      <Dialog
        open={modalFilter != null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent
          data-nested-dialog-content
          overlayClassName="z-[95]"
          className="z-[100] max-h-[85vh] max-w-lg overflow-hidden !flex flex-col gap-3"
        >
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>
              از فهرست زیر یک مورد را انتخاب کنید
            </DialogDescription>
          </DialogHeader>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جستجو بر اساس عنوان..."
            className="h-9 shrink-0 text-xs"
            autoFocus
          />

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-md border p-1">
            {loading ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">در حال بارگذاری...</p>
            ) : error ? (
              <p className="px-2 py-2 text-xs text-destructive">{error}</p>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                موردی یافت نشد. اگر چیزی نیست، اول در تولیدات ثبت کنید.
              </p>
            ) : (
              filtered.map((item) => {
                const isActive = item.type === valueType && item.id === valueId;
                return (
                  <button
                    key={`${item.type}:${item.id}`}
                    type="button"
                    onClick={() => selectItem(item)}
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-right text-xs transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    <div className="font-medium">{item.title}</div>
                    <div
                      className={cn(
                        "mt-0.5",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {PRODUCTION_SOURCE_TYPE_LABELS[item.type]}
                      {item.subtitle ? ` — ${item.subtitle}` : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
