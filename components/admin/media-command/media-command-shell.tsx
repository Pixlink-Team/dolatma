"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MEDIA_COMMAND_NAV } from "@/lib/media-command/labels";
import { adminHref, cn } from "@/lib/utils";

interface MediaCommandShellProps {
  campaignId: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function MediaCommandShell({
  campaignId,
  title,
  description,
  actions,
  children,
}: MediaCommandShellProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} description={description}>
        {actions}
      </AdminPageHeader>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {MEDIA_COMMAND_NAV.map((item) => {
          const href = adminHref(item.href, campaignId);
          const isActive =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={href}
              prefetch={false}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
