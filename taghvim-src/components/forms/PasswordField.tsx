"use client";

import {
  evaluatePasswordStrength,
  PASSWORD_RULE_HINT,
} from "@taghvim/lib/password-strength";

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  /** When false, hide meter until user types (e.g. optional edit password) */
  showMeterWhenEmpty?: boolean;
};

export function PasswordField({
  value,
  onChange,
  placeholder = "رمز عبور",
  required = false,
  id,
  className = "",
  showMeterWhenEmpty = false,
}: PasswordFieldProps) {
  const strength = evaluatePasswordStrength(value);
  const showMeter = value.length > 0 || showMeterWhenEmpty;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <input
        id={id}
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-blue-500"
      />

      {showMeter ? (
        <div className="space-y-1" aria-live="polite">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${strength.barClass}`}
              style={{ width: `${strength.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className={strength.textClass}>
              {strength.label || "قدرت رمز"}
            </span>
            <span className="text-[var(--text-secondary)]">{PASSWORD_RULE_HINT}</span>
          </div>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-[var(--text-secondary)] sm:grid-cols-3">
            <RuleOk ok={strength.checks.minLength} label="۱۰+ کاراکتر" />
            <RuleOk ok={strength.checks.lower} label="حرف کوچک" />
            <RuleOk ok={strength.checks.upper} label="حرف بزرگ" />
            <RuleOk ok={strength.checks.number} label="عدد" />
            <RuleOk ok={strength.checks.symbol} label="نماد !@#" />
          </ul>
        </div>
      ) : (
        <p className="text-[11px] text-[var(--text-secondary)]">{PASSWORD_RULE_HINT}</p>
      )}
    </div>
  );
}

function RuleOk({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={ok ? "text-emerald-600" : "text-[var(--text-secondary)]"}>
      {ok ? "✓" : "○"} {label}
    </li>
  );
}
