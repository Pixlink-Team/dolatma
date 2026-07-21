"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { canManageForms, isClientUser } from "@/lib/auth/access";
import {
  hasContributorPermission,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import {
  normalizeFormFields,
  validateFormAnswers,
  validateFormFieldsDefinition,
} from "@/lib/campaign-forms";
import {
  pgDeleteCampaignForm,
  pgDeleteFormResponse,
  pgGetCampaignForm,
  pgGetFormResponse,
  pgListCampaignForms,
  pgListFormResponses,
  pgSaveCampaignForm,
  pgSubmitFormResponse,
} from "@/lib/db/repository-forms";
import { pgGetUserPermissionsForCampaign } from "@/lib/db/repository-extended";
import type {
  CampaignForm,
  CampaignFormResponse,
  CampaignFormStatus,
  FormField,
} from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

const UNAUTHORIZED = { success: false as const, error: "Unauthorized" };

function requirePostgres() {
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  return null;
}

async function revalidateForms() {
  revalidatePath("/admin/forms");
  revalidatePath("/admin");
}

async function getSessionPermissions(
  userId: string | undefined,
  campaignId: string
): Promise<ContributorPermissions | null> {
  if (!userId) return null;
  return pgGetUserPermissionsForCampaign(userId, campaignId);
}

async function assertCanAccessForms(campaignId: string) {
  const session = await getAuthSession();
  if (!session) return { error: UNAUTHORIZED, session: null as null };

  if (isFullAdmin(session) || isClientUser(session)) {
    return { error: null, session };
  }

  const permissions = await getSessionPermissions(session.userId ?? undefined, campaignId);
  if (!hasContributorPermission(permissions, "forms")) {
    return { error: UNAUTHORIZED, session: null as null };
  }

  return { error: null, session };
}

export async function listCampaignFormsAction(campaignId: string) {
  const access = await assertCanAccessForms(campaignId);
  if (access.error || !access.session) return access.error ?? UNAUTHORIZED;

  const dbError = requirePostgres();
  if (dbError) return dbError;

  const canManage = canManageForms(access.session);
  const forms = await pgListCampaignForms(campaignId, {
    publishedOnly: !canManage,
  });

  return { success: true as const, forms, canManage };
}

export async function saveCampaignFormAction(input: {
  id?: string;
  campaignId: string;
  title: string;
  description?: string;
  fields: FormField[];
  status: CampaignFormStatus;
  sortOrder?: number;
}) {
  const session = await getAuthSession();
  if (!session || !canManageForms(session)) return UNAUTHORIZED;

  const dbError = requirePostgres();
  if (dbError) return dbError;

  const title = input.title.trim();
  if (!title) {
    return { success: false as const, error: "عنوان فرم الزامی است" };
  }

  const fields = normalizeFormFields(input.fields);
  const fieldsError = validateFormFieldsDefinition(fields);
  if (fieldsError) {
    return { success: false as const, error: fieldsError };
  }

  if (input.id) {
    const existing = await pgGetCampaignForm(input.id);
    if (!existing || existing.campaignId !== input.campaignId) {
      return { success: false as const, error: "فرم یافت نشد" };
    }
  }

  const result = await pgSaveCampaignForm({
    id: input.id,
    campaignId: input.campaignId,
    title,
    description: (input.description ?? "").trim(),
    fields,
    status: input.status,
    sortOrder: input.sortOrder,
    createdBy: session.userId ?? null,
  });

  if (!result.success) return result;

  await revalidateForms();
  return { success: true as const, form: result.form };
}

export async function deleteCampaignFormAction(formId: string, campaignId: string) {
  const session = await getAuthSession();
  if (!session || !canManageForms(session)) return UNAUTHORIZED;

  const dbError = requirePostgres();
  if (dbError) return dbError;

  const existing = await pgGetCampaignForm(formId);
  if (!existing || existing.campaignId !== campaignId) {
    return { success: false as const, error: "فرم یافت نشد" };
  }

  const result = await pgDeleteCampaignForm(formId);
  if (!result.success) return result;

  await revalidateForms();
  return { success: true as const };
}

export async function listFormResponsesAction(input: {
  campaignId: string;
  formId?: string;
}) {
  const access = await assertCanAccessForms(input.campaignId);
  if (access.error || !access.session) return access.error ?? UNAUTHORIZED;

  const dbError = requirePostgres();
  if (dbError) return dbError;

  const canManage = canManageForms(access.session);
  const responses = await pgListFormResponses({
    campaignId: input.campaignId,
    formId: input.formId,
    ownerUserId: canManage ? undefined : access.session.userId ?? undefined,
  });

  return { success: true as const, responses, canManage };
}

export async function submitFormResponseAction(input: {
  formId: string;
  campaignId: string;
  answers: Record<string, unknown>;
}) {
  const access = await assertCanAccessForms(input.campaignId);
  if (access.error || !access.session) return access.error ?? UNAUTHORIZED;

  const dbError = requirePostgres();
  if (dbError) return dbError;

  const form = await pgGetCampaignForm(input.formId);
  if (!form || form.campaignId !== input.campaignId) {
    return { success: false as const, error: "فرم یافت نشد" };
  }

  if (form.status !== "published" && !canManageForms(access.session)) {
    return { success: false as const, error: "این فرم برای پر کردن باز نیست" };
  }

  const validated = validateFormAnswers(form.fields, input.answers ?? {});
  if (!validated.ok) {
    return { success: false as const, error: validated.error };
  }

  const result = await pgSubmitFormResponse({
    formId: form.id,
    campaignId: form.campaignId,
    ownerUserId: access.session.userId ?? null,
    answers: validated.answers,
  });

  if (!result.success) return result;

  await revalidateForms();
  return { success: true as const, response: result.response };
}

export async function deleteFormResponseAction(
  responseId: string,
  campaignId: string
) {
  const access = await assertCanAccessForms(campaignId);
  if (access.error || !access.session) return access.error ?? UNAUTHORIZED;

  const dbError = requirePostgres();
  if (dbError) return dbError;

  const existing = await pgGetFormResponse(responseId);
  if (!existing || existing.campaignId !== campaignId) {
    return { success: false as const, error: "پاسخ یافت نشد" };
  }

  const canManage = canManageForms(access.session);
  if (!canManage && existing.ownerUserId !== access.session.userId) {
    return UNAUTHORIZED;
  }

  const result = await pgDeleteFormResponse(responseId);
  if (!result.success) return result;

  await revalidateForms();
  return { success: true as const };
}

export type { CampaignForm, CampaignFormResponse };
