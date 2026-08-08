"use client";

import type { ReactNode } from "react";

type DetailSectionProps = {
  title: string;
  showDot?: boolean;
  children: ReactNode;
  className?: string;
};

export function DetailSection({
  title,
  showDot = true,
  children,
  className,
}: DetailSectionProps) {
  return (
    <section className={className} style={{ direction: "rtl", textAlign: "right" }}>
      <div className="mb-2.5 flex items-center gap-2">
        {showDot ? (
          <span
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: "#EE4C58" }}
          />
        ) : null}
        <h4
          className="text-[13px] font-bold"
          style={{ color: "#ECE6E9" }}
        >
          {title}
        </h4>
      </div>
      {children}
    </section>
  );
}
