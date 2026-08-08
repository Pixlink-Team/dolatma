"use client";
import { taghvimPath, stripTaghvimBase, TAGHVIM_BASE } from "@taghvim/lib/paths";

import { SiteMottoBanner } from "@taghvim/components/brand/SiteMottoBanner";
import { PasswordField } from "@taghvim/components/forms/PasswordField";
import { AppShell } from "@taghvim/components/layout/AppShell";
import { AppSidebar, MobileMenuButton } from "@taghvim/components/layout/AppSidebar";
import { NotificationBell } from "@taghvim/components/notifications/NotificationBell";
import { apiFetch, getCurrentUser, refreshCurrentUser } from "@taghvim/lib/auth";
import { evaluatePasswordStrength } from "@taghvim/lib/password-strength";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  userHasPermission,
  type AdminUser,
  type Permission,
  type UserRole,
} from "@taghvim/types/auth";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  FileText,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type TreeNode = {
  user: AdminUser;
  children: TreeNode[];
};

export default function MySubusersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">
          در حال بارگذاری...
        </div>
      }
    >
      <MySubusersInner />
    </Suspense>
  );
}

function MySubusersInner() {
  const router = useRouter();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const grantable = useMemo(() => {
    if (!me) return [] as Permission[];
    if (me.role === "super_admin") return ALL_PERMISSIONS;
    return (me.permissions ?? []).filter((p) => p !== "manage_users");
  }, [me]);

  const myTeam = useMemo(() => {
    if (!me) return [] as AdminUser[];
    // Prefer direct children + their descendants under this user
    const byParent = new Map<string, AdminUser[]>();
    for (const u of users) {
      if (u.id === me.id) continue;
      const parentKey =
        u.parent_id != null ? String(u.parent_id) : "__root__";
      const list = byParent.get(parentKey) ?? [];
      list.push(u);
      byParent.set(parentKey, list);
    }

    const collect = (parentId: string): AdminUser[] => {
      const kids = byParent.get(parentId) ?? [];
      return kids.flatMap((child) => [child, ...collect(child.id)]);
    };

    const underMe = collect(me.id);
    if (underMe.length > 0) return underMe;

    // Fallback if API already scoped without parent links
    return users.filter((u) => u.id !== me.id);
  }, [users, me]);

  const tree = useMemo(() => {
    if (!me) return [] as TreeNode[];
    const map = new Map<string, TreeNode>();
    myTeam.forEach((u) => map.set(u.id, { user: u, children: [] }));
    const roots: TreeNode[] = [];
    map.forEach((node) => {
      const parentId =
        node.user.parent_id != null ? String(node.user.parent_id) : null;
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(node);
      } else if (parentId === me.id || !parentId) {
        roots.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }, [myTeam, me]);

  const directCount = useMemo(() => {
    if (!me) return 0;
    return myTeam.filter((u) => String(u.parent_id) === me.id).length;
  }, [myTeam, me]);

  const activeCount = useMemo(
    () => myTeam.filter((u) => u.is_active).length,
    [myTeam],
  );

  useEffect(() => {
    void (async () => {
      const current = (await refreshCurrentUser()) ?? getCurrentUser();
      if (!current) {
        router.replace(taghvimPath("/login"));
        return;
      }
      if (!userHasPermission(current, "manage_subusers")) {
        router.replace(taghvimPath("/my-content"));
        return;
      }
      setMe(current);
      setSelectedPerms(
        (current.permissions ?? []).filter((p) => p !== "manage_users"),
      );
      await loadUsers();
    })();
  }, [router]);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/users");
      if (!res.ok) {
        setError("بارگذاری کاربران ناموفق بود");
        return;
      }
      const payload = await res.json();
      const list = (payload.data ?? []).map((u: Record<string, unknown>) => ({
        id: String(u.id),
        name: String(u.name),
        username: String(u.username ?? u.email ?? ""),
        mobile: u.mobile != null && String(u.mobile).trim() !== "" ? String(u.mobile) : null,
        email: u.email != null ? String(u.email) : "",
        role: (u.role as UserRole) ?? "editor",
        is_active: Boolean(u.is_active),
        created_at: String(u.created_at ?? ""),
        parent_id: u.parent_id as string | number | null,
        permissions: (u.permissions as Permission[]) ?? [],
        agencyIds: Array.isArray(u.agency_ids)
          ? u.agency_ids.map(String)
          : [],
      })) as AdminUser[];
      setUsers(list);
      const open: Record<string, boolean> = {};
      list.forEach((u) => {
        open[u.id] = true;
      });
      setExpanded(open);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در بارگذاری");
    } finally {
      setLoading(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!username.trim()) {
      setError("نام کاربری الزامی است");
      return;
    }
    if (!evaluatePasswordStrength(password).isStrong) {
      setError(
        "رمز عبور باید قوی باشد (۱۰+ کاراکتر، حروف بزرگ/کوچک، عدد و نماد)",
      );
      return;
    }
    const res = await apiFetch("/users", {
      method: "POST",
      body: JSON.stringify({
        name,
        username: username.trim().toLowerCase(),
        mobile: mobile.trim() || null,
        password,
        role: "editor",
        permissions: selectedPerms.filter((p) => grantable.includes(p)),
        agency_ids: me?.agencyIds ?? [],
      }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const firstError =
        payload.errors && typeof payload.errors === "object"
          ? String(
              Object.values(payload.errors as Record<string, string[]>)[0]?.[0] ??
                "",
            )
          : "";
      setError(firstError || payload.message || "ایجاد کاربر ناموفق بود");
      return;
    }
    setName("");
    setUsername("");
    setMobile("");
    setPassword("");
    setFormOpen(false);
    setSuccess("زیردست جدید با موفقیت اضافه شد.");
    await loadUsers();
  }

  async function onDelete(id: string, label: string) {
    if (!confirm(`حذف زیردست «${label}»؟`)) return;
    setError(null);
    const res = await apiFetch(`/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("حذف ناموفق بود");
      return;
    }
    setSuccess("زیردست حذف شد.");
    await loadUsers();
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <AppShell
      sidebar={
        <AppSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onCloseMobile={() => setMobileMenuOpen(false)}
          stats={{
            totalEvents: myTeam.length,
            enemy: 0,
            government: 0,
            activeUsers: activeCount,
          }}
        />
      }
      main={
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-semibold text-[var(--text-primary)]">
                  زیردستان من
                </p>
                <p className="m-0 truncate text-[11px] text-[var(--text-secondary)]">
                  مدیریت تیم · {me.name}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell />
              <button
                type="button"
                onClick={() => {
                  setFormOpen((v) => !v);
                  setError(null);
                  setSuccess(null);
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {formOpen ? "بستن فرم" : "افزودن"}
              </button>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4 scrollbar-thin"
            style={{ direction: "rtl" }}
          >
        <SiteMottoBanner compact />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold">زیردستان من</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              تیم زیرمجموعه شما — مستقیم و غیرمستقیم. فقط مجوزهایی که خودتان دارید
              قابل تفویض است.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={taghvimPath("/my-content")}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs"
            >
              <FileText className="h-3.5 w-3.5" />
              محتوای من
            </Link>
            <button
              type="button"
              onClick={() => {
                setFormOpen((v) => !v);
                setError(null);
                setSuccess(null);
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {formOpen ? "بستن فرم" : "افزودن زیردست"}
            </button>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            label="کل تیم"
            value={myTeam.length}
            hint="مستقیم + زیرمجموعه"
          />
          <StatCard
            label="زیردست مستقیم"
            value={directCount}
            hint="فقط لایه اول"
          />
          <StatCard label="فعال" value={activeCount} hint="حساب‌های فعال" />
          <StatCard
            label="غیرفعال"
            value={myTeam.length - activeCount}
            hint="مسدود یا غیرفعال"
          />
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <div className="mb-3 flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
            <div className="text-sm text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">
                چطور بخوانیم؟
              </p>
              <ul className="mt-1 list-disc space-y-1 pr-4 text-[12px] leading-6">
                <li>
                  کارت‌های با برچسب <strong>مستقیم</strong> همان کسانی هستند که
                  خودتان ساخته‌اید.
                </li>
                <li>
                  افراد با تورفتگی، زیردستِ زیردست شما هستند (سلسله‌مراتب).
                </li>
                <li>
                  مجوزهای هر نفر با تراشه نشان داده می‌شود تا سریع ببینید چه کاری
                  می‌تواند بکند.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {formOpen ? (
          <form
            onSubmit={(e) => void onCreate(e)}
            className="space-y-4 rounded-2xl border border-blue-500/25 bg-[var(--panel)] p-4"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="text-sm font-semibold">افزودن زیردست جدید</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="text-xs text-[var(--text-secondary)]">
                  نام نمایشی
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً کارشناس رصد غرب"
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-xs text-[var(--text-secondary)]">
                  نام کاربری (ورود)
                </span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثلاً west_editor"
                  required
                  autoComplete="username"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="space-y-1.5 text-sm sm:col-span-2">
                <span className="text-xs text-[var(--text-secondary)]">
                  شماره موبایل (برای پیامک دوعاملی بعدی)
                </span>
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="09123456789"
                  inputMode="tel"
                  autoComplete="tel"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <div className="sm:col-span-2">
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  placeholder="رمز عبور قوی"
                  required
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
                مجوزهای قابل تفویض
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {grantable.map((perm) => {
                  const checked = selectedPerms.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-xs transition ${
                        checked
                          ? "border-blue-500/40 bg-blue-500/10"
                          : "border-[var(--border)] bg-[var(--panel-2)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedPerms((prev) =>
                            e.target.checked
                              ? [...prev, perm]
                              : prev.filter((p) => p !== perm),
                          );
                        }}
                      />
                      <span>
                        <span className="block font-medium text-[var(--text-primary)]">
                          {PERMISSION_LABELS[perm]}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                ثبت زیردست
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm"
              >
                انصراف
              </button>
            </div>
          </form>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm text-emerald-600">
            {success}
          </p>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              ساختار تیم
            </h3>
            <span className="text-[11px] text-[var(--text-muted)]">
              شما در رأس هستید
            </span>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3">
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--primary)]/30 bg-blue-500/10 px-3 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                {me.name.trim().charAt(0) || "م"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  {me.name}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  @{me.username || "—"} · {ROLE_LABELS[me.role]} · رأس تیم
                </p>
              </div>
              <ArrowRight className="hidden h-4 w-4 text-[var(--text-muted)] sm:block" />
            </div>

            {loading ? (
              <p className="px-2 py-6 text-center text-sm text-[var(--text-secondary)]">
                در حال بارگذاری تیم...
              </p>
            ) : tree.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center">
                <Users className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                  هنوز زیردستی ندارید
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  با دکمه «افزودن زیردست» اولین عضو تیم را بسازید.
                </p>
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="mt-4 inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  افزودن زیردست
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {tree.map((node) => (
                  <SubuserNode
                    key={node.user.id}
                    node={node}
                    depth={0}
                    meId={me.id}
                    expanded={expanded}
                    onToggle={(id) =>
                      setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
                    }
                    onDelete={(u) => void onDelete(u.id, u.name)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      
          </div>
        </div>
      }
    />
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-3 py-3">
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text-primary)]">
        {value.toLocaleString("fa-IR")}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">{hint}</p>
    </div>
  );
}

function SubuserNode({
  node,
  depth,
  meId,
  expanded,
  onToggle,
  onDelete,
}: {
  node: TreeNode;
  depth: number;
  meId: string;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onDelete: (u: AdminUser) => void;
}) {
  const u = node.user;
  const isDirect = String(u.parent_id) === meId;
  const hasChildren = node.children.length > 0;
  const isOpen = expanded[u.id] !== false;

  return (
    <div style={{ marginRight: depth * 14 }}>
      <article className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
        <div className="flex items-start gap-3">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(u.id)}
              className="mt-1 rounded-lg border border-[var(--border)] p-1 text-[var(--text-secondary)] hover:bg-[var(--hover)]"
              aria-label={isOpen ? "بستن زیرمجموعه" : "باز کردن زیرمجموعه"}
            >
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="mt-1 w-7" />
          )}

          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
              isDirect
                ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                : "bg-gradient-to-br from-slate-500 to-slate-700"
            }`}
          >
            {u.name.trim().charAt(0) || "ک"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                {u.name}
              </h4>
              {isDirect ? (
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                  مستقیم
                </span>
              ) : (
                <span className="rounded-md bg-slate-500/15 px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  لایه {depth + 1}
                </span>
              )}
              {u.is_active ? (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  فعال
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-500">
                  <XCircle className="h-3 w-3" />
                  غیرفعال
                </span>
              )}
            </div>

            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              @{u.username || "—"}
              {u.mobile ? ` · ${u.mobile}` : ""} · {ROLE_LABELS[u.role]}
              {hasChildren
                ? ` · ${node.children.length.toLocaleString("fa-IR")} زیرمجموعه`
                : ""}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {(u.permissions ?? []).length > 0 ? (
                (u.permissions ?? []).map((p) => (
                  <span
                    key={p}
                    className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                  >
                    {PERMISSION_LABELS[p]}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-[var(--text-muted)]">
                  بدون مجوز اختصاصی
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDelete(u)}
            className="rounded-lg border border-red-500/30 p-2 text-red-400 hover:bg-red-500/10"
            aria-label={`حذف ${u.name}`}
            title="حذف"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>

      {hasChildren && isOpen ? (
        <div className="mt-2 space-y-2 border-r border-dashed border-[var(--border)] pr-2">
          {node.children.map((child) => (
            <SubuserNode
              key={child.user.id}
              node={child}
              depth={depth + 1}
              meId={meId}
              expanded={expanded}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
