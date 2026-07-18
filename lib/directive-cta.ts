import { adminHref } from "@/lib/utils";

export type DirectiveCtaKind = "none" | "external" | "internal";

export const DIRECTIVE_INTERNAL_TARGETS = [
  "profile",
  "posters",
  "videos",
  "files",
  "billboards",
  "activities",
  "social_posts",
  "submissions",
  "raw_media",
  "meetings",
  "broadcast",
  "press_publications",
] as const;

export type DirectiveInternalTarget = (typeof DIRECTIVE_INTERNAL_TARGETS)[number];

const INTERNAL_TARGET_META: Record<
  DirectiveInternalTarget,
  { path: string; label: string }
> = {
  profile: { path: "/admin/profile", label: "تکمیل پروفایل" },
  posters: { path: "/admin/posters", label: "ثبت پوستر" },
  videos: { path: "/admin/videos", label: "ثبت ویدیو" },
  files: { path: "/admin/files", label: "آپلود فایل" },
  billboards: { path: "/admin/billboards", label: "ثبت تبلیغات محیطی" },
  activities: { path: "/admin/activities", label: "ثبت اقدام" },
  social_posts: { path: "/admin/social-posts", label: "ثبت پست شبکه اجتماعی" },
  submissions: { path: "/admin/submissions", label: "مشاهده مشارکت‌ها" },
  raw_media: { path: "/admin/raw-media", label: "آپلود راش تصویر" },
  meetings: { path: "/admin/meetings", label: "جلسات و مصوبات" },
  broadcast: { path: "/admin/broadcast", label: "پخش صدا و سیما" },
  press_publications: { path: "/admin/press-publications", label: "مجله و روزنامه" },
};

export const DIRECTIVE_INTERNAL_TARGET_OPTIONS = DIRECTIVE_INTERNAL_TARGETS.map((value) => ({
  value,
  label: INTERNAL_TARGET_META[value].label,
}));

export function isDirectiveInternalTarget(value: unknown): value is DirectiveInternalTarget {
  return (
    typeof value === "string" &&
    (DIRECTIVE_INTERNAL_TARGETS as readonly string[]).includes(value)
  );
}

export function mapDirectiveCtaKind(value: unknown): DirectiveCtaKind {
  if (value === "external" || value === "internal") return value;
  return "none";
}

export function getDefaultInternalCtaLabel(target: DirectiveInternalTarget): string {
  return INTERNAL_TARGET_META[target].label;
}

export function resolveDirectiveCtaHref(input: {
  kind: DirectiveCtaKind;
  url?: string | null;
  target?: string | null;
  campaignId: string;
}): string | null {
  if (input.kind === "external") {
    const url = input.url?.trim() ?? "";
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }

  if (input.kind === "internal") {
    if (!isDirectiveInternalTarget(input.target)) return null;
    return adminHref(INTERNAL_TARGET_META[input.target].path, input.campaignId);
  }

  return null;
}

export function resolveDirectiveCtaLabel(input: {
  kind: DirectiveCtaKind;
  label?: string | null;
  target?: string | null;
}): string | null {
  const custom = input.label?.trim() ?? "";
  if (custom) return custom;

  if (input.kind === "internal" && isDirectiveInternalTarget(input.target)) {
    return getDefaultInternalCtaLabel(input.target);
  }

  if (input.kind === "external") return "مشاهده لینک";
  return null;
}

/** Normalize + validate CTA fields before save. Empty means no button. */
export function normalizeDirectiveCtaInput(input: {
  ctaKind?: DirectiveCtaKind | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  ctaTarget?: string | null;
}):
  | {
      ok: true;
      ctaKind: DirectiveCtaKind;
      ctaLabel: string | null;
      ctaUrl: string | null;
      ctaTarget: string | null;
    }
  | { ok: false; error: string } {
  const kind = mapDirectiveCtaKind(input.ctaKind);
  if (kind === "none") {
    return {
      ok: true,
      ctaKind: "none",
      ctaLabel: null,
      ctaUrl: null,
      ctaTarget: null,
    };
  }

  const label = input.ctaLabel?.trim() || null;

  if (kind === "external") {
    const url = input.ctaUrl?.trim() || "";
    if (!url) {
      return { ok: false, error: "آدرس لینک دکمه را وارد کنید" };
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { ok: false, error: "لینک باید با http یا https شروع شود" };
      }
    } catch {
      return { ok: false, error: "آدرس لینک معتبر نیست" };
    }
    if (!label) {
      return { ok: false, error: "متن دکمه لینک را وارد کنید" };
    }
    return {
      ok: true,
      ctaKind: "external",
      ctaLabel: label,
      ctaUrl: url,
      ctaTarget: null,
    };
  }

  const target = input.ctaTarget?.trim() || "";
  if (!isDirectiveInternalTarget(target)) {
    return { ok: false, error: "بخش سیستمی دکمه را انتخاب کنید" };
  }

  return {
    ok: true,
    ctaKind: "internal",
    ctaLabel: label || getDefaultInternalCtaLabel(target),
    ctaUrl: null,
    ctaTarget: target,
  };
}
