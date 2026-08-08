export const TAGHVIM_BASE = "/admin/taghvim";

/** Prefix an in-app calendar path with TAGHVIM_BASE. Keeps query strings. */
export function taghvimPath(input = "/"): string {
  const raw = input.startsWith("/") ? input : `/${input}`;
  const [pathname, query = ""] = raw.split("?");

  let mapped = pathname;
  if (pathname === "/" || pathname === "") {
    mapped = "";
  } else if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    mapped = "/login";
  } else if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    mapped =
      pathname === "/admin"
        ? "/manage"
        : `/manage${pathname.slice("/admin".length)}`;
  }

  const base = `${TAGHVIM_BASE}${mapped}`;
  return query ? `${base}?${query}` : base;
}

/** Strip TAGHVIM_BASE for matching legacy calendar pathnames. */
export function stripTaghvimBase(pathname: string): string {
  if (pathname === TAGHVIM_BASE) return "/";
  if (pathname.startsWith(`${TAGHVIM_BASE}/`)) {
    const rest = pathname.slice(TAGHVIM_BASE.length);
    if (rest === "/manage" || rest.startsWith("/manage/")) {
      return rest === "/manage"
        ? "/admin"
        : `/admin${rest.slice("/manage".length)}`;
    }
    return rest || "/";
  }
  return pathname;
}

export function isTaghvimPublicPath(pathname: string): boolean {
  const p = stripTaghvimBase(pathname);
  return (
    p === "/login" ||
    p === "/admin/login" ||
    p.startsWith("/login/") ||
    p.startsWith("/admin/login/")
  );
}
