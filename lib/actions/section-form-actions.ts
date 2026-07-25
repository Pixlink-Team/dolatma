"use server";

import { revalidatePath } from "next/cache";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { canManageForms, hasAnyCampaignPermission, isClientUser } from "@/lib/auth/access";
import {
  isContentFormSectionKey,
  normalizeContentFormFields,
  validateContentFormFields,
} from "@/lib/section-content-forms";
import {
  pgGetSectionContentForm,
  pgListSectionContentForms,
  pgSaveSectionContentForm,
} from "@/lib/db/repository-section-forms";
import type { ContentFormField } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

const UNAUTHORIZED = { success: false as const, error: "Unauthorized" };

function requirePostgres() {
  if (!isPostgresConfigured()) {
    return { success: false as const, error: "Database required" };
  }
  return null;
}

async function revalidateSectionForms() {
  revalidatePath("/admin/forms");
  revalidatePath("/admin/posters");
  revalidatePath("/admin/billboards");
  revalidatePath("/admin");
}

async function assertCanManageSectionForms() {
  const session = await getAuthSession();
  if (!session) return null;
  if (isFullAdmin(session) || isClientUser(session)) return session;
  if (await hasAnyCampaignPermission(session, "forms")) return session;
  // Keep sync helper path for callers that already loaded permissions elsewhere.
  if (canManageForms(session)) return session;
  return null;
}

export async function listSectionContentFormsAction() {
  const session = await assertCanManageSectionForms();
  if (!session) return UNAUTHORIZED;

  const dbError = requirePostgres();
  if (dbError) return dbError;

  const forms = await pgListSectionContentForms();
  return { success: true as const, forms };
}

export async function getSectionContentFormAction(sectionKey: string) {
  const session = await getAuthSession();
  if (!session) return UNAUTHORIZED;
  if (!isContentFormSectionKey(sectionKey)) {
    return { success: false as const, error: "بخش نامعتبر است" };
  }

  const dbError = requirePostgres();
  if (dbError) return dbError;

  const form = await pgGetSectionContentForm(sectionKey);
  return { success: true as const, form };
}

export async function saveSectionContentFormAction(input: {
  sectionKey: string;
  title: string;
  fields: ContentFormField[];
}) {
  const session = await assertCanManageSectionForms();
  if (!session) return UNAUTHORIZED;
  if (!isContentFormSectionKey(input.sectionKey)) {
    return { success: false as const, error: "بخش نامعتبر است" };
  }

  const dbError = requirePostgres();
  if (dbError) return dbError;

  const fields = normalizeContentFormFields(input.fields, input.sectionKey);
  const fieldsError = validateContentFormFields(fields, input.sectionKey);
  if (fieldsError) {
    return { success: false as const, error: fieldsError };
  }

  const result = await pgSaveSectionContentForm({
    sectionKey: input.sectionKey,
    title: input.title,
    fields,
  });
  if (!result.success) return result;

  await revalidateSectionForms();
  return { success: true as const, form: result.form };
}
