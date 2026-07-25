"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronLeft, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminItemActions } from "@/components/admin/admin-item-actions";
import { getLoginUsernameFromEmail } from "@/lib/auth/user-login";
import { getUserRoleDisplayLabel } from "@/lib/user-roles";
import type { AdminUser, Ministry } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

const NO_MINISTRY = "__none__";
const MINISTRY_ITSELF = "__ministry_itself__";

interface UsersMinistryTreeProps {
  users: AdminUser[];
  ministries?: Ministry[];
  onEdit?: (user: AdminUser) => void;
  onDelete?: (user: AdminUser) => void;
}

type OrgBranch = {
  id: string;
  name: string;
  users: AdminUser[];
};

type MinistryGroup = {
  id: string;
  name: string;
  orgs: OrgBranch[];
  total: number;
};

function sortByName(a: AdminUser, b: AdminUser) {
  return (a.name ?? "").localeCompare(b.name ?? "", "fa");
}

function buildMinistryGroups(
  users: AdminUser[],
  ministries: Ministry[]
): MinistryGroup[] {
  const byMinistry = new Map<string, AdminUser[]>();
  for (const user of users) {
    const key = user.ministryId || NO_MINISTRY;
    const list = byMinistry.get(key) ?? [];
    list.push(user);
    byMinistry.set(key, list);
  }

  const groups: MinistryGroup[] = [];

  for (const [key, groupUsers] of byMinistry) {
    const ministryMeta = ministries.find((ministry) => ministry.id === key);
    const ministryName =
      key === NO_MINISTRY
        ? "بدون وزارتخانه"
        : groupUsers.find((user) => user.ministryId === key)?.ministryName?.trim() ||
          ministryMeta?.name ||
          "وزارتخانه";

    const byOrg = new Map<string, AdminUser[]>();
    for (const user of groupUsers) {
      const orgKey = user.organizationId || MINISTRY_ITSELF;
      const list = byOrg.get(orgKey) ?? [];
      list.push(user);
      byOrg.set(orgKey, list);
    }

    const orgs: OrgBranch[] = [];
    for (const [orgKey, orgUsers] of byOrg) {
      const name =
        orgKey === MINISTRY_ITSELF
          ? "خود وزارتخانه"
          : orgUsers.find((user) => user.organizationId === orgKey)?.organizationName?.trim() ||
            ministryMeta?.organizations?.find((org) => org.id === orgKey)?.name ||
            "زیرمجموعه";
      orgs.push({
        id: orgKey,
        name,
        users: [...orgUsers].sort(sortByName),
      });
    }

    orgs.sort((a, b) => {
      if (a.id === MINISTRY_ITSELF) return -1;
      if (b.id === MINISTRY_ITSELF) return 1;
      return a.name.localeCompare(b.name, "fa");
    });

    groups.push({
      id: key,
      name: ministryName,
      orgs,
      total: groupUsers.length,
    });
  }

  return groups.sort((a, b) => {
    if (a.id === NO_MINISTRY) return 1;
    if (b.id === NO_MINISTRY) return -1;
    return a.name.localeCompare(b.name, "fa");
  });
}

function UserMeta({ user }: { user: AdminUser }) {
  const parts = [
    getLoginUsernameFromEmail(user.email ?? ""),
    [user.province, user.city].filter(Boolean).join(" / ") || null,
  ].filter(Boolean);

  return (
    <p className="truncate text-xs text-muted-foreground">{parts.join(" · ")}</p>
  );
}

export function UsersMinistryTree({
  users,
  ministries = [],
  onEdit,
  onDelete,
}: UsersMinistryTreeProps) {
  const groups = useMemo(
    () => buildMinistryGroups(users, ministries),
    [users, ministries]
  );

  // Cards start collapsed; expand on demand via the chevron.
  const [expandedMinistryIds, setExpandedMinistryIds] = useState<Set<string>>(
    () => new Set()
  );
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(
    () => new Set()
  );

  const toggleMinistry = (id: string) => {
    setExpandedMinistryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleOrg = (ministryId: string, orgId: string) => {
    const key = `${ministryId}:${orgId}`;
    setExpandedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border py-12 text-center text-muted-foreground">
        کاربری با این فیلترها یافت نشد.
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {groups.map((group) => {
        const ministryExpanded = expandedMinistryIds.has(group.id);
        const orgCount = group.orgs.filter((org) => org.id !== MINISTRY_ITSELF).length;

        return (
          <div key={group.id} className="overflow-hidden rounded-lg border bg-card">
            <div className="flex flex-wrap items-center gap-2 p-4">
              <button
                type="button"
                className="rounded p-1 hover:bg-muted"
                onClick={() => toggleMinistry(group.id)}
                aria-label="باز و بسته کردن وزارتخانه"
              >
                {ministryExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
              <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{group.name}</span>
                  <Badge variant="secondary">
                    {formatPersianNumber(group.total)} کاربر
                  </Badge>
                  {orgCount > 0 ? (
                    <Badge variant="outline">
                      {formatPersianNumber(orgCount)} زیرمجموعه
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  توزیع کاربران بر اساس وزارتخانه و زیرمجموعه
                </p>
              </div>
            </div>

            {ministryExpanded ? (
              <div className="border-t bg-muted/30">
                {group.orgs.map((org) => {
                  const orgKey = `${group.id}:${org.id}`;
                  const orgExpanded = expandedOrgIds.has(orgKey);

                  return (
                    <div key={org.id} className="border-b last:border-b-0">
                      <div
                        className="flex flex-wrap items-center gap-2 px-4 py-3"
                        style={{ paddingRight: 36 }}
                      >
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-muted"
                          onClick={() => toggleOrg(group.id, org.id)}
                          aria-label="باز و بسته کردن کاربران"
                        >
                          {orgExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronLeft className="h-4 w-4" />
                          )}
                        </button>
                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{org.name}</span>
                            <Badge variant="secondary">
                              {formatPersianNumber(org.users.length)} کاربر
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {orgExpanded ? (
                        <div className="bg-muted/20">
                          {org.users.map((user) => (
                            <div
                              key={user.id}
                              className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5"
                              style={{ paddingRight: 64 }}
                            >
                              <span className="inline-block h-4 w-4 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm">{user.name}</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {getUserRoleDisplayLabel(user)}
                                  </Badge>
                                </div>
                                <UserMeta user={user} />
                              </div>
                              {(onEdit || onDelete) && (
                                <AdminItemActions
                                  compact
                                  onEdit={onEdit ? () => onEdit(user) : undefined}
                                  onDelete={
                                    onDelete ? () => onDelete(user) : undefined
                                  }
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {group.orgs.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    کاربری در این وزارتخانه نیست.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
