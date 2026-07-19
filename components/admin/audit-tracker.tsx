"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

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

function extractToastMessage(message: unknown): string {
  if (typeof message === "string") return message.trim();
  if (typeof message === "number" || typeof message === "boolean") return String(message);
  if (message && typeof message === "object" && "message" in message) {
    const nested = (message as { message?: unknown }).message;
    if (typeof nested === "string") return nested.trim();
  }
  return "خطای ناشناخته";
}

/**
 * Client-side audit tracker for the admin panel.
 * Records page views, clicks (flagging content actions), and UI errors from toast.error.
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
    const originalError = toast.error.bind(toast);

    toast.error = ((message: unknown, data?: unknown) => {
      const text = extractToastMessage(message).slice(0, MAX_LABEL_LENGTH);
      if (text) {
        sendTrack({
          action: "ui.error",
          path: currentPath(),
          label: text,
          metadata: { source: "toast.error" },
        });
      }
      return originalError(message as never, data as never);
    }) as typeof toast.error;

    return () => {
      toast.error = originalError as typeof toast.error;
    };
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
