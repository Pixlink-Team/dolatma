import { getSql } from "@/lib/db/client";

export type PreRegistrationStatus = "pending_otp" | "otp_verified" | "submitted";

export type PreRegistrationRow = {
  id: string;
  phone: string;
  fullName: string | null;
  organization: string | null;
  ministry: string | null;
  positionTitle: string | null;
  province: string | null;
  city: string | null;
  note: string | null;
  status: PreRegistrationStatus;
  otpHash: string | null;
  otpExpiresAt: string | null;
  otpSentAt: string | null;
  otpAttempts: number;
  verifiedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PreRegistrationPublic = {
  id: string;
  phone: string;
  fullName: string | null;
  organization: string | null;
  ministry: string | null;
  positionTitle: string | null;
  province: string | null;
  city: string | null;
  note: string | null;
  status: PreRegistrationStatus;
  verifiedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
};

let schemaReady: Promise<void> | null = null;

export async function ensurePreRegistrationSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS pre_registrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          phone TEXT NOT NULL,
          full_name TEXT,
          organization TEXT,
          ministry TEXT,
          position_title TEXT,
          province TEXT,
          city TEXT,
          note TEXT,
          status TEXT NOT NULL DEFAULT 'pending_otp'
            CHECK (status IN ('pending_otp', 'otp_verified', 'submitted')),
          otp_hash TEXT,
          otp_expires_at TIMESTAMPTZ,
          otp_sent_at TIMESTAMPTZ,
          otp_attempts INT NOT NULL DEFAULT 0,
          verified_at TIMESTAMPTZ,
          submitted_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`ALTER TABLE pre_registrations ADD COLUMN IF NOT EXISTS ministry TEXT`;
      await sql`ALTER TABLE pre_registrations ADD COLUMN IF NOT EXISTS province TEXT`;
      await sql`ALTER TABLE pre_registrations ADD COLUMN IF NOT EXISTS city TEXT`;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_pre_registrations_phone_unique
          ON pre_registrations(phone)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_pre_registrations_status_created
          ON pre_registrations(status, created_at DESC)
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function mapRow(row: Record<string, unknown>): PreRegistrationRow {
  return {
    id: String(row.id),
    phone: String(row.phone),
    fullName: row.full_name == null ? null : String(row.full_name),
    organization: row.organization == null ? null : String(row.organization),
    ministry: row.ministry == null ? null : String(row.ministry),
    positionTitle: row.position_title == null ? null : String(row.position_title),
    province: row.province == null ? null : String(row.province),
    city: row.city == null ? null : String(row.city),
    note: row.note == null ? null : String(row.note),
    status: row.status as PreRegistrationStatus,
    otpHash: row.otp_hash == null ? null : String(row.otp_hash),
    otpExpiresAt: row.otp_expires_at == null ? null : new Date(String(row.otp_expires_at)).toISOString(),
    otpSentAt: row.otp_sent_at == null ? null : new Date(String(row.otp_sent_at)).toISOString(),
    otpAttempts: Number(row.otp_attempts ?? 0),
    verifiedAt: row.verified_at == null ? null : new Date(String(row.verified_at)).toISOString(),
    submittedAt: row.submitted_at == null ? null : new Date(String(row.submitted_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function toPublic(row: PreRegistrationRow): PreRegistrationPublic {
  return {
    id: row.id,
    phone: row.phone,
    fullName: row.fullName,
    organization: row.organization,
    ministry: row.ministry,
    positionTitle: row.positionTitle,
    province: row.province,
    city: row.city,
    note: row.note,
    status: row.status,
    verifiedAt: row.verifiedAt,
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
  };
}

export async function pgGetPreRegistrationByPhone(
  phone: string
): Promise<PreRegistrationRow | null> {
  await ensurePreRegistrationSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM pre_registrations WHERE phone = ${phone} LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function pgUpsertOtpChallenge(input: {
  phone: string;
  otpHash: string;
  otpExpiresAt: Date;
  otpSentAt: Date;
}): Promise<PreRegistrationRow> {
  await ensurePreRegistrationSchema();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO pre_registrations (
      phone, status, otp_hash, otp_expires_at, otp_sent_at, otp_attempts, updated_at
    )
    VALUES (
      ${input.phone},
      'pending_otp',
      ${input.otpHash},
      ${input.otpExpiresAt.toISOString()},
      ${input.otpSentAt.toISOString()},
      0,
      now()
    )
    ON CONFLICT (phone) DO UPDATE SET
      status = CASE
        WHEN pre_registrations.status = 'submitted' THEN pre_registrations.status
        ELSE 'pending_otp'
      END,
      otp_hash = EXCLUDED.otp_hash,
      otp_expires_at = EXCLUDED.otp_expires_at,
      otp_sent_at = EXCLUDED.otp_sent_at,
      otp_attempts = 0,
      updated_at = now()
    WHERE pre_registrations.status <> 'submitted'
    RETURNING *
  `;

  if (!rows[0]) {
    const existing = await pgGetPreRegistrationByPhone(input.phone);
    if (existing?.status === "submitted") {
      return existing;
    }
    throw new Error("Failed to create OTP challenge");
  }

  return mapRow(rows[0] as Record<string, unknown>);
}

export async function pgMarkOtpVerified(phone: string): Promise<PreRegistrationRow | null> {
  await ensurePreRegistrationSchema();
  const sql = getSql();
  const rows = await sql`
    UPDATE pre_registrations
    SET
      status = 'otp_verified',
      otp_hash = NULL,
      otp_expires_at = NULL,
      otp_attempts = 0,
      verified_at = COALESCE(verified_at, now()),
      updated_at = now()
    WHERE phone = ${phone}
      AND status IN ('pending_otp', 'otp_verified')
    RETURNING *
  `;
  if (!rows[0]) return null;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function pgIncrementOtpAttempts(phone: string): Promise<number> {
  await ensurePreRegistrationSchema();
  const sql = getSql();
  const rows = await sql`
    UPDATE pre_registrations
    SET otp_attempts = otp_attempts + 1, updated_at = now()
    WHERE phone = ${phone}
    RETURNING otp_attempts
  `;
  return Number(rows[0]?.otp_attempts ?? 0);
}

export async function pgSubmitPreRegistration(input: {
  phone: string;
  fullName: string;
  organization: string;
  ministry: string;
  positionTitle: string;
  province: string;
  city: string;
  note: string | null;
}): Promise<PreRegistrationRow | null> {
  await ensurePreRegistrationSchema();
  const sql = getSql();
  const rows = await sql`
    UPDATE pre_registrations
    SET
      full_name = ${input.fullName},
      organization = ${input.organization},
      ministry = ${input.ministry},
      position_title = ${input.positionTitle},
      province = ${input.province},
      city = ${input.city},
      note = ${input.note},
      status = 'submitted',
      otp_hash = NULL,
      otp_expires_at = NULL,
      submitted_at = now(),
      updated_at = now()
    WHERE phone = ${input.phone}
      AND status IN ('otp_verified', 'pending_otp', 'submitted')
    RETURNING *
  `;
  if (!rows[0]) return null;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function pgListSubmittedPreRegistrations(
  limit = 200
): Promise<PreRegistrationPublic[]> {
  await ensurePreRegistrationSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM pre_registrations
    WHERE status = 'submitted'
    ORDER BY submitted_at DESC NULLS LAST, created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => toPublic(mapRow(row as Record<string, unknown>)));
}

export async function pgCountSubmittedPreRegistrations(): Promise<number> {
  await ensurePreRegistrationSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM pre_registrations
    WHERE status = 'submitted'
  `;
  return Number(rows[0]?.count ?? 0);
}
