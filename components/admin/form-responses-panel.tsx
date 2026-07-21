"use client";

import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteFormResponseAction } from "@/lib/actions/form-actions";
import { formatPersianNumber } from "@/lib/utils";
import type { CampaignForm, CampaignFormResponse, FormField } from "@/lib/types";

interface FormResponsesPanelProps {
  campaignId: string;
  form: CampaignForm | null;
  responses: CampaignFormResponse[];
  canManage: boolean;
  onChanged: () => void;
  onEdit: (response: CampaignFormResponse) => void;
}

function formatAnswerValue(field: FormField | undefined, value: unknown): string {
  if (value == null || value === "") return "—";
  if (field?.type === "checkbox") return value ? "بله" : "خیر";
  if (field?.type === "file" && typeof value === "string") {
    return value;
  }
  return String(value);
}

export function FormResponsesPanel({
  campaignId,
  form,
  responses,
  canManage,
  onChanged,
  onEdit,
}: FormResponsesPanelProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (responseId: string) => {
    if (!confirm("این پاسخ حذف شود؟")) return;
    startTransition(async () => {
      const result = await deleteFormResponseAction(responseId, campaignId);
      if (!result.success) {
        toast.error(result.error ?? "حذف پاسخ ناموفق بود");
        return;
      }
      toast.success("پاسخ حذف شد");
      onChanged();
    });
  };

  if (!form) {
    return (
      <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
        یک فرم را انتخاب کنید تا پاسخ‌ها نمایش داده شوند.
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
        هنوز پاسخی برای «{form.title}» ثبت نشده است.
      </div>
    );
  }

  const fieldMap = new Map(form.fields.map((field) => [field.id, field]));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">پاسخ‌ها ({formatPersianNumber(responses.length)})</h3>
        {!canManage ? (
          <p className="text-xs text-muted-foreground">فقط پاسخ‌های خودتان</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {responses.map((response) => (
          <div
            key={response.id}
            className="rounded-xl border p-4 space-y-3 cursor-pointer transition-colors hover:bg-muted/20"
            onClick={() => onEdit(response)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit(response);
              }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {response.ownerName ?? "کاربر ناشناس"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(response.createdAt).toLocaleString("fa-IR")}
                </p>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="ویرایش پاسخ"
                  onClick={() => onEdit(response)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  title="حذف پاسخ"
                  onClick={() => handleDelete(response.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {form.fields.map((field) => {
                const value = response.answers[field.id];
                const display = formatAnswerValue(fieldMap.get(field.id), value);
                const isFile = field.type === "file" && typeof value === "string" && value;
                return (
                  <div key={field.id} className="rounded-md bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                    {isFile ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary underline break-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        مشاهده فایل
                      </a>
                    ) : (
                      <p className="text-sm break-words">{display}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
