/**
 * Shared SMS.ir REST client helpers.
 * Auth: X-API-KEY header (developer panel API key).
 * Response model: { status, message, data }
 */

export type SmsIrApiResponse<T = unknown> = {
  status?: number;
  message?: string;
  data?: T;
};

export type SmsIrSendBulkResult =
  | { ok: true; packId?: string; messageIds?: string[] }
  | { ok: false; error: string; statusCode?: number };

/** SMS.ir often expects mobile without leading zero (e.g. 912...). */
export function toSmsIrMobile(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  if (digits.startsWith("98") && digits.length === 12) return digits.slice(2);
  return digits;
}

export function parseSmsIrLineNumber(sender: string | null | undefined): number | null {
  const digits = sender?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  const lineNumber = Number(digits);
  return Number.isFinite(lineNumber) && lineNumber > 0 ? lineNumber : null;
}

function parseBulkSendData(data: unknown): { packId?: string; messageIds?: string[] } {
  if (!data || typeof data !== "object") {
    return {};
  }

  const record = data as {
    packId?: number | string;
    messageIds?: Array<number | string>;
  };

  return {
    packId: record.packId != null ? String(record.packId) : undefined,
    messageIds: Array.isArray(record.messageIds)
      ? record.messageIds.map((id) => String(id))
      : undefined,
  };
}

export async function sendSmsIrBulk(params: {
  apiKey: string;
  lineNumber: number;
  messageText: string;
  mobiles: string[];
}): Promise<SmsIrSendBulkResult> {
  const { apiKey, lineNumber, messageText, mobiles } = params;

  if (!mobiles.length) {
    return { ok: false, error: "شماره موبایل گیرنده مشخص نشده است" };
  }

  try {
    const response = await fetch("https://api.sms.ir/v1/send/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        lineNumber,
        messageText,
        mobiles,
        sendDateTime: null,
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as SmsIrApiResponse | null;

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.message?.trim() || `خطای ارسال پیامک (${response.status})`,
        statusCode: response.status,
      };
    }

    if (payload && typeof payload.status === "number" && payload.status !== 1) {
      return {
        ok: false,
        error: payload.message?.trim() || "ارسال پیامک ناموفق بود",
        statusCode: response.status,
      };
    }

    const parsed = parseBulkSendData(payload?.data);
    return {
      ok: true,
      packId: parsed.packId,
      messageIds: parsed.messageIds,
    };
  } catch {
    return { ok: false, error: "ارتباط با سرویس sms.ir برقرار نشد" };
  }
}
