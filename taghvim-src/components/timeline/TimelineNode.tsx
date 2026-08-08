"use client";

type TimelineNodeProps = {
  tone: "enemy" | "government";
  size?: "sm" | "md" | "lg";
  active?: boolean;
};

/** Shared rail offset from the content box right edge (px). */
export const TIMELINE_RAIL_RIGHT = 14;

export function TimelineNode({
  tone,
  size = "md",
  active = false,
}: TimelineNodeProps) {
  const isEnemy = tone === "enemy";
  const dim = size === "sm" ? 13 : size === "lg" || active ? 17 : 15;

  return (
    <span
      className="pointer-events-none absolute top-1/2 z-10 rounded-full"
      style={{
        right: TIMELINE_RAIL_RIGHT,
        width: dim,
        height: dim,
        transform: "translate(50%, -50%)",
        background: isEnemy ? "var(--enemy)" : "var(--government)",
        border: isEnemy
          ? "3px solid color-mix(in srgb, var(--enemy) 45%, transparent)"
          : "3px solid color-mix(in srgb, var(--government) 45%, transparent)",
        boxShadow: active
          ? isEnemy
            ? "0 0 0 2px var(--panel), 0 0 16px rgba(239, 68, 68, 0.55)"
            : "0 0 0 2px var(--panel), 0 0 16px rgba(59, 130, 246, 0.55)"
          : isEnemy
            ? "0 0 0 2px var(--panel), 0 0 10px rgba(239, 68, 68, 0.35)"
            : "0 0 0 2px var(--panel), 0 0 10px rgba(59, 130, 246, 0.35)",
      }}
      aria-hidden
    />
  );
}
