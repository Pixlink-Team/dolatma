import type {
  ContentFormField,
  ContentFormSectionKey,
  ContentSystemWidget,
  FormFieldType,
  SectionContentForm,
} from "@/lib/types";
import { FORM_FIELD_TYPES } from "@/lib/campaign-forms";

/** Content-creation sections with configurable add/edit forms. */
export const CONTENT_FORM_SECTION_KEYS = [
  "billboards",
  "posters",
  "videos",
  "files",
  "rawMedia",
  "sitePublications",
  "socialPosts",
  "pressPublications",
  "activities",
  "broadcast",
  "meetings",
] as const;

export const contentFormSectionLabels: Record<ContentFormSectionKey, string> = {
  billboards: "تبلیغات محیطی",
  posters: "پوستر و عکس",
  videos: "ویدیوها",
  files: "فایل‌ها",
  rawMedia: "راش تصاویر",
  sitePublications: "انتشار در سایت",
  socialPosts: "پست‌های شبکه اجتماعی",
  pressPublications: "مجله و روزنامه",
  activities: "اقدامات",
  broadcast: "پخش صدا و سیما",
  meetings: "جلسات و مصوبات",
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
  "locationType",
  "map",
  "periods",
  "video",
  "videoType",
  "cover",
  "document",
  "rawFile",
  "mediaKind",
  "link",
  "publishedDate",
  "platform",
  "contentType",
  "engagement",
  "media",
  "activityType",
  "activityDate",
  "location",
  "mediaItems",
  "isCreative",
  "pdf",
  "reportDate",
  "meetingDate",
  "audio",
  "discussionSummary",
  "attendees",
  "tasks",
  "decisions",
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
  locationType: "محل",
  map: "نقشه",
  periods: "تاریخ و عکس",
  video: "ویدیو",
  videoType: "نوع ویدیو",
  cover: "کاور",
  document: "فایل",
  rawFile: "فایل خام",
  mediaKind: "نوع فایل",
  link: "لینک",
  publishedDate: "تاریخ انتشار",
  platform: "کانال",
  contentType: "نوع محتوا",
  engagement: "آمار تعامل",
  media: "رسانه",
  activityType: "نوع",
  activityDate: "تاریخ",
  location: "مکان",
  mediaItems: "رسانه‌ها",
  isCreative: "اقدام خلاقانه",
  pdf: "فایل PDF",
  reportDate: "تاریخ گزارش",
  meetingDate: "تاریخ جلسه",
  audio: "فایل صوتی",
  discussionSummary: "خلاصه صحبت‌ها",
  attendees: "حاضرین",
  tasks: "مصوبات",
  decisions: "تصمیم‌ها",
};

const POSTER_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "image",
  "title",
  "planLabels",
  "description",
  "score",
];

const BILLBOARD_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "category",
  "planLabels",
  "provinceCity",
  "map",
  "locationType",
  "axis",
  "areaSqm",
  "score",
  "periods",
];

const VIDEO_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "video",
  "title",
  "planLabels",
  "description",
  "videoType",
  "score",
  "cover",
];

const FILE_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "title",
  "planLabels",
  "description",
  "document",
];

const RAW_MEDIA_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "title",
  "planLabels",
  "description",
  "mediaKind",
  "rawFile",
];

const SITE_PUBLICATION_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "title",
  "planLabels",
  "link",
  "publishedDate",
  "score",
  "cover",
  "description",
];

const SOCIAL_POST_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "platform",
  "contentType",
  "title",
  "planLabels",
  "score",
  "engagement",
  "link",
  "publishedDate",
  "cover",
  "media",
  "description",
];

const PRESS_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "title",
  "planLabels",
  "activityType",
  "activityDate",
  "link",
  "location",
  "mediaItems",
  "description",
];

const ACTIVITY_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "title",
  "planLabels",
  "activityType",
  "isCreative",
  "activityDate",
  "location",
  "score",
  "mediaItems",
  "description",
];

const BROADCAST_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "title",
  "reportDate",
  "pdf",
];

const MEETING_SYSTEM_WIDGETS: ContentSystemWidget[] = [
  "title",
  "meetingDate",
  "location",
  "image",
  "audio",
  "discussionSummary",
  "attendees",
  "tasks",
  "decisions",
];

