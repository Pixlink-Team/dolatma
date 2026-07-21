"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface FormBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  form: CampaignForm | null;
  onSaved: () => void;
}

export function FormBuilderDialog({
  open,
  onOpenChange,
  campaignId,
  form,
  onSaved,
}: FormBuilderDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CampaignFormStatus>("draft");
  const [fields, setFields] = useState<FormField[]>([createEmptyFormField()]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (form) {
      setTitle(form.title);
      setDescription(form.description);
      setStatus(form.status);
      setFields(form.fields.length > 0 ? form.fields : [createEmptyFormField()]);
      return;
    }
    setTitle("");
    setDescription("");
    setStatus("draft");
    setFields([createEmptyFormField()]);
  }, [open, form]);

  const updateField = (index: number, patch: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((field, i) => {
        if (i !== index) return field;
        const next = { ...field, ...patch };
        if (patch.type === "select" && !next.options?.length) {
          next.options = ["گزینه ۱"];
        }
        if (patch.type && patch.type !== "select") {
          delete next.options;
        }
        if (patch.type && patch.type !== "file") {
          delete next.accept;
        }
        return next;
      })
    );
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setFields((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
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
      onOpenChange(false);
      onSaved();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form ? "ویرایش فرم" : "فرم جدید"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-title">عنوان</Label>
            <Input
              id="form-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً گزارش هفتگی"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-description">توضیحات</Label>
            <Textarea
              id="form-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="راهنمای کوتاه برای پرکننده فرم"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>وضعیت</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as CampaignFormStatus)}
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
                onClick={() => setFields((prev) => [...prev, createEmptyFormField()])}
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
                      onClick={() =>
                        setFields((prev) => prev.filter((_, i) => i !== index))
                      }
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "در حال ذخیره..." : "ذخیره فرم"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
