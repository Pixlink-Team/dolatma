import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REIS_HOME_PATH, type ReisSection } from "@/lib/reis/sections";

type ReisSectionPlaceholderProps = {
  section: ReisSection;
};

export function ReisSectionPlaceholder({ section }: ReisSectionPlaceholderProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-center sm:text-right">
      <div className="space-y-3 rounded-2xl border border-border/80 bg-card/80 p-8 shadow-[var(--shadow-apple)]">
        <p className="text-sm font-medium text-primary">بخش اختصاصی رییس</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{section.title}</h1>
        <p className="text-sm leading-7 text-muted-foreground">{section.description}</p>
        <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm leading-6 text-muted-foreground">
          نمای این بخش به‌زودی آماده می‌شود. فعلاً از همین مسیر می‌توانید به
          صفحه اصلی دسترسی رییس بازگردید.
        </p>
        <div className="pt-2">
          <Button asChild variant="outline" className="gap-1.5">
            <Link href={REIS_HOME_PATH}>
              <ArrowRight className="h-4 w-4" />
              بازگشت به فهرست بخش‌ها
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
