import type {
  ContentFormField,
  ContentFormSectionKey,
  ContentSystemWidget,
  FormFieldType,
  SectionContentForm,
} from "@/lib/types";
import { FORM_FIELD_TYPES } from "@/lib/campaign-forms";

export const CONTENT_FORM_SECTION_KEYS = ["posters", "billboards"] as const;

export const contentFormSectionLabels: Record<ContentFormSectionKey, string> = {
  posters: "پوسترها",
  billboards: "تبلیغات محیطی",
};

export const CONTENT_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "image",
  "title",
  "description",
  "planLabels",
  "notes",
  "score",
  "category",
  "provinceCity",
  "axis",
  "areaSqm",
  "address",
  "map",
  "periods",
];

export const contentSystemWidgetLabels: Record<ContentSystemWidget, string> = {
  image: "تصویر",
  title: "عنوان",
  description: "توضیحات",
  planLabels: "موضوع",
  notes: "یادداشت",
  score: "امتیاز",
  category: "دسته‌بندی",
  provinceCity: "استان و شهر",
  axis: "محور",
  areaSqm: "متراژ",
  address: "آدرس",
  map: "نقشه",
  periods: "دوره‌های نمایش",
};

const POSTER_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "image",
  "title",
  "description",
  "planLabels",
  "notes",
  "score",
];

const BILLBOARD_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "category",
  "provinceCity",
  "axis",
  "areaSqm",
  "address",
  "map",
  "notes",
  "planLabels",
  "score",
  "periods",
];

export function systemWidgetsForSection(
  sectionKey: ContentFormSectionKey
): ContentSystemWidget[] {
  return sectionKey === "posters" ? POSTER_SYSTEM_WIDGETS : BILLBOARD_SYSTEM_WIDGETS;
}

function isFormFieldType(value: unknown): value is FormFieldType {
  return typeof value === "string" && FORM_FIELD_TYPES.includes(value as FormFieldType);
}

function isSystemWidget(value: unknown): value is ContentSystemWidget {
  return (
    typeof value === "string" &&
    CONTENT_SYSTEM_WIDGETS.includes(value as ContentSystemWidget)
  );
}

function newFieldId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function systemField(
  widget: ContentSystemWidget,
  label: string,
  required: boolean
): ContentFormField {
  return {
    id: newFieldId(),
    key: widget,
    kind: "system",
    widget,
    type: "text",
    label,
    required,
  };
}

export function defaultContentFormFields(
  sectionKey: ContentFormSectionKey
): ContentFormField[] {
  if (sectionKey === "posters") {
    return [
      systemField("image", "تصویر پوستر", true),
      systemField("title", "عنوان", false),
      systemField("description", "توضیحات", false),
      systemField("planLabels", "موضوع", false),
      systemField("notes", "یادداشت", false),
      systemField("score", "امتیاز", false),
    ];
  }

  return [
    systemField("category", "دسته‌بندی", true),
    systemField("provinceCity", "استان و شهر", false),
    systemField("axis", "محور / خیابان / بزرگراه", true),
    systemField("areaSqm", "متراژ (متر مربع)", false),
    systemField("address", "آدرس توصیفی", false),
    systemField("map", "موقعیت روی نقشه", true),
    systemField("notes", "یادداشت داخلی", false),
    systemField("planLabels", "موضوع", false),
    systemField("score", "امتیاز", false),
    systemField("periods", "دوره‌های نمایش", true),
  ];
}

export function defaultSectionContentForm(
  sectionKey: ContentFormSectionKey
): SectionContentForm {
  return {
    sectionKey,
    title: contentFormSectionLabels[sectionKey],
    fields: defaultContentFormFields(sectionKey),
    updatedAt: new Date().toISOString(),
  };
}

export function isContentFormSectionKey(
  value: unknown
): value is ContentFormSectionKey {
  return (
    typeof value === "string" &&
    (CONTENT_FORM_SECTION_KEYS as readonly string[]).includes(value)
  );
}

