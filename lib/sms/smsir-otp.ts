/**
 * SMS.ir Verify (OTP) client.
 * Docs: POST https://api.sms.ir/v1/send/verify
 */

export type SmsIrOtpResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string; statusCode?: number };

function getApiKey(): string | null {
  const key = process.env.SMS_IR_API_KEY?.trim();
  return key || null;
}

function getTemplateId(): number | null {
  const raw = process.env.SMS_IR_OTP_TEMPLATE_ID?.trim() || "399658";
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getParamName(): string {
  return process.env.SMS_IR_OTP_PARAM_NAME?.trim() || "CODE";
}

/** SMS.ir often expects mobile without leading zero (e.g. 912...). */
export function toSmsIrMobile(phone09: string): string {
  const digits = phone09.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits;
}

export function isSmsIrOtpConfigured(): boolean {
  return Boolean(getApiKey() && getTemplateId());
}

export async function sendSmsIrOtp(phone09: string, code: string): Promise<SmsIrOtpResult> {
  const apiKey = getApiKey();
  const templateId = getTemplateId();

  if (!apiKey || !templateId) {
    return { ok: false, error: "سرویس پیامک OTP پیکربندی نشده است" };
  }

  const mobile = toSmsIrMobile(phone09);
  if (!/^9\d{9}$/.test(mobile)) {
    return { ok: false, error: "شماره موبایل نامعتبر است" };
  }

  try {
    const response = await fetch("https://api.sms.ir/v1/send/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        mobile,
        templateId,
        parameters: [{ name: getParamName(), value: code }],
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as {
      status?: number;
      message?: string;
      data?: { messageId?: number | string } | number | null;
    } | null;

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.message?.trim() || `خطای ارسال پیامک (${response.status})`,
        statusCode: response.status,
      };
    }

    // sms.ir uses status === 1 for success
    if (payload && typeof payload.status === "number" && payload.status !== 1) {
      return {
        ok: false,
        error: payload.message?.trim() || "ارسال پیامک ناموفق بود",
        statusCode: response.status,
      };
    }

    const messageId =
      payload?.data && typeof payload.data === "object" && "messageId" in payload.data
        ? String(payload.data.messageId)
        : undefined;

    return { ok: true, messageId };
  } catch {
    return { ok: false, error: "ارتباط با سرویس پیامک برقرار نشد" };
  }
}
