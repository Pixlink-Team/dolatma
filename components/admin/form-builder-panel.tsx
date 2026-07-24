"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveCampaignFormAction } from "@/lib/actions/form-actions";
import {
  FORM_FIELD_TYPES,
  createEmptyFormField,
  formFieldTypeLabels,
} from "@/lib/campaign-forms";
import type { CampaignForm, CampaignFormStatus, FormField, FormFieldType } from "@/lib/types";

export interface FormBuilderDraft {
  title: string;
  description: string;
  status: CampaignFormStatus;
  fields: FormField[];
}

interface FormBuilderPanelProps {
  campaignId: string;
  /** Existing form to edit, or null when creating a new form. */
  form: CampaignForm | null;
  /** Bumps when parent wants the panel to reset (e.g. new form / switch selection). */
  resetKey: string;
  onDraftChange: (draft: FormBuilderDraft) => void;
  onSaved: (savedFormId?: string) => void;
  onCancelCreate?: () => void;
}

function draftFromForm(form: CampaignForm | null): FormBuilderDraft {
  if (form) {
    return {
      title: form.title,
      description: form.description,
      status: form.status,
      fields: form.fields.length > 0 ? form.fields : [createEmptyFormField()],
    };
  }
  return {
    title: "",
    description: "",
    status: "draft",
    fields: [createEmptyFormField()],
  };
}

export function FormBuilderPanel({
  campaignId,
  form,
  resetKey,
  onDraftChange,
  onSaved,
  onCancelCreate,
}: FormBuilderPanelProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CampaignFormStatus>("draft");
  const [fields, setFields] = useState<FormField[]>([createEmptyFormField()]);
  const [isPending, startTransition] = useTransition();
  const isCreate = !form;

  useEffect(() => {
    const next = draftFromForm(form);
    setTitle(next.title);
    setDescription(next.description);
    setStatus(next.status);
    setFields(next.fields);
    onDraftChange(next);
    // Only reset when selection / create mode changes — not when onDraftChange identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, form?.id]);

  const emitDraft = (patch: Partial<FormBuilderDraft> & { fields?: FormField[] }) => {
    const next: FormBuilderDraft = {
      title: patch.title ?? title,
      description: patch.description ?? description,
      status: patch.status ?? status,
      fields: patch.fields ?? fields,
    };
    onDraftChange(next);
  };

  const updateField = (index: number, patch: Partial<FormField>) => {
    setFields((prev) => {
      const next = prev.map((field, i) => {
        if (i !== index) return field;
        const updated = { ...field, ...patch };
        if (patch.type === "select" && !updated.options?.length) {
          updated.options = ["گزینه ۱"];
        }
        if (patch.type && patch.type !== "select") {
          delete updated.options;
        }
        if (patch.type && patch.type !== "file") {
          delete updated.accept;
        }
        return updated;
      });
      emitDraft({ fields: next });
      return next;
    });
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setFields((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      emitDraft({ fields: next });
      return next;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveCampaignFormAction({
        id: form?.id,
        campaignId,
        title,
        description,
        fields,
        status,
        sortOrder: form?.sortOrder,
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره فرم ناموفق بود");
        return;
      }
      toast.success(form ? "فرم به‌روزرسانی شد" : "فرم ایجاد شد");
      onSaved(result.form?.id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">
          {isCreate ? "فرم جدید" : "ویرایش فرم"}
        </h2>
        <div className="flex items-center gap-2">
          {isCreate && onCancelCreate ? (
            <Button type="button" variant="outline" size="sm" onClick={onCancelCreate}>
              انصراف
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "در حال ذخیره..." : "ذخیره فرم"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="form-title">عنوان</Label>
        <Input
          id="form-title"
          value={title}
          onChange={(e) => {
            const value = e.target.value;
            setTitle(value);
            emitDraft({ title: value });
          }}
          placeholder="مثلاً تبلیغات محیطی"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="form-description">توضیحات</Label>
        <Textarea
          id="form-description"
          value={description}
          onChange={(e) => {
            const value = e.target.value;
            setDescription(value);
            emitDraft({ description: value });
          }}
          placeholder="راهنمای کوتاه برای پرکننده فرم"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>وضعیت</Label>
        <Select
          value={status}
          onValueChange={(value) => {
            const next = value as CampaignFormStatus;
            setStatus(next);
            emitDraft({ status: next });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">پیش‌نویس</SelectItem>
            <SelectItem value="published">منتشر شده</SelectItem>
            <SelectItem value="archived">آرشیو</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>فیلدها</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFields((prev) => {
                const next = [...prev, createEmptyFormField()];
                emitDraft({ fields: next });
                return next;
              });
            }}
          >
            <Plus className="h-4 w-4" />
            افزودن فیلد
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">فیلد {index + 1}</p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => moveField(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={index === fields.length - 1}
                  onClick={() => moveField(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={fields.length <= 1}
                  onClick={() => {
                    setFields((prev) => {
                      const next = prev.filter((_, i) => i !== index);
                      emitDraft({ fields: next });
                      return next;
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>برچسب</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="عنوان فیلد"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) =>
                    updateField(index, { type: value as FormFieldType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORM_FIELD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {formFieldTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(field.type === "text" ||
              field.type === "textarea" ||
              field.type === "number") && (
              <div className="space-y-2">
                <Label>متن راهنما</Label>
                <Input
                  value={field.placeholder ?? ""}
                  onChange={(e) =>
                    updateField(index, { placeholder: e.target.value })
                  }
                />
              </div>
            )}

            {field.type === "select" && (
              <div className="space-y-2">
                <Label>گزینه‌ها (هر خط یک گزینه)</Label>
                <Textarea
                  value={(field.options ?? []).join("\n")}
                  onChange={(e) =>
                    updateField(index, {
                      options: e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={3}
                />
              </div>
            )}

            {field.type === "file" && (
              <div className="space-y-2">
                <Label>پسوندهای مجاز (اختیاری)</Label>
                <Input
                  value={field.accept ?? ""}
                  onChange={(e) => updateField(index, { accept: e.target.value })}
                  placeholder="مثلاً .pdf,.jpg"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`required-${field.id}`}>اجباری</Label>
              <Switch
                id={`required-${field.id}`}
                checked={field.required}
                onCheckedChange={(checked) =>
                  updateField(index, { required: checked })
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
