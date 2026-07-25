"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isUserCreateFieldKey,
  type UserCreateFieldKey,
} from "@/lib/user-create-field-tutorials";

const STORAGE_KEY = "user-create-field-tutorials:v1";

function readDismissed(): Set<UserCreateFieldKey> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter(isUserCreateFieldKey));
  } catch {
    return new Set();
  }
}

function writeDismissed(dismissed: Set<UserCreateFieldKey>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Ignore quota / private-mode failures; tips still work for the session.
  }
}

/**
 * Shows one-time field tips while creating a user (not on edit).
 * Completion is remembered in localStorage so tips do not repeat.
 */
export function useUserCreateFieldTutorials(enabled: boolean) {
  const [dismissed, setDismissed] = useState<Set<UserCreateFieldKey>>(
    () => new Set()
  );
  const [activeField, setActiveField] = useState<UserCreateFieldKey | null>(null);
  /** Select dropdown open for this field — tip stays hidden so it is not covered by the portal. */
  const [openSelectField, setOpenSelectField] =
    useState<UserCreateFieldKey | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setActiveField(null);
      setOpenSelectField(null);
    }
  }, [enabled]);

  const onFieldFocus = useCallback(
    (key: UserCreateFieldKey) => {
      if (!enabled || !hydrated) return;
      if (dismissed.has(key)) return;
      setActiveField(key);
    },
    [dismissed, enabled, hydrated]
  );

  const onSelectOpenChange = useCallback(
    (key: UserCreateFieldKey, nextOpen: boolean) => {
      setOpenSelectField(nextOpen ? key : null);
      if (nextOpen) {
        onFieldFocus(key);
      }
    },
    [onFieldFocus]
  );

  const dismiss = useCallback((key: UserCreateFieldKey) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      writeDismissed(next);
      return next;
    });
    setActiveField((current) => (current === key ? null : current));
  }, []);

  const isTipVisible = useCallback(
    (key: UserCreateFieldKey) =>
      enabled &&
      hydrated &&
      activeField === key &&
      !dismissed.has(key) &&
      openSelectField !== key,
    [activeField, dismissed, enabled, hydrated, openSelectField]
  );

  return {
    onFieldFocus,
    onSelectOpenChange,
    dismiss,
    isTipVisible,
  };
}
