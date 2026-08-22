"use server";

import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import {
  pgGetPreRegistrationByPhone,
  pgIncrementOtpAttempts,
  pgListSubmittedPreRegistrations,
  pgMarkOtpVerified,
  pgSubmitPreRegistration,
  pgUpsertOtpChallenge,
  type PreRegistrationPublic,
} from "@/lib/db/pre-registration";
import {
  createPhoneVerificationToken,
  generateOtpCode,
  hashOtp,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  safeEqualHash,
  verifyPhoneVerificationToken,
} from "@/lib/pre-registration/otp";
import { maskIranMobile, normalizeIranMobile } from "@/lib/pre-registration/phone";
import { getCitiesForProvince, isIranProvince } from "@/lib/iran-locations";
import { pgGetLoginPageSettings } from "@/lib/db/login-page-settings";
import { isSmsIrOtpConfigured, sendSmsIrOtp } from "@/lib/sms/smsir-otp";
import { isPostgresConfigured } from "@/lib/utils";

type ActionOk<T extends object = object> = { success: true } & T;
type ActionFail = { success: false; error: string };

function trimField(value: unknown, max: number): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

async function assertPreRegistrationEnabled(): Promise<ActionFail | null> {
  const settings = await pgGetLoginPageSettings();
  if (settings.preRegistrationEnabled === false) {
    return { success: false, error: "پیش‌ثبت‌نام در حال حاضر غیرفعال است" };
  }
  return null;
}

export async function sendPreRegistrationOtpAction(
  phoneRaw: string
): Promise<ActionOk<{ maskedPhone: string; resendAfterSeconds: number }> | ActionFail> {
  if (!isPostgresConfigured()) {
    return { success: false, error: "پایگاه داده در دسترس نیست" };
  }
  const disabled = await assertPreRegistrationEnabled();
  if (disabled) return disabled;
  if (!isSmsIrOtpConfigured()) {
    return { success: false, error: "سرویس پیامک هنوز روی سرور تنظیم نشده است" };
  }

  const phone = normalizeIranMobile(phoneRaw);
  if (!phone) {
    return { success: false, error: "شماره موبایل معتبر وارد کنید (مثل ۰۹۱۲۱۲۳۴۵۶۷)" };
  }

  const existing = await pgGetPreRegistrationByPhone(phone);
  if (existing?.status === "submitted") {
    return {
      success: false,
      error: "درخواست پیش‌ثبت‌نام شما قبلاً ثبت شده و در حال بررسی است",
    };
  }

  if (existing?.otpSentAt) {
    const elapsed = Date.now() - new Date(existing.otpSentAt).getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        error: `برای ارسال مجدد کد، ${wait} ثانیه صبر کنید`,
      };
    }
  }

  const code = generateOtpCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  const smsResult = await sendSmsIrOtp(phone, code);
  if (!smsResult.ok) {
    return { success: false, error: smsResult.error };
  }

  await pgUpsertOtpChallenge({
    phone,
    otpHash: hashOtp(phone, code),
    otpExpiresAt: expiresAt,
    otpSentAt: now,
  });

  return {
    success: true,
    maskedPhone: maskIranMobile(phone),
    resendAfterSeconds: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
  };
}

