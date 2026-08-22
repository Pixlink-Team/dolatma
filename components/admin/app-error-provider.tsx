"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { AppErrorModal } from "@/components/admin/app-error-modal";
import { resolveAppError, shouldIgnoreClientError } from "@/lib/app-errors/catalog";
import type { AppErrorCode, ResolvedAppError } from "@/lib/app-errors/types";
import { redirectIfSessionExpired } from "@/lib/auth/client-reauth";

const OPEN_PROBLEM_REPORT_EVENT = "dolatma:open-problem-report";
const SHOW_APP_ERROR_EVENT = "dolatma:show-app-error";

type ShowAppErrorInput = {
  message: unknown;
  code?: AppErrorCode;
  /** Force modal even when guide says toast-only. */
  forceModal?: boolean;
  /** Show a toast when the guide is toast-only (used by global error handlers). */
  notifyToast?: boolean;
  /** Extra audit metadata. */
  metadata?: Record<string, unknown>;
};

type AppErrorContextValue = {
  showAppError: (input: ShowAppErrorInput | string) => ResolvedAppError;
};

const AppErrorContext = createContext<AppErrorContextValue | null>(null);

function extractToastMessage(message: unknown): string {
  if (typeof message === "string") return message.trim();
  if (typeof message === "number" || typeof message === "boolean") return String(message);
  if (message && typeof message === "object" && "message" in message) {
    const nested = (message as { message?: unknown }).message;
    if (typeof nested === "string") return nested.trim();
  }
  return "خطای ناشناخته";
}

function currentPath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname + window.location.search;
}

function sendErrorTrack(guide: ResolvedAppError, metadata?: Record<string, unknown>) {
  try {
    const payload = JSON.stringify({
      action: "ui.error",
      path: currentPath(),
      label: guide.message.slice(0, 200),
      metadata: {
        source: metadata?.source ?? "app-error",
        code: guide.code,
        title: guide.title,
        why: guide.why,
        whatToDo: guide.whatToDo,
        severity: guide.severity,
        ...metadata,
      },
    });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/audit/track", blob)) return;
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

export function openProblemReportDialog() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_PROBLEM_REPORT_EVENT));
}

export function showAppError(input: ShowAppErrorInput | string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SHOW_APP_ERROR_EVENT, {
      detail: typeof input === "string" ? { message: input } : input,
    })
  );
}

export function AppErrorProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<ResolvedAppError | null>(null);
  const lastFingerprintRef = useRef<string>("");
  const lastShownAtRef = useRef(0);

  const present = useCallback((input: ShowAppErrorInput) => {
    if (redirectIfSessionExpired(input.message)) {
      return resolveAppError(input.message, { code: "unauthorized" });
    }

    const guide = resolveAppError(input.message, { code: input.code });
    const fingerprint = `${guide.code}:${guide.message}`;
    const now = Date.now();
    // Avoid stacking identical modals from rapid toast bursts.
    const dedupe =
      fingerprint === lastFingerprintRef.current && now - lastShownAtRef.current < 2500;

    sendErrorTrack(guide, input.metadata);

    const shouldShowModal = !dedupe && (guide.showModal || input.forceModal);

    if (shouldShowModal) {
      lastFingerprintRef.current = fingerprint;
      lastShownAtRef.current = now;
      setError(guide);
      setOpen(true);
    } else if (!dedupe && input.notifyToast) {
      lastFingerprintRef.current = fingerprint;
      lastShownAtRef.current = now;
      toast.error(guide.title, { description: guide.whatToDo });
    }

    return guide;
  }, []);

  const showAppErrorValue = useCallback(
    (input: ShowAppErrorInput | string) =>
      present(typeof input === "string" ? { message: input } : input),
    [present]
  );

  useEffect(() => {
    const onShow = (event: Event) => {
      const detail = (event as CustomEvent<ShowAppErrorInput>).detail;
      if (!detail) return;
      present(detail);
    };
    window.addEventListener(SHOW_APP_ERROR_EVENT, onShow);
    return () => window.removeEventListener(SHOW_APP_ERROR_EVENT, onShow);
  }, [present]);

  useEffect(() => {
    const originalError = toast.error.bind(toast);

    toast.error = ((message: unknown, data?: unknown) => {
      if (redirectIfSessionExpired(message)) return;

      const guide = resolveAppError(message);
      sendErrorTrack(guide, { source: "toast.error" });

      if (guide.showModal) {
        const fingerprint = `${guide.code}:${guide.message}`;
        const now = Date.now();
        if (
          fingerprint !== lastFingerprintRef.current ||
          now - lastShownAtRef.current >= 2500
        ) {
          lastFingerprintRef.current = fingerprint;
          lastShownAtRef.current = now;
          setError(guide);
          setOpen(true);
        }
        // Still show a short toast so the user notices if the modal is behind another dialog.
        return originalError(guide.title, data as never);
      }

      const toastMessage =
        guide.code === "validation_required" || guide.code === "validation_choice"
          ? guide.message
          : guide.title;
      return originalError(toastMessage, data as never);
    }) as typeof toast.error;

    return () => {
      toast.error = originalError as typeof toast.error;
    };
  }, []);

  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      const message =
        event.message ||
        (event.error instanceof Error ? event.error.message : "خطای غیرمنتظره در صفحه");
      if (shouldIgnoreClientError(message)) return;

      present({
        message,
        notifyToast: true,
        metadata: {
          source: "window.error",
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "وعدهٔ جاوااسکریپت بدون مدیریت خطا رد شد";
      if (shouldIgnoreClientError(message)) return;

      present({
        message,
        notifyToast: true,
        metadata: { source: "unhandledrejection" },
      });
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, [present]);

  const value = useMemo(
    () => ({ showAppError: showAppErrorValue }),
    [showAppErrorValue]
  );

  return (
    <AppErrorContext.Provider value={value}>
      {children}
      <AppErrorModal
        open={open}
        error={error}
        onOpenChange={setOpen}
        onReportProblem={openProblemReportDialog}
      />
    </AppErrorContext.Provider>
  );
}

export function useAppError() {
  const ctx = useContext(AppErrorContext);
  if (!ctx) {
    return {
      showAppError: (input: ShowAppErrorInput | string) => {
        showAppError(input);
        return resolveAppError(typeof input === "string" ? input : input.message, {
          code: typeof input === "string" ? undefined : input.code,
        });
      },
    };
  }
  return ctx;
}

export { OPEN_PROBLEM_REPORT_EVENT, extractToastMessage };
