"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronLeft, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminItemActions } from "@/components/admin/admin-item-actions";
import { getLoginUsernameFromEmail } from "@/lib/auth/user-login";
import {
  canOrgRoleManageSubtreeUsers,
  getUserRoleDisplayLabel,
  isOrgUserRole,
} from "@/lib/user-roles";
import type { AdminUser, Ministry } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

const NO_MINISTRY = "__none__";

function isSubtreeParentUser(user: AdminUser): boolean {
  if (!isOrgUserRole(user.role)) return false;
  if (canOrgRoleManageSubtreeUsers(user.orgRole)) return true;
  const campaignIds = user.campaignIds ?? [];
  const permissions = user.campaignPermissions ?? {};
  return campaignIds.some((id) => Boolean(permissions[id]?.manageSubtreeUsers));
}

interface UsersMinistryTreeProps {
  users: AdminUser[];
  ministries?: Ministry[];
  onEdit?: (user: AdminUser) => void;
  onDelete?: (user: AdminUser) => void;
}

type ParentBranch = {
  user: AdminUser;
  children: AdminUser[];
};

type MinistryGroup = {
  id: string;
  name: string;
  parents: ParentBranch[];
  otherUsers: AdminUser[];
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
    const ids = new Set(groupUsers.map((user) => user.id));
    const childrenByParent = new Map<string, AdminUser[]>();

    for (const user of groupUsers) {
      if (!user.parentUserId || !ids.has(user.parentUserId)) continue;
      const list = childrenByParent.get(user.parentUserId) ?? [];
      list.push(user);
      childrenByParent.set(user.parentUserId, list);
    }
    for (const list of childrenByParent.values()) {
      list.sort(sortByName);
    }

    // Nest by parent_user_id even when manageSubtreeUsers was revoked — hierarchy
    // visibility must not depend on the management permission flag.
    const parentIdsWithChildren = new Set(childrenByParent.keys());
    const parents: ParentBranch[] = groupUsers
      .filter(
        (user) => parentIdsWithChildren.has(user.id) || isSubtreeParentUser(user)
      )
      .sort((a, b) => {
        const aHasChildren = parentIdsWithChildren.has(a.id) ? 0 : 1;
        const bHasChildren = parentIdsWithChildren.has(b.id) ? 0 : 1;
        if (aHasChildren !== bHasChildren) return aHasChildren - bHasChildren;
        return sortByName(a, b);
      })
      .map((user) => ({
        user,
        children: childrenByParent.get(user.id) ?? [],
      }));

    const nestedIds = new Set(
      parents.flatMap((branch) => branch.children.map((child) => child.id))
    );
    const parentIds = new Set(parents.map((branch) => branch.user.id));
    const otherUsers = groupUsers
      .filter((user) => !parentIds.has(user.id) && !nestedIds.has(user.id))
      .sort(sortByName);

    const name =
      key === NO_MINISTRY
        ? "بدون وزارتخانه"
        : groupUsers.find((user) => user.ministryId === key)?.ministryName?.trim() ||
          ministries.find((ministry) => ministry.id === key)?.name ||
          "وزارتخانه";

    groups.push({
      id: key,
      name,
      parents,
      otherUsers,
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
    user.organizationName?.trim() || null,
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
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(
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

  const toggleParent = (id: string) => {
    setExpandedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        const parentCount = group.parents.length;
        const subCount = group.parents.reduce(
          (sum, branch) => sum + branch.children.length,
          0
        );

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
                  {parentCount > 0 ? (
                    <Badge variant="outline">
                      {formatPersianNumber(parentCount)} یوزر مادر
                    </Badge>
                  ) : null}
                  {subCount > 0 ? (
                    <Badge variant="outline">
                      {formatPersianNumber(subCount)} زیرمجموعه
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  توزیع کاربران این وزارتخانه
                </p>
              </div>
            </div>

            {ministryExpanded ? (
              <div className="border-t bg-muted/30">
                {group.parents.map((branch) => {
                  const parentExpanded = expandedParentIds.has(branch.user.id);
                  const hasChildren = branch.children.length > 0;

                  return (
                    <div key={branch.user.id} className="border-b last:border-b-0">
                      <div
                        className="flex flex-wrap items-center gap-2 px-4 py-3"
                        style={{ paddingRight: 36 }}
                      >
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-muted"
                          onClick={() => toggleParent(branch.user.id)}
                          aria-label="باز و بسته کردن زیرمجموعه‌ها"
                          disabled={!hasChildren}
                        >
                          {hasChildren ? (
                            parentExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronLeft className="h-4 w-4" />
                            )
                          ) : (
                            <span className="inline-block h-4 w-4" />
                          )}
                        </button>
                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{branch.user.name}</span>
                            <Badge variant="secondary">
                              {getUserRoleDisplayLabel(branch.user)}
                            </Badge>
                            {hasChildren ? (
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {formatPersianNumber(branch.children.length)} زیرمجموعه
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-normal">
                                بدون زیرمجموعه
                              </Badge>
                            )}
                            {isSubtreeParentUser(branch.user) ? (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                مدیریت زیرشاخه
                              </Badge>
                            ) : null}
                          </div>
                          <UserMeta user={branch.user} />
                        </div>
                        {(onEdit || onDelete) && (
                          <AdminItemActions
                            compact
                            onEdit={onEdit ? () => onEdit(branch.user) : undefined}
                            onDelete={onDelete ? () => onDelete(branch.user) : undefined}
                          />
                        )}
                      </div>

                      {parentExpanded && hasChildren ? (
                        <div className="bg-muted/20">
                          {branch.children.map((child) => (
                            <div
                              key={child.id}
                              className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5"
                              style={{ paddingRight: 64 }}
                            >
                              <span className="inline-block h-4 w-4 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm">{child.name}</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {getUserRoleDisplayLabel(child)}
                                  </Badge>
                                </div>
                                <UserMeta user={child} />
                              </div>
                              {(onEdit || onDelete) && (
                                <AdminItemActions
                                  compact
                                  onEdit={onEdit ? () => onEdit(child) : undefined}
                                  onDelete={
                                    onDelete ? () => onDelete(child) : undefined
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

                {group.otherUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center gap-2 border-b px-4 py-3 last:border-b-0"
                    style={{ paddingRight: 36 }}
                  >
                    <span className="inline-block h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge variant="outline">{getUserRoleDisplayLabel(user)}</Badge>
                        {user.parentUserId && user.parentUserName ? (
                          <span className="text-[11px] text-muted-foreground">
                            زیردستِ {user.parentUserName}
                          </span>
                        ) : null}
                      </div>
                      <UserMeta user={user} />
                    </div>
                    {(onEdit || onDelete) && (
                      <AdminItemActions
                        compact
                        onEdit={onEdit ? () => onEdit(user) : undefined}
                        onDelete={onDelete ? () => onDelete(user) : undefined}
                      />
                    )}
                  </div>
                ))}

                {group.parents.length === 0 && group.otherUsers.length === 0 ? (
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
