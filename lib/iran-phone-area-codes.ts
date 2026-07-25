import { normalizeImportedProvince } from "@/lib/iran-locations";

/** Iran landline NDCs (with leading 0) after the national numbering reform — one code per province. */
const IRAN_PROVINCE_AREA_CODES: Record<string, string> = {
  "آذربایجان شرقی": "041",
  "آذربایجان غربی": "044",
  اردبیل: "045",
  اصفهان: "031",
  البرز: "026",
  ایلام: "084",
  بوشهر: "077",
  تهران: "021",
  "چهارمحال و بختیاری": "038",
  "خراسان جنوبی": "056",
  "خراسان رضوی": "051",
  "خراسان شمالی": "058",
  خوزستان: "061",
  زنجان: "024",
  سمنان: "023",
  "سیستان و بلوچستان": "054",
  فارس: "071",
  قزوین: "028",
  قم: "025",
  کردستان: "087",
  کرمان: "034",
  کرمانشاه: "083",
  "کهگیلویه و بویراحمد": "074",
  گلستان: "017",
  گیلان: "013",
  لرستان: "066",
  مازندران: "011",
  مرکزی: "086",
  هرمزگان: "076",
  همدان: "081",
  یزد: "035",
};

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - "۰".charCodeAt(0)))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - "٠".charCodeAt(0)));
}

export function digitsOnly(value: string): string {
  return toEnglishDigits(value).replace(/\D/g, "");
}

/**
 * Resolve landline area code from province (and optional city for future overrides).
 * City is currently unused: Iran NDCs are province-level after the reform.
 */
export function getIranAreaCode(
  province?: string | null,
  city?: string | null
): string | null {
  void city;
  const normalized = normalizeImportedProvince(province ?? null);
  if (!normalized) return null;
  return IRAN_PROVINCE_AREA_CODES[normalized] ?? null;
}

/** Strip a known area-code prefix so the form can show the local subscriber number. */
export function extractLocalLandline(
  phone: string,
  areaCode: string | null
): string {
  const digits = digitsOnly(phone);
  if (!digits) return "";

  const code = digitsOnly(areaCode ?? "");
  if (code && digits.startsWith(code)) {
    return digits.slice(code.length);
  }
  if (code.startsWith("0") && digits.startsWith(code.slice(1))) {
    return digits.slice(code.length - 1);
  }
  return digits;
}

/** Build a full landline from area code + local digits. */
export function composeLandline(
  areaCode: string | null,
  local: string
): string | null {
  const localDigits = digitsOnly(local);
  if (!localDigits) return null;

  const code = digitsOnly(areaCode ?? "");
  if (!code) return localDigits.startsWith("0") ? localDigits : localDigits;

  if (localDigits.startsWith(code)) {
    return localDigits;
  }
  if (code.startsWith("0") && localDigits.startsWith(code.slice(1))) {
    return `0${localDigits}`;
  }
  return `${code}${localDigits}`;
}
