"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Archive,
  Check,
  ClipboardCheck,
  ClipboardList,
  Eye,
  LayoutDashboard,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { DirectiveActionPlanDialog } from "@/components/admin/directive-action-plan-dialog";
import { DirectiveCtaButton } from "@/components/admin/directive-cta-button";
import { DirectiveUserView } from "@/components/admin/directive-view-content";
import { DirectiveGlobalMemoryAdmin } from "@/components/admin/directive-global-memory-admin";
import { DirectivePlaybooksAdmin } from "@/components/admin/directive-playbooks-admin";
import { DirectiveSmartWizard } from "@/components/admin/directive-smart-wizard";
import { RejectedSubmissionsInbox } from "@/components/admin/rejected-submissions-inbox";
import { ReisUpwardRequestsPanel } from "@/components/admin/reis/reis-upward-requests-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DocumentUpload } from "@/components/ui/document-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PersianDateField } from "@/components/ui/persian-date-input";
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
  archiveDirectiveAction,
  confirmDirectiveSeenAction,
  getDirectiveRecipientsAction,
  saveDirectiveAction,
} from "@/lib/actions/directive-actions";
import { convertDirectiveToSmartAction } from "@/lib/actions/directive-smart-actions";
import { checkDirectiveCalendarConflictAction } from "@/lib/actions/calendar-actions";
import {
  getDirectiveWorkspaceAction,
  saveDirectiveWorkspaceMetaAction,
} from "@/lib/actions/directive-workspace-actions";
import {
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_TITLE_MAX_LENGTH_MESSAGE,
} from "@/lib/content-constraints";
import {
  DIRECTIVE_INTERNAL_TARGET_OPTIONS,
  getDefaultInternalCtaLabel,
  mapDirectiveCtaKind,
  type DirectiveCtaKind,
  type DirectiveInternalTarget,
} from "@/lib/directive-cta";
import { getDirectiveActionAttachments } from "@/lib/directive-attachments";
import { DIRECTIVE_URGENCY_OPTIONS } from "@/lib/directive-workspace";
import {
  DIRECTIVE_MISSION_TYPE_LABELS,
  DIRECTIVE_MISSION_TYPES,
  type DirectiveCreationMode,
  type DirectiveMissionType,
} from "@/lib/directive-smart";
import type {
  CampaignDirective,
  CampaignSubmission,
  DirectiveAudienceType,
  DirectiveRecipient,
  DirectiveUrgency,
  Ministry,
} from "@/lib/types";
import type { StrategicUpwardRequest } from "@/lib/strategic-requests";
import { IRAN_PROVINCES } from "@/lib/iran-locations";
import { USER_REGIONS, getUserRegionLabel, type UserRegion } from "@/lib/user-regions";
import { adminHref, cn, formatPersianDate, formatPersianDateTime, formatPersianNumber } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1).max(CONTENT_TITLE_MAX_LENGTH, CONTENT_TITLE_MAX_LENGTH_MESSAGE),
  body: z.string().min(1, "متن دستورکار الزامی است"),
  priority: z.enum(["normal", "urgent"]),
  urgency: z.enum(["low", "normal", "high", "critical"]),
  crisisMode: z.boolean().optional(),
  escalationAfterMinutes: z.coerce.number().min(5).max(1440).optional(),
  topic: z.string().optional(),
  linkContentTopic: z.boolean().optional(),
  objective: z.string().optional(),
  expectedResults: z.string().optional(),
  mandatoryActions: z.string().optional(),
  suggestedActions: z.string().optional(),
  startDate: z.string().min(1, "تاریخ شروع الزامی است"),
  endDate: z.string().min(1, "تاریخ پایان الزامی است"),
  audienceType: z.enum(["all", "region", "users", "ministry_city"]),
  audienceRegion: z.enum(["north", "south", "east", "west"]).nullable().optional(),
  audienceMinistryId: z.string().nullable().optional(),
  audienceOrganizationId: z.string().nullable().optional(),
  ctaKind: z.enum(["none", "external", "internal"]),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  ctaTarget: z.string().nullable().optional(),
});

function linesToList(value: string | undefined): string[] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(values: string[] | undefined): string {
  return (values ?? []).join("\n");
}

type FormValues = z.infer<typeof schema>;

type InboxTab = "new" | "seen" | "all" | "rejected";
type ManagerView = "manage" | "inbox" | "upward";
type ManageListTab = "active" | "archive" | "patterns";
type IssuerFilter = "all" | "mine" | "subordinates";

