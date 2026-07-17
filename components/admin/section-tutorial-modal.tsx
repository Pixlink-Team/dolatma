"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TutorialStep } from "@/lib/section-tutorials";
import { formatPersianNumber } from "@/lib/utils";

interface SectionTutorialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: TutorialStep[];
  /** When true, tutorial content is missing and create stays blocked. */
  unavailable?: boolean;
  unavailableMessage?: string;
  completing?: boolean;
  onComplete: () => void;
}

export function SectionTutorialModal({
  open,
  onOpenChange,
  title,
  steps,
  unavailable = false,
  unavailableMessage = "آموزش این بخش هنوز توسط مدیر آماده نشده است. تا زمان آماده‌سازی امکان افزودن وجود ندارد.",
  completing = false,
  onComplete,
}: SectionTutorialModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const safeSteps = steps.length > 0 ? steps : [];
  const currentStep = safeSteps[stepIndex];
  const isLastStep = stepIndex >= safeSteps.length - 1 && safeSteps.length > 0;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStepIndex(0);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 shrink-0" />
            {title || "آموزش بخش"}
          </DialogTitle>
          <DialogDescription>
            {unavailable
              ? "افزودن محتوا تا تکمیل آموزش توسط مدیر غیرفعال است"
              : `مرحله ${formatPersianNumber(stepIndex + 1)} از ${formatPersianNumber(safeSteps.length)}`}
          </DialogDescription>
        </DialogHeader>

        {unavailable ? (
          <p className="text-sm leading-7 text-muted-foreground">{unavailableMessage}</p>
        ) : currentStep ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">{currentStep.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {currentStep.body}
              </p>
            </div>
            {currentStep.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentStep.imageUrl}
                alt={currentStep.title}
                className="max-h-64 w-full rounded-lg border object-contain bg-muted/30"
              />
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          {unavailable ? (
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              بستن
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === 0 || completing}
                onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
              >
                <ChevronRight className="h-4 w-4" />
                قبلی
              </Button>
              <div className="flex gap-2">
                {!isLastStep ? (
                  <Button
                    type="button"
                    disabled={completing}
                    onClick={() =>
                      setStepIndex((prev) => Math.min(safeSteps.length - 1, prev + 1))
                    }
                  >
                    بعدی
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" disabled={completing} onClick={onComplete}>
                    متوجه شدم
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
