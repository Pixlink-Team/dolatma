"use client";

import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOwnerLocationFilter } from "@/lib/context/owner-location-filter-context";
import type { CampaignContentSort } from "@/lib/owner-location-filter";

export function CampaignDashboardSortSelect({ className }: { className?: string }) {
  const { filter, setSortOrder } = useOwnerLocationFilter();

  return (
    <Select
      value={filter.sortOrder}
      onValueChange={(value) => setSortOrder(value as CampaignContentSort)}
    >
      <SelectTrigger className={className ?? "h-9 w-[11.5rem] sm:w-56"} data-export-hide>
        <div className="flex min-w-0 items-center gap-2">
          <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="ترتیب نمایش" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">ترتیب پیش‌فرض</SelectItem>
        <SelectItem value="newest">جدیدترین آپلود</SelectItem>
        <SelectItem value="oldest">قدیمی‌ترین آپلود</SelectItem>
        <SelectItem value="top_scored">۵ برتر (امتیاز)</SelectItem>
      </SelectContent>
    </Select>
  );
}
