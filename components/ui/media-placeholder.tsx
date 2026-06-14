import { Film, ImageIcon, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaPlaceholderProps {
  kind?: "image" | "video" | "poster" | "billboard";
  className?: string;
  label?: string;
}

export function MediaPlaceholder({
  kind = "image",
  className,
  label,
}: MediaPlaceholderProps) {
  const Icon =
    kind === "video" ? Film : kind === "billboard" ? LayoutGrid : ImageIcon;
  const defaultLabel =
    kind === "video"
      ? "بدون کاور ویدیو"
      : kind === "poster"
        ? "بدون تصویر پوستر"
        : kind === "billboard"
          ? "تصویر بیلبورد ثبت نشده"
          : "بدون تصویر";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-muted-foreground",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-xs font-medium">{label ?? defaultLabel}</span>
    </div>
  );
}
