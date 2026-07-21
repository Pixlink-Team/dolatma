"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormBuilderDialog } from "@/components/admin/form-builder-dialog";
import { FormFillDialog } from "@/components/admin/form-fill-dialog";
import { FormResponsesPanel } from "@/components/admin/form-responses-panel";
import {
  deleteCampaignFormAction,
  listCampaignFormsAction,
  listFormResponsesAction,
} from "@/lib/actions/form-actions";
import { campaignFormStatusLabels } from "@/lib/campaign-forms";
import { formatPersianNumber } from "@/lib/utils";
import type { CampaignForm, CampaignFormResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FormsAdminProps {
  campaignId: string;
  canManage: boolean;
}

export function FormsAdmin({ campaignId, canManage }: FormsAdminProps) {
  const [forms, setForms] = useState<CampaignForm[]>([]);
  const [responses, setResponses] = useState<CampaignFormResponse[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<CampaignForm | null>(null);
  const [fillOpen, setFillOpen] = useState(false);
  const [fillForm, setFillForm] = useState<CampaignForm | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedForm = forms.find((form) => form.id === selectedFormId) ?? null;

  const loadForms = useCallback(async () => {
    setLoading(true);
    const result = await listCampaignFormsAction(campaignId);
    if (!result.success) {
      toast.error(result.error ?? "بارگذاری فرم‌ها ناموفق بود");
      setLoading(false);
      return;
    }
    setForms(result.forms);
    setSelectedFormId((prev) => {
      if (prev && result.forms.some((form) => form.id === prev)) return prev;
      return result.forms[0]?.id ?? null;
    });
    setLoading(false);
  }, [campaignId]);

  const loadResponses = useCallback(
    async (formId: string | null) => {
      if (!formId) {
        setResponses([]);
        return;
      }
      const result = await listFormResponsesAction({ campaignId, formId });
      if (!result.success) {
        toast.error(result.error ?? "بارگذاری پاسخ‌ها ناموفق بود");
        return;
      }
      setResponses(result.responses);
    },
    [campaignId]
  );

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  useEffect(() => {
    void loadResponses(selectedFormId);
  }, [loadResponses, selectedFormId]);

  const refreshAll = async () => {
    await loadForms();
    await loadResponses(selectedFormId);
  };

  const openCreate = () => {
    setEditingForm(null);
    setBuilderOpen(true);
  };

  const openEdit = (form: CampaignForm) => {
    setEditingForm(form);
    setBuilderOpen(true);
  };

  const openFill = (form: CampaignForm) => {
    setFillForm(form);
    setFillOpen(true);
  };

  const handleDelete = (form: CampaignForm) => {
    if (!confirm(`فرم «${form.title}» و همه پاسخ‌هایش حذف شود؟`)) return;
    startTransition(async () => {
      const result = await deleteCampaignFormAction(form.id, campaignId);
      if (!result.success) {
        toast.error(result.error ?? "حذف فرم ناموفق بود");
        return;
      }
      toast.success("فرم حذف شد");
      await refreshAll();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">فرم‌ها</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "فرم بسازید، فیلدها را ویرایش کنید و پاسخ‌های مشارکت‌کنندگان را ببینید"
              : "فرم‌های منتشرشده را پر کنید و پاسخ‌های خود را ببینید"}
          </p>
        </div>
        {canManage ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            فرم جدید
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          در حال بارگذاری...
        </div>
      ) : forms.length === 0 ? (
        <div className="rounded-xl border bg-muted/20 p-10 text-center space-y-3">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-medium">
            {canManage ? "هنوز فرمی ساخته نشده" : "فرم منتشرشده‌ای وجود ندارد"}
          </p>
          {canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              ساخت اولین فرم
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-3">
            {forms.map((form) => {
              const isSelected = form.id === selectedFormId;
              const canFill = form.status === "published";
              return (
                <div
                  key={form.id}
                  className={cn(
                    "rounded-xl border p-4 space-y-3 transition-colors cursor-pointer",
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                  )}
                  onClick={() => setSelectedFormId(form.id)}
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{form.title}</p>
                    {form.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {form.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{campaignFormStatusLabels[form.status]}</span>
                    <span>
                      {formatPersianNumber(form.fields.length)} فیلد
                      {typeof form.responseCount === "number"
                        ? ` · ${formatPersianNumber(form.responseCount)} پاسخ`
                        : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canFill ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openFill(form);
                        }}
                      >
                        پر کردن
                      </Button>
                    ) : null}
                    {canManage ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(form);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          ویرایش
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(form);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <FormResponsesPanel
            campaignId={campaignId}
            form={selectedForm}
            responses={responses}
            canManage={canManage}
            onChanged={() => void loadResponses(selectedFormId)}
          />
        </div>
      )}

      {canManage ? (
        <FormBuilderDialog
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          campaignId={campaignId}
          form={editingForm}
          onSaved={() => void refreshAll()}
        />
      ) : null}

      <FormFillDialog
        open={fillOpen}
        onOpenChange={setFillOpen}
        campaignId={campaignId}
        form={fillForm}
        onSubmitted={() => void refreshAll()}
      />
    </div>
  );
}
