"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronLeft, Pencil, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminItemActions } from "@/components/admin/admin-item-actions";
import { getLoginUsernameFromEmail } from "@/lib/auth/user-login";
import { getUserRoleDisplayLabel } from "@/lib/user-roles";
import type { AdminUser, Ministry, MinistryOrganization } from "@/lib/types";
import { formatPersianNumber } from "@/lib/utils";

const NO_MINISTRY = "__none__";
const MINISTRY_ITSELF = "__ministry_itself__";

interface UsersMinistryTreeProps {
  users: AdminUser[];
  ministries?: Ministry[];
  onEdit?: (user: AdminUser) => void;
  onDelete?: (user: AdminUser) => void;
}

type OrgNode = {
  id: string;
  name: string;
  parentId: string | null;
  users: AdminUser[];
  children: OrgNode[];
};

type MinistryGroup = {
  id: string;
  name: string;
  ministryUsers: AdminUser[];
  roots: OrgNode[];
  total: number;
};

type UsersModalTarget =
  | {
      kind: "ministry";
      ministryId: string;
      title: string;
      subtitle: string;
    }
  | {
      kind: "org";
      ministryId: string;
      orgId: string;
      title: string;
      subtitle: string;
    };

function findOrgNode(nodes: OrgNode[], orgId: string): OrgNode | null {
  for (const node of nodes) {
    if (node.id === orgId) return node;
    const nested = findOrgNode(node.children, orgId);
    if (nested) return nested;
  }
  return null;
}

function sortByName(a: AdminUser, b: AdminUser) {
  return (a.name ?? "").localeCompare(b.name ?? "", "fa");
}

function sortOrgNodes(a: OrgNode, b: OrgNode) {
  return a.name.localeCompare(b.name, "fa");
}

function buildOrgForest(
  ministryId: string,
  orgs: MinistryOrganization[],
  usersByOrg: Map<string, AdminUser[]>
): OrgNode[] {
  const nodes = new Map<string, OrgNode>();

  for (const org of orgs) {
    nodes.set(org.id, {
      id: org.id,
      name: org.name,
      parentId: org.parentId ?? ministryId,
      users: [...(usersByOrg.get(org.id) ?? [])].sort(sortByName),
      children: [],
    });
  }

  // Orphan user orgs not present in the ministry catalog still get a node.
  for (const [orgId, orgUsers] of usersByOrg) {
    if (orgId === MINISTRY_ITSELF || nodes.has(orgId)) continue;
    const name =
      orgUsers.find((user) => user.organizationId === orgId)?.organizationName?.trim() ||
      "زیرمجموعه";
    nodes.set(orgId, {
      id: orgId,
      name,
      parentId: ministryId,
      users: [...orgUsers].sort(sortByName),
      children: [],
    });
  }

  const roots: OrgNode[] = [];
  for (const node of nodes.values()) {
    const parentId = node.parentId;
    if (parentId && parentId !== ministryId && nodes.has(parentId)) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (list: OrgNode[]) => {
    list.sort(sortOrgNodes);
    for (const child of list) sortRecursive(child.children);
  };
  sortRecursive(roots);
  return roots;
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

    const usersByOrg = new Map<string, AdminUser[]>();
    for (const user of groupUsers) {
      const orgKey = user.organizationId || MINISTRY_ITSELF;
      const list = usersByOrg.get(orgKey) ?? [];
      list.push(user);
      usersByOrg.set(orgKey, list);
    }

    const ministryUsers = [...(usersByOrg.get(MINISTRY_ITSELF) ?? [])].sort(sortByName);
    const roots =
      key === NO_MINISTRY
        ? []
        : buildOrgForest(key, ministryMeta?.organizations ?? [], usersByOrg);

    groups.push({
      id: key,
      name: ministryName,
      ministryUsers,
      roots,
      total: groupUsers.length,
    });
  }

  return groups.sort((a, b) => {
    if (a.id === NO_MINISTRY) return 1;
    if (b.id === NO_MINISTRY) return -1;
    return a.name.localeCompare(b.name, "fa");
  });
}

function countOrgNodes(nodes: OrgNode[]): number {
  let total = 0;
  for (const node of nodes) {
    total += 1 + countOrgNodes(node.children);
  }
  return total;
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

function UserRow({
  user,
  onEdit,
  onDelete,
}: {
  user: AdminUser;
  onEdit?: (user: AdminUser) => void;
  onDelete?: (user: AdminUser) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5 first:border-t-0">
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
          deleteLabel="کاربر"
          onEdit={onEdit ? () => onEdit(user) : undefined}
          onDelete={onDelete ? () => onDelete(user) : undefined}
        />
      )}
    </div>
  );
}

