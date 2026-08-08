import type {
  GovernmentActionStatus,
  Severity,
  VerificationStatus,
} from "@taghvim/types/timeline";
import { severityColor, severityLabel, verificationLabel } from "@taghvim/lib/timeline";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const color = severityColor(severity);
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {severityLabel(severity)}
    </span>
  );
}

export function StatusBadge({
  status,
}: {
  status: VerificationStatus | GovernmentActionStatus;
}) {
  const map: Record<string, string> = {
    draft: "پیش‌نویس",
    pending: "در انتظار بررسی",
    verified: "تأییدشده",
    rejected: "ردشده",
    published: "منتشرشده",
    planned: "برنامه‌ریزی‌شده",
    in_progress: "در حال اجرا",
    completed: "انجام‌شده",
    successful: "موفق",
    needs_follow_up: "نیازمند پیگیری",
  };

  return (
    <span className="rounded-md bg-[var(--hover)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
      {map[status] || verificationLabel(status as VerificationStatus)}
    </span>
  );
}
