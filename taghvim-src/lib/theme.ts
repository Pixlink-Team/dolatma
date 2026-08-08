export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEY = "taghvim-theme";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

/** Prefer dolatma html.dark, then local storage, then light. */
export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    if (document.documentElement.classList.contains("dark")) return "dark";
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(stored)) return stored;
    return "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.querySelector(".taghvim-root");
  if (root instanceof HTMLElement) {
    root.setAttribute("data-theme", theme);
  }
}

export function persistTheme(theme: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}
