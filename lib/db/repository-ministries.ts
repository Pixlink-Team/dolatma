import { getSql } from "@/lib/db/client";
import { DEFAULT_MINISTRIES } from "@/lib/ministry-seed";
import type { Ministry } from "@/lib/types";
import { generateId } from "@/lib/utils";

function mapMinistry(row: Record<string, unknown>): Ministry {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    fullName:
      typeof row.full_name === "string" && row.full_name.trim()
        ? row.full_name.trim()
        : null,
    description:
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : null,
    isActive: row.is_active !== false,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? new Date().toISOString()),
  };
}

export async function pgListMinistries(): Promise<Ministry[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM ministries
    ORDER BY name ASC
  `;
  return rows.map((row) => mapMinistry(row as Record<string, unknown>));
}

export async function pgGetMinistryById(id: string): Promise<Ministry | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM ministries WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return null;
  return mapMinistry(rows[0] as Record<string, unknown>);
}

export async function pgEnsureDefaultMinistries(): Promise<void> {
  const sql = getSql();
  const now = new Date().toISOString();
  for (const item of DEFAULT_MINISTRIES) {
    await sql`
      INSERT INTO ministries (id, name, full_name, description, is_active, created_at)
      VALUES (
        ${generateId()},
        ${item.name},
        ${item.fullName},
        ${item.description},
        ${true},
        ${now}
      )
      ON CONFLICT (name) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active
    `;
  }
}

export async function pgSaveMinistry(data: {
  id?: string;
  name: string;
  fullName?: string | null;
  description?: string | null;
  isActive?: boolean;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const sql = getSql();
  const id = data.id ?? generateId();
  const name = data.name.trim();
  const fullName = data.fullName?.trim() || null;
  const description = data.description?.trim() || null;
  const isActive = data.isActive !== false;
  if (!name) {
    return { success: false, error: "نام وزارتخانه الزامی است" };
  }

  try {
    if (data.id) {
      await sql`
        UPDATE ministries SET
          name = ${name},
          full_name = ${fullName},
          description = ${description},
          is_active = ${isActive}
        WHERE id = ${id}
      `;
    } else {
      const now = new Date().toISOString();
      await sql`
        INSERT INTO ministries (id, name, full_name, description, is_active, created_at)
        VALUES (${id}, ${name}, ${fullName}, ${description}, ${isActive}, ${now})
      `;
    }
    return { success: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "ذخیره وزارتخانه ناموفق بود";
    if (message.includes("duplicate key") || message.includes("unique")) {
      return { success: false, error: "این نام وزارتخانه قبلاً ثبت شده است" };
    }
    return { success: false, error: message };
  }
}

export async function pgDeleteMinistry(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const linked = await sql`
    SELECT COUNT(*)::int AS count FROM users WHERE ministry_id = ${id}
  `;
  if (Number(linked[0]?.count ?? 0) > 0) {
    return {
      success: false,
      error: "ابتدا کاربران متصل به این وزارتخانه را حذف یا جابه‌جا کنید",
    };
  }
  await sql`DELETE FROM ministries WHERE id = ${id}`;
  return { success: true };
}

export async function pgListSubUserIds(parentUserId: string): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id FROM users
    WHERE parent_user_id = ${parentUserId}
      AND role = 'sub_user'
  `;
  return rows.map((row) => String(row.id));
}

export async function pgListUsersByParent(parentUserId: string) {
  const sql = getSql();
  return sql`
    SELECT u.*, m.name AS ministry_name, p.name AS parent_user_name
    FROM users u
    LEFT JOIN ministries m ON m.id = u.ministry_id
    LEFT JOIN users p ON p.id = u.parent_user_id
    WHERE u.parent_user_id = ${parentUserId}
    ORDER BY u.created_at DESC
  `;
}
