"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDirectiveBlockerAction } from "@/lib/actions/blocker-actions";
import { DIRECTIVE_BLOCKER_CATEGORY_LABELS } from "@/lib/command-feature-labels";
import type { DirectiveBlocker, DirectiveBlockerCategory } from "@/lib/types";
import { formatPersianDateTime } from "@/lib/utils";

interface DirectiveBlockersPanelProps {
  directiveId: string;
  campaignId: string;
  blockers: DirectiveBlocker[];
  canRegister: boolean;
}

export function DirectiveBlockersPanel({
  directiveId,
  campaignId,
  blockers: initialBlockers,
  canRegister,
}: DirectiveBlockersPanelProps) {
  const [blockers, setBlockers] = useState(initialBlockers);
  const [category, setCategory] = useState<DirectiveBlockerCategory>("budget");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h2 className="text-base font-semibold">ثبت مانع</h2>
        <p className="text-xs text-muted-foreground">
          موانع اجرای دستور به‌صورت ساختاریافته ثبت و گزارش می‌شوند.
        </p>
      </div>

      {canRegister ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label>نوع مانع</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as DirectiveBlockerCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DIRECTIVE_BLOCKER_CATEGORY_LABELS) as DirectiveBlockerCategory[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {DIRECTIVE_BLOCKER_CATEGORY_LABELS[key]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>توضیح</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="جزئیات مانع را بنویسید"
            />
          </div>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await createDirectiveBlockerAction({
                  directiveId,
                  campaignId,
                  category,
                  note,
                });
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                toast.success("مانع ثبت شد");
                setBlockers((prev) => [
                  {
                    id: result.id,
                    directiveId,
                    userId: "",
                    userName: "شما",
                    category,
                    note: note.trim(),
                    createdAt: new Date().toISOString(),
                  },
                  ...prev,
                ]);
                setNote("");
              });
            }}
          >
            ثبت مانع
          </Button>
        </div>
      ) : null}

      {blockers.length === 0 ? (
        <p className="text-sm text-muted-foreground">مانعی ثبت نشده است.</p>
      ) : (
        <div className="space-y-2">
          {blockers.map((blocker) => (
            <div key={blocker.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {DIRECTIVE_BLOCKER_CATEGORY_LABELS[blocker.category]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {blocker.userName ?? "—"} · {formatPersianDateTime(blocker.createdAt)}
                </p>
              </div>
              {blocker.note ? (
                <p className="mt-1 text-muted-foreground">{blocker.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
