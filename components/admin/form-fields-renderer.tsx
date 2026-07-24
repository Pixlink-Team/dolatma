"use client";

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
import type { FormField } from "@/lib/types";
import { cn } from "@/lib/utils";

export function emptyFormAnswers(fields: FormField[]): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const field of fields) {
    answers[field.id] = field.type === "checkbox" ? false : "";
  }
  return answers;
}

export function answersFromFormResponse(
  fields: FormField[],
  existing: Record<string, unknown> | undefined
): Record<string, unknown> {
  const answers = emptyFormAnswers(fields);
  if (!existing) return answers;
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(existing, field.id)) {
      answers[field.id] = existing[field.id];
    }
  }
  return answers;
}

interface FormFieldsRendererProps {
  fields: FormField[];
  answers: Record<string, unknown>;
  onChange?: (fieldId: string, value: unknown) => void;
  /** Preview mode: inputs are non-interactive. */
  readOnly?: boolean;
  className?: string;
}

export function FormFieldsRenderer({
  fields,
  answers,
  onChange,
  readOnly = false,
  className,
}: FormFieldsRendererProps) {
  const setAnswer = (fieldId: string, value: unknown) => {
    if (readOnly) return;
    onChange?.(fieldId, value);
  };

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">هنوز فیلدی تعریف نشده است</p>
    );
  }

  return (
    <div
      className={cn("space-y-4", readOnly && "pointer-events-none select-none", className)}
      aria-disabled={readOnly || undefined}
    >
      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label>
            {field.label.trim() || "بدون عنوان"}
            {field.required ? (
              <span className="text-destructive mr-1">*</span>
            ) : null}
          </Label>

          {field.type === "text" && (
            <Input
              value={String(answers[field.id] ?? "")}
              onChange={(e) => setAnswer(field.id, e.target.value)}
              placeholder={field.placeholder}
              readOnly={readOnly}
              tabIndex={readOnly ? -1 : undefined}
            />
          )}

          {field.type === "textarea" && (
            <Textarea
              value={String(answers[field.id] ?? "")}
              onChange={(e) => setAnswer(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              readOnly={readOnly}
              tabIndex={readOnly ? -1 : undefined}
            />
          )}

          {field.type === "number" && (
            <Input
              type="number"
              value={String(answers[field.id] ?? "")}
              onChange={(e) => setAnswer(field.id, e.target.value)}
              placeholder={field.placeholder}
              readOnly={readOnly}
              tabIndex={readOnly ? -1 : undefined}
            />
          )}

          {field.type === "select" && (
            <Select
              value={String(answers[field.id] ?? "") || undefined}
              onValueChange={(value) => setAnswer(field.id, value)}
              disabled={readOnly}
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
                disabled={readOnly}
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
              disabled={readOnly}
            />
          )}
        </div>
      ))}
    </div>
  );
}
