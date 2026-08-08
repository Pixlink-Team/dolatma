export function activityColor(score: number, maxScore: number): string {
  const intensity = maxScore <= 0 ? 0 : Math.min(1, score / maxScore);

  if (intensity >= 0.75) return "#EF4444";
  if (intensity >= 0.5) return "#F97316";
  if (intensity >= 0.25) return "#3B82F6";
  if (intensity > 0) return "#64748B";
  return "#334155";
}

export function activityLabel(score: number, maxScore: number): string {
  const intensity = maxScore <= 0 ? 0 : score / maxScore;

  if (intensity >= 0.75) return "فعالیت بسیار بالا";
  if (intensity >= 0.5) return "فعالیت بالا";
  if (intensity >= 0.25) return "فعالیت متوسط";
  if (intensity > 0) return "فعالیت کم";
  return "بدون فعالیت";
}

export function formatFaDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatFaShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function severityLabel(severity: string): string {
  switch (severity) {
    case "critical":
      return "بحرانی";
    case "high":
      return "بالا";
    case "medium":
      return "متوسط";
    default:
      return "کم";
  }
}
