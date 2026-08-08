"use client";

type WeeklyDayDonutProps = {
  total: number;
  enemy: number;
  government: number;
  size?: number;
};

export function WeeklyDayDonut({
  total,
  enemy,
  government,
  size = 108,
}: WeeklyDayDonutProps) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(total, 1);
  const enemyLen = (enemy / safeTotal) * circumference;
  const govLen = (government / safeTotal) * circumference;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--enemy)"
          strokeWidth={stroke}
          strokeDasharray={`${enemyLen} ${circumference - enemyLen}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--government)"
          strokeWidth={stroke}
          strokeDasharray={`${govLen} ${circumference - govLen}`}
          strokeDashoffset={-enemyLen}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[26px] font-extrabold leading-none text-[var(--text-primary)]">
          {total.toLocaleString("fa-IR")}
        </span>
        <span className="mt-1 text-[10px] text-[var(--text-secondary)]">رویداد</span>
      </div>
    </div>
  );
}
