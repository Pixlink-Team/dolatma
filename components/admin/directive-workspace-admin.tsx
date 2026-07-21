"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentUpload } from "@/components/ui/document-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ackDirectiveReplacementAlertAction,
  addDirectiveWorkspaceAssetVersionAction,
  createDirectiveWorkspaceAssetAction,
  deleteDirectiveWorkspaceAssetAction,
  recordDirectiveAssetEventAction,
  saveDirectiveWorkspaceMetaAction,
} from "@/lib/actions/directive-workspace-actions";
import {
  DIRECTIVE_URGENCY_OPTIONS,
  DIRECTIVE_WORKSPACE_ASSET_CATEGORIES,
  getDirectiveUrgencyLabel,
  getWorkspaceAssetCategoryMeta,
} from "@/lib/directive-workspace";
import { IRAN_PROVINCES } from "@/lib/iran-locations";
import type {
  DirectiveReplacementAlert,
  DirectiveUrgency,
  DirectiveWorkspaceAsset,
  DirectiveWorkspaceAssetCategory,
  DirectiveWorkspaceBundle,
  DirectiveWorkspaceFaqItem,
  DirectiveWorkspaceKpi,
  Ministry,
} from "@/lib/types";
import {
  adminHref,
  cn,
  formatPersianDate,
  formatPersianDateTime,
  formatPersianNumber,
  generateId,
} from "@/lib/utils";

interface CampaignUserOption {
  id: string;
  name: string;
  email: string;
}

interface DirectiveWorkspaceAdminProps {
  campaignId: string;
  canManage: boolean;
  initialBundle: DirectiveWorkspaceBundle;
  initialAlerts: DirectiveReplacementAlert[];
  campaignUsers: CampaignUserOption[];
  ministries: Ministry[];
}

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(values: string[]): string {
  return values.join("\n");
}

