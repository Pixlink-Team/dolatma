"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { logAuditForSession } from "@/lib/audit/log-event";
import type {
  CreateProblemReportInput,
  ProblemReportCategory,
  ProblemReportStatus,
} from "@/lib/audit/problem-types";
import { PROBLEM_REPORT_CATEGORY_LABELS, PROBLEM_REPORT_STATUS_LABELS } from "@/lib/audit/problem-types";
import { pgGetUserById } from "@/lib/db/repository-extended";
import type { ProblemReport } from "@/lib/audit/problem-types";
import {
  pgInsertProblemReport,
  pgListProblemReportsByReporter,
  pgUpdateProblemReportAdminNote,
  pgUpdateProblemReportStatus,
} from "@/lib/db/problem-reports-repository";
import { isPostgresConfigured } from "@/lib/utils";

const VALID_CATEGORIES = new Set<ProblemReportCategory>([
  "ui_bug",
  "cant_find",
  "upload",
  "permission",
  "data",
  "performance",
  "other",
]);

const VALID_STATUSES = new Set<ProblemReportStatus>([
  "pending",
  "in_progress",
  "resolved",
  "dismissed",
]);

export async function submitProblemReportAction(
  input: CreateProblemReportInput
): Promise<{ success: boolean; error?: string }> {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "برای ارسال گزارش باید وارد شوید" };
  }
  if (!isPostgresConfigured()) {
    return { success: false, error: "ارسال گزارش فقط با دیتابیس فعال است" };
  }

  const category = input.category;
  if (!VALID_CATEGORIES.has(category)) {
    return { success: false, error: "دسته‌بندی نامعتبر است" };
  }

  const title = input.title?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  if (title.length < 3) {
    return { success: false, error: "عنوان حداقل ۳ کاراکتر باشد" };
  }
  if (description.length < 8) {
    return { success: false, error: "توضیح مشکل را کامل‌تر بنویسید" };
  }

  let reporterEmail = session.email ?? null;
  let reporterName = session.name ?? null;
  const reporterType: "env_admin" | "db_user" =
    session.type === "env_admin" ? "env_admin" : "db_user";

  if (session.type === "env_admin") {
    reporterName = reporterName ?? "مدیر سیستم";
  } else if (session.userId) {
    const user = await pgGetUserById(session.userId);
    reporterEmail = reporterEmail ?? user?.email ?? null;
    reporterName = reporterName ?? user?.name ?? null;
  }

  const report = await pgInsertProblemReport({
    reporterUserId: session.userId,
    reporterType,
    reporterEmail,
    reporterName,
    reporterRole: session.role,
    category,
    title: title.slice(0, 160),
    description: description.slice(0, 4000),
    path: input.path?.trim().slice(0, 500) || null,
    campaignId: input.campaignId?.trim() || null,
  });

  if (!report) {
    return { success: false, error: "ثبت گزارش با خطا مواجه شد" };
  }

  await logAuditForSession(session, {
    category: "system",
    action: "problem.report",
    entityType: "problem_report",
    entityId: report.id,
    campaignId: report.campaignId,
    path: report.path,
    label: title,
    metadata: { category, reportId: report.id },
  });

  revalidatePath("/admin/audit");
  return { success: true };
}

export async function listMyProblemReportsAction(): Promise<{
  success: boolean;
  reports?: ProblemReport[];
  error?: string;
}> {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "برای مشاهده گزارش‌ها باید وارد شوید" };
  }
  if (!isPostgresConfigured()) {
    return { success: false, error: "دیتابیس فعال نیست" };
  }

  const reports = await pgListProblemReportsByReporter({
    reporterUserId: session.userId,
    reporterType: session.type === "env_admin" ? "env_admin" : null,
    limit: 50,
  });

  return { success: true, reports };
}

export async function updateProblemReportStatusAction(input: {
  id: string;
  status: ProblemReportStatus;
  adminNote?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getAuthSession();
    if (!session || !isFullAdmin(session)) {
      return { success: false, error: "فقط ادمین می‌تواند گزارش را رسیدگی کند" };
    }
    if (!isPostgresConfigured()) {
      return { success: false, error: "دیتابیس فعال نیست" };
    }
    if (!VALID_STATUSES.has(input.status)) {
      return { success: false, error: "وضعیت نامعتبر است" };
    }
    if (!input.id?.trim()) {
      return { success: false, error: "شناسه گزارش نامعتبر است" };
    }

    const updated = await pgUpdateProblemReportStatus({
      id: input.id.trim(),
      status: input.status,
      adminNote: input.adminNote,
      // Env admin sessions have no users FK row — leave resolver null.
      resolvedByUserId: session.type === "db_user" ? session.userId : null,
    });

    if (!updated) {
      return { success: false, error: "گزارش یافت نشد یا به‌روزرسانی نشد" };
    }

    await logAuditForSession(session, {
      category: "admin",
      action: "problem.triage",
      entityType: "problem_report",
      entityId: updated.id,
      label: `${PROBLEM_REPORT_CATEGORY_LABELS[updated.category] ?? updated.category} → ${
        PROBLEM_REPORT_STATUS_LABELS[input.status] ?? input.status
      }`,
      metadata: { status: input.status },
    });

    revalidatePath("/admin/audit");
    return { success: true };
  } catch (error) {
    console.error("updateProblemReportStatusAction failed:", error);
    return { success: false, error: "خطا در به‌روزرسانی گزارش" };
  }
}

export async function replyToProblemReportAction(input: {
  id: string;
  adminNote: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getAuthSession();
    if (!session || !isFullAdmin(session)) {
      return { success: false, error: "فقط ادمین می‌تواند پاسخ دهد" };
    }
    if (!isPostgresConfigured()) {
      return { success: false, error: "دیتابیس فعال نیست" };
    }
    if (!input.id?.trim()) {
      return { success: false, error: "شناسه گزارش نامعتبر است" };
    }

    const note = input.adminNote?.trim() ?? "";
    if (note.length < 2) {
      return { success: false, error: "متن پاسخ را بنویسید" };
    }

    const updated = await pgUpdateProblemReportAdminNote({
      id: input.id.trim(),
      adminNote: note.slice(0, 4000),
      markInProgressIfPending: true,
    });

    if (!updated) {
      return { success: false, error: "گزارش یافت نشد یا به‌روزرسانی نشد" };
    }

    await logAuditForSession(session, {
      category: "admin",
      action: "problem.reply",
      entityType: "problem_report",
      entityId: updated.id,
      label: updated.title,
      metadata: { status: updated.status },
    });

    revalidatePath("/admin/audit");
    return { success: true };
  } catch (error) {
    console.error("replyToProblemReportAction failed:", error);
    return { success: false, error: "خطا در ارسال پاسخ" };
  }
}
