import type { DirectiveActionPlanInput } from "@/lib/types";

export function validateDirectiveActionPlanInput(
  input: DirectiveActionPlanInput
): string | null {
  if (!input.studiedAcknowledged) {
    return "ابتدا دریافت و مطالعه دستور را تأیید کنید";
  }

  if (typeof input.isExecutable !== "boolean") {
    return "مشخص کنید آیا دستور برای دستگاه شما قابل اجراست";
  }

  if (!input.isExecutable) {
    if (!input.notExecutableReason?.trim()) {
      return "دلیل غیرقابل‌اجرا بودن دستور را بنویسید";
    }
    return null;
  }

  if (!input.plannedActions?.trim()) {
    return "اقدامات برنامه‌ریزی‌شده را بنویسید";
  }
  if (!input.volumeDescription?.trim()) {
    return "حجم اجرا را مشخص کنید";
  }
  if (
    !input.scheduleStart?.trim() &&
    !input.scheduleEnd?.trim() &&
    !input.scheduleNotes?.trim()
  ) {
    return "زمان‌بندی اجرا (تاریخ یا توضیح) را وارد کنید";
  }
  if (!input.executorName?.trim()) {
    return "نام مسئول اجرا الزامی است";
  }

  return null;
}

export function normalizeActionPlanInput(input: DirectiveActionPlanInput): {
  studiedAcknowledged: boolean;
  isExecutable: boolean;
  notExecutableReason: string;
  plannedActions: string;
  capacityIds: string[];
  capacityNotes: string;
  volumeDescription: string;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  scheduleNotes: string;
  executorName: string;
  executorRole: string;
  executorPhone: string;
  obstacles: string;
  supportNeeded: string;
} {
  const capacityIds = Array.isArray(input.capacityIds)
    ? [...new Set(input.capacityIds.map((id) => String(id).trim()).filter(Boolean))]
    : [];

  if (!input.isExecutable) {
    return {
      studiedAcknowledged: true,
      isExecutable: false,
      notExecutableReason: input.notExecutableReason?.trim() ?? "",
      plannedActions: "",
      capacityIds: [],
      capacityNotes: "",
      volumeDescription: "",
      scheduleStart: null,
      scheduleEnd: null,
      scheduleNotes: "",
      executorName: "",
      executorRole: "",
      executorPhone: "",
      obstacles: input.obstacles?.trim() ?? "",
      supportNeeded: input.supportNeeded?.trim() ?? "",
    };
  }

  return {
    studiedAcknowledged: true,
    isExecutable: true,
    notExecutableReason: "",
    plannedActions: input.plannedActions?.trim() ?? "",
    capacityIds,
    capacityNotes: input.capacityNotes?.trim() ?? "",
    volumeDescription: input.volumeDescription?.trim() ?? "",
    scheduleStart: input.scheduleStart?.trim() || null,
    scheduleEnd: input.scheduleEnd?.trim() || null,
    scheduleNotes: input.scheduleNotes?.trim() ?? "",
    executorName: input.executorName?.trim() ?? "",
    executorRole: input.executorRole?.trim() ?? "",
    executorPhone: input.executorPhone?.trim() ?? "",
    obstacles: input.obstacles?.trim() ?? "",
    supportNeeded: input.supportNeeded?.trim() ?? "",
  };
}
