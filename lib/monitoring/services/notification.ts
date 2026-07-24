import { sendSms as sendProjectSms } from "@/lib/sms/provider";
import type {
  MonitoringNotification,
  NotificationChannel,
  UrgencyLevel,
} from "@/lib/monitoring/types";
import { DEFAULT_MONITORING_SETTINGS } from "@/lib/monitoring/defaults";

export interface NotificationSendRequest {
  userId?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  organizationId?: string | null;
  rapidResponseCaseId?: string | null;
  monitoredItemId?: string | null;
  notificationType: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  priority: UrgencyLevel;
}

export interface NotificationProvider {
  sendSms(phone: string, message: string): Promise<{ ok: boolean; error?: string; skipped?: boolean; providerMessageId?: string }>;
  sendInApp(request: NotificationSendRequest): Promise<{ ok: boolean; error?: string }>;
  sendEmail(to: string, subject: string, body: string): Promise<{ ok: boolean; error?: string; skipped?: boolean }>;
  sendPush(userId: string, title: string, message: string): Promise<{ ok: boolean; error?: string; skipped?: boolean }>;
}

export class MockSmsProvider implements NotificationProvider {
  async sendSms(phone: string, message: string) {
    if (!phone.trim()) {
      return { ok: false, error: "شماره موبایل ثبت نشده", skipped: true };
    }
    // Simulate successful mock delivery for audit trail.
    void message;
    return { ok: true, providerMessageId: `mock-sms-${Date.now()}` };
  }

  async sendInApp() {
    return { ok: true };
  }

  async sendEmail() {
    return { ok: true, skipped: true, error: "ایمیل در حالت Mock ثبت می‌شود" };
  }

  async sendPush() {
    return { ok: true, skipped: true, error: "پوش در حالت Mock ثبت می‌شود" };
  }
}

export class ProjectSmsAdapter implements NotificationProvider {
  async sendSms(phone: string, message: string) {
    const result = await sendProjectSms(phone, message);
    if (result.ok) return { ok: true, providerMessageId: result.providerMessageId };
    return { ok: false, error: result.error, skipped: result.skipped };
  }

  async sendInApp() {
    return { ok: true };
  }

  async sendEmail() {
    return { ok: false, skipped: true, error: "سرویس ایمیل پیکربندی نشده" };
  }

  async sendPush() {
    return { ok: false, skipped: true, error: "سرویس پوش پیکربندی نشده" };
  }
}

let activeProvider: NotificationProvider = new MockSmsProvider();

export function setNotificationProvider(provider: NotificationProvider) {
  activeProvider = provider;
}

export function getNotificationProvider(): NotificationProvider {
  return activeProvider;
}

export function buildRapidResponseSms(params: {
  organizationName: string;
  caseTitle: string;
  deadlineLabel: string;
  riskLabel: string;
}): string {
  return `هشدار واکنش سریع راستا
یک خبر منفی با سطح ریسک ${params.riskLabel} درباره ${params.organizationName} شناسایی شد.
مهلت واکنش: ${params.deadlineLabel}
عنوان: ${params.caseTitle}
برای مشاهده پرونده وارد سامانه شوید.`;
}

export function recipientsForUrgency(urgency: UrgencyLevel) {
  const roles = DEFAULT_MONITORING_SETTINGS.escalationMatrix[urgency] ?? ["shift_officer"];
  return DEFAULT_MONITORING_SETTINGS.smsRecipients.filter((r) => roles.includes(r.role));
}

export async function dispatchNotification(
  request: NotificationSendRequest,
  persist: (row: Omit<MonitoringNotification, "id" | "createdAt"> & { id?: string }) => Promise<MonitoringNotification>
): Promise<MonitoringNotification> {
  const provider = getNotificationProvider();
  let status: MonitoringNotification["status"] = "pending";
  let failureReason: string | null = null;
  let sentAt: string | null = null;

  if (request.channel === "sms") {
    const result = await provider.sendSms(request.recipientPhone ?? "", request.message);
    if (result.ok) {
      status = "sent";
      sentAt = new Date().toISOString();
    } else {
      status = result.skipped ? "skipped" : "failed";
      failureReason = result.error ?? "ارسال ناموفق";
    }
  } else if (request.channel === "in_app") {
    await provider.sendInApp(request);
    status = "sent";
    sentAt = new Date().toISOString();
  } else if (request.channel === "email") {
    const result = await provider.sendEmail(
      request.recipientPhone ?? "noreply@example.com",
      request.title,
      request.message
    );
    status = result.ok ? "sent" : result.skipped ? "skipped" : "failed";
    failureReason = result.error ?? null;
    sentAt = result.ok ? new Date().toISOString() : null;
  } else {
    const result = await provider.sendPush(request.userId ?? "", request.title, request.message);
    status = result.ok ? "sent" : result.skipped ? "skipped" : "failed";
    failureReason = result.error ?? null;
    sentAt = result.ok ? new Date().toISOString() : null;
  }

  return persist({
    userId: request.userId ?? null,
    recipientName: request.recipientName ?? null,
    recipientPhone: request.recipientPhone ?? null,
    organizationId: request.organizationId ?? null,
    rapidResponseCaseId: request.rapidResponseCaseId ?? null,
    monitoredItemId: request.monitoredItemId ?? null,
    notificationType: request.notificationType,
    channel: request.channel,
    title: request.title,
    message: request.message,
    status,
    priority: request.priority,
    sentAt,
    readAt: null,
    failureReason,
  });
}
