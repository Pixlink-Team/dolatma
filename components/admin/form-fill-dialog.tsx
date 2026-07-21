"use client";

import { useEffect, useState, useTransition } from "react";
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
import { DocumentUpload } from "@/components/ui/document-upload";
import { PersianDateInput } from "@/components/ui/persian-date-input";
import { submitFormResponseAction } from "@/lib/actions/form-actions";
import type { CampaignForm, FormField } from "@/lib/types";

interface FormFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  form: CampaignForm | null;
  onSubmitted: () => void;
}

function emptyAnswers(fields: FormField[]): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const field of fields) {
    answers[field.id] = field.type === "checkbox" ? false : "";
  }
  return answers;
}

export function FormFillDialog({
  open,
  onOpenChange,
  campaignId,
  form,
  onSubmitted,
}: FormFillDialogProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !form) return;
    setAnswers(emptyAnswers(form.fields));
  }, [open, form]);

  const setAnswer = (fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = () => {
    if (!form) return;
    startTransition(async () => {
      const result = await submitFormResponseAction({
        formId: form.id,
        campaignId,
        answers,
      });
      if (!result.success) {
        toast.error(result.error ?? "ثبت پاسخ ناموفق بود");
        return;
      }
      toast.success("پاسخ با موفقیت ثبت شد");
      onOpenChange(false);
      onSubmitted();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form?.title ?? "پر کردن فرم"}</DialogTitle>
        </DialogHeader>

        {form?.description ? (
          <p className="text-sm text-muted-foreground">{form.description}</p>
        ) : null}

        <div className="space-y-4">
          {form?.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label>
                {field.label}
                {field.required ? (
                  <span className="text-destructive mr-1">*</span>
                ) : null}
              </Label>

              {field.type === "text" && (
                <Input
                  value={String(answers[field.id] ?? "")}
                  onChange={(e) => setAnswer(field.id, e.target.value)}
                  placeholder={field.placeholder}
                />
              )}

              {field.type === "textarea" && (
                <Textarea
                  value={String(answers[field.id] ?? "")}
                  onChange={(e) => setAnswer(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                />
              )}

              {field.type === "number" && (
                <Input
                  type="number"
                  value={String(answers[field.id] ?? "")}
                  onChange={(e) => setAnswer(field.id, e.target.value)}
                  placeholder={field.placeholder}
                />
              )}

              {field.type === "select" && (
                <Select
                  value={String(answers[field.id] ?? "")}
                  onValueChange={(value) => setAnswer(field.id, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.type === "checkbox" && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm text-muted-foreground">بله / خیر</span>
                  <Switch
                    checked={Boolean(answers[field.id])}
                    onCheckedChange={(checked) => setAnswer(field.id, checked)}
                  />
                </div>
              )}

              {field.type === "date" && (
                <PersianDateInput
                  value={String(answers[field.id] ?? "") || undefined}
                  onChange={(isoDate) => setAnswer(field.id, isoDate)}
                  allowEmpty={!field.required}
                />
              )}

              {field.type === "file" && (
                <DocumentUpload
                  value={String(answers[field.id] ?? "")}
                  onChange={(payload) => setAnswer(field.id, payload.url)}
                  label="آپلود فایل"
                />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending || !form}>
              {isPending ? "در حال ارسال..." : "ارسال پاسخ"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
