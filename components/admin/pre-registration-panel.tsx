"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  sendPreRegistrationOtpAction,
  submitPreRegistrationAction,
  verifyPreRegistrationOtpAction,
} from "@/lib/actions/pre-registration-actions";
import { ensureSelectOptions, IRAN_PROVINCES } from "@/lib/iran-locations";
import { getProvinceCityOptions } from "@/lib/iran-location-center";
import { CheckCircle2, Loader2 } from "lucide-react";

type Step = "phone" | "otp" | "details" | "done";

type PreRegistrationPanelProps = {
  onBackToLogin: () => void;
};

const EMPTY_VALUE = "__none__";

export function PreRegistrationPanel({ onBackToLogin }: PreRegistrationPanelProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [ministry, setMinistry] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timerId = window.setTimeout(() => setResendSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(timerId);
  }, [resendSeconds]);

  const provinceOptions = useMemo(
    () => ensureSelectOptions([...IRAN_PROVINCES], province),
    [province]
  );
  const cityOptions = useMemo(
    () => ensureSelectOptions(getProvinceCityOptions(province), city),
    [province, city]
  );

  const searchableProvinces = useMemo(
    () => [
      { value: EMPTY_VALUE, label: "انتخاب استان" },
      ...provinceOptions.map((item) => ({ value: item, label: item })),
    ],
    [provinceOptions]
  );

  const searchableCities = useMemo(
    () => [
      { value: EMPTY_VALUE, label: province ? "انتخاب شهر" : "ابتدا استان را انتخاب کنید" },
      ...cityOptions.map((item) => ({ value: item, label: item })),
    ],
    [cityOptions, province]
  );

  const inputClassName =
    "h-[52px] w-full rounded-2xl border border-white/40 bg-black/45 px-4 py-3 text-right text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] outline-none backdrop-blur-md transition placeholder:text-white/60 focus:border-white/55 focus:bg-black/55 focus:ring-4 focus:ring-[#0A84FF]/25";

  const selectTriggerClassName =
    "h-[52px] min-h-[52px] rounded-2xl border border-white/40 bg-black/45 px-4 py-3 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md transition hover:bg-black/55 focus:border-white/55 focus:ring-4 focus:ring-[#0A84FF]/25 [&_span]:text-white [&_span.text-muted-foreground]:text-white/60";

  const labelClassName =
    "text-sm font-medium text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.74)]";

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await sendPreRegistrationOtpAction(phone);
      if (!result.success) {
        setErrorMessage(result.error);
        toast.error(result.error);
        return;
      }
      setMaskedPhone(result.maskedPhone);
      setResendSeconds(result.resendAfterSeconds);
      setOtp("");
      setStep("otp");
      toast.success("کد تأیید ارسال شد");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await verifyPreRegistrationOtpAction(phone, otp);
      if (!result.success) {
        setErrorMessage(result.error);
        toast.error(result.error);
        return;
      }
      setPhone(result.phone);
      setVerificationToken(result.verificationToken);
      setStep("details");
      toast.success("شماره تأیید شد");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await sendPreRegistrationOtpAction(phone);
      if (!result.success) {
        setErrorMessage(result.error);
        toast.error(result.error);
        return;
      }
      setMaskedPhone(result.maskedPhone);
      setResendSeconds(result.resendAfterSeconds);
      setOtp("");
      toast.success("کد جدید ارسال شد");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await submitPreRegistrationAction({
        phone,
        verificationToken,
        fullName,
        organization,
        ministry,
        positionTitle,
        province,
        city,
        note,
      });
      if (!result.success) {
        setErrorMessage(result.error);
        toast.error(result.error);
        return;
      }
      setStep("done");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-500/20">
          <CheckCircle2 className="h-7 w-7 text-emerald-200" />
        </div>
        <div className="space-y-2 [text-shadow:0_2px_14px_rgba(0,0,0,0.7)]">
          <h2 className="text-xl font-bold text-white">درخواست شما ثبت شد</h2>
          <p className="text-sm leading-7 text-white/85">
            به‌زودی دسترسی ورود به شما داده می‌شود.
            <br />
            پس از تأیید، از همین صفحه می‌توانید وارد سامانه شوید.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToLogin}
          className="flex h-[52px] w-full items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-5 text-base font-semibold text-white transition hover:bg-white/16"
        >
          بازگشت به ورود
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm leading-6 text-white/90 [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">
        اگر هنوز حساب کاربری ندارید، شماره موبایل خود را تأیید کنید و اطلاعات تماس را بفرستید تا دسترسی
        برایتان فعال شود.
      </div>

      {step === "phone" ? (
        <form onSubmit={handleSendOtp} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="prereg-phone" className={labelClassName}>
              شماره موبایل
            </Label>
            <input
              id="prereg-phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="۰۹۱۲۱۲۳۴۵۶۷"
              required
              dir="ltr"
              autoComplete="tel"
              className={`${inputClassName} text-left`}
            />
          </div>

          {errorMessage ? <ErrorBox message={errorMessage} /> : null}

          <button type="submit" className={primaryButtonClass} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                در حال ارسال کد...
              </>
            ) : (
              "دریافت کد تأیید"
            )}
          </button>
        </form>
      ) : null}

      {step === "otp" ? (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <p className="text-sm text-white/85 [text-shadow:0_2px_10px_rgba(0,0,0,0.6)]">
            کد ارسال‌شده به <span className="font-semibold tracking-wide" dir="ltr">{maskedPhone}</span> را
            وارد کنید.
          </p>
          <div className="space-y-2">
            <Label htmlFor="prereg-otp" className={labelClassName}>
              کد تأیید
            </Label>
            <input
              id="prereg-otp"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^\d۰-۹٠-٩]/g, "").slice(0, 8))}
              placeholder="کد ۵ رقمی"
              required
              dir="ltr"
              autoComplete="one-time-code"
              className={`${inputClassName} text-center tracking-[0.35em]`}
            />
          </div>

          {errorMessage ? <ErrorBox message={errorMessage} /> : null}

          <button type="submit" className={primaryButtonClass} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                در حال بررسی...
              </>
            ) : (
              "تأیید کد"
            )}
          </button>

          <div className="flex items-center justify-between gap-3 text-xs text-white/70">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setErrorMessage(null);
                setOtp("");
              }}
              className="underline-offset-2 hover:underline"
            >
              اصلاح شماره
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resendSeconds > 0}
              className="disabled:opacity-50"
            >
              {resendSeconds > 0 ? `ارسال مجدد (${resendSeconds})` : "ارسال مجدد کد"}
            </button>
          </div>
        </form>
      ) : null}

      {step === "details" ? (
        <form onSubmit={handleSubmitDetails} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prereg-name" className={labelClassName}>
              نام و نام خانوادگی
            </Label>
            <input
              id="prereg-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={inputClassName}
              placeholder="مثال: علی رضایی"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prereg-org" className={labelClassName}>
              نام سازمان
            </Label>
            <input
              id="prereg-org"
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              required
              className={inputClassName}
              placeholder="نام سازمان"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prereg-ministry" className={labelClassName}>
              وزارتخانه
            </Label>
            <input
              id="prereg-ministry"
              type="text"
              value={ministry}
              onChange={(e) => setMinistry(e.target.value)}
              required
              className={inputClassName}
              placeholder="نام وزارتخانه"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prereg-position" className={labelClassName}>
              سمت
            </Label>
            <input
              id="prereg-position"
              type="text"
              value={positionTitle}
              onChange={(e) => setPositionTitle(e.target.value)}
              required
              className={inputClassName}
              placeholder="سمت سازمانی"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className={labelClassName}>استان</Label>
              <SearchableSelect
                value={province || EMPTY_VALUE}
                onValueChange={(value) => {
                  setProvince(value === EMPTY_VALUE ? "" : value);
                  setCity("");
                }}
                options={searchableProvinces}
                placeholder="انتخاب استان"
                searchPlaceholder="جستجوی استان..."
                triggerClassName={selectTriggerClassName}
              />
            </div>
            <div className="space-y-2">
              <Label className={labelClassName}>شهر</Label>
              <SearchableSelect
                value={city || EMPTY_VALUE}
                onValueChange={(value) => setCity(value === EMPTY_VALUE ? "" : value)}
                options={searchableCities}
                placeholder={province ? "انتخاب شهر" : "ابتدا استان را انتخاب کنید"}
                searchPlaceholder="جستجوی شهر..."
                disabled={!province}
                triggerClassName={selectTriggerClassName}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prereg-note" className={labelClassName}>
              توضیحات (اختیاری)
            </Label>
            <textarea
              id="prereg-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-white/40 bg-black/45 px-4 py-3 text-right text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] outline-none backdrop-blur-md transition placeholder:text-white/60 focus:border-white/55 focus:bg-black/55 focus:ring-4 focus:ring-[#0A84FF]/25"
              placeholder="در صورت نیاز توضیح کوتاه بنویسید"
            />
          </div>

          {errorMessage ? <ErrorBox message={errorMessage} /> : null}

          <button type="submit" className={primaryButtonClass} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                در حال ثبت...
              </>
            ) : (
              "ثبت درخواست"
            )}
          </button>
        </form>
      ) : null}

      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full text-center text-sm text-white/75 transition hover:text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.65)]"
      >
        بازگشت به ورود
      </button>
    </div>
  );
}

const primaryButtonClass =
  "flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0A84FF] px-5 py-3 text-base font-bold text-white shadow-[0_16px_42px_rgba(10,132,255,0.38)] transition hover:bg-[#0077ED] focus:outline-none focus:ring-4 focus:ring-[#0A84FF]/32 disabled:cursor-not-allowed disabled:opacity-70 [text-shadow:0_2px_10px_rgba(0,0,0,0.36)]";

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-red-300/25 bg-red-500/18 px-4 py-3 text-sm text-red-50 shadow-[0_10px_30px_rgba(127,29,29,0.18)] backdrop-blur-sm [text-shadow:0_2px_10px_rgba(0,0,0,0.62)]">
      {message}
    </p>
  );
}