function OrgBranch({
  node,
  ministryId,
  depth,
  expandedIds,
  onToggle,
  onOpenUsers,
}: {
  node: OrgNode;
  ministryId: string;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (ministryId: string, orgId: string) => void;
  onOpenUsers: (target: UsersModalTarget) => void;
}) {
  const key = `${ministryId}:${node.id}`;
  const expanded = expandedIds.has(key);
  const hasChildren = node.children.length > 0;

  return (
    <div className="border-b last:border-b-0">
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-3"
        style={{ paddingRight: 36 + depth * 20 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="rounded p-1 hover:bg-muted"
            onClick={() => onToggle(ministryId, node.id)}
            aria-label="باز و بسته کردن زیرمجموعه"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="inline-block h-6 w-6 shrink-0" />
        )}
        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{node.name}</span>
            <Badge variant="secondary">
              {formatPersianNumber(node.users.length)} کاربر
            </Badge>
            {node.children.length > 0 ? (
              <Badge variant="outline">
                {formatPersianNumber(node.children.length)} زیرمجموعه
              </Badge>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0 hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300"
          title="مشاهده و ویرایش کاربران"
          aria-label="مشاهده و ویرایش کاربران"
          onClick={() =>
            onOpenUsers({
              kind: "org",
              ministryId,
              orgId: node.id,
              title: node.name,
              subtitle: "کاربران مستقیم این زیرمجموعه (مدیر، ناظر و …)",
            })
          }
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded ? (
        <div className="bg-muted/20">
          {node.children.map((child) => (
            <OrgBranch
              key={child.id}
              node={child}
              ministryId={ministryId}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onOpenUsers={onOpenUsers}
            />
          ))}
        </div>
      ) : null}
    </div>
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
  const [usersModal, setUsersModal] = useState<UsersModalTarget | null>(null);

  const modalUsers = useMemo(() => {
    if (!usersModal) return [] as AdminUser[];
    const group = groups.find((item) => item.id === usersModal.ministryId);
    if (!group) return [];
    if (usersModal.kind === "ministry") {
      return group.ministryUsers;
    }
    return findOrgNode(group.roots, usersModal.orgId)?.users ?? [];
  }, [groups, usersModal]);

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
        const orgCount = countOrgNodes(group.roots);
        const isUnassigned = group.id === NO_MINISTRY;

        return (
          <div key={group.id} className="overflow-hidden rounded-lg border bg-card">
            <div className="flex flex-wrap items-center gap-2 p-4">
              {!isUnassigned && group.roots.length > 0 ? (
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
              ) : (
                <span className="inline-block h-6 w-6 shrink-0" />
              )}
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
                  {isUnassigned
                    ? "کاربران بدون اتصال به وزارتخانه"
                    : "با مداد کاربران خود دستگاه را ببینید؛ با فلش فقط زیرمجموعه‌ها باز می‌شوند"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300"
                title="مشاهده و ویرایش کاربران"
                aria-label="مشاهده و ویرایش کاربران"
                onClick={() =>
                  setUsersModal({
                    kind: "ministry",
                    ministryId: group.id,
                    title: group.name,
                    subtitle: isUnassigned
                      ? "کاربران بدون وزارتخانه"
                      : "کاربران مستقیم خود وزارتخانه (مدیر، ناظر و …)",
                  })
                }
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>

            {ministryExpanded && !isUnassigned ? (
              <div className="border-t bg-muted/30">
                {group.roots.map((node) => (
                  <OrgBranch
                    key={node.id}
                    node={node}
                    ministryId={group.id}
                    depth={0}
                    expandedIds={expandedOrgIds}
                    onToggle={toggleOrg}
                    onOpenUsers={setUsersModal}
                  />
                ))}

                {group.roots.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    زیرمجموعه‌ای برای این وزارتخانه ثبت نشده است.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      <Dialog
        open={Boolean(usersModal)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setUsersModal(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b px-5 py-4 text-right">
            <DialogTitle>{usersModal?.title ?? "کاربران"}</DialogTitle>
            {usersModal?.subtitle ? (
              <p className="text-sm text-muted-foreground">{usersModal.subtitle}</p>
            ) : null}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {modalUsers.length > 0 ? (
              modalUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={
                    onEdit
                      ? (item) => {
                          setUsersModal(null);
                          onEdit(item);
                        }
                      : undefined
                  }
                  onDelete={onDelete}
                />
              ))
            ) : (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                کاربری مستقیم در این سطح ثبت نشده است.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
