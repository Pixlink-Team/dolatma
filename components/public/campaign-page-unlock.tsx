"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { CampaignAuthChip } from "@/components/public/campaign-auth-chip";
import type { CampaignAuthViewer } from "@/lib/auth/campaign-viewer";

interface CampaignPageUnlockProps {
  slug: string;
  title: string;
  authViewer?: CampaignAuthViewer | null;
}

export function CampaignPageUnlock({
  slug,
  title,
  authViewer = null,
}: CampaignPageUnlockProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleUnlock = () => {
    if (!password.trim()) return;

    startTransition(async () => {
      const response = await fetch(`/api/campaign/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "رمز اشتباه است");
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
            <p className="text-xs text-muted-foreground">صفحه اقدام</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <CampaignAuthChip viewer={authViewer} returnPath={`/campaign/${slug}`} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border bg-card">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">این اقدام با رمز محافظت شده است</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          برای مشاهده محتوا، رمز عبور را وارد کنید.
        </p>

        <div className="mt-8 w-full space-y-3 text-right">
          <Label htmlFor="campaign-page-password">رمز عبور</Label>
          <Input
            id="campaign-page-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleUnlock();
            }}
            placeholder="رمز صفحه اقدام"
            autoFocus
            dir="ltr"
            className="text-left"
          />
          <Button
            className="w-full"
            onClick={handleUnlock}
            disabled={isPending || !password.trim()}
          >
            {isPending ? "در حال بررسی..." : "ورود به اقدام"}
          </Button>
        </div>
      </main>
    </div>
  );
}
