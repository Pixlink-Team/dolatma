"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveSectionContentFormAction } from "@/lib/actions/section-form-actions";
import { FORM_FIELD_TYPES, formFieldTypeLabels } from "@/lib/campaign-forms";
import {
  contentFormSectionLabels,
  contentSystemWidgetLabels,
  createEmptyCustomContentField,
  systemWidgetsForSection,
} from "@/lib/section-content-forms";
import type {
  ContentFormField,
  ContentFormSectionKey,
  FormFieldType,
  SectionContentForm,
} from "@/lib/types";

export interface ContentFormBuilderDraft {
  title: string;
  fields: ContentFormField[];
}

interface ContentFormBuilderPanelProps {
  form: SectionContentForm;
  resetKey: string;
  onDraftChange: (draft: ContentFormBuilderDraft) => void;
  onSaved: (form: SectionContentForm) => void;
}

function draftFromForm(form: SectionContentForm): ContentFormBuilderDraft {
  return {
    title: form.title || contentFormSectionLabels[form.sectionKey],
    fields: form.fields.length > 0 ? form.fields : [],
  };
}

export function ContentFormBuilderPanel({
  form,
  resetKey,
  onDraftChange,
  onSaved,
}: ContentFormBuilderPanelProps) {
  const [title, setTitle] = useState(form.title);
  const [fields, setFields] = useState<ContentFormField[]>(form.fields);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const next = draftFromForm(form);
    setTitle(next.title);
    setFields(next.fields);
    onDraftChange(next);
    // Reset only when switching section / reloading form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, form.sectionKey, form.updatedAt]);

  const emitDraft = (patch: Partial<ContentFormBuilderDraft>) => {
    const next: ContentFormBuilderDraft = {
      title: patch.title ?? title,
      fields: patch.fields ?? fields,
    };
    onDraftChange(next);
  };

  const updateField = (index: number, patch: Partial<ContentFormField>) => {
    setFields((prev) => {
      const next = prev.map((field, i) => {
        if (i !== index) return field;
        const merged = { ...field, ...patch };
        if (merged.kind === "custom" && patch.type === "select" && !merged.options?.length) {
          merged.options = ["گزینه ۱"];
        }
        return merged;
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

  const removeField = (index: number) => {
    setFields((prev) => {
      const next = prev.filter((_, i) => i !== index);
      emitDraft({ fields: next });
      return next;
    });
  };

  const addCustomField = () => {
    setFields((prev) => {
      const next = [...prev, createEmptyCustomContentField()];
      emitDraft({ fields: next });
      return next;
    });
  };

  const restoreSystemWidget = (widget: ReturnType<typeof systemWidgetsForSection>[number]) => {
    setFields((prev) => {
      if (prev.some((field) => field.kind === "system" && field.widget === widget)) {
        return prev;
      }
      const next: ContentFormField[] = [
        ...prev,
        {
          id: crypto.randomUUID(),
          key: widget,
          kind: "system",
          widget,
          type: "text",
          label: contentSystemWidgetLabels[widget],
          required: widget === "image" || widget === "map" || widget === "periods" || widget === "axis" || widget === "category",
        },
      ];
      emitDraft({ fields: next });
      return next;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveSectionContentFormAction({
        sectionKey: form.sectionKey,
        title,
        fields,
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره فرم ناموفق بود");
        return;
      }
      toast.success("فرم ذخیره شد");
      onSaved(result.form);
    });
  };

  const missingSystemWidgets = systemWidgetsForSection(form.sectionKey).filter(
    (widget) => !fields.some((field) => field.kind === "system" && field.widget === widget)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">ویرایش فرم</h2>
        <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "در حال ذخیره..." : "ذخیره فرم"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="section-form-title">عنوان بخش</Label>
        <Input
          id="section-form-title"
          value={title}
          onChange={(e) => {
            const value = e.target.value;
            setTitle(value);
            emitDraft({ title: value });
          }}
          placeholder={contentFormSectionLabels[form.sectionKey as ContentFormSectionKey]}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Label>فیلدها</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
            <Plus className="h-4 w-4" />
            افزودن فیلد سفارشی
          </Button>
        </div>

        {missingSystemWidgets.length > 0 ? (
          <div className="rounded-lg border border-dashed p-3 space-y-2">
            <p className="text-xs text-muted-foreground">بازگرداندن فیلدهای اصلی حذف‌شده:</p>
            <div className="flex flex-wrap gap-2">
              {missingSystemWidgets.map((widget) => (
                <Button
                  key={widget}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => restoreSystemWidget(widget)}
                >
                  {contentSystemWidgetLabels[widget]}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {field.kind === "system"
                  ? `فیلد اصلی · ${contentSystemWidgetLabels[field.widget!]}`
                  : `فیلد سفارشی ${index + 1}`}
              </p>
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
                  onClick={() => removeField(index)}
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
              {field.kind === "custom" ? (
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
              ) : (
                <div className="space-y-2">
                  <Label>نوع</Label>
                  <Input value="فیلد اصلی بخش" disabled />
                </div>
              )}
            </div>

            {field.kind === "custom" &&
              (field.type === "text" ||
                field.type === "textarea" ||
                field.type === "number") && (
                <div className="space-y-2">
                  <Label>متن راهنما</Label>
                  <Input
                    value={field.placeholder ?? ""}
                    onChange={(e) => updateField(index, { placeholder: e.target.value })}
                  />
                </div>
              )}

            {field.kind === "custom" && field.type === "select" && (
              <div className="space-y-2">
                <Label>گزینه‌ها (هر خط یک گزینه)</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
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

            {field.kind === "custom" && field.type === "file" && (
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
                onCheckedChange={(checked) => updateField(index, { required: checked })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
