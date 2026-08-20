/** Shared admin list query helpers for large datasets. */

export type AdminListSortOrder = "asc" | "desc";

export interface AdminListQuery {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: AdminListSortOrder;
  q: string;
  owner?: string | null;
  plan?: string | null;
  status?: string | null;
  type?: string | null;
}

export interface AdminListResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 40;
const MAX_PAGE_SIZE = 200;

export function parseAdminListQuery(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
  defaults?: Partial<AdminListQuery>
): AdminListQuery {
  const get = (key: string): string | undefined => {
    if (input instanceof URLSearchParams) {
      return input.get(key) ?? undefined;
    }
    const value = input[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const pageRaw = Number(get("page") ?? defaults?.page ?? 1);
  const pageSizeRaw = Number(get("pageSize") ?? defaults?.pageSize ?? DEFAULT_PAGE_SIZE);
  const sortOrderRaw = (get("sortOrder") ?? defaults?.sortOrder ?? "desc").toLowerCase();

  return {
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1,
    pageSize: Math.min(
      MAX_PAGE_SIZE,
      Math.max(10, Number.isFinite(pageSizeRaw) ? Math.trunc(pageSizeRaw) : DEFAULT_PAGE_SIZE)
    ),
    sortBy: get("sortBy") ?? defaults?.sortBy ?? "updatedAt",
    sortOrder: sortOrderRaw === "asc" ? "asc" : "desc",
    q: (get("q") ?? defaults?.q ?? "").trim(),
    owner: get("owner") ?? defaults?.owner ?? null,
    plan: get("plan") ?? defaults?.plan ?? null,
    status: get("status") ?? defaults?.status ?? null,
    type: get("type") ?? defaults?.type ?? null,
  };
}

export function paginateItems<T>(
  items: T[],
  query: Pick<AdminListQuery, "page" | "pageSize">
): AdminListResult<T> {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / query.pageSize));
  const page = Math.min(Math.max(1, query.page), totalPages);
  const start = (page - 1) * query.pageSize;
  return {
    items: items.slice(start, start + query.pageSize),
    totalCount,
    page,
    pageSize: query.pageSize,
    totalPages,
  };
}

export function sortByDateField<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  sortOrder: AdminListSortOrder = "desc"
): T[] {
  const factor = sortOrder === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const aTime = new Date(getDate(a) || 0).getTime();
    const bTime = new Date(getDate(b) || 0).getTime();
    return (aTime - bTime) * factor;
  });
}
