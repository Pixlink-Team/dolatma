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
import { ImageZoom } from "@/components/ui/image-zoom";
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
      <DialogContent className="flex max-h-[92vh] max-w-lg flex-col gap-4 overflow-hidden sm:max-w-xl">
        <DialogHeader className="shrink-0">
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {unavailable ? (
            <p className="text-sm leading-7 text-muted-foreground">{unavailableMessage}</p>
          ) : currentStep ? (
            <div className="space-y-4">
              {currentStep.imageUrl ? (
                <ImageZoom
                  src={currentStep.imageUrl}
                  alt={currentStep.title}
                  className="aspect-square w-full rounded-xl border bg-muted/30"
                  imgClassName="object-cover object-center"
                  sizes="(max-width: 640px) 90vw, 36rem"
                  quality={80}
                />
              ) : null}
              <div>
                <h3 className="text-base font-semibold">{currentStep.title}</h3>
                {currentStep.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {currentStep.body}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-4">
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
