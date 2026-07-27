export const TUTORIAL_SECTION_KEYS = [
  "billboards",
  "posters",
  "videos",
  "files",
  "rawMedia",
  "analytics",
  "socialAnalytics",
  "socialPosts",
  "sitePublications",
  "pressPublications",
  "activities",
  "broadcast",
  "meetings",
  "submissions",
  "subsidiaries",
  "smsReports",
] as const;

export type TutorialSectionKey = (typeof TUTORIAL_SECTION_KEYS)[number];

export const tutorialSectionLabels: Record<TutorialSectionKey, string> = {
  billboards: "تبلیغات محیطی",
  posters: "پوسترها",
  videos: "ویدیوها",
  files: "فایل‌ها",
  rawMedia: "راش تصویر",
  analytics: "سایت‌ها",
  socialAnalytics: "شبکه‌های اجتماعی",
  socialPosts: "پست‌های شبکه اجتماعی",
  sitePublications: "انتشار در سایت",
  pressPublications: "مجله و روزنامه",
  activities: "اقدامات",
  broadcast: "پخش صدا و سیما",
  meetings: "جلسات و مصوبات",
  submissions: "مشارکت‌ها",
  subsidiaries: "زیرمجموعه‌ها",
  smsReports: "ارسال پیام",
};

export interface TutorialStep {
  title: string;
  body: string;
  imageUrl?: string | null;
}

/** Built-in steps seeded when the subsidiaries tutorial has no admin content yet. */
export const DEFAULT_SUBSIDIARIES_TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "زیرمجموعه یعنی چه؟",
    body: "هر دستگاه (وزارتخانه، سازمان، اداره و …) می‌تواند زیرمجموعه‌هایی زیر خودش داشته باشد. درخت سازمانی را از بالا به پایین بسازید: واحد بزرگ‌تر در بالا، واحدهای وابسته زیر آن. زیرمجموعه مالِ دستگاه است، نه مالِ یک کاربر خاص.",
    imageUrl: null,
  },
  {
    title: "از کجا بسازم؟",
    body: "مسیر اصلی: صفحه «دستگاه‌ها» → روی دستگاه والد دکمه «+» (افزودن زیرمجموعه) را بزنید.\n\nمسیر دیگر: در صفحه «کاربران»، هنگام ساخت یا ویرایش کاربر، گزینه «ایجاد زیرمجموعه جدید…» را انتخاب کنید؛ همان آموزش برای هر دو مسیر کافی است.",
    imageUrl: null,
  },
  {
    title: "فرم را چطور پر کنم؟",
    body: "نام کامل: عنوان رسمی واحد.\nنام کوتاه: نام خلاصه برای نمایش در درخت و فهرست‌ها.\nنوع: با واقعیت سازمانی هماهنگ باشد — مثلاً سازمان، اداره کل، شرکت، استانداری، شهرداری یا سایر.\n\nنکته: وزارتخانه فقط ریشه است؛ برای زیرمجموعه نوع وزارتخانه انتخاب نکنید.",
    imageUrl: null,
  },
  {
    title: "بعد از ثبت چه می‌شود؟",
    body: "زیرمجموعه در درخت زیر والد ظاهر می‌شود و می‌توانید برایش کاربر، دسترسی یا شناسنامه تعریف کنید. با زدن «متوجه شدم» این آموزش برای شما تکمیل می‌شود و فرم ایجاد باز می‌شود.",
    imageUrl: null,
  },
];

export interface SectionTutorial {
  sectionKey: TutorialSectionKey;
  title: string;
  version: number;
  steps: TutorialStep[];
  updatedAt: string;
}

export interface TutorialCompletionStatus {
  sectionKey: TutorialSectionKey;
  /** Tutorial content exists with at least one step. */
  hasContent: boolean;
  title: string;
  version: number;
  steps: TutorialStep[];
  /** User completed the current tutorial version. */
  isCompleted: boolean;
  completedVersion: number | null;
}

export function isTutorialSectionKey(value: unknown): value is TutorialSectionKey {
  return (
    typeof value === "string" &&
    (TUTORIAL_SECTION_KEYS as readonly string[]).includes(value)
  );
}

export function normalizeTutorialSteps(value: unknown): TutorialStep[] {
  if (!Array.isArray(value)) return [];

  return value
    .map<TutorialStep | null>((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const body = typeof record.body === "string" ? record.body.trim() : "";
      const imageUrl =
        typeof record.imageUrl === "string" && record.imageUrl.trim()
          ? record.imageUrl.trim()
          : null;
      if (!title && !body && !imageUrl) return null;
      return {
        title: title || "مرحله",
        body,
        imageUrl,
      };
    })
    .filter((step): step is TutorialStep => step !== null);
}
