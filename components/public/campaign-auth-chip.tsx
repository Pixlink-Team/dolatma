"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogIn, LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAdminAction } from "@/lib/actions/auth-actions";
import type { CampaignAuthViewer } from "@/lib/auth/campaign-viewer";
import { createClient } from "@/lib/supabase/client";
import { cn, isSupabaseConfigured } from "@/lib/utils";

interface CampaignAuthChipProps {
  viewer: CampaignAuthViewer | null;
  /** Path to return to after login (e.g. /campaign/foo). */
  returnPath: string;
  className?: string;
}

export function CampaignAuthChip({ viewer, returnPath, className }: CampaignAuthChipProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!viewer) {
    const loginHref = `/admin/login?next=${encodeURIComponent(returnPath)}`;
    return (
      <Button variant="outline" size="sm" asChild className={className} data-export-hide>
        <Link href={loginHref}>
          <LogIn className="h-4 w-4" />
          ورود
        </Link>
      </Button>
    );
  }

  const profileHref = viewer.hasProfile ? "/admin/profile" : "/admin";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (supabase) await supabase.auth.signOut();
      } else {
        await logoutAdminAction();
      }
      setOpen(false);
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)} data-export-hide>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="max-w-[11rem] gap-1.5"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <UserCircle className="h-4 w-4 shrink-0" />
        <span className="truncate">{viewer.name}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 opacity-70 transition-transform", open && "rotate-180")} />
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <Link
            href={profileHref}
            role="menuitem"
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => setOpen(false)}
          >
            <UserCircle className="h-4 w-4" />
            پروفایل من
          </Link>
          <Link
            href="/admin"
            role="menuitem"
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => setOpen(false)}
          >
            <LayoutDashboard className="h-4 w-4" />
            پنل مدیریت
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={loggingOut}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-accent disabled:opacity-60"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "در حال خروج..." : "خروج"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
