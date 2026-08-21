"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  encodePlanLabel,
  formatPlanLabelDisplay,
  type ContentTopic,
} from "@/lib/content-topics";
import { cn } from "@/lib/utils";

interface PlanLabelSelectProps {
  topics?: ContentTopic[];
  /** Legacy flat plan list — used when topics is empty. */
  plans?: string[];
  value?: string | null;
  values?: string[];
  onChange?: (value: string | null) => void;
  onChangeMultiple?: (values: string[]) => void;
  label?: string;
  optional?: boolean;
  multiple?: boolean;
  /** Save-time / deep-link empty highlight. */
  invalid?: boolean;
  className?: string;
}

function buildOptions(topics: ContentTopic[], plans: string[]): string[] {
  if (topics.length > 0) {
    const options: string[] = [];
    for (const topic of topics) {
      options.push(topic.name);
      for (const sub of topic.subtopics) {
        options.push(encodePlanLabel(topic.name, sub));
      }
    }
    return options;
  }
  return plans;
}

export function PlanLabelSelect({
  topics = [],
  plans = [],
  value,
  values,
  onChange,
  onChangeMultiple,
  label = "موضوع",
  optional = false,
  multiple = true,
  invalid = false,
  className,
}: PlanLabelSelectProps) {
  const options = buildOptions(topics, plans);
  if (options.length === 0) {
    return (
      <div data-field="planLabels" className={cn("space-y-2", className)}>
        <Label className={cn(invalid && "text-destructive")}>
          {label}
          {!optional ? <span className="mr-1 text-destructive">*</span> : null}
        </Label>
        <p className="text-xs text-destructive">
          هنوز موضوعی در تنظیمات راستا تعریف نشده است.
        </p>
      </div>
    );
  }

  const selected = multiple
    ? values ?? (value?.trim() ? [value] : [])
    : value?.trim()
      ? [value]
      : [];

  const available = options.filter((option) => !selected.includes(option));

  const addValue = (next: string) => {
    if (!next || selected.includes(next)) return;
    const updated = [...selected, next];
    if (multiple && onChangeMultiple) {
      onChangeMultiple(updated);
    } else {
      onChange?.(next);
      onChangeMultiple?.(updated);
    }
  };

  const removeValue = (token: string) => {
    const updated = selected.filter((item) => item !== token);
    if (!optional && updated.length === 0) return;
    if (multiple && onChangeMultiple) {
      onChangeMultiple(updated);
    } else {
      onChange?.(updated[0] ?? null);
      onChangeMultiple?.(updated);
    }
  };

  const searchableOptions = available.map((option) => {
    const isSub = option.includes("|");
    return {
      value: option,
      label: isSub ? `↳ ${formatPlanLabelDisplay(option)}` : formatPlanLabelDisplay(option),
      keywords: option,
    };
  });

  return (
    <div data-field="planLabels" className={cn("space-y-2", className)}>
      <Label className={cn(invalid && "text-destructive")}>
        {label}
        {!optional ? <span className="mr-1 text-destructive">*</span> : null}
      </Label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((token) => (
            <Badge key={token} variant="secondary" className="gap-1 pl-2">
              {formatPlanLabelDisplay(token)}
              {(optional || selected.length > 1) && (
                <button
                  type="button"
                  className="rounded-full hover:bg-muted"
                  onClick={() => removeValue(token)}
                  aria-label="حذف موضوع"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      {available.length > 0 ? (
        <SearchableSelect
          key={selected.join("|")}
          value=""
          onValueChange={addValue}
          options={searchableOptions}
          placeholder={multiple ? "افزودن موضوع / زیرموضوع" : "انتخاب موضوع"}
          searchPlaceholder="جستجوی موضوع..."
          clearAfterSelect
          triggerClassName={cn(
            invalid && "border-destructive focus-visible:ring-destructive"
          )}
        />
      ) : null}
      {invalid && selected.length === 0 ? (
        <p className="text-xs text-destructive">موضوع را انتخاب کنید.</p>
      ) : null}
      {optional && multiple && selected.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => {
            onChangeMultiple?.([]);
            onChange?.(null);
          }}
        >
          پاک کردن همه
        </Button>
      )}
    </div>
  );
}