export function DirectiveWorkspaceAdmin({
  campaignId,
  canManage,
  initialBundle,
  initialAlerts,
  campaignUsers,
  ministries,
}: DirectiveWorkspaceAdminProps) {
  const [bundle, setBundle] = useState(initialBundle);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [isPending, startTransition] = useTransition();

  const [objective, setObjective] = useState(bundle.meta.objective);
  const [expectedResults, setExpectedResults] = useState(bundle.meta.expectedResults);
  const [urgency, setUrgency] = useState<DirectiveUrgency>(bundle.meta.urgency);
  const [mandatoryActions, setMandatoryActions] = useState(
    listToLines(bundle.meta.mandatoryActions)
  );
  const [suggestedActions, setSuggestedActions] = useState(
    listToLines(bundle.meta.suggestedActions)
  );
  const [kpis, setKpis] = useState<DirectiveWorkspaceKpi[]>(bundle.meta.kpis);
  const [brandGuide, setBrandGuide] = useState(bundle.meta.brandGuide);
  const [executionGuide, setExecutionGuide] = useState(bundle.meta.executionGuide);
  const [approvalRequirements, setApprovalRequirements] = useState(
    bundle.meta.approvalRequirements
  );
  const [centralOwnerUserId, setCentralOwnerUserId] = useState(
    bundle.meta.centralOwnerUserId ?? ""
  );
  const [centralOwnerLabel, setCentralOwnerLabel] = useState(
    bundle.meta.centralOwnerLabel ?? ""
  );
  const [faq, setFaq] = useState<DirectiveWorkspaceFaqItem[]>(bundle.meta.faq);
  const [targetMinistryIds, setTargetMinistryIds] = useState(
    new Set(bundle.meta.targetMinistryIds)
  );
  const [targetOrganizationIds, setTargetOrganizationIds] = useState(
    new Set(bundle.meta.targetOrganizationIds)
  );
  const [targetProvinces, setTargetProvinces] = useState(
    new Set(bundle.meta.targetProvinces)
  );
  const [targetCities, setTargetCities] = useState(listToLines(bundle.meta.targetCities));

  const [assetCategory, setAssetCategory] =
    useState<DirectiveWorkspaceAssetCategory>("reference");
  const [assetTitle, setAssetTitle] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [assetPrintSize, setAssetPrintSize] = useState("");
  const [assetContentText, setAssetContentText] = useState("");
  const [assetFile, setAssetFile] = useState({
    url: "",
    fileName: "",
    fileSize: 0,
    mimeType: "",
  });
  const [versionDrafts, setVersionDrafts] = useState<
    Record<
      string,
      {
        contentText: string;
        changeNote: string;
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      }
    >
  >({});

  const pendingAlerts = useMemo(
    () => alerts.filter((item) => item.status === "pending"),
    [alerts]
  );

  const assetsByCategory = useMemo(() => {
    const map = new Map<DirectiveWorkspaceAssetCategory, DirectiveWorkspaceAsset[]>();
    for (const category of DIRECTIVE_WORKSPACE_ASSET_CATEGORIES) {
      map.set(
        category.value,
        bundle.assets.filter((asset) => asset.category === category.value)
      );
    }
    return map;
  }, [bundle.assets]);

  const selectedCategoryMeta = getWorkspaceAssetCategoryMeta(assetCategory);

  const saveMeta = () => {
    startTransition(async () => {
      const result = await saveDirectiveWorkspaceMetaAction({
        directiveId: bundle.directive.id,
        objective,
        expectedResults,
        urgency,
        mandatoryActions: linesToList(mandatoryActions),
        suggestedActions: linesToList(suggestedActions),
        kpis,
        brandGuide,
        executionGuide,
        approvalRequirements,
        centralOwnerUserId: centralOwnerUserId || null,
        centralOwnerLabel: centralOwnerLabel || null,
        faq,
        targetMinistryIds: Array.from(targetMinistryIds),
        targetOrganizationIds: Array.from(targetOrganizationIds),
        targetProvinces: Array.from(targetProvinces),
        targetCities: linesToList(targetCities),
      });
      if (!result.success) {
        toast.error(result.error ?? "ذخیره نشد");
        return;
      }
      toast.success("اتاق عملیات ذخیره شد");
      setBundle((prev) => ({
        ...prev,
        meta: {
          ...prev.meta,
          objective,
          expectedResults,
          urgency,
          mandatoryActions: linesToList(mandatoryActions),
          suggestedActions: linesToList(suggestedActions),
          kpis,
          brandGuide,
          executionGuide,
          approvalRequirements,
          centralOwnerUserId: centralOwnerUserId || null,
          centralOwnerLabel: centralOwnerLabel || null,
          faq,
          targetMinistryIds: Array.from(targetMinistryIds),
          targetOrganizationIds: Array.from(targetOrganizationIds),
          targetProvinces: Array.from(targetProvinces),
          targetCities: linesToList(targetCities),
        },
      }));
    });
  };

  const createAsset = () => {
    startTransition(async () => {
      const result = await createDirectiveWorkspaceAssetAction({
        directiveId: bundle.directive.id,
        category: assetCategory,
        title: assetTitle,
        description: assetDescription,
        printSize: assetPrintSize || null,
        contentText: assetContentText || null,
        fileUrl: assetFile.url || null,
        fileName: assetFile.fileName || null,
        mimeType: assetFile.mimeType || null,
        fileSize: assetFile.fileSize,
      });
      if (!result.success) {
        toast.error(result.error ?? "ایجاد نشد");
        return;
      }
      toast.success("فایل به اتاق عملیات اضافه شد");
      window.location.reload();
    });
  };

  const addVersion = (asset: DirectiveWorkspaceAsset) => {
    const draft = versionDrafts[asset.id];
    if (!draft) {
      toast.error("نسخه جدید را تکمیل کنید");
      return;
    }
    startTransition(async () => {
      const result = await addDirectiveWorkspaceAssetVersionAction({
        assetId: asset.id,
        directiveId: bundle.directive.id,
        contentText: draft.contentText || null,
        fileUrl: draft.url || null,
        fileName: draft.fileName || null,
        mimeType: draft.mimeType || null,
        fileSize: draft.fileSize,
        changeNote: draft.changeNote,
      });
      if (!result.success) {
        toast.error(result.error ?? "نسخه ثبت نشد");
        return;
      }
      toast.success(
        result.alertCount > 0
          ? `نسخه ${formatPersianNumber(result.versionNumber)} ثبت شد و ${formatPersianNumber(result.alertCount)} هشدار جایگزینی ارسال شد`
          : `نسخه ${formatPersianNumber(result.versionNumber)} ثبت شد`
      );
      window.location.reload();
    });
  };

  const removeAsset = (asset: DirectiveWorkspaceAsset) => {
    if (!window.confirm(`«${asset.title}» حذف شود؟`)) return;
    startTransition(async () => {
      const result = await deleteDirectiveWorkspaceAssetAction({
        assetId: asset.id,
        directiveId: bundle.directive.id,
      });
      if (!result.success) {
        toast.error(result.error ?? "حذف نشد");
        return;
      }
      setBundle((prev) => ({
        ...prev,
        assets: prev.assets.filter((item) => item.id !== asset.id),
      }));
      toast.success("حذف شد");
    });
  };

  const trackEvent = (
    asset: DirectiveWorkspaceAsset,
    eventType: "downloaded" | "published"
  ) => {
    const version = asset.currentVersion;
    if (!version) return;
    startTransition(async () => {
      const result = await recordDirectiveAssetEventAction({
        directiveId: bundle.directive.id,
        assetId: asset.id,
        versionId: version.id,
        eventType,
      });
      if (!result.success) {
        toast.error(result.error ?? "ثبت نشد");
        return;
      }
      toast.success(eventType === "downloaded" ? "دانلود ثبت شد" : "انتشار ثبت شد");
    });
  };

  const ackAlert = (alert: DirectiveReplacementAlert, status: "acked" | "replaced") => {
    startTransition(async () => {
      const result = await ackDirectiveReplacementAlertAction({
        alertId: alert.id,
        status,
      });
      if (!result.success) {
        toast.error(result.error ?? "ثبت نشد");
        return;
      }
      setAlerts((prev) =>
        prev.map((item) =>
          item.id === alert.id
            ? { ...item, status, ackedAt: new Date().toISOString() }
            : item
        )
      );
      toast.success(status === "replaced" ? "جایگزینی تأیید شد" : "هشدار تأیید شد");
    });
  };

  const toggleSetValue = (set: Set<string>, value: string, next: boolean) => {
    const copy = new Set(set);
    if (next) copy.add(value);
    else copy.delete(value);
    return copy;
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Link
            href={adminHref("/admin/directives", campaignId)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
            بازگشت به دستورکارها
          </Link>
          <div>
            <h1 className="text-2xl font-bold">اتاق عملیات دستورکار</h1>
            <p className="mt-1 text-sm text-muted-foreground">{bundle.directive.title}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {bundle.directive.startDate && (
              <span>شروع: {formatPersianDate(bundle.directive.startDate)}</span>
            )}
            {(bundle.directive.endDate || bundle.directive.dueDate) && (
              <span>
                پایان: {formatPersianDate(bundle.directive.endDate ?? bundle.directive.dueDate!)}
              </span>
            )}
            <Badge variant={bundle.directive.priority === "urgent" ? "destructive" : "secondary"}>
              اولویت: {bundle.directive.priority === "urgent" ? "فوری" : "عادی"}
            </Badge>
            <Badge variant="outline">فوریت: {getDirectiveUrgencyLabel(urgency)}</Badge>
          </div>
        </div>
        {canManage && (
          <Button onClick={saveMeta} disabled={isPending}>
            ذخیره اتاق عملیات
          </Button>
        )}
      </div>

      {pendingAlerts.length > 0 && (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            هشدار جایگزینی نسخه
            <Badge variant="secondary">{formatPersianNumber(pendingAlerts.length)}</Badge>
          </div>
          <div className="space-y-2">
            {pendingAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{alert.assetTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    نسخه {formatPersianNumber(alert.oldVersionNumber)} →{" "}
                    {formatPersianNumber(alert.newVersionNumber)}
                    {alert.ministryName ? ` · ${alert.ministryName}` : ""}
                    {alert.userName && canManage ? ` · ${alert.userName}` : ""}
                  </p>
                </div>
                {!canManage && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => ackAlert(alert, "acked")}
                    >
                      متوجه شدم
                    </Button>
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => ackAlert(alert, "replaced")}
                    >
                      <Check className="h-4 w-4" />
                      جایگزین کردم
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">هدف و مخاطب</TabsTrigger>
          <TabsTrigger value="actions">اقدامات و KPI</TabsTrigger>
          <TabsTrigger value="assets">فایل‌ها و نسخه‌ها</TabsTrigger>
          <TabsTrigger value="guides">راهنما و FAQ</TabsTrigger>
          {canManage && <TabsTrigger value="alerts">هشدارها</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>هدف اصلی</Label>
              <Textarea
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                disabled={!canManage}
                rows={4}
                placeholder="هدف اصلی این دستورکار چیست؟"
              />
            </div>
            <div className="space-y-2">
              <Label>نتایج مورد انتظار</Label>
              <Textarea
                value={expectedResults}
                onChange={(event) => setExpectedResults(event.target.value)}
                disabled={!canManage}
                rows={4}
                placeholder="چه نتایجی باید حاصل شود؟"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>درجه فوریت</Label>
              <Select
                value={urgency}
                onValueChange={(value) => setUrgency(value as DirectiveUrgency)}
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIVE_URGENCY_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>مسئول مرکزی کمپین</Label>
              <Select
                value={centralOwnerUserId || "__none__"}
                onValueChange={(value) =>
                  setCentralOwnerUserId(value === "__none__" ? "" : value)
                }
                disabled={!canManage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب مسئول" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون مسئول مشخص</SelectItem>
                  {campaignUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={centralOwnerLabel}
                onChange={(event) => setCentralOwnerLabel(event.target.value)}
                disabled={!canManage}
                placeholder="برچسب اختیاری (مثلاً ستاد مرکزی)"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <Label>دستگاه‌های هدف (وزارتخانه / زیرمجموعه)</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {ministries.map((ministry) => {
                const ministryChecked = targetMinistryIds.has(ministry.id);
                return (
                  <div key={ministry.id} className="rounded-lg border px-3 py-2 space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={ministryChecked}
                        disabled={!canManage}
                        onChange={(event) =>
                          setTargetMinistryIds((prev) =>
                            toggleSetValue(prev, ministry.id, event.target.checked)
                          )
                        }
                      />
                      {ministry.name}
                    </label>
                    {(ministry.organizations ?? []).map((org) => (
                      <label
                        key={org.id}
                        className="mr-5 flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={targetOrganizationIds.has(org.id)}
                          disabled={!canManage}
                          onChange={(event) =>
                            setTargetOrganizationIds((prev) =>
                              toggleSetValue(prev, org.id, event.target.checked)
                            )
                          }
                        />
                        {org.name}
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-xl border p-4">
              <Label>استان‌های هدف</Label>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {IRAN_PROVINCES.map((province) => (
                  <label key={province} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={targetProvinces.has(province)}
                      disabled={!canManage}
                      onChange={(event) =>
                        setTargetProvinces((prev) =>
                          toggleSetValue(prev, province, event.target.checked)
                        )
                      }
                    />
                    {province}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>شهرهای هدف (هر خط یک شهر)</Label>
              <Textarea
                value={targetCities}
                onChange={(event) => setTargetCities(event.target.value)}
                disabled={!canManage}
                rows={12}
                placeholder={"تهران\nمشهد\nاصفهان"}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>اقدامات الزامی (هر خط یک مورد)</Label>
              <Textarea
                value={mandatoryActions}
                onChange={(event) => setMandatoryActions(event.target.value)}
                disabled={!canManage}
                rows={8}
              />
            </div>
            <div className="space-y-2">
              <Label>اقدامات پیشنهادی (هر خط یک مورد)</Label>
              <Textarea
                value={suggestedActions}
                onChange={(event) => setSuggestedActions(event.target.value)}
                disabled={!canManage}
                rows={8}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-2">
              <Label>KPIها و اهداف کمی</Label>
              {canManage && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setKpis((prev) => [
                      ...prev,
                      { id: generateId(), title: "", target: 0, unit: "" },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  افزودن KPI
                </Button>
              )}
            </div>
            {kpis.length === 0 ? (
              <p className="text-sm text-muted-foreground">هنوز KPI تعریف نشده</p>
            ) : (
              <div className="space-y-2">
                {kpis.map((kpi, index) => (
                  <div key={kpi.id} className="grid gap-2 md:grid-cols-[1fr_120px_120px_auto]">
                    <Input
                      value={kpi.title}
                      disabled={!canManage}
                      placeholder="عنوان شاخص"
                      onChange={(event) =>
                        setKpis((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, title: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                    <Input
                      type="number"
                      value={kpi.target}
                      disabled={!canManage}
                      placeholder="هدف"
                      onChange={(event) =>
                        setKpis((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, target: Number(event.target.value || 0) }
                              : item
                          )
                        )
                      }
                    />
                    <Input
                      value={kpi.unit}
                      disabled={!canManage}
                      placeholder="واحد"
                      onChange={(event) =>
                        setKpis((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, unit: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                    {canManage && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setKpis((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          {canManage && (
            <div className="space-y-3 rounded-xl border p-4">
              <h2 className="font-semibold">افزودن فایل / متن به Workspace</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>دسته</Label>
                  <Select
                    value={assetCategory}
                    onValueChange={(value) =>
                      setAssetCategory(value as DirectiveWorkspaceAssetCategory)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECTIVE_WORKSPACE_ASSET_CATEGORIES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {selectedCategoryMeta.description}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>عنوان</Label>
                  <Input
                    value={assetTitle}
                    onChange={(event) => setAssetTitle(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>توضیح</Label>
                <Textarea
                  value={assetDescription}
                  onChange={(event) => setAssetDescription(event.target.value)}
                  rows={2}
                />
              </div>
              {selectedCategoryMeta.supportsPrintSize && (
                <div className="space-y-2">
                  <Label>ابعاد چاپی</Label>
                  <Input
                    value={assetPrintSize}
                    onChange={(event) => setAssetPrintSize(event.target.value)}
                    placeholder="مثلاً A3، بیلبورد ۱۲×۴"
                  />
                </div>
              )}
              {selectedCategoryMeta.supportsText && (
                <div className="space-y-2">
                  <Label>متن نسخه</Label>
                  <Textarea
                    value={assetContentText}
                    onChange={(event) => setAssetContentText(event.target.value)}
                    rows={4}
                  />
                </div>
              )}
              <DocumentUpload
                value={assetFile.url}
                fileName={assetFile.fileName}
                fileSize={assetFile.fileSize}
                mimeType={assetFile.mimeType}
                onChange={(payload) =>
                  setAssetFile({
                    url: payload.url,
                    fileName: payload.fileName,
                    fileSize: payload.fileSize,
                    mimeType: payload.mimeType,
                  })
                }
                label="آپلود فایل"
              />
              <Button type="button" disabled={isPending} onClick={createAsset}>
                <Upload className="h-4 w-4" />
                افزودن به Workspace
              </Button>
            </div>
          )}

          {DIRECTIVE_WORKSPACE_ASSET_CATEGORIES.map((category) => {
            const assets = assetsByCategory.get(category.value) ?? [];
            return (
              <section key={category.value} className="space-y-3 rounded-xl border p-4">
                <div>
                  <h3 className="font-semibold">{category.label}</h3>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
                {assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">موردی ثبت نشده</p>
                ) : (
                  <div className="space-y-3">
                    {assets.map((asset) => {
                      const draft = versionDrafts[asset.id] ?? {
                        contentText: "",
                        changeNote: "",
                        url: "",
                        fileName: "",
                        fileSize: 0,
                        mimeType: "",
                      };
                      return (
                        <article key={asset.id} className="rounded-lg border px-3 py-3 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{asset.title}</p>
                              {asset.description && (
                                <p className="text-sm text-muted-foreground">
                                  {asset.description}
                                </p>
                              )}
                              {asset.printSize && (
                                <Badge variant="outline" className="mt-1">
                                  {asset.printSize}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {asset.currentVersion?.fileUrl && (
                                <Button asChild size="sm" variant="outline">
                                  <a
                                    href={asset.currentVersion.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => trackEvent(asset, "downloaded")}
                                  >
                                    <Download className="h-4 w-4" />
                                    دانلود نسخه جاری
                                  </a>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isPending || !asset.currentVersion}
                                onClick={() => trackEvent(asset, "published")}
                              >
                                ثبت انتشار نسخه جاری
                              </Button>
                              {canManage && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() => removeAsset(asset)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {asset.currentVersion?.contentText && (
                            <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
                              {asset.currentVersion.contentText}
                            </pre>
                          )}

                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              تاریخچه نسخه‌ها
                            </p>
                            {asset.versions.map((version) => (
                              <div
                                key={version.id}
                                className={cn(
                                  "flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs",
                                  version.isCurrent && "border-primary/40 bg-primary/5"
                                )}
                              >
                                <span>
                                  نسخه {formatPersianNumber(version.versionNumber)}
                                  {version.isCurrent ? " (جاری)" : ""}
                                  {version.changeNote ? ` — ${version.changeNote}` : ""}
                                </span>
                                <span className="text-muted-foreground">
                                  {formatPersianDateTime(version.createdAt)}
                                  {version.createdByName ? ` · ${version.createdByName}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>

                          {canManage && (
                            <div className="space-y-2 rounded-md border border-dashed p-3">
                              <p className="text-sm font-medium">نسخه جدید</p>
                              {category.supportsText && (
                                <Textarea
                                  rows={3}
                                  placeholder="متن نسخه جدید"
                                  value={draft.contentText}
                                  onChange={(event) =>
                                    setVersionDrafts((prev) => ({
                                      ...prev,
                                      [asset.id]: {
                                        ...draft,
                                        contentText: event.target.value,
                                      },
                                    }))
                                  }
                                />
                              )}
                              <Input
                                placeholder="یادداشت تغییر"
                                value={draft.changeNote}
                                onChange={(event) =>
                                  setVersionDrafts((prev) => ({
                                    ...prev,
                                    [asset.id]: {
                                      ...draft,
                                      changeNote: event.target.value,
                                    },
                                  }))
                                }
                              />
                              <DocumentUpload
                                value={draft.url}
                                fileName={draft.fileName}
                                fileSize={draft.fileSize}
                                mimeType={draft.mimeType}
                                onChange={(payload) =>
                                  setVersionDrafts((prev) => ({
                                    ...prev,
                                    [asset.id]: {
                                      ...draft,
                                      url: payload.url,
                                      fileName: payload.fileName,
                                      fileSize: payload.fileSize,
                                      mimeType: payload.mimeType,
                                    },
                                  }))
                                }
                                label="فایل نسخه جدید"
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={isPending}
                                onClick={() => addVersion(asset)}
                              >
                                ثبت نسخه جدید و هشدار جایگزینی
                              </Button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </TabsContent>

        <TabsContent value="guides" className="space-y-4">
          <div className="space-y-2">
            <Label>راهنمای هویت بصری</Label>
            <Textarea
              value={brandGuide}
              onChange={(event) => setBrandGuide(event.target.value)}
              disabled={!canManage}
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label>آموزش اجرای دستور</Label>
            <Textarea
              value={executionGuide}
              onChange={(event) => setExecutionGuide(event.target.value)}
              disabled={!canManage}
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label>مستندات موردنیاز برای تأیید</Label>
            <Textarea
              value={approvalRequirements}
              onChange={(event) => setApprovalRequirements(event.target.value)}
              disabled={!canManage}
              rows={4}
            />
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-2">
              <Label>پرسش‌های متداول</Label>
              {canManage && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setFaq((prev) => [
                      ...prev,
                      { id: generateId(), question: "", answer: "" },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  افزودن سؤال
                </Button>
              )}
            </div>
            {faq.length === 0 ? (
              <p className="text-sm text-muted-foreground">سؤالی ثبت نشده</p>
            ) : (
              <div className="space-y-3">
                {faq.map((item, index) => (
                  <div key={item.id} className="space-y-2 rounded-lg border p-3">
                    <Input
                      value={item.question}
                      disabled={!canManage}
                      placeholder="سؤال"
                      onChange={(event) =>
                        setFaq((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, question: event.target.value }
                              : row
                          )
                        )
                      }
                    />
                    <Textarea
                      value={item.answer}
                      disabled={!canManage}
                      placeholder="پاسخ"
                      rows={3}
                      onChange={(event) =>
                        setFaq((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, answer: event.target.value }
                              : row
                          )
                        )
                      }
                    />
                    {canManage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setFaq((prev) => prev.filter((_, rowIndex) => rowIndex !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {canManage && (
          <TabsContent value="alerts" className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                هنوز هشدار جایگزینی‌ای ثبت نشده. با انتشار نسخه جدید برای گیرنده‌های نسخه قبلی
                هشدار ساخته می‌شود.
              </p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{alert.assetTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.userName || "کاربر"}
                      {alert.ministryName ? ` · ${alert.ministryName}` : ""}
                      {alert.organizationName ? ` › ${alert.organizationName}` : ""}
                      {" · "}
                      نسخه {formatPersianNumber(alert.oldVersionNumber)} →{" "}
                      {formatPersianNumber(alert.newVersionNumber)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      alert.status === "pending"
                        ? "destructive"
                        : alert.status === "replaced"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {alert.status === "pending"
                      ? "در انتظار"
                      : alert.status === "replaced"
                        ? "جایگزین شده"
                        : "تأیید شده"}
                  </Badge>
                </div>
              ))
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