interface AttachmentDraft {
  key: string;
  id?: string;
  title: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

function createAttachmentDraft(partial?: Partial<AttachmentDraft>): AttachmentDraft {
  return {
    key: partial?.key ?? `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: partial?.id,
    title: partial?.title ?? "",
    url: partial?.url ?? "",
    fileName: partial?.fileName ?? "",
    fileSize: partial?.fileSize ?? 0,
    mimeType: partial?.mimeType ?? "",
  };
}

/** Skip legacy rows that only mirrored the official letter into attachments. */
function toAttachmentDrafts(item: CampaignDirective): AttachmentDraft[] {
  return getDirectiveActionAttachments(item).map((attachment) =>
    createAttachmentDraft({
      key: attachment.id,
      id: attachment.id,
      title: attachment.title,
      url: attachment.fileUrl,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
    })
  );
}

interface CampaignUserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  region: UserRegion | null;
  phone: string | null;
  province?: string | null;
  city?: string | null;
  ministryId?: string | null;
  ministryName?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
}

interface DirectivesAdminProps {
  campaignId: string;
  canManage: boolean;
  /** Global = full campaign; subordinates = only the issuer's sub-users. */
  audienceScope?: "global" | "subordinates";
  /** Full system admin (env admin / role admin). */
  isFullAdmin?: boolean;
  /** Active (non-archived) campaign directives for managers. */
  initialDirectives: CampaignDirective[];
  /** Archived campaign directives for managers. */
  archivedDirectives?: CampaignDirective[];
  /** Directives addressed to the current user (kartabl). */
  inboxDirectives: CampaignDirective[];
  /** Rejected campaign submissions owned by the current user. */
  rejectedSubmissions?: CampaignSubmission[];
  campaignUsers: CampaignUserOption[];
  ministries?: Ministry[];
  /** Show mine / subordinates issuer filters (reis strategic view). */
  issuerFilterEnabled?: boolean;
  currentUserId?: string | null;
  headingTitle?: string;
  headingDescription?: string;
  /** Hide the page title block when embedded in another dashboard. */
  hideHeading?: boolean;
  /** Upward requests panel (subordinates → superiors). */
  upwardRequests?: StrategicUpwardRequest[];
  canCreateUpwardRequest?: boolean;
  canRespondUpwardRequest?: boolean;
}

function sortDirectives(rows: CampaignDirective[]): CampaignDirective[] {
  return [...rows].sort((a, b) => {
    const aUrgent = a.priority === "urgent" ? 0 : 1;
    const bUrgent = b.priority === "urgent" ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function formatAudienceLabel(
  item: CampaignDirective,
  audienceScope: "global" | "subordinates"
): string {
  if (item.audienceType === "region") {
    return item.audienceRegion ? `منطقه ${getUserRegionLabel(item.audienceRegion)}` : "منطقه";
  }
  if (item.audienceType === "users") return "افراد انتخابی";
  if (item.audienceType === "ministry_city") {
    const ministry = item.audienceMinistryName || "وزارتخانه";
    const org = item.audienceOrganizationName;
    const provinces = (item.audienceProvinces ?? []).join("، ");
    const scope = org ? `${ministry} › ${org}` : ministry;
    return provinces ? `${scope} — ${provinces}` : scope;
  }
  return audienceScope === "subordinates" ? "همه زیرمجموعه‌ها" : "همه کاربران";
}

const smsStatusLabels: Record<DirectiveRecipient["smsStatus"], string> = {
  pending: "در انتظار",
  sent: "ارسال شد",
  failed: "خطا",
  no_phone: "بدون شماره",
  skipped: "رد شد",
};

function DirectiveDateRange({ item }: { item: CampaignDirective }) {
  const start = item.startDate;
  const end = item.endDate ?? item.dueDate;
  if (!start && !end) return null;
  return (
    <>
      {start && <span>شروع: {formatPersianDate(start)}</span>}
      {end && <span>پایان: {formatPersianDate(end)}</span>}
    </>
  );
}

export function DirectivesAdmin({
  campaignId,
  canManage,
  audienceScope = "global",
  isFullAdmin = false,
  initialDirectives,
  archivedDirectives: initialArchived = [],
  inboxDirectives: initialInbox,
  rejectedSubmissions: initialRejected = [],
  campaignUsers,
  ministries = [],
  issuerFilterEnabled = false,
  currentUserId = null,
  headingTitle,
  headingDescription,
  hideHeading = false,
  upwardRequests: initialUpwardRequests = [],
  canCreateUpwardRequest = false,
  canRespondUpwardRequest = false,
}: DirectivesAdminProps) {
  const [rows, setRows] = useState(initialDirectives);
  const [archivedRows, setArchivedRows] = useState(initialArchived);
  const [inboxRowsState, setInboxRowsState] = useState(initialInbox);
  const [rejectedCount, setRejectedCount] = useState(initialRejected.length);
  const [managerView, setManagerView] = useState<ManagerView>("manage");
  const [manageListTab, setManageListTab] = useState<ManageListTab>("active");
  const [inboxTab, setInboxTab] = useState<InboxTab>("new");
  const [issuerFilter, setIssuerFilter] = useState<IssuerFilter>("all");
  const [open, setOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<DirectiveCreationMode>("normal");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSmartItem, setEditingSmartItem] = useState<CampaignDirective | null>(null);
  const [convertTarget, setConvertTarget] = useState<CampaignDirective | null>(null);
  const [convertMissionType, setConvertMissionType] =
    useState<DirectiveMissionType>("communication_campaign");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [letterUpload, setLetterUpload] = useState({
    url: "",
    fileName: "",
    fileSize: 0,
    mimeType: "",
  });
  const [attachmentDrafts, setAttachmentDrafts] = useState<AttachmentDraft[]>([]);
  const [detailItem, setDetailItem] = useState<CampaignDirective | null>(null);
  const [trackingItem, setTrackingItem] = useState<CampaignDirective | null>(null);
  const [recipients, setRecipients] = useState<DirectiveRecipient[]>([]);
  const [contentTracking, setContentTracking] = useState<
    | { enabled: true; topic: string; createdTotal: number; publishedTotal: number }
    | { enabled: false }
    | null
  >(null);
  const [recipientFilter, setRecipientFilter] = useState<"all" | "unseen" | "sms_error" | "no_plan">(
    "all"
  );
  const [actionPlanTarget, setActionPlanTarget] = useState<{
    directive: CampaignDirective;
    mode: "edit" | "view";
    planId?: string | null;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formTab, setFormTab] = useState<"basics" | "workspace">("basics");
  /** When false, publish a simple directive without ops-room setup or redirect. */
  const [includeOpsRoom, setIncludeOpsRoom] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      body: "",
      priority: "normal",
      urgency: "normal",
      crisisMode: false,
      escalationAfterMinutes: 30,
      topic: "",
      linkContentTopic: false,
      objective: "",
      expectedResults: "",
      mandatoryActions: "",
      suggestedActions: "",
      startDate: "",
      endDate: "",
      audienceType: "all",
      audienceRegion: null,
      audienceMinistryId: null,
      audienceOrganizationId: null,
      ctaKind: "none",
      ctaLabel: "",
      ctaUrl: "",
      ctaTarget: null,
    },
  });

  useEffect(() => {
    setRejectedCount(initialRejected.length);
  }, [initialRejected]);

  const audienceType = form.watch("audienceType");
  const audienceMinistryId = form.watch("audienceMinistryId");
  const audienceOrganizationId = form.watch("audienceOrganizationId");
  const ctaKind = form.watch("ctaKind");
  const ctaTarget = form.watch("ctaTarget");

  const audienceOrganizations = useMemo(() => {
    if (!audienceMinistryId) return [] as NonNullable<Ministry["organizations"]>;
    return (
      ministries.find((ministry) => ministry.id === audienceMinistryId)?.organizations ?? []
    );
  }, [audienceMinistryId, ministries]);

  const ministryUserProvinces = useMemo(() => {
    if (!audienceMinistryId) return [] as string[];
    const set = new Set<string>();
    for (const user of campaignUsers) {
      if (user.ministryId !== audienceMinistryId) continue;
      if (audienceOrganizationId && user.organizationId !== audienceOrganizationId) continue;
      if (user.province?.trim()) set.add(user.province.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fa"));
  }, [audienceMinistryId, audienceOrganizationId, campaignUsers]);

  const showingUpward = managerView === "upward";
  const showingInbox = !showingUpward && (!canManage || managerView === "inbox");
  const showingArchive = !showingInbox && !showingUpward && manageListTab === "archive";
  const showingPatterns = !showingInbox && !showingUpward && manageListTab === "patterns";
  const showingRejected = showingInbox && inboxTab === "rejected";
  const showUpwardTab =
    canCreateUpwardRequest || canRespondUpwardRequest || initialUpwardRequests.length > 0;

  const listRows = useMemo(() => {
    if (showingPatterns || showingRejected || showingUpward) return [] as CampaignDirective[];
    let base: CampaignDirective[];
    if (!showingInbox) {
      base = manageListTab === "archive" ? archivedRows : rows;
      if (issuerFilterEnabled && issuerFilter !== "all" && currentUserId) {
        base =
          issuerFilter === "mine"
            ? base.filter((row) => row.createdByUserId === currentUserId)
            : base.filter((row) => row.createdByUserId !== currentUserId);
      }
    } else if (inboxTab === "new") {
      base = inboxRowsState.filter((row) => !row.confirmed);
    } else if (inboxTab === "seen") {
      base = inboxRowsState.filter((row) => row.confirmed);
    } else {
      base = inboxRowsState;
    }
    return sortDirectives(base);
  }, [
    showingInbox,
    showingUpward,
    showingPatterns,
    showingRejected,
    manageListTab,
    archivedRows,
    rows,
    inboxTab,
    inboxRowsState,
    issuerFilterEnabled,
    issuerFilter,
    currentUserId,
  ]);

  const issuerCounts = useMemo(() => {
    const source = manageListTab === "archive" ? archivedRows : rows;
    if (!currentUserId) {
      return { all: source.length, mine: 0, subordinates: source.length };
    }
    const mine = source.filter((row) => row.createdByUserId === currentUserId).length;
    return {
      all: source.length,
      mine,
      subordinates: source.length - mine,
    };
  }, [archivedRows, rows, manageListTab, currentUserId]);

  const openCreate = () => {
    setEditingId(null);
    setEditingSmartItem(null);
    setCreationMode("normal");
    setFormTab("basics");
    setIncludeOpsRoom(false);
    setSelectedUserIds([]);
    setSelectedProvinces([]);
    setLetterUpload({ url: "", fileName: "", fileSize: 0, mimeType: "" });
    setAttachmentDrafts([]);
    form.reset({
      title: "",
      body: "",
      priority: "normal",
      urgency: "normal",
      crisisMode: false,
      escalationAfterMinutes: 30,
      topic: "",
      linkContentTopic: false,
      objective: "",
      expectedResults: "",
      mandatoryActions: "",
      suggestedActions: "",
      startDate: "",
      endDate: "",
      audienceType: "all",
      audienceRegion: null,
      audienceMinistryId: null,
      audienceOrganizationId: null,
      ctaKind: "none",
      ctaLabel: "",
      ctaUrl: "",
      ctaTarget: null,
    });
    setOpen(true);
  };

  const openEdit = (item: CampaignDirective) => {
    if (item.creationMode === "smart") {
      setEditingId(item.id);
      setEditingSmartItem(item);
      setCreationMode("smart");
      setOpen(true);
      return;
    }

    setEditingId(item.id);
    setEditingSmartItem(null);
    setCreationMode("normal");
    setFormTab("basics");
    setIncludeOpsRoom(false);
    setLetterUpload({
      url: item.letterFileUrl ?? "",
      fileName: item.letterFileName ?? "",
      fileSize: item.letterFileSize ?? 0,
      mimeType: item.letterMimeType ?? "",
    });
    setAttachmentDrafts(toAttachmentDrafts(item));
    setSelectedUserIds([]);
    setSelectedProvinces(item.audienceProvinces ?? []);
    const kind = mapDirectiveCtaKind(item.ctaKind);
    form.reset({
      title: item.title,
      body: item.body,
      priority: item.priority,
      urgency: "normal",
      crisisMode: Boolean(item.crisisMode),
      escalationAfterMinutes: item.escalationAfterMinutes ?? 30,
      topic: item.topic ?? "",
      linkContentTopic: Boolean(item.linkContentTopic),
      objective: "",
      expectedResults: "",
      mandatoryActions: "",
      suggestedActions: "",
      startDate: item.startDate ?? "",
      endDate: item.endDate ?? item.dueDate ?? "",
      audienceType: item.audienceType,
      audienceRegion: item.audienceRegion,
      audienceMinistryId: item.audienceMinistryId ?? null,
      audienceOrganizationId: item.audienceOrganizationId ?? null,
      ctaKind: kind,
      ctaLabel: item.ctaLabel ?? "",
      ctaUrl: item.ctaUrl ?? "",
      ctaTarget: item.ctaTarget ?? null,
    });

    startTransition(async () => {
      const workspace = await getDirectiveWorkspaceAction(item.id);
      if (workspace.success && workspace.bundle) {
        const meta = workspace.bundle.meta;
        form.setValue("urgency", meta.urgency);
        form.setValue("objective", meta.objective);
        form.setValue("expectedResults", meta.expectedResults);
        form.setValue("mandatoryActions", listToLines(meta.mandatoryActions));
        form.setValue("suggestedActions", listToLines(meta.suggestedActions));
        const hasOpsContent =
          Boolean(meta.objective?.trim()) ||
          Boolean(meta.expectedResults?.trim()) ||
          (meta.mandatoryActions?.length ?? 0) > 0 ||
          (meta.suggestedActions?.length ?? 0) > 0 ||
          meta.urgency !== "normal" ||
          (meta.kpis?.length ?? 0) > 0 ||
          Boolean(meta.brandGuide?.trim()) ||
          Boolean(meta.executionGuide?.trim()) ||
          (workspace.bundle.assets?.length ?? 0) > 0;
        setIncludeOpsRoom(hasOpsContent);
      }
      if (item.audienceType === "users") {
        const result = await getDirectiveRecipientsAction(item.id);
        if (result.success) {
          setSelectedUserIds(result.recipients.map((row) => row.userId));
        }
      }
    });

    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setEditingSmartItem(null);
    setCreationMode("normal");
    setFormTab("basics");
    setIncludeOpsRoom(false);
  };

  const convertToSmart = () => {
    if (!convertTarget) return;
    startTransition(async () => {
      const result = await convertDirectiveToSmartAction(
        convertTarget.id,
        convertMissionType
      );
      if (!result.success) {
        toast.error(result.error ?? "تبدیل انجام نشد");
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === convertTarget.id
            ? {
                ...row,
                creationMode: "smart",
                missionType: convertMissionType,
              }
            : row
        )
      );
      toast.success("دستورکار به ساخت هوشمند تبدیل شد");
      setConvertTarget(null);
      window.location.href = adminHref(
        `/admin/directives/${convertTarget.id}`,
        campaignId
      );
    });
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleProvince = (province: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(province) ? prev.filter((item) => item !== province) : [...prev, province]
    );
  };

  const onSubmit = form.handleSubmit((data) => {
    if (!letterUpload.url) {
      toast.error("آپلود نامه رسمی (PDF یا تصویر) الزامی است");
      return;
    }

    for (const [index, draft] of attachmentDrafts.entries()) {
      if (!draft.title.trim()) {
        toast.error(`عنوان فایل اقدام شماره ${index + 1} را وارد کنید`);
        return;
      }
      if (!draft.url) {
        toast.error(`فایل اقدام «${draft.title.trim()}» را آپلود کنید`);
        return;
      }
    }

    if (data.linkContentTopic && !data.topic?.trim()) {
      toast.error("برای ساخت موضوع محتوا، نام موضوع را وارد کنید");
      return;
    }

    startTransition(async () => {
      const conflictCheck = await checkDirectiveCalendarConflictAction({
        campaignId,
        excludeId: editingId,
        deviceId:
          data.audienceType === "ministry_city"
            ? data.audienceOrganizationId || data.audienceMinistryId || null
            : null,
        provinces: data.audienceType === "ministry_city" ? selectedProvinces : [],
        topic: data.topic,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      if (conflictCheck.success && conflictCheck.conflicts.length > 0) {
        toast.warning(
          `هشدار تداخل تقویم: با «${conflictCheck.conflicts.map((c) => c.title).join("، ")}» هم‌پوشانی دارد (ثبت ادامه می‌یابد).`
        );
      }

      const result = await saveDirectiveAction({
        id: editingId ?? undefined,
        campaignId,
        title: data.title,
        body: data.body,
        priority: data.priority,
        startDate: data.startDate,
        endDate: data.endDate,
        letterFileUrl: letterUpload.url,
        letterFileName: letterUpload.fileName || "نامه رسمی",
        letterMimeType: letterUpload.mimeType || "application/octet-stream",
        letterFileSize: letterUpload.fileSize || 0,
        attachments: attachmentDrafts.map((draft) => ({
          id: draft.id,
          title: draft.title.trim(),
          fileUrl: draft.url,
          fileName: draft.fileName || draft.title.trim(),
          mimeType: draft.mimeType || "application/octet-stream",
          fileSize: draft.fileSize || 0,
        })),
        audienceType: data.audienceType,
        audienceRegion: data.audienceType === "region" ? data.audienceRegion ?? null : null,
        audienceMinistryId:
          data.audienceType === "ministry_city" ? data.audienceMinistryId ?? null : null,
        audienceOrganizationId:
          data.audienceType === "ministry_city" ? data.audienceOrganizationId ?? null : null,
        audienceProvinces: data.audienceType === "ministry_city" ? selectedProvinces : undefined,
        selectedUserIds: data.audienceType === "users" ? selectedUserIds : undefined,
        ctaKind: data.ctaKind,
        ctaLabel: data.ctaLabel,
        ctaUrl: data.ctaUrl,
        ctaTarget: data.ctaTarget,
        sendSmsOnPublish: true,
        crisisMode: Boolean(data.crisisMode) || data.urgency === "critical",
        escalationAfterMinutes: data.escalationAfterMinutes ?? 30,
        topic: data.topic?.trim() || "",
        linkContentTopic: Boolean(data.linkContentTopic),
      });

      if (!result.success) {
        toast.error(result.error ?? "ذخیره نشد");
        return;
      }

      const directiveId = result.id;

      if (includeOpsRoom) {
        const existingWorkspace = await getDirectiveWorkspaceAction(directiveId);
        const existingMeta = existingWorkspace.bundle?.meta;
        const workspaceResult = await saveDirectiveWorkspaceMetaAction({
          directiveId,
          objective: data.objective?.trim() ?? "",
          expectedResults: data.expectedResults?.trim() ?? "",
          urgency: data.urgency as DirectiveUrgency,
          mandatoryActions: linesToList(data.mandatoryActions),
          suggestedActions: linesToList(data.suggestedActions),
          kpis: existingMeta?.kpis ?? [],
          brandGuide: existingMeta?.brandGuide ?? "",
          executionGuide: existingMeta?.executionGuide ?? "",
          approvalRequirements: existingMeta?.approvalRequirements ?? "",
          centralOwnerUserId: existingMeta?.centralOwnerUserId ?? null,
          centralOwnerLabel: existingMeta?.centralOwnerLabel ?? null,
          faq: existingMeta?.faq ?? [],
          targetMinistryIds: existingMeta?.targetMinistryIds ?? [],
          targetOrganizationIds: existingMeta?.targetOrganizationIds ?? [],
          targetProvinces:
            data.audienceType === "ministry_city"
              ? selectedProvinces
              : existingMeta?.targetProvinces ?? [],
          targetCities: existingMeta?.targetCities ?? [],
        });

        if (!workspaceResult.success) {
          toast.error(
            workspaceResult.error ??
              "دستورکار ذخیره شد ولی اتاق عملیات کامل نشد؛ از صفحه اتاق عملیات ادامه دهید"
          );
        } else {
          toast.success(
            editingId
              ? "دستورکار به‌روز شد — در حال باز کردن اتاق عملیات"
              : "دستورکار منتشر شد — در حال باز کردن اتاق عملیات"
          );
        }

        closeDialog();
        window.location.href = adminHref(`/admin/directives/${directiveId}`, campaignId);
        return;
      }

      toast.success(editingId ? "دستورکار به‌روز شد" : "دستورکار منتشر شد");
      closeDialog();
      window.location.href = adminHref("/admin/directives", campaignId);
    });
  });

  const openTracking = (item: CampaignDirective) => {
    setTrackingItem(item);
    setRecipientFilter("all");
    setContentTracking(null);
    setRecipients([]);
    startTransition(async () => {
      const result = await getDirectiveRecipientsAction(item.id);
      if (!result.success) {
        toast.error(result.error ?? "بارگذاری مخاطبان ناموفق بود");
        return;
      }
      setRecipients(result.recipients);
      setContentTracking(result.contentTracking ?? { enabled: false });
    });
  };

  const filteredRecipients = useMemo(() => {
    if (recipientFilter === "unseen") return recipients.filter((row) => !row.confirmed);
    if (recipientFilter === "no_plan") {
      return recipients.filter((row) => row.confirmed && !row.hasActionPlan);
    }
    if (recipientFilter === "sms_error") {
      return recipients.filter(
        (row) => row.smsStatus === "failed" || row.smsStatus === "no_phone"
      );
    }
    return recipients;
  }, [recipientFilter, recipients]);

  const confirmSeen = (item: CampaignDirective) => {
    startTransition(async () => {
      const result = await confirmDirectiveSeenAction(item.id, campaignId);
      if (!result.success) {
        toast.error(result.error ?? "تأیید ثبت نشد");
        return;
      }
      const next = {
        ...item,
        confirmed: true,
        seenAt: new Date().toISOString(),
        hasActionPlan: item.hasActionPlan ?? false,
      };
      setInboxRowsState((prev) =>
        prev.map((row) => (row.id === item.id ? next : row))
      );
      if (detailItem?.id === item.id) {
        setDetailItem(next);
      }
      toast.success("تأیید مشاهده ثبت شد — اکنون برنامه اقدام را ثبت کنید");
      setActionPlanTarget({ directive: next, mode: "edit" });
    });
  };

  const markActionPlanSaved = (directiveId: string) => {
    setInboxRowsState((prev) =>
      prev.map((row) =>
        row.id === directiveId ? { ...row, hasActionPlan: true } : row
      )
    );
    if (detailItem?.id === directiveId) {
      setDetailItem({ ...detailItem, hasActionPlan: true });
    }
    setRecipients((prev) =>
      prev.map((row) =>
        row.directiveId === directiveId ? { ...row, hasActionPlan: true } : row
      )
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      {hideHeading ? (
        canManage && managerView === "manage" && manageListTab === "active" ? (
          <div className="flex justify-start">
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              ثبت دستورکار
            </Button>
          </div>
        ) : null
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl">{headingTitle ?? "دستورکارها"}</h1>
            <p className="text-sm text-muted-foreground">
              {headingDescription ??
                (canManage
                  ? audienceScope === "subordinates"
                    ? "صدور دستورکار ساده یا همراه اتاق عملیات برای زیرمجموعه‌ها"
                    : "ثبت دستورکار ساده یا همراه اتاق عملیات، فایل‌ها، KPI و پیگیری"
                  : "دستورکارهای جدید را ببینید، تأیید مشاهده بزنید و برنامه اقدام ثبت کنید")}
            </p>
          </div>
          {canManage && managerView === "manage" && manageListTab === "active" && (
            <Button className="w-full sm:w-auto" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              ثبت دستورکار
            </Button>
          )}
        </div>
      )}

      {canManage && (
        <Tabs
          value={managerView}
          onValueChange={(value) => setManagerView(value as ManagerView)}
        >
          <TabsList>
            <TabsTrigger value="manage">مدیریت</TabsTrigger>
            <TabsTrigger value="inbox">
              کارتابل من (
              {formatPersianNumber(inboxRowsState.filter((row) => !row.confirmed).length)}
              )
            </TabsTrigger>
            {showUpwardTab ? (
              <TabsTrigger value="upward">درخواست به بالاسری</TabsTrigger>
            ) : null}
          </TabsList>
        </Tabs>
      )}

      {!canManage && showUpwardTab ? (
        <Tabs
          value={showingUpward ? "upward" : "inbox"}
          onValueChange={(value) =>
            setManagerView(value === "upward" ? "upward" : "inbox")
          }
        >
          <TabsList>
            <TabsTrigger value="inbox">کارتابل من</TabsTrigger>
            <TabsTrigger value="upward">درخواست به بالاسری</TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      {!showingInbox && canManage && (
        <Tabs
          value={manageListTab}
          onValueChange={(value) => setManageListTab(value as ManageListTab)}
        >
          <TabsList>
            <TabsTrigger value="active">
              فعال ({formatPersianNumber(rows.length)})
            </TabsTrigger>
            <TabsTrigger value="archive">
              آرشیو ({formatPersianNumber(archivedRows.length)})
            </TabsTrigger>
            {isFullAdmin ? <TabsTrigger value="patterns">الگو و حافظه</TabsTrigger> : null}
          </TabsList>
        </Tabs>
      )}

      {!showingInbox && canManage && issuerFilterEnabled && manageListTab !== "patterns" ? (
        <Tabs
          value={issuerFilter}
          onValueChange={(value) => setIssuerFilter(value as IssuerFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">
              همه ({formatPersianNumber(issuerCounts.all)})
            </TabsTrigger>
            <TabsTrigger value="mine">
              دستورکارهای من ({formatPersianNumber(issuerCounts.mine)})
            </TabsTrigger>
            <TabsTrigger value="subordinates">
              دستورکارهای زیرمجموعه ({formatPersianNumber(issuerCounts.subordinates)})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}

      {showingInbox && (
        <Tabs value={inboxTab} onValueChange={(value) => setInboxTab(value as InboxTab)}>
          <TabsList>
            <TabsTrigger value="new">
              جدید (
              {formatPersianNumber(inboxRowsState.filter((row) => !row.confirmed).length)}
              )
            </TabsTrigger>
            <TabsTrigger value="seen">
              دیده‌شده (
              {formatPersianNumber(inboxRowsState.filter((row) => row.confirmed).length)}
              )
            </TabsTrigger>
            <TabsTrigger value="all">
              همه ({formatPersianNumber(inboxRowsState.length)})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              ردشده ({formatPersianNumber(rejectedCount)})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {showingRejected ? (
        <RejectedSubmissionsInbox
          initialItems={initialRejected}
          onCountChange={setRejectedCount}
        />
      ) : showingUpward ? (
        <ReisUpwardRequestsPanel
          campaignId={campaignId}
          initialRequests={initialUpwardRequests}
          canRespond={canRespondUpwardRequest}
          canCreate={canCreateUpwardRequest}
        />
      ) : showingPatterns && isFullAdmin ? (
        <div className="space-y-8">
          <DirectivePlaybooksAdmin />
          <DirectiveGlobalMemoryAdmin campaignId={campaignId} />
        </div>
      ) : (
      <div className="space-y-3">
        {listRows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            <ClipboardList className="mx-auto mb-3 h-8 w-8 opacity-50" />
            {showingArchive
              ? "هنوز دستورکاری در آرشیو نیست"
              : "هنوز دستورکاری نیست"}
          </div>
        ) : (
          listRows.map((item) => (
            <article
              key={item.id}
              className={cn(
                "rounded-xl border bg-card p-4 shadow-sm",
                item.priority === "urgent" && "border-destructive/40"
              )}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 break-words text-base font-semibold sm:text-lg">
                      {item.title}
                    </h2>
                    {item.creationMode === "smart" ? (
                      <Badge variant="outline">ساخت هوشمند</Badge>
                    ) : null}
                    {item.missionType ? (
                      <Badge variant="secondary">
                        {DIRECTIVE_MISSION_TYPE_LABELS[item.missionType]}
                      </Badge>
                    ) : null}
                    {item.priority === "urgent" && <Badge variant="destructive">فوری</Badge>}
                    {item.linkContentTopic && item.topic ? (
                      <Badge variant="secondary" className="max-w-full whitespace-normal">
                        موضوع محتوا: {item.topic}
                      </Badge>
                    ) : null}
                    {!showingInbox && (
                      <Badge variant="outline">{formatAudienceLabel(item, audienceScope)}</Badge>
                    )}
                    {!showingInbox && issuerFilterEnabled && item.createdByName ? (
                      <Badge variant="secondary">صادرکننده: {item.createdByName}</Badge>
                    ) : null}
                    {showingArchive && <Badge variant="secondary">آرشیو</Badge>}
                    {showingInbox && !item.confirmed && <Badge>جدید</Badge>}
                    {showingInbox && item.confirmed && !item.hasActionPlan && (
                      <Badge variant="destructive">نیاز به برنامه اقدام</Badge>
                    )}
                    {showingInbox && item.confirmed && item.hasActionPlan && (
                      <Badge variant="secondary">تعهد ثبت‌شده</Badge>
                    )}
                  </div>
                  <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {item.body}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>انتشار: {formatPersianDateTime(item.publishedAt ?? item.createdAt)}</span>
                    {showingArchive && item.archivedAt && (
                      <span>آرشیو: {formatPersianDateTime(item.archivedAt)}</span>
                    )}
                    <DirectiveDateRange item={item} />
                    {!showingInbox && (
                      <span>
                        {formatPersianNumber(item.seenCount ?? 0)} دیده‌اند ·{" "}
                        {formatPersianNumber(item.unseenCount ?? 0)} ندیده‌اند ·{" "}
                        {formatPersianNumber(item.actionPlanCount ?? 0)} تعهد
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:max-w-[22rem] lg:justify-end">
                  <Button size="sm" className="flex-1 sm:flex-none" asChild>
                    <Link href={adminHref(`/admin/directives/${item.id}`, campaignId)}>
                      <LayoutDashboard className="h-4 w-4" />
                      اتاق عملیات
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={() => setDetailItem(item)}
                  >
                    <Eye className="h-4 w-4" />
                    جزئیات
                  </Button>
                  {showingInbox && !item.confirmed && (
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      disabled={isPending}
                      onClick={() => confirmSeen(item)}
                    >
                      <Check className="h-4 w-4" />
                      تأیید مشاهده
                    </Button>
                  )}
                  {showingInbox && item.confirmed && (
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      variant={item.hasActionPlan ? "outline" : "default"}
                      onClick={() =>
                        setActionPlanTarget({ directive: item, mode: "edit" })
                      }
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      {item.hasActionPlan ? "ویرایش برنامه اقدام" : "ثبت برنامه اقدام"}
                    </Button>
                  )}
                  {!showingInbox && canManage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => openTracking(item)}
                      >
                        <Users className="h-4 w-4" />
                        پیگیری
                      </Button>
                      {!showingArchive && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none"
                            onClick={() => openEdit(item)}
                          >
                            ویرایش مشخصات
                          </Button>
                          {item.creationMode !== "smart" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none"
                              disabled={isPending}
                              onClick={() => {
                                setConvertMissionType(
                                  item.missionType ?? "communication_campaign"
                                );
                                setConvertTarget(item);
                              }}
                            >
                              تبدیل به هوشمند
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none"
                            disabled={isPending}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  "این دستورکار به آرشیو منتقل شود؟ از کارتابل کاربران نیز حذف می‌شود."
                                )
                              ) {
                                return;
                              }
                              startTransition(async () => {
                                const result = await archiveDirectiveAction(item.id, campaignId);
                                if (!result.success) {
                                  toast.error(result.error ?? "آرشیو نشد");
                                  return;
                                }
                                const archivedAt = new Date().toISOString();
                                setRows((prev) => prev.filter((row) => row.id !== item.id));
                                setInboxRowsState((prev) =>
                                  prev.filter((row) => row.id !== item.id)
                                );
                                setArchivedRows((prev) => [
                                  { ...item, archivedAt },
                                  ...prev.filter((row) => row.id !== item.id),
                                ]);
                                toast.success("به آرشیو منتقل شد");
                              });
                            }}
                          >
                            <Archive className="h-4 w-4" />
                            آرشیو
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
      )}

      {/* Create / Edit — basics + operations workspace together */}
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
        <DialogContent
          className={cn(
            "max-h-[90vh] overflow-y-auto",
            creationMode === "smart" ? "max-w-4xl" : "max-w-3xl"
          )}
          dir="rtl"
        >
          <DialogHeader className="text-right">
            <DialogTitle>
              {editingId
                ? creationMode === "smart"
                  ? "ویرایش دستورکار هوشمند"
                  : "ویرایش دستورکار"
                : "ثبت دستورکار"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {creationMode === "smart"
                ? "ویزارد چندمرحله‌ای ساخت هوشمند — نوع مأموریت، راهبرد، سنجش و برداشت AI"
                : "می‌توانید فقط مشخصات دستورکار را ثبت کنید، یا در صورت نیاز اتاق عملیات را هم فعال کنید."}
            </p>
          </DialogHeader>

          {!editingId || creationMode === "normal" ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <Label>حالت ساخت</Label>
                <p className="text-xs text-muted-foreground">
                  عادی: فرم فعلی · هوشمند: ویزارد ساختاریافته
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={creationMode === "normal" ? "font-medium" : "text-muted-foreground"}>
                  عادی
                </span>
                <Switch
                  checked={creationMode === "smart"}
                  onCheckedChange={(checked) =>
                    setCreationMode(checked ? "smart" : "normal")
                  }
                  disabled={Boolean(editingId)}
                />
                <span className={creationMode === "smart" ? "font-medium" : "text-muted-foreground"}>
                  هوشمند
                </span>
              </div>
            </div>
          ) : null}

          {creationMode === "smart" ? (
            <DirectiveSmartWizard
              campaignId={campaignId}
              editingId={editingId}
              initialMissionType={editingSmartItem?.missionType ?? null}
              initialPayload={editingSmartItem?.smartPayload ?? null}
              initialTitle={editingSmartItem?.title ?? ""}
              initialBody={editingSmartItem?.body ?? ""}
              initialPriority={editingSmartItem?.priority ?? "normal"}
              initialStartDate={editingSmartItem?.startDate ?? ""}
              initialEndDate={
                editingSmartItem?.endDate ?? editingSmartItem?.dueDate ?? ""
              }
              initialTopic={editingSmartItem?.topic ?? ""}
              initialLinkContentTopic={Boolean(editingSmartItem?.linkContentTopic)}
              initialLetter={
                editingSmartItem?.letterFileUrl
                  ? {
                      url: editingSmartItem.letterFileUrl,
                      fileName: editingSmartItem.letterFileName ?? "نامه رسمی",
                      fileSize: editingSmartItem.letterFileSize ?? 0,
                      mimeType:
                        editingSmartItem.letterMimeType ?? "application/octet-stream",
                    }
                  : undefined
              }
              onCancel={closeDialog}
              onSaved={() => closeDialog()}
            />
          ) : (
          <form onSubmit={onSubmit} className="space-y-4 text-right" dir="rtl">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <Label>اتاق عملیات</Label>
                <p className="text-xs text-muted-foreground">
                  اختیاری — برای دستورکار ساده خاموش بگذارید
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={!includeOpsRoom ? "font-medium" : "text-muted-foreground"}>
                  ساده
                </span>
                <Switch
                  checked={includeOpsRoom}
                  onCheckedChange={(checked) => {
                    setIncludeOpsRoom(checked);
                    if (!checked) setFormTab("basics");
                  }}
                />
                <span className={includeOpsRoom ? "font-medium" : "text-muted-foreground"}>
                  با اتاق عملیات
                </span>
              </div>
            </div>

            <Tabs
              value={includeOpsRoom ? formTab : "basics"}
              onValueChange={(value) => setFormTab(value as "basics" | "workspace")}
              dir="rtl"
            >
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                <TabsTrigger value="basics">
                  {includeOpsRoom ? "۱. مشخصات دستورکار" : "مشخصات دستورکار"}
                </TabsTrigger>
                {includeOpsRoom ? (
                  <TabsTrigger value="workspace">۲. اتاق عملیات</TabsTrigger>
                ) : null}
              </TabsList>

              <TabsContent value="basics" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>عنوان</Label>
              <Input {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>متن دستورکار</Label>
              <Textarea rows={6} {...form.register("body")} />
              {form.formState.errors.body && (
                <p className="text-sm text-destructive">{form.formState.errors.body.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>اولویت</Label>
                <Select
                  value={form.watch("priority")}
                  onValueChange={(value) =>
                    form.setValue("priority", value as "normal" | "urgent")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">عادی</SelectItem>
                    <SelectItem value="urgent">فوری</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>موضوع (برای تقویم ملی)</Label>
              <Input {...form.register("topic")} placeholder="مثلاً سلامت / آموزش" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <Label>ساخت موضوع محتوا</Label>
                <p className="text-xs text-muted-foreground">
                  این موضوع به موضوعات راستا اضافه می‌شود و در فرم‌های محتوا قابل انتخاب است؛ برای پیگیری تولید محتوا استفاده می‌شود
                </p>
              </div>
              <Switch
                checked={Boolean(form.watch("linkContentTopic"))}
                onCheckedChange={(checked) => form.setValue("linkContentTopic", checked)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <Label>حالت بحران</Label>
                <p className="text-xs text-muted-foreground">
                  ابلاغ فوری، الزام تأیید دریافت و تصاعد به تماس جایگزین
                </p>
              </div>
              <Switch
                checked={Boolean(form.watch("crisisMode"))}
                onCheckedChange={(checked) => {
                  form.setValue("crisisMode", checked);
                  if (checked) form.setValue("urgency", "critical");
                }}
              />
            </div>
            {form.watch("crisisMode") ? (
              <div className="space-y-2">
                <Label>مهلت تصاعد (دقیقه)</Label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  {...form.register("escalationAfterMinutes")}
                />
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <PersianDateField
                control={form.control}
                name="startDate"
                label="تاریخ شروع"
              />
              <PersianDateField
                control={form.control}
                name="endDate"
                label="تاریخ پایان"
              />
            </div>
            {(form.formState.errors.startDate || form.formState.errors.endDate) && (
              <p className="text-sm text-destructive">
                {form.formState.errors.startDate?.message ||
                  form.formState.errors.endDate?.message}
              </p>
            )}

            <DocumentUpload
              variant="letter"
              label="نامه رسمی این راستا"
              value={letterUpload.url}
              fileName={letterUpload.fileName}
              fileSize={letterUpload.fileSize}
              mimeType={letterUpload.mimeType}
              onChange={(payload) => setLetterUpload(payload)}
            />

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label>فایل‌های اقدام</Label>
                  <p className="text-xs text-muted-foreground">
                    برای هر فایل یک عنوان و سند، تصویر یا ویدیو جداگانه اضافه کنید
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAttachmentDrafts((prev) => [...prev, createAttachmentDraft()])
                  }
                >
                  <Plus className="h-4 w-4" />
                  افزودن فایل
                </Button>
              </div>

              {attachmentDrafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">هنوز فایل اقدامی اضافه نشده است</p>
              ) : (
                <div className="space-y-3">
                  {attachmentDrafts.map((draft, index) => (
                    <div key={draft.key} className="space-y-3 rounded-md border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">فایل {formatPersianNumber(index + 1)}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setAttachmentDrafts((prev) =>
                              prev.filter((item) => item.key !== draft.key)
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>عنوان فایل</Label>
                        <Input
                          value={draft.title}
                          maxLength={CONTENT_TITLE_MAX_LENGTH}
                          placeholder="مثلاً پیوست ۱ / دستورالعمل"
                          onChange={(event) => {
                            const value = event.target.value;
                            setAttachmentDrafts((prev) =>
                              prev.map((item) =>
                                item.key === draft.key ? { ...item, title: value } : item
                              )
                            );
                          }}
                        />
                      </div>
                      <DocumentUpload
                        variant="action"
                        label="فایل"
                        value={draft.url}
                        fileName={draft.fileName}
                        fileSize={draft.fileSize}
                        mimeType={draft.mimeType}
                        onChange={(payload) => {
                          setAttachmentDrafts((prev) =>
                            prev.map((item) =>
                              item.key === draft.key
                                ? {
                                    ...item,
                                    url: payload.url,
                                    fileName: payload.fileName,
                                    fileSize: payload.fileSize,
                                    mimeType: payload.mimeType,
                                  }
                                : item
                            )
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div>
                <Label>دکمه اقدام (اختیاری)</Label>
                <p className="text-xs text-muted-foreground">
                  در صفحه جزئیات یک دکمه برای هدایت کاربر به لینک خارجی یا بخش پنل نمایش داده می‌شود
                </p>
              </div>

              <div className="space-y-2">
                <Label>نوع دکمه</Label>
                <Select
                  value={ctaKind}
                  onValueChange={(value) => {
                    const next = value as DirectiveCtaKind;
                    form.setValue("ctaKind", next);
                    if (next === "none") {
                      form.setValue("ctaLabel", "");
                      form.setValue("ctaUrl", "");
                      form.setValue("ctaTarget", null);
                      return;
                    }
                    if (next === "internal") {
                      const target =
                        (form.getValues("ctaTarget") as DirectiveInternalTarget | null) ??
                        "profile";
                      form.setValue("ctaTarget", target);
                      if (!form.getValues("ctaLabel")?.trim()) {
                        form.setValue("ctaLabel", getDefaultInternalCtaLabel(target));
                      }
                      form.setValue("ctaUrl", "");
                      return;
                    }
                    form.setValue("ctaTarget", null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون دکمه</SelectItem>
                    <SelectItem value="external">لینک خارجی (سایت / آدرس)</SelectItem>
                    <SelectItem value="internal">بخش سیستمی پنل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ctaKind !== "none" && (
                <div className="space-y-2">
                  <Label>متن دکمه</Label>
                  <Input
                    {...form.register("ctaLabel")}
                    placeholder={
                      ctaKind === "internal" && ctaTarget
                        ? getDefaultInternalCtaLabel(ctaTarget as DirectiveInternalTarget)
                        : "مثلاً بروید به سایت و ثبت‌نام کنید"
                    }
                  />
                </div>
              )}

              {ctaKind === "external" && (
                <div className="space-y-2">
                  <Label>آدرس لینک</Label>
                  <Input
                    dir="ltr"
                    className="text-left"
                    {...form.register("ctaUrl")}
                    placeholder="example.com یا https://example.com"
                  />
                </div>
              )}

              {ctaKind === "internal" && (
                <div className="space-y-2">
                  <Label>بخش مقصد</Label>
                  <Select
                    value={ctaTarget ?? ""}
                    onValueChange={(value) => {
                      const target = value as DirectiveInternalTarget;
                      form.setValue("ctaTarget", target);
                      const currentLabel = form.getValues("ctaLabel")?.trim() ?? "";
                      const previousDefaults = new Set(
                        DIRECTIVE_INTERNAL_TARGET_OPTIONS.map((option) => option.label)
                      );
                      if (!currentLabel || previousDefaults.has(currentLabel)) {
                        form.setValue("ctaLabel", getDefaultInternalCtaLabel(target));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب بخش" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECTIVE_INTERNAL_TARGET_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>مخاطب</Label>
              <Select
                value={audienceType}
                onValueChange={(value) =>
                  form.setValue("audienceType", value as DirectiveAudienceType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audienceScope === "subordinates" ? (
                    <>
                      <SelectItem value="all">همه زیرمجموعه‌های من</SelectItem>
                      <SelectItem value="users">افراد انتخابی از زیرمجموعه</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="all">همه کاربران این راستا</SelectItem>
                      <SelectItem value="ministry_city">وزارتخانه و استان</SelectItem>
                      <SelectItem value="region">منطقه جغرافیایی</SelectItem>
                      <SelectItem value="users">افراد انتخابی</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {audienceScope === "global" && audienceType === "region" && (
              <div className="space-y-2">
                <Label>منطقه</Label>
                <Select
                  value={form.watch("audienceRegion") ?? ""}
                  onValueChange={(value) =>
                    form.setValue("audienceRegion", value as UserRegion)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب منطقه" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_REGIONS.map((region) => (
                      <SelectItem key={region} value={region}>
                        {getUserRegionLabel(region)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {audienceScope === "global" && audienceType === "ministry_city" && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label>وزارتخانه</Label>
                  <Select
                    value={audienceMinistryId ?? ""}
                    onValueChange={(value) => {
                      form.setValue("audienceMinistryId", value);
                      form.setValue("audienceOrganizationId", null);
                      setSelectedProvinces([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب وزارتخانه" />
                    </SelectTrigger>
                    <SelectContent>
                      {ministries.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          ابتدا وزارتخانه تعریف کنید
                        </SelectItem>
                      ) : (
                        ministries.map((ministry) => (
                          <SelectItem key={ministry.id} value={ministry.id}>
                            {ministry.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>زیرمجموعه (اختیاری)</Label>
                  <Select
                    value={audienceOrganizationId ?? "__all__"}
                    onValueChange={(value) => {
                      form.setValue(
                        "audienceOrganizationId",
                        value === "__all__" ? null : value
                      );
                      setSelectedProvinces([]);
                    }}
                    disabled={!audienceMinistryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="کل وزارتخانه یا یک زیرمجموعه" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">کل وزارتخانه</SelectItem>
                      {audienceOrganizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {ministryUserProvinces.length > 0 && (
                  <div className="space-y-2">
                    <Label>استان‌های کاربران این محدوده</Label>
                    <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border p-2">
                      {ministryUserProvinces.map((province) => (
                        <label key={province} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedProvinces.includes(province)}
                            onChange={() => toggleProvince(province)}
                          />
                          {province}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>انتخاب استان مخاطب</Label>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
                    {IRAN_PROVINCES.map((province) => (
                      <label key={province} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedProvinces.includes(province)}
                          onChange={() => toggleProvince(province)}
                        />
                        {province}
                      </label>
                    ))}
                  </div>
                </div>

                {selectedProvinces.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    استان‌های انتخاب‌شده: {selectedProvinces.join("، ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  یوزر مادر وزارتخانه و کاربران در محدوده انتخاب‌شده (وزارتخانه یا زیرمجموعه + استان)
                  مخاطب می‌شوند.
                </p>
              </div>
            )}

            {audienceType === "users" && (
              <div className="space-y-2">
                <Label>انتخاب کاربران</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {campaignUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {audienceScope === "subordinates"
                        ? "هنوز کاربر زیرمجموعه‌ای ندارید"
                        : "کاربری در این راستا نیست"}
                    </p>
                  ) : (
                    campaignUsers.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => toggleUser(user.id)}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {user.name}
                          <span className="text-muted-foreground"> · {user.email}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

              </TabsContent>

              <TabsContent value="workspace" className="mt-4 space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                  اینجا هدف، فوریت و اقدامات اتاق عملیات همین دستورکار را تعریف می‌کنید.
                </div>

                <div className="space-y-2">
                  <Label>درجه فوریت</Label>
                  <Select
                    value={form.watch("urgency")}
                    onValueChange={(value) =>
                      form.setValue("urgency", value as DirectiveUrgency)
                    }
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
                  <Label>هدف اصلی</Label>
                  <Textarea
                    rows={3}
                    placeholder="هدف اصلی این دستور / کمپین چیست؟"
                    {...form.register("objective")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>نتایج مورد انتظار</Label>
                  <Textarea
                    rows={3}
                    placeholder="چه نتایجی باید حاصل شود؟"
                    {...form.register("expectedResults")}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>اقدامات الزامی (هر خط یک مورد)</Label>
                    <Textarea rows={5} {...form.register("mandatoryActions")} />
                  </div>
                  <div className="space-y-2">
                    <Label>اقدامات پیشنهادی (هر خط یک مورد)</Label>
                    <Textarea rows={5} {...form.register("suggestedActions")} />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  بعد از ذخیره، برای فایل‌های مرجع، متن آماده انتشار، چاپی، ویدئو، هویت بصری،
                  FAQ و تاریخچه نسخه‌ها وارد صفحه کامل اتاق عملیات می‌شوید.
                </p>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground">
              با انتشار، برای مخاطبان پیامک رزرو می‌شود (سرویس پیامک فعلاً جای خالی است و بعداً وصل می‌شود).
            </p>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                انصراف
              </Button>
              {includeOpsRoom && formTab === "basics" ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setFormTab("workspace")}
                >
                  ادامه: اتاق عملیات
                </Button>
              ) : null}
              {includeOpsRoom && formTab === "workspace" ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setFormTab("basics")}
                >
                  بازگشت به مشخصات
                </Button>
              ) : null}
              <Button type="submit" disabled={isPending}>
                {includeOpsRoom
                  ? editingId
                    ? "ذخیره و باز کردن اتاق عملیات"
                    : "انتشار و باز کردن اتاق عملیات"
                  : editingId
                    ? "ذخیره دستورکار"
                    : "انتشار دستورکار"}
              </Button>
            </div>
          </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(convertTarget)}
        onOpenChange={(next) => !next && setConvertTarget(null)}
      >
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>تبدیل به ساخت هوشمند</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-right">
            <p className="text-sm text-muted-foreground">
              نوع مأموریت را برای دستورکار «{convertTarget?.title}» انتخاب کنید.
            </p>
            <div className="space-y-2">
              <Label>نوع مأموریت</Label>
              <Select
                value={convertMissionType}
                onValueChange={(value) =>
                  setConvertMissionType(value as DirectiveMissionType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIVE_MISSION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DIRECTIVE_MISSION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConvertTarget(null)}>
                انصراف
              </Button>
              <Button type="button" disabled={isPending} onClick={convertToSmart}>
                تبدیل و باز کردن اتاق هوشمند
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={Boolean(detailItem)} onOpenChange={(next) => !next && setDetailItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {detailItem.title}
                  {detailItem.priority === "urgent" && (
                    <Badge variant="destructive">فوری</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <DirectiveUserView item={detailItem} />
                <DirectiveCtaButton item={detailItem} />
                {showingInbox && !detailItem.confirmed && (
                  <Button disabled={isPending} onClick={() => confirmSeen(detailItem)}>
                    <Check className="h-4 w-4" />
                    تأیید مشاهده
                  </Button>
                )}
                {showingInbox && detailItem.confirmed && (
                  <Button
                    variant={detailItem.hasActionPlan ? "outline" : "default"}
                    onClick={() =>
                      setActionPlanTarget({ directive: detailItem, mode: "edit" })
                    }
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    {detailItem.hasActionPlan
                      ? "ویرایش برنامه اقدام"
                      : "ثبت برنامه اقدام"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Tracking */}
      <Dialog
        open={Boolean(trackingItem)}
        onOpenChange={(next) => {
          if (!next) {
            setTrackingItem(null);
            setRecipients([]);
            setContentTracking(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {trackingItem && (
            <>
              <DialogHeader>
                <DialogTitle>پیگیری: {trackingItem.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {formatPersianNumber(trackingItem.recipientCount ?? recipients.length)} مخاطب ·{" "}
                  {formatPersianNumber(trackingItem.seenCount ?? 0)} دیده‌اند ·{" "}
                  {formatPersianNumber(trackingItem.unseenCount ?? 0)} ندیده‌اند ·{" "}
                  {formatPersianNumber(trackingItem.actionPlanCount ?? 0)} تعهد
                  {contentTracking?.enabled ? (
                    <>
                      {" "}
                      · {formatPersianNumber(contentTracking.createdTotal)} محتوا ساخته‌شده ·{" "}
                      {formatPersianNumber(contentTracking.publishedTotal)} منتشرشده
                      <span className="text-xs"> (موضوع: {contentTracking.topic})</span>
                    </>
                  ) : null}
                </p>
                {!contentTracking?.enabled ? (
                  <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
                    برای پیگیری محتوا، هنگام ثبت دستورکار گزینه «ساخت موضوع محتوا» را فعال کنید.
                  </p>
                ) : null}

                <Tabs
                  value={recipientFilter}
                  onValueChange={(value) =>
                    setRecipientFilter(
                      value as "all" | "unseen" | "sms_error" | "no_plan"
                    )
                  }
                >
                  <TabsList>
                    <TabsTrigger value="all">همه</TabsTrigger>
                    <TabsTrigger value="unseen">فقط ندیده‌ها</TabsTrigger>
                    <TabsTrigger value="no_plan">بدون برنامه اقدام</TabsTrigger>
                    <TabsTrigger value="sms_error">خطای پیامک / بدون شماره</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-right">
                      <tr>
                        <th className="px-3 py-2 font-medium">نام</th>
                        <th className="px-3 py-2 font-medium">نقش</th>
                        <th className="px-3 py-2 font-medium">مشاهده</th>
                        <th className="px-3 py-2 font-medium">تعهد</th>
                        {contentTracking?.enabled ? (
                          <>
                            <th className="px-3 py-2 font-medium">محتوا ساخته‌شده</th>
                            <th className="px-3 py-2 font-medium">منتشرشده</th>
                          </>
                        ) : null}
                        <th className="px-3 py-2 font-medium">زمان تأیید</th>
                        <th className="px-3 py-2 font-medium">پیامک</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecipients.length === 0 ? (
                        <tr>
                          <td
                            colSpan={contentTracking?.enabled ? 8 : 6}
                            className="px-3 py-6 text-center text-muted-foreground"
                          >
                            موردی نیست
                          </td>
                        </tr>
                      ) : (
                        filteredRecipients.map((row) => (
                          <tr key={row.userId} className="border-t">
                            <td className="px-3 py-2">
                              <div>{row.userName}</div>
                              <div className="text-xs text-muted-foreground">{row.userEmail}</div>
                            </td>
                            <td className="px-3 py-2">
                              {row.userRole === "client"
                                ? "کارفرما"
                                : row.userRole === "admin"
                                  ? "مدیر"
                                  : "کاربر"}
                            </td>
                            <td className="px-3 py-2">
                              {row.confirmed ? (
                                <Badge variant="secondary">دید</Badge>
                              ) : (
                                <Badge variant="outline">ندید</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.hasActionPlan && row.actionPlanId ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0"
                                  onClick={() =>
                                    setActionPlanTarget({
                                      directive: trackingItem,
                                      mode: "view",
                                      planId: row.actionPlanId,
                                    })
                                  }
                                >
                                  مشاهده تعهد
                                </Button>
                              ) : row.confirmed ? (
                                <Badge variant="destructive">ثبت نشده</Badge>
                              ) : (
                                "—"
                              )}
                            </td>
                            {contentTracking?.enabled ? (
                              <>
                                <td className="px-3 py-2">
                                  {formatPersianNumber(row.contentCreatedCount ?? 0)}
                                </td>
                                <td className="px-3 py-2">
                                  {formatPersianNumber(row.contentPublishedCount ?? 0)}
                                </td>
                              </>
                            ) : null}
                            <td className="px-3 py-2">
                              {row.seenAt ? formatPersianDateTime(row.seenAt) : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <div>{smsStatusLabels[row.smsStatus]}</div>
                              {row.smsError && (
                                <div className="text-xs text-muted-foreground">{row.smsError}</div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <DirectiveActionPlanDialog
        open={Boolean(actionPlanTarget)}
        onOpenChange={(next) => {
          if (!next) setActionPlanTarget(null);
        }}
        directiveId={actionPlanTarget?.directive.id ?? ""}
        campaignId={campaignId}
        directiveTitle={actionPlanTarget?.directive.title ?? ""}
        mode={actionPlanTarget?.mode ?? "edit"}
        planId={actionPlanTarget?.planId}
        onSaved={() => {
          if (!actionPlanTarget) return;
          const alreadyHad = Boolean(actionPlanTarget.directive.hasActionPlan);
          markActionPlanSaved(actionPlanTarget.directive.id);
          if (trackingItem?.id === actionPlanTarget.directive.id && !alreadyHad) {
            setTrackingItem({
              ...trackingItem,
              actionPlanCount: (trackingItem.actionPlanCount ?? 0) + 1,
            });
          }
        }}
      />
    </div>
  );
}