export async function verifyPreRegistrationOtpAction(
  phoneRaw: string,
  codeRaw: string
): Promise<ActionOk<{ verificationToken: string; phone: string }> | ActionFail> {
  if (!isPostgresConfigured()) {
    return { success: false, error: "پایگاه داده در دسترس نیست" };
  }
  const disabled = await assertPreRegistrationEnabled();
  if (disabled) return disabled;

  const phone = normalizeIranMobile(phoneRaw);
  if (!phone) {
    return { success: false, error: "شماره موبایل نامعتبر است" };
  }

  const code = String(codeRaw ?? "").replace(/\D/g, "");
  if (code.length < 4 || code.length > 8) {
    return { success: false, error: "کد تأیید را درست وارد کنید" };
  }

  const existing = await pgGetPreRegistrationByPhone(phone);
  if (!existing) {
    return { success: false, error: "ابتدا درخواست ارسال کد را ثبت کنید" };
  }
  if (existing.status === "submitted") {
    return {
      success: false,
      error: "درخواست پیش‌ثبت‌نام شما قبلاً ثبت شده است",
    };
  }
  if (existing.otpAttempts >= OTP_MAX_ATTEMPTS) {
    return {
      success: false,
      error: "تعداد تلاش‌ها بیش از حد مجاز است؛ لطفاً کد جدید دریافت کنید",
    };
  }
  if (!existing.otpHash || !existing.otpExpiresAt) {
    return { success: false, error: "کد منقضی شده؛ دوباره درخواست کد دهید" };
  }
  if (new Date(existing.otpExpiresAt).getTime() <= Date.now()) {
    return { success: false, error: "کد منقضی شده؛ دوباره درخواست کد دهید" };
  }

  const expected = hashOtp(phone, code);
  if (!safeEqualHash(existing.otpHash, expected)) {
    const attempts = await pgIncrementOtpAttempts(phone);
    if (attempts >= OTP_MAX_ATTEMPTS) {
      return {
        success: false,
        error: "تعداد تلاش‌ها بیش از حد مجاز است؛ لطفاً کد جدید دریافت کنید",
      };
    }
    return { success: false, error: "کد تأیید نادرست است" };
  }

  await pgMarkOtpVerified(phone);

  return {
    success: true,
    phone,
    verificationToken: createPhoneVerificationToken(phone),
  };
}

export async function submitPreRegistrationAction(input: {
  phone: string;
  verificationToken: string;
  fullName: string;
  organization: string;
  ministry: string;
  positionTitle: string;
  province: string;
  city: string;
  note?: string;
}): Promise<ActionOk | ActionFail> {
  if (!isPostgresConfigured()) {
    return { success: false, error: "پایگاه داده در دسترس نیست" };
  }
  const disabled = await assertPreRegistrationEnabled();
  if (disabled) return disabled;

  const phone = normalizeIranMobile(input.phone);
  if (!phone) {
    return { success: false, error: "شماره موبایل نامعتبر است" };
  }

  if (!verifyPhoneVerificationToken(phone, String(input.verificationToken ?? ""))) {
    return {
      success: false,
      error: "اعتبار تأیید شماره به پایان رسیده؛ دوباره کد بگیرید",
    };
  }

  const fullName = trimField(input.fullName, 120);
  const organization = trimField(input.organization, 160);
  const ministry = trimField(input.ministry, 160);
  const positionTitle = trimField(input.positionTitle, 120);
  const province = trimField(input.province, 80);
  const city = trimField(input.city, 80);
  const noteRaw = trimField(input.note ?? "", 500);
  const note = noteRaw || null;

  if (fullName.length < 2) {
    return { success: false, error: "نام و نام خانوادگی را وارد کنید" };
  }
  if (organization.length < 2) {
    return { success: false, error: "نام سازمان را وارد کنید" };
  }
  if (ministry.length < 2) {
    return { success: false, error: "وزارتخانه را وارد کنید" };
  }
  if (positionTitle.length < 2) {
    return { success: false, error: "سمت سازمانی را وارد کنید" };
  }
  if (!isIranProvince(province)) {
    return { success: false, error: "استان را از فهرست انتخاب کنید" };
  }
  const cities = getCitiesForProvince(province);
  if (!city || !cities.includes(city)) {
    return { success: false, error: "شهر را از فهرست انتخاب کنید" };
  }

  const existing = await pgGetPreRegistrationByPhone(phone);
  if (!existing) {
    return { success: false, error: "ابتدا شماره موبایل را تأیید کنید" };
  }
  if (existing.status === "submitted") {
    return {
      success: false,
      error: "درخواست پیش‌ثبت‌نام شما قبلاً ثبت شده است",
    };
  }

  const saved = await pgSubmitPreRegistration({
    phone,
    fullName,
    organization,
    ministry,
    positionTitle,
    province,
    city,
    note,
  });

  if (!saved) {
    return { success: false, error: "ثبت درخواست انجام نشد" };
  }

  return { success: true };
}

export async function listPreRegistrationsAction(): Promise<
  ActionOk<{ items: PreRegistrationPublic[]; count: number }> | ActionFail
> {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) {
    return { success: false, error: "Database required" };
  }

  const items = await pgListSubmittedPreRegistrations(300);
  return { success: true, items, count: items.length };
}
