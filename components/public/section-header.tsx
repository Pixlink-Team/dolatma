import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  id?: string;
  children?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  id,
  children,
  className,
}: SectionHeaderProps) {
  return (
    <div id={id} className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm max-w-2xl">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
