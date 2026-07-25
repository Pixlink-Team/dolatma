"use client";

import { AlertTriangle, CircleAlert, Info, Lightbulb, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResolvedAppError } from "@/lib/app-errors/types";

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  error: CircleAlert,
} as const;

const SEVERITY_CLASS = {
  info: "text-sky-600 dark:text-sky-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-destructive",
} as const;

interface AppErrorModalProps {
  open: boolean;
  error: ResolvedAppError | null;
  onOpenChange: (open: boolean) => void;
  onReportProblem?: () => void;
}

export function AppErrorModal({
  open,
  error,
  onOpenChange,
  onReportProblem,
}: AppErrorModalProps) {
  if (!error) return null;

  const Icon = SEVERITY_ICON[error.severity];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 text-right">
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${SEVERITY_CLASS[error.severity]}`} />
            <span>{error.title}</span>
          </DialogTitle>
          <DialogDescription className="text-right text-sm leading-6 text-foreground/80">
            {error.message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Wrench className="h-3.5 w-3.5" />
              چرا این خطا را می‌بینید؟
            </p>
            <p className="text-sm leading-6">{error.why}</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <Lightbulb className="h-3.5 w-3.5" />
              الان چه کار کنید؟
            </p>
            <p className="text-sm leading-6">{error.whatToDo}</p>
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
          <Button type="button" onClick={() => onOpenChange(false)}>
            متوجه شدم
          </Button>
          {onReportProblem ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onReportProblem();
              }}
            >
              گزارش مشکل
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
