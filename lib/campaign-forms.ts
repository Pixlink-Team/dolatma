import type {
  CampaignFormStatus,
  FormField,
  FormFieldType,
} from "@/lib/types";

export const FORM_FIELD_TYPES: FormFieldType[] = [
  "text",
  "textarea",
  "number",
  "select",
  "checkbox",
  "date",
  "file",
];

export const formFieldTypeLabels: Record<FormFieldType, string> = {
  text: "متن کوتاه",
  textarea: "متن بلند",
  number: "عدد",
  select: "انتخابی",
  checkbox: "چک‌باکس",
  date: "تاریخ",
  file: "فایل",
};

export const campaignFormStatusLabels: Record<CampaignFormStatus, string> = {
  draft: "پیش‌نویس",
  published: "منتشر شده",
  archived: "آرشیو",
};

function isFormFieldType(value: unknown): value is FormFieldType {
  return typeof value === "string" && FORM_FIELD_TYPES.includes(value as FormFieldType);
}

function newFieldId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyFormField(type: FormFieldType = "text"): FormField {
  return {
    id: newFieldId(),
    type,
    label: "",
    required: false,
    placeholder: "",
    options: type === "select" ? ["گزینه ۱"] : undefined,
  };
}

export function normalizeFormFields(value: unknown): FormField[] {
  if (!Array.isArray(value)) return [];

  const fields: FormField[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (!isFormFieldType(record.type)) continue;

    const label = typeof record.label === "string" ? record.label.trim() : "";
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : newFieldId();

    const field: FormField = {
      id,
      type: record.type,
      label,
      required: Boolean(record.required),
    };

    if (typeof record.placeholder === "string" && record.placeholder.trim()) {
      field.placeholder = record.placeholder.trim();
    }

    if (record.type === "select") {
      const options = Array.isArray(record.options)
        ? record.options
            .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
            .filter(Boolean)
        : [];
      field.options = options.length > 0 ? options : ["گزینه ۱"];
    }

    if (record.type === "file" && typeof record.accept === "string" && record.accept.trim()) {
      field.accept = record.accept.trim();
    }

    fields.push(field);
  }

  return fields;
}

export function validateFormFieldsDefinition(fields: FormField[]): string | null {
  if (fields.length === 0) {
    return "حداقل یک فیلد برای فرم لازم است";
  }

  for (const field of fields) {
    if (!field.label.trim()) {
      return "برچسب همه فیلدها الزامی است";
    }
    if (field.type === "select" && (!field.options || field.options.length === 0)) {
      return `فیلد «${field.label}» باید حداقل یک گزینه داشته باشد`;
    }
  }

  const ids = new Set<string>();
  for (const field of fields) {
    if (ids.has(field.id)) {
      return "شناسه فیلدها تکراری است";
    }
    ids.add(field.id);
  }

  return null;
}

function isEmptyAnswer(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return Number.isNaN(value);
  return false;
}

/**
 * Validates submitted answers against the form field definitions.
 * Returns cleaned answers or an error message.
 */
export function validateFormAnswers(
  fields: FormField[],
  answers: Record<string, unknown>
): { ok: true; answers: Record<string, unknown> } | { ok: false; error: string } {
  const cleaned: Record<string, unknown> = {};

  for (const field of fields) {
    const raw = answers[field.id];

    if (field.required && isEmptyAnswer(raw) && field.type !== "checkbox") {
      return { ok: false, error: `فیلد «${field.label}» الزامی است` };
    }

    if (isEmptyAnswer(raw) && field.type !== "checkbox") {
      continue;
    }

    switch (field.type) {
      case "text":
      case "textarea":
      case "date":
      case "file": {
        if (typeof raw !== "string") {
          return { ok: false, error: `مقدار فیلد «${field.label}» نامعتبر است` };
        }
        cleaned[field.id] = raw.trim();
        break;
      }
      case "number": {
        const num = typeof raw === "number" ? raw : Number(String(raw).trim());
        if (!Number.isFinite(num)) {
          return { ok: false, error: `فیلد «${field.label}» باید عدد باشد` };
        }
        cleaned[field.id] = num;
        break;
      }
      case "select": {
        if (typeof raw !== "string") {
          return { ok: false, error: `مقدار فیلد «${field.label}» نامعتبر است` };
        }
        const value = raw.trim();
        if (field.options && !field.options.includes(value)) {
          return { ok: false, error: `گزینه انتخاب‌شده برای «${field.label}» معتبر نیست` };
        }
        cleaned[field.id] = value;
        break;
      }
      case "checkbox": {
        cleaned[field.id] = Boolean(raw);
        break;
      }
      default:
        return { ok: false, error: `نوع فیلد «${field.label}» پشتیبانی نمی‌شود` };
    }
  }

  return { ok: true, answers: cleaned };
}
