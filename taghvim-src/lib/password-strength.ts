export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export type PasswordStrengthResult = {
  score: PasswordStrengthLevel;
  label: string;
  percent: number;
  barClass: string;
  textClass: string;
  checks: {
    minLength: boolean;
    lower: boolean;
    upper: boolean;
    number: boolean;
    symbol: boolean;
  };
  isStrong: boolean;
};

const MIN_LENGTH = 10;

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= MIN_LENGTH,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const isStrong = passed === 5;

  let score: PasswordStrengthLevel = 0;
  if (password.length === 0) score = 0;
  else if (passed <= 1) score = 1;
  else if (passed === 2) score = 2;
  else if (passed === 3 || passed === 4) score = 3;
  else score = 4;

  const meta: Record<
    PasswordStrengthLevel,
    { label: string; percent: number; barClass: string; textClass: string }
  > = {
    0: {
      label: "",
      percent: 0,
      barClass: "bg-transparent",
      textClass: "text-[var(--text-secondary)]",
    },
    1: {
      label: "خیلی ضعیف",
      percent: 20,
      barClass: "bg-red-500",
      textClass: "text-red-600",
    },
    2: {
      label: "ضعیف",
      percent: 40,
      barClass: "bg-orange-500",
      textClass: "text-orange-600",
    },
    3: {
      label: "متوسط",
      percent: 70,
      barClass: "bg-amber-500",
      textClass: "text-amber-600",
    },
    4: {
      label: "قوی",
      percent: 100,
      barClass: "bg-emerald-500",
      textClass: "text-emerald-600",
    },
  };

  return {
    score,
    isStrong,
    checks,
    ...meta[score],
  };
}

export const PASSWORD_RULE_HINT =
  "حداقل ۱۰ کاراکتر، شامل حروف بزرگ و کوچک، عدد و نماد";
