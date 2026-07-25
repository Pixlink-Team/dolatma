"use server";

import { revalidatePath } from "next/cache";
import { canManageSubtreeUsers, isClientUser } from "@/lib/auth/access";
import { assertContributorTutorialCompleted } from "@/lib/auth/require-tutorial-completion";
import { getAuthSession, isFullAdmin } from "@/lib/auth/get-session";
import { pgGetUserById } from "@/lib/db/repository-extended";
import {
  pgDeleteMinistry,
  pgDeleteOrganization,
  pgEnsureDefaultMinistries,
  pgListMinistries,
  pgListOrganizations,
  pgSaveMinistry,
  pgSaveOrganization,
} from "@/lib/db/repository-ministries";
import { isPostgresConfigured } from "@/lib/utils";

async function revalidateMinistryPages() {
  revalidatePath("/admin/ministries");
  revalidatePath("/admin/devices");
  revalidatePath("/admin/users");
  revalidatePath("/admin/directives");
}

async function canSaveOrganization(
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>,
  ministryId: string,
  isUpdate: boolean
): Promise<boolean> {
  if (isFullAdmin(session)) return true;
  if (isClientUser(session) && !isUpdate) return true;
  if (!canManageSubtreeUsers(session) || isUpdate || !session.userId) return false;
  if (!isPostgresConfigured()) return false;
  const user = await pgGetUserById(session.userId);
  // Subunit managers must create children under their own device, not peer ministry orgs.
  if (user?.organizationId) return false;
  return Boolean(user?.ministryId && user.ministryId === ministryId);
}

export async function listMinistriesAction() {
  const session = await getAuthSession();
  if (!session) return { success: false as const, error: "Unauthorized", ministries: [] };
  if (!isPostgresConfigured()) return { success: true as const, ministries: [] };
  const ministries = await pgListMinistries({ includeOrganizations: true });
  return { success: true as const, ministries };
}

export async function listOrganizationsAction(ministryId?: string) {
  const session = await getAuthSession();
  if (!session) return { success: false as const, error: "Unauthorized", organizations: [] };
  if (!isPostgresConfigured()) return { success: true as const, organizations: [] };
  const organizations = await pgListOrganizations(ministryId);
  return { success: true as const, organizations };
}

export async function saveMinistryAction(data: {
  id?: string;
  name: string;
  fullName?: string | null;
  description?: string | null;
  isActive?: boolean;
}) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const result = await pgSaveMinistry(data);
  if (result.success) await revalidateMinistryPages();
  return result;
}

export async function saveOrganizationAction(data: {
  id?: string;
  ministryId: string;
  name: string;
  fullName?: string | null;
  isActive?: boolean;
  /** Device-tree parent; defaults to ministry root so nested orgs appear under the right node. */
  parentId?: string | null;
}) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const allowed = await canSaveOrganization(session, data.ministryId, Boolean(data.id));
  if (!allowed) {
    return { success: false as const, error: "Unauthorized" };
  }

  if (!data.id) {
    const tutorialDenied = await assertContributorTutorialCompleted("subsidiaries");
    if (tutorialDenied) return tutorialDenied;
  }

  const result = await pgSaveOrganization(data);
  if (result.success) await revalidateMinistryPages();
  return result;
}

export async function deleteMinistryAction(id: string) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const result = await pgDeleteMinistry(id);
  if (result.success) await revalidateMinistryPages();
  return result;
}

export async function deleteOrganizationAction(id: string) {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };

  const result = await pgDeleteOrganization(id);
  if (result.success) await revalidateMinistryPages();
  return result;
}

export async function ensureDefaultMinistriesAction() {
  const session = await getAuthSession();
  if (!session || !isFullAdmin(session)) {
    return { success: false as const, error: "Unauthorized" };
  }
  if (!isPostgresConfigured()) return { success: false as const, error: "Database required" };
  await pgEnsureDefaultMinistries();
  await revalidateMinistryPages();
  return { success: true as const };
}
