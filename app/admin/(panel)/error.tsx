"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveAppError } from "@/lib/app-errors/catalog";
import { showAppError } from "@/components/admin/app-error-provider";

export default function AdminPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const guide = resolveAppError(error.message || "خطای غیرمنتظره در صفحه");
    showAppError({
      message: error.message || "خطای غیرمنتظره در صفحه",
      code: guide.code,
      forceModal: guide.showModal,
      notifyToast: !guide.showModal,
      metadata: {
        source: "next.error.tsx",
        digest: error.digest,
      },
    });
  }, [error]);

  const guide = resolveAppError(error.message || "خطای غیرمنتظره در صفحه");

  return (
    <div
      className="mx-auto flex max-w-lg flex-col items-stretch gap-4 rounded-xl border bg-card p-6 text-right shadow-sm"
      dir="rtl"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{guide.title}</h2>
          <p className="text-sm text-muted-foreground">{guide.message}</p>
        </div>
      </div>
      <div className="space-y-3 text-sm leading-7">
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">چرا این خطا را می‌بینید؟</p>
          <p>{guide.why}</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="mb-1 text-xs font-medium text-primary">الان چه کار کنید؟</p>
          <p>{guide.whatToDo}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={reset}>
          تلاش دوباره
        </Button>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          تازه کردن صفحه
        </Button>
      </div>
    </div>
  );
}
