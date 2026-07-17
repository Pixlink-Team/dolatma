"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  parseEditSuggestionMissingFields,
  type EditSuggestionMissingField,
} from "@/lib/edit-suggestions";

interface UseAdminEditDeepLinkOptions<T> {
  items: T[];
  getId: (item: T) => string;
  basePath: string;
  onOpen: (item: T, highlightFields: EditSuggestionMissingField[]) => void;
}

export function useAdminEditDeepLink<T>({
  items,
  getId,
  basePath,
  onOpen,
}: UseAdminEditDeepLinkOptions<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openedFromQueryRef = useRef<string | null>(null);
  const onOpenRef = useRef(onOpen);
  const getIdRef = useRef(getId);
  const [highlightFields, setHighlightFields] = useState<EditSuggestionMissingField[]>([]);

  useEffect(() => {
    onOpenRef.current = onOpen;
    getIdRef.current = getId;
  }, [onOpen, getId]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || openedFromQueryRef.current === editId) return;
    const item = items.find((row) => getIdRef.current(row) === editId);
    if (!item) return;

    openedFromQueryRef.current = editId;
    const fields = parseEditSuggestionMissingFields(searchParams.get("missing"));
    setHighlightFields(fields);
    onOpenRef.current(item, fields);
  }, [items, searchParams]);

  const clearEditQuery = () => {
    if (!searchParams.get("edit") && !searchParams.get("missing")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    params.delete("missing");
    const query = params.toString();
    router.replace(query ? `${basePath}?${query}` : basePath);
  };

  const resetDeepLink = () => {
    setHighlightFields([]);
    openedFromQueryRef.current = null;
    clearEditQuery();
  };

  return {
    highlightFields,
    setHighlightFields,
    resetDeepLink,
  };
}
