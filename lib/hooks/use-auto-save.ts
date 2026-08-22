"use client";

import { useEffect, useRef, useState, useTransition } from "react";

export type AutoSaveStatus = "idle" | "pending" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  value: T;
  onSave: () => Promise<boolean>;
  enabled?: boolean;
  /** Skip auto-save (e.g. while loading initial data). */
  skip?: boolean;
  delayMs?: number;
}

function serializeValue<T>(value: T): string {
  return JSON.stringify(value);
}

export function useAutoSave<T>({
  value,
  onSave,
  enabled = true,
  skip = false,
  delayMs = 600,
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedSnapshotRef = useRef<string>("");
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const serialized = serializeValue(value);

  const markSaved = (snapshot?: T) => {
    savedSnapshotRef.current = serializeValue(snapshot ?? value);
    setStatus("idle");
  };

  useEffect(() => {
    if (!enabled || skip) return;
    if (serialized === savedSnapshotRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        setStatus("pending");
        const ok = await onSaveRef.current();
        if (!ok) {
          setStatus("error");
          return;
        }
        savedSnapshotRef.current = serialized;
        setStatus("saved");
        window.setTimeout(() => {
          setStatus((current) => (current === "saved" ? "idle" : current));
        }, 2000);
      });
    }, delayMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [serialized, enabled, skip, delayMs]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    status: isPending || status === "pending" ? ("pending" as const) : status,
    markSaved,
  };
}
