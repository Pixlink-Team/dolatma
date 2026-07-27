"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { CampaignAuthChip } from "@/components/public/campaign-auth-chip";
import type { CampaignAuthViewer } from "@/lib/auth/campaign-viewer";

interface DevicePageUnlockProps {
  slug: string;
  title: string;
  authViewer?: CampaignAuthViewer | null;
}

export function DevicePageUnlock({
  slug,
  title,
  authViewer = null,
}: DevicePageUnlockProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockedUntilMs, setLockedUntilMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  const lockRemainingSec = Math.max(0, Math.ceil((lockedUntilMs - nowMs) / 1000));
  const isLocked = lockRemainingSec > 0;

  useEffect(() => {
    if (!isLocked) return;
    const timerId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [isLocked]);

  const handleUnlock = () => {
    if (!password.trim() || isLocked) return;

    startTransition(async () => {
      setErrorMessage(null);
      const response = await fetch(`/api/device/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          code?: string;
          retryAfterSec?: number;
        } | null;
        const message = data?.error ?? "رمز اشتباه است";
        if (response.status === 429 || data?.code === "rate_limited") {
          const retryAfterSec =
            typeof data?.retryAfterSec === "number" && data.retryAfterSec > 0
              ? data.retryAfterSec
              : Number(response.headers.get("Retry-After")) || 15 * 60;
          setLockedUntilMs(Date.now() + retryAfterSec * 1000);
          setNowMs(Date.now());
        }
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      toast.success("دسترسی برقرار شد");
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs text-muted-foreground">صفحه دستگاه</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <CampaignAuthChip viewer={authViewer} returnPath={`/device/${slug}`} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border bg-card">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">این صفحه با رمز محافظت شده است</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          برای مشاهده محتوای این دستگاه و زیرمجموعه‌هایش، رمز عبور را وارد کنید.
        </p>

        <div className="mt-8 w-full space-y-3 text-right">
          <Label htmlFor="device-page-password">رمز عبور</Label>
          <Input
            id="device-page-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleUnlock();
            }}
            placeholder="رمز صفحه دستگاه"
            autoFocus
            dir="ltr"
            disabled={isLocked}
            className="text-left"
          />
          {errorMessage ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {isLocked
                ? `${errorMessage} (${Math.ceil(lockRemainingSec / 60)} دقیقه باقی‌مانده)`
                : errorMessage}
            </p>
          ) : null}
          <Button
            className="w-full"
            onClick={handleUnlock}
            disabled={isPending || isLocked || !password.trim()}
          >
            {isPending
              ? "در حال بررسی..."
              : isLocked
                ? `قفل موقت — ${Math.ceil(lockRemainingSec / 60)} دقیقه صبر کنید`
                : "ورود به صفحه دستگاه"}
          </Button>
        </div>
      </main>
    </div>
  );
}
