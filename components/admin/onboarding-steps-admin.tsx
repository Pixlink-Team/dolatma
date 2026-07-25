"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOnboardingStepAction,
  deleteOnboardingStepAction,
  listOnboardingStepsAction,
  updateOnboardingStepAction,
} from "@/lib/actions/onboarding-actions";
import { ONBOARDING_EVALUATOR_LABELS } from "@/lib/onboarding/defaults";
import {
  ONBOARDING_EVALUATORS,
  type OnboardingEvaluator,
  type OnboardingStep,
} from "@/lib/onboarding/types";
import { formatPersianNumber } from "@/lib/utils";

export function OnboardingStepsAdmin() {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [newStep, setNewStep] = useState({
    stepKey: "",
    title: "",
    description: "",
    href: "",
    evaluator: "none" as OnboardingEvaluator,
  });

  const load = async () => {
    setLoading(true);
    const result = await listOnboardingStepsAction();
    if (!result.success) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    setSteps(result.steps);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateLocal = (id: string, patch: Partial<OnboardingStep>) => {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  };

  const saveStep = (step: OnboardingStep) => {
    startTransition(async () => {
      const result = await updateOnboardingStepAction({
        id: step.id,
        title: step.title,
        description: step.description,
        href: step.href,
        evaluator: step.evaluator,
        sortOrder: step.sortOrder,
        isActive: step.isActive,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("مرحله ذخیره شد");
      setSteps((prev) => prev.map((item) => (item.id === result.step.id ? result.step : item)));
    });
  };

  const removeStep = (id: string) => {
    startTransition(async () => {
      const result = await deleteOnboardingStepAction(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("مرحله حذف شد");
      setSteps((prev) => prev.filter((step) => step.id !== id));
    });
  };

  const createStep = () => {
    startTransition(async () => {
      const result = await createOnboardingStepAction(newStep);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("مرحله افزوده شد");
      setNewStep({
        stepKey: "",
        title: "",
        description: "",
        href: "",
        evaluator: "none",
      });
      setSteps((prev) => [...prev, result.step].sort((a, b) => a.sortOrder - b.sortOrder));
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">در حال بارگذاری…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مراحل راه‌اندازی</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          عنوان، ترتیب و فعال بودن مراحل چک‌لیست راه‌اندازی را مدیریت کنید. پیشرفت از دادهٔ واقعی
          محاسبه می‌شود.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={step.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">
                  مرحله {formatPersianNumber(index + 1)} —{" "}
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {step.stepKey}
                  </span>
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${step.id}`} className="text-xs">
                      فعال
                    </Label>
                    <Switch
                      id={`active-${step.id}`}
                      checked={step.isActive}
                      onCheckedChange={(checked) => updateLocal(step.id, { isActive: checked })}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => saveStep(step)}
                    disabled={isPending}
                    className="gap-1"
                  >
                    <Save className="h-3.5 w-3.5" />
                    ذخیره
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeStep(step.id)}
                    disabled={isPending}
                    className="gap-1 text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>عنوان</Label>
                <Input
                  value={step.title}
                  onChange={(event) => updateLocal(step.id, { title: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ترتیب</Label>
                <Input
                  type="number"
                  value={step.sortOrder}
                  onChange={(event) =>
                    updateLocal(step.id, { sortOrder: Number(event.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>توضیح</Label>
                <Textarea
                  value={step.description}
                  onChange={(event) => updateLocal(step.id, { description: event.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>لینک</Label>
                <Input
                  value={step.href}
                  dir="ltr"
                  onChange={(event) => updateLocal(step.id, { href: event.target.value })}
                  placeholder="/admin/..."
                />
              </div>
              <div className="space-y-2">
                <Label>ارزیابی‌کننده</Label>
                <Select
                  value={step.evaluator}
                  onValueChange={(value) =>
                    updateLocal(step.id, { evaluator: value as OnboardingEvaluator })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ONBOARDING_EVALUATORS.map((evaluator) => (
                      <SelectItem key={evaluator} value={evaluator}>
                        {ONBOARDING_EVALUATOR_LABELS[evaluator]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">افزودن مرحله جدید</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>کلید (انگلیسی)</Label>
            <Input
              value={newStep.stepKey}
              dir="ltr"
              placeholder="custom_step"
              onChange={(event) => setNewStep((prev) => ({ ...prev, stepKey: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>عنوان</Label>
            <Input
              value={newStep.title}
              onChange={(event) => setNewStep((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>توضیح</Label>
            <Textarea
              value={newStep.description}
              rows={2}
              onChange={(event) =>
                setNewStep((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>لینک</Label>
            <Input
              value={newStep.href}
              dir="ltr"
              onChange={(event) => setNewStep((prev) => ({ ...prev, href: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>ارزیابی‌کننده</Label>
            <Select
              value={newStep.evaluator}
              onValueChange={(value) =>
                setNewStep((prev) => ({ ...prev, evaluator: value as OnboardingEvaluator }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ONBOARDING_EVALUATORS.map((evaluator) => (
                  <SelectItem key={evaluator} value={evaluator}>
                    {ONBOARDING_EVALUATOR_LABELS[evaluator]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button onClick={createStep} disabled={isPending} className="gap-1">
              <Plus className="h-4 w-4" />
              افزودن مرحله
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
