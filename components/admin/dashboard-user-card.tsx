import Link from "next/link";
import { ArrowLeft, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUsernameFromEmail } from "@/lib/auth/user-login";
import { adminHref } from "@/lib/utils";

interface DashboardUserCardProps {
  name?: string | null;
  email?: string | null;
  roleLabel: string;
  campaignTitle: string;
  campaignId: string;
  subtitle?: string;
}

export function DashboardUserCard({
  name,
  email,
  roleLabel,
  campaignTitle,
  campaignId,
  subtitle,
}: DashboardUserCardProps) {
  const displayName = name?.trim() || getLoginUsernameFromEmail(email ?? "") || "کاربر";
  const username = email ? getLoginUsernameFromEmail(email) : "";

  return (
    <Card className="h-full overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardContent className="flex h-full flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <UserCircle className="h-7 w-7" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-lg font-bold leading-tight">{displayName}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-xs">
                {roleLabel}
              </Badge>
              {username ? (
                <span className="truncate text-xs text-muted-foreground" dir="ltr">
                  {username}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-1 rounded-xl bg-background/60 px-3 py-2.5 ring-1 ring-border/60">
          <p className="text-xs text-muted-foreground">راستای فعال</p>
          <p className="text-sm font-semibold leading-snug">{campaignTitle}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>

        <Link
          href={adminHref("/admin/profile", campaignId)}
          className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          پروفایل من
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
