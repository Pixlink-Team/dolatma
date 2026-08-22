"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MAX_LABEL_LENGTH = 120;

/** Content mutation actions: save, add, edit, close, register, delete, upload, etc. */
const CONTENT_ACTION_PATTERN =
  /ذخیره|افزودن|ویرایش|بستن|ثبت|حذف|آپلود|ساخت|ایجاد|به‌?روزرسانی|بروزرسانی|انتشار|تأیید|تایید|کپی|جدید|ارسال|save|add|edit|delete|upload|create|update|submit|close/i;

function sendTrack(body: Record<string, unknown>) {
  try {
    const payload = JSON.stringify(body);
    // Prefer sendBeacon so navigation is not blocked.
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/audit/track", blob);
      if (ok) return;
    }
    void fetch("/api/audit/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    // Never break the UI because of tracking.
  }
}

function currentPath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname + window.location.search;
}

function resolveClickTarget(target: EventTarget | null): {
  label: string;
  role: string;
  contentAction: boolean;
} | null {
  if (!(target instanceof Element)) return null;

  const interactive = target.closest<HTMLElement>(
    "button, a, [role='button'], [role='menuitem'], [role='tab'], input[type='submit']"
  );
  if (!interactive) return null;

  const explicit = interactive.getAttribute("data-audit-label");
  const ariaLabel = interactive.getAttribute("aria-label");
  const title = interactive.getAttribute("title");
  const text = interactive.textContent?.replace(/\s+/g, " ").trim();
  const href = interactive.getAttribute("href");

  const label =
    explicit ||
    ariaLabel ||
    title ||
    (text && text.length > 0 ? text : null) ||
    href ||
    interactive.tagName.toLowerCase();

  const role =
    interactive.tagName.toLowerCase() === "a"
      ? "link"
      : interactive.getAttribute("role") || interactive.tagName.toLowerCase();

  const sliced = label.slice(0, MAX_LABEL_LENGTH);
  return {
    label: sliced,
    role,
    contentAction: CONTENT_ACTION_PATTERN.test(sliced),
  };
}

/**
 * Client-side audit tracker for the admin panel.
 * Records page views, clicks (flagging content actions), and idle-tab heartbeats.
 * Heartbeats are stored for diagnostics but do not count toward presence / active time.
 * UI errors are tracked by AppErrorProvider with richer metadata.
 */
export function AuditTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const campaignId = searchParams.get("campaign") ?? undefined;
    const query = searchParams.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;

    if (lastPathRef.current === fullPath) return;
    lastPathRef.current = fullPath;

    sendTrack({
      action: "navigation.page_view",
      path: fullPath,
      label: document.title,
      campaignId,
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const resolved = resolveClickTarget(event.target);
      if (!resolved) return;

      sendTrack({
        action: "ui.click",
        path: currentPath(),
        label: resolved.label,
        metadata: {
          role: resolved.role,
          contentAction: resolved.contentAction,
        },
      });
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () =>
      document.removeEventListener("click", handleClick, {
        capture: true,
      } as EventListenerOptions);
  }, []);

  useEffect(() => {
    const sendHeartbeat = () => {
      sendTrack({
        action: "presence.heartbeat",
        path: currentPath(),
        label: "آنلاین",
      });
    };

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  return null;
}
