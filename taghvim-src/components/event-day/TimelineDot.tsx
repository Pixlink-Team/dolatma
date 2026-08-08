"use client";

type TimelineDotProps = {
  tone: "enemy" | "government";
  size?: "sm" | "lg";
  active?: boolean;
};

export function TimelineDot({
  tone,
  size = "lg",
  active = false,
}: TimelineDotProps) {
  const isEnemy = tone === "enemy";

  if (size === "sm") {
    return (
      <span
        className="absolute left-1/2 z-[2] -translate-x-1/2 rounded-full"
        style={{
          width: 10,
          height: 10,
          top: 46,
          background: "#D93643",
        }}
      />
    );
  }

  return (
    <span
      className="relative z-[2] block rounded-full"
      style={{
        width: 17,
        height: 17,
        background: isEnemy ? "#F04E58" : "#3B8AF2",
        border: isEnemy ? "3px solid #6E2031" : "3px solid #174D98",
        boxShadow: active
          ? isEnemy
            ? "0 0 0 2px #151E31, 0 0 16px rgba(239, 68, 68, 0.75)"
            : "0 0 0 2px #151E31, 0 0 16px rgba(59, 130, 246, 0.75)"
          : isEnemy
            ? "0 0 0 2px #151E31, 0 0 12px rgba(239, 68, 68, 0.6)"
            : "0 0 0 2px #151E31, 0 0 12px rgba(59, 130, 246, 0.6)",
      }}
    />
  );
}
