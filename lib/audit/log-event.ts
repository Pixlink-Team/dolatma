import { headers } from "next/headers";
import { getAuthSession } from "@/lib/auth/get-session";
import { pgGetUserById } from "@/lib/db/repository-extended";
import { pgInsertAuditEvent } from "@/lib/db/audit-repository";
import type { AuditEventInput } from "@/lib/audit/types";
import type { AuthSession } from "@/lib/types";
import { isPostgresConfigured } from "@/lib/utils";

async function readRequestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    const ipAddress =
      forwarded?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      headerStore.get("cf-connecting-ip") ||
      null;
    const userAgent = headerStore.get("user-agent");
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}

async function resolveActorFromSession(session: AuthSession | null): Promise<{
  actorUserId: string | null;
  actorType: AuditEventInput["actorType"];
  actorEmail: string | null;
  actorName: string | null;
  actorRole: string | null;
}> {
  if (!session) {
    return {
      actorUserId: null,
      actorType: "anonymous",
      actorEmail: null,
      actorName: null,
      actorRole: null,
    };
  }

  if (session.type === "env_admin") {
    return {
      actorUserId: null,
      actorType: "env_admin",
      actorEmail: session.email ?? null,
      actorName: session.name ?? "مدیر سیستم",
      actorRole: "admin",
    };
  }

  let email = session.email ?? null;
  let name = session.name ?? null;

  if (session.userId && isPostgresConfigured() && (!email || !name)) {
    try {
      const user = await pgGetUserById(session.userId);
      email = email ?? user?.email ?? null;
      name = name ?? user?.name ?? null;
    } catch {
      // Keep session values if lookup fails.
    }
  }

  return {
    actorUserId: session.userId,
    actorType: "db_user",
    actorEmail: email,
    actorName: name ?? "کاربر",
    actorRole: session.role,
  };
}

/** Fire-and-forget audit write — never throws to callers. */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  if (!isPostgresConfigured()) return;

  try {
    const meta = await readRequestMeta();
    await pgInsertAuditEvent({
      ...input,
      ipAddress: input.ipAddress ?? meta.ipAddress,
      userAgent: input.userAgent ?? meta.userAgent,
    });
  } catch (error) {
    console.error("logAuditEvent failed:", error);
  }
}

export async function logAuditForSession(
  session: AuthSession | null,
  input: Omit<
    AuditEventInput,
    "actorUserId" | "actorType" | "actorEmail" | "actorName" | "actorRole"
  >
): Promise<void> {
  const actor = await resolveActorFromSession(session);
  await logAuditEvent({ ...input, ...actor });
}

export async function logAuditFromCurrentSession(
  input: Omit<
    AuditEventInput,
    "actorUserId" | "actorType" | "actorEmail" | "actorName" | "actorRole"
  >
): Promise<void> {
  const session = await getAuthSession();
  await logAuditForSession(session, input);
}

export async function auditContentChange(options: {
  isUpdate: boolean;
  entityType: string;
  entityId?: string | null;
  campaignId?: string | null;
  label?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logAuditFromCurrentSession({
    category: "content",
    action: options.isUpdate ? "content.update" : "content.create",
    entityType: options.entityType,
    entityId: options.entityId ?? null,
    campaignId: options.campaignId ?? null,
    label: options.label ?? null,
    metadata: options.metadata,
  });
}

export async function auditContentDelete(options: {
  entityType: string;
  entityId: string;
  campaignId?: string | null;
  label?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await logAuditFromCurrentSession({
    category: "content",
    action: "content.delete",
    entityType: options.entityType,
    entityId: options.entityId,
    campaignId: options.campaignId ?? null,
    label: options.label ?? null,
    metadata: options.metadata,
  });
}
