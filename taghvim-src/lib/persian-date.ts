import {
  PERSIAN_MONTH_NAMES,
  WEEKDAY_LABELS,
  daysInPersianMonth,
  getPersianYmd,
  gregorianFromPersian,
  toMonthlyDateString,
} from "@taghvim/lib/monthly";

export { WEEKDAY_LABELS, PERSIAN_MONTH_NAMES };

export function formatPersianDateLabel(dateStr: string): string {
  if (!dateStr) return "";
  const { year, month, day } = getPersianYmd(dateStr);
  const name = PERSIAN_MONTH_NAMES[month - 1] ?? "";
  return `${day.toLocaleString("fa-IR")} ${name} ${year.toLocaleString("fa-IR")}`;
}

export function formatPersianDateShort(dateStr: string): string {
  if (!dateStr) return "";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${dateStr}T12:00:00`));
}

export function gregorianStringFromPersian(
  year: number,
  month: number,
  day: number,
): string {
  return toMonthlyDateString(gregorianFromPersian(year, month, day));
}

export type PersianCalendarCell = {
  key: string;
  date: string | null;
  day: number | null;
  inMonth: boolean;
};

export function buildPersianCalendarCells(
  year: number,
  month: number,
): PersianCalendarCell[] {
  const length = daysInPersianMonth(year, month);
  const first = gregorianFromPersian(year, month, 1);
  const offset = (first.getDay() + 1) % 7;
  const cells: PersianCalendarCell[] = [];

  for (let i = 0; i < offset; i++) {
    cells.push({
      key: `pad-start-${i}`,
      date: null,
      day: null,
      inMonth: false,
    });
  }

  for (let day = 1; day <= length; day++) {
    const date = gregorianStringFromPersian(year, month, day);
    cells.push({
      key: date,
      date,
      day,
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    const i = cells.length;
    cells.push({
      key: `pad-end-${i}`,
      date: null,
      day: null,
      inMonth: false,
    });
  }

  return cells;
}

export function todayGregorianString(): string {
  return toMonthlyDateString(new Date());
}