const SECTION_SYSTEM_WIDGETS: Record<ContentFormSectionKey, ContentSystemWidget[]> = {
  posters: POSTER_SYSTEM_WIDGETS,
  billboards: BILLBOARD_SYSTEM_WIDGETS,
  videos: VIDEO_SYSTEM_WIDGETS,
  files: FILE_SYSTEM_WIDGETS,
  rawMedia: RAW_MEDIA_SYSTEM_WIDGETS,
  sitePublications: SITE_PUBLICATION_SYSTEM_WIDGETS,
  socialPosts: SOCIAL_POST_SYSTEM_WIDGETS,
  pressPublications: PRESS_SYSTEM_WIDGETS,
  activities: ACTIVITY_SYSTEM_WIDGETS,
  broadcast: BROADCAST_SYSTEM_WIDGETS,
  meetings: MEETING_SYSTEM_WIDGETS,
};

export function systemWidgetsForSection(
  sectionKey: ContentFormSectionKey
): ContentSystemWidget[] {
  return SECTION_SYSTEM_WIDGETS[sectionKey];
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

const DEFAULT_FIELDS: Record<ContentFormSectionKey, () => ContentFormField[]> = {
  posters: () => [
    systemField("image", "تصویر پوستر", true),
    systemField("title", "عنوان", true),
    systemField("planLabels", "موضوع", true),
    systemField("description", "توضیحات", false),
    systemField("score", "امتیاز", false),
  ],
  billboards: () => [
    systemField("category", "دسته‌بندی", true),
    systemField("planLabels", "موضوع", true),
    systemField("provinceCity", "استان و شهر", false),
    systemField("map", "موقعیت روی نقشه", true),
    systemField("locationType", "محل", true),
    systemField("axis", "محور / خیابان / بزرگراه", true),
    systemField("areaSqm", "متراژ (متر مربع)", false),
    systemField("score", "امتیاز", false),
    systemField("periods", "تاریخ و عکس", true),
  ],
  videos: () => [
    systemField("video", "ویدیو", true),
    systemField("title", "عنوان", true),
    systemField("planLabels", "موضوع", true),
    systemField("description", "توضیحات", false),
    systemField("videoType", "نوع ویدیو", false),
    systemField("score", "امتیاز", false),
    systemField("cover", "کاور سفارشی", false),
  ],
  files: () => [
    systemField("title", "عنوان", true),
    systemField("planLabels", "موضوع", true),
    systemField("description", "توضیحات", false),
    systemField("document", "فایل", true),
  ],
  rawMedia: () => [
    systemField("title", "عنوان", true),
    systemField("planLabels", "موضوع", true),
    systemField("description", "توضیحات", false),
    systemField("mediaKind", "نوع فایل", true),
    systemField("rawFile", "فایل خام", true),
  ],
  sitePublications: () => [
    systemField("title", "عنوان", true),
    systemField("planLabels", "موضوع", true),
    systemField("link", "لینک مطلب", true),
    systemField("publishedDate", "تاریخ انتشار", false),
    systemField("score", "امتیاز", false),
    systemField("cover", "تصویر شاخص", false),
    systemField("description", "توضیح", false),
  ],
  socialPosts: () => [
    systemField("platform", "کانال", true),
    systemField("contentType", "نوع محتوا", true),
    systemField("title", "عنوان / نام کاور", true),
    systemField("planLabels", "موضوع", true),
    systemField("score", "امتیاز", false),
    systemField("engagement", "آمار تعامل", false),
    systemField("link", "لینک پست", false),
    systemField("publishedDate", "تاریخ انتشار", false),
    systemField("cover", "تصویر کاور", false),
    systemField("media", "رسانه", false),
    systemField("description", "توضیحات", false),
  ],
  pressPublications: () => [
    systemField("title", "عنوان", true),
    systemField("planLabels", "موضوع", true),
    systemField("activityType", "نوع (مجله / روزنامه)", true),
    systemField("activityDate", "تاریخ", true),
    systemField("link", "لینک مطلب", false),
    systemField("location", "مکان", false),
    systemField("mediaItems", "رسانه‌ها", false),
    systemField("description", "توضیحات", false),
  ],
  activities: () => [
    systemField("title", "عنوان", true),
    systemField("planLabels", "موضوع", true),
    systemField("activityType", "نوع اقدام", true),
    systemField("isCreative", "اقدام خلاقانه", false),
    systemField("activityDate", "تاریخ", true),
    systemField("location", "مکان", false),
    systemField("score", "امتیاز", false),
    systemField("mediaItems", "رسانه‌ها", false),
    systemField("description", "توضیحات", false),
  ],
  broadcast: () => [
    systemField("title", "عنوان گزارش", true),
    systemField("reportDate", "تاریخ گزارش", true),
    systemField("pdf", "فایل PDF گزارش", true),
  ],
  meetings: () => [
    systemField("title", "عنوان جلسه", true),
    systemField("meetingDate", "تاریخ جلسه", true),
    systemField("location", "مکان جلسه", false),
    systemField("image", "عکس جلسه", false),
    systemField("audio", "فایل صوتی", false),
    systemField("discussionSummary", "خلاصه صحبت‌ها", false),
    systemField("attendees", "حاضرین", false),
    systemField("tasks", "مصوبات", false),
    systemField("decisions", "تصمیم‌ها", false),
  ],
};

export function defaultContentFormFields(
  sectionKey: ContentFormSectionKey
): ContentFormField[] {
  return DEFAULT_FIELDS[sectionKey]();
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
        // Title and topic are always required across content forms.
        required: widget === "planLabels" || widget === "title" ? true : required,
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

  if (fields.length === 0) return defaultContentFormFields(sectionKey);

  const ordered =
    sectionKey === "billboards" ? applyBillboardFieldOrder(fields) : fields;
  return pinPlanLabelsAfterTitle(ordered);
}

/**
 * Always place موضوع (planLabels) immediately after عنوان (title) when both exist.
 * Billboard forms have no title widget; planLabels stays near the top after category.
 */
export function pinPlanLabelsAfterTitle(fields: ContentFormField[]): ContentFormField[] {
  const planIndex = fields.findIndex(
    (field) => field.kind === "system" && field.widget === "planLabels"
  );
  if (planIndex < 0) return fields;

  const titleIndex = fields.findIndex(
    (field) => field.kind === "system" && field.widget === "title"
  );
  const planField = fields[planIndex];
  const withoutPlan = fields.filter((_, index) => index !== planIndex);

  if (titleIndex >= 0) {
    const adjustedTitleIndex = titleIndex > planIndex ? titleIndex - 1 : titleIndex;
    const next = [...withoutPlan];
    next.splice(adjustedTitleIndex + 1, 0, planField);
    return next;
  }

  // No title: keep planLabels early (after first system field when present).
  const firstSystemIndex = withoutPlan.findIndex((field) => field.kind === "system");
  const insertAt = firstSystemIndex >= 0 ? firstSystemIndex + 1 : 0;
  const next = [...withoutPlan];
  next.splice(insertAt, 0, planField);
  return next;
}

/** Keep billboard system widgets in the product order; inject محل if missing. */
function applyBillboardFieldOrder(fields: ContentFormField[]): ContentFormField[] {
  const byWidget = new Map<ContentSystemWidget, ContentFormField>();
  const custom: ContentFormField[] = [];

  for (const field of fields) {
    if (field.kind === "system" && field.widget) {
      byWidget.set(field.widget, field);
    } else {
      custom.push(field);
    }
  }

  if (!byWidget.has("locationType")) {
    byWidget.set("locationType", systemField("locationType", "محل", true));
  }

  const ordered: ContentFormField[] = [];
  for (const widget of BILLBOARD_SYSTEM_WIDGETS) {
    const field = byWidget.get(widget);
    if (field) ordered.push(field);
  }
  for (const [widget, field] of byWidget) {
    if (!BILLBOARD_SYSTEM_WIDGETS.includes(widget)) ordered.push(field);
  }

  return [...ordered, ...custom];
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

/** Widgets that are required by default when restored in the builder. */
export function isDefaultRequiredSystemWidget(widget: ContentSystemWidget): boolean {
  return (
    widget === "image" ||
    widget === "map" ||
    widget === "periods" ||
    widget === "axis" ||
    widget === "category" ||
    widget === "video" ||
    widget === "document" ||
    widget === "rawFile" ||
    widget === "pdf" ||
    widget === "title" ||
    widget === "link" ||
    widget === "platform" ||
    widget === "contentType" ||
    widget === "activityType" ||
    widget === "activityDate" ||
    widget === "reportDate" ||
    widget === "meetingDate" ||
    widget === "mediaKind"
  );
}
