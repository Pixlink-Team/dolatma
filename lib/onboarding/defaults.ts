import type { OnboardingEvaluator } from "@/lib/onboarding/types";

export interface DefaultOnboardingStepSeed {
  stepKey: string;
  title: string;
  description: string;
  href: string;
  evaluator: OnboardingEvaluator;
  sortOrder: number;
}

export const DEFAULT_ONBOARDING_STEPS: DefaultOnboardingStepSeed[] = [
  {
    stepKey: "passport",
    title: "تکمیل شناسنامه",
    description: "اطلاعات پروفایل، کاربر مدیر، کارکنان و ظرفیت‌های دستگاه را کامل کنید.",
    href: "/admin/ministries",
    evaluator: "passport",
    sortOrder: 1,
  },
  {
    stepKey: "subsidiaries",
    title: "تعریف زیرمجموعه‌ها",
    description: "حداقل یک دستگاه زیرمجموعه زیر دستگاه خود ثبت کنید.",
    href: "/admin/ministries",
    evaluator: "subsidiaries",
    sortOrder: 2,
  },
  {
    stepKey: "content",
    title: "آپلود محتوا",
    description: "در هر دسته فعال راستا حداقل یک محتوا بارگذاری کنید.",
    href: "/admin",
    evaluator: "content",
    sortOrder: 3,
  },
  {
    stepKey: "directives",
    title: "صدور دستورکار",
    description: "حداقل یک دستورکار برای زیرمجموعه‌ها صادر کنید.",
    href: "/admin/directives",
    evaluator: "directives",
    sortOrder: 4,
  },
];

export const ONBOARDING_EVALUATOR_LABELS: Record<OnboardingEvaluator, string> = {
  passport: "شناسنامه دستگاه",
  subsidiaries: "زیرمجموعه‌ها",
  content: "آپلود محتوا",
  directives: "صدور دستورکار",
  none: "بدون ارزیابی خودکار",
};
