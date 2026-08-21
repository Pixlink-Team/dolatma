"use client";

import { useCallback, useState } from "react";
import {
  fieldHasSubmitError,
  reportInvalidFormFields,
} from "@/lib/form-field-focus";

/**
 * Tracks which required fields failed on the latest save attempt so the UI can
 * show red borders and scroll to the first empty field (instead of toast warnings).
 */
export function useInvalidFormFields() {
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  const reportInvalid = useCallback(
    (fieldKeys: string[], root?: ParentNode | Document | null) => {
      reportInvalidFormFields(fieldKeys, setInvalidFields, root);
    },
    []
  );

  const clearInvalid = useCallback(() => {
    setInvalidFields([]);
  }, []);

  const isFieldInvalid = useCallback(
    (fieldKey: string, isEmpty: boolean) =>
      fieldHasSubmitError(fieldKey, invalidFields, isEmpty),
    [invalidFields]
  );

  return {
    invalidFields,
    reportInvalid,
    clearInvalid,
    isFieldInvalid,
    setInvalidFields,
  };
}
