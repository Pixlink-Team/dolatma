"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  userCreateFieldTutorials,
  type UserCreateFieldKey,
} from "@/lib/user-create-field-tutorials";

interface FieldTutorialTipProps {
  fieldKey: UserCreateFieldKey;
  visible: boolean;
  onDismiss: (key: UserCreateFieldKey) => void;
}

export function FieldTutorialTip({
  fieldKey,
  visible,
  onDismiss,
}: FieldTutorialTipProps) {
  if (!visible) return null;

  const tip = userCreateFieldTutorials[fieldKey];

  return (
    <div
      role="status"
      className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-right shadow-sm"
    >
      <div className="flex items-start gap-2">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium text-foreground">{tip.title}</p>
          <p className="text-xs leading-6 text-muted-foreground">{tip.body}</p>
          <div className="pt-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onDismiss(fieldKey)}
            >
              متوجه شدم
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