export function createEmptyCustomContentField(
  type: FormFieldType = "text"
): ContentFormField {
  const id = newFieldId();
  return {
    id,
    key: `custom_${id.replace(/-/g, "").slice(0, 12)}`,
    kind: "custom",
    type,
    label: "",
    required: false,
    placeholder: "",
    options: type === "select" ? ["گزینه ۱"] : undefined,
  };
}

export function normalizeContentFormFields(
  value: unknown,
  sectionKey: ContentFormSectionKey
): ContentFormField[] {
  if (!Array.isArray(value)) return defaultContentFormFields(sectionKey);

  const allowedWidgets = new Set(systemWidgetsForSection(sectionKey));
  const fields: ContentFormField[] = [];
  const seenSystem = new Set<ContentSystemWidget>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const kind = record.kind === "system" || record.kind === "custom" ? record.kind : null;
    if (!kind) continue;

    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : newFieldId();
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const required = Boolean(record.required);

    if (kind === "system") {
      const widget = isSystemWidget(record.widget)
        ? record.widget
        : isSystemWidget(record.key)
          ? record.key
          : null;
      if (!widget || !allowedWidgets.has(widget) || seenSystem.has(widget)) continue;
      seenSystem.add(widget);
      fields.push({
        id,
        key: widget,
        kind: "system",
        widget,
        type: "text",
        label: label || contentSystemWidgetLabels[widget],
        required,
      });
      continue;
    }

    if (!isFormFieldType(record.type)) continue;
    const key =
      typeof record.key === "string" && record.key.trim()
        ? record.key.trim()
        : `custom_${id.replace(/-/g, "").slice(0, 12)}`;

    const field: ContentFormField = {
      id,
      key,
      kind: "custom",
      type: record.type,
      label,
      required,
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

  return fields.length > 0 ? fields : defaultContentFormFields(sectionKey);
}

export function validateContentFormFields(
  fields: ContentFormField[],
  sectionKey: ContentFormSectionKey
): string | null {
  if (fields.length === 0) {
    return "حداقل یک فیلد برای فرم لازم است";
  }

  const allowedWidgets = new Set(systemWidgetsForSection(sectionKey));
  const ids = new Set<string>();
  const keys = new Set<string>();
  const systemSeen = new Set<ContentSystemWidget>();

  for (const field of fields) {
    if (!field.label.trim()) {
      return "برچسب همه فیلدها الزامی است";
    }
    if (ids.has(field.id)) {
      return "شناسه فیلدها تکراری است";
    }
    ids.add(field.id);

    if (keys.has(field.key)) {
      return "کلید فیلدها تکراری است";
    }
    keys.add(field.key);

    if (field.kind === "system") {
      if (!field.widget || !allowedWidgets.has(field.widget)) {
        return `ویجت سیستم «${field.label}» برای این بخش معتبر نیست`;
      }
      if (systemSeen.has(field.widget)) {
        return `ویجت «${contentSystemWidgetLabels[field.widget]}» تکراری است`;
      }
      systemSeen.add(field.widget);
      continue;
    }

    if (!isFormFieldType(field.type)) {
      return `نوع فیلد «${field.label}» نامعتبر است`;
    }
    if (field.type === "select" && (!field.options || field.options.length === 0)) {
      return `فیلد «${field.label}» باید حداقل یک گزینه داشته باشد`;
    }
  }

  return null;
}

export function parseMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

export function extractCustomMetadata(
  fields: ContentFormField[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.kind !== "custom") continue;
    if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
    metadata[field.key] = values[field.key];
  }
  return metadata;
}

export function fieldByWidget(
  fields: ContentFormField[],
  widget: ContentSystemWidget
): ContentFormField | undefined {
  return fields.find((field) => field.kind === "system" && field.widget === widget);
}

export function hasSystemWidget(
  fields: ContentFormField[],
  widget: ContentSystemWidget
): boolean {
  return Boolean(fieldByWidget(fields, widget));
}
