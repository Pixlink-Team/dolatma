/**
 * Scroll to a form field marked with `data-field` and focus its first control.
 * Used for save-time validation instead of toast warnings for empty required fields.
 */
export function scrollToFormField(
  fieldKey: string,
  root?: ParentNode | Document | null
): boolean {
  if (typeof document === "undefined") return false;
  const scope = root ?? document;
  const el = scope.querySelector(`[data-field="${CSS.escape(fieldKey)}"]`);
  if (!(el instanceof HTMLElement)) return false;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  const focusTarget = el.matches(
    "input, textarea, select, button, [contenteditable='true']"
  )
    ? el
    : el.querySelector<HTMLElement>(
        "input:not([type='hidden']), textarea, select, button, [tabindex]:not([tabindex='-1'])"
      );

  focusTarget?.focus({ preventScroll: true });
  return true;
}

/** Mark fields invalid and scroll to the first one after paint. */
export function reportInvalidFormFields(
  fieldKeys: string[],
  setInvalidFields: (keys: string[]) => void,
  root?: ParentNode | Document | null
): void {
  const unique = [...new Set(fieldKeys.filter(Boolean))];
  setInvalidFields(unique);
  const first = unique[0];
  if (!first) return;
  requestAnimationFrame(() => {
    scrollToFormField(first, root);
  });
}

/** True when a field was flagged on submit and is still empty. */
export function fieldHasSubmitError(
  fieldKey: string,
  invalidFields: readonly string[],
  isEmpty: boolean
): boolean {
  return isEmpty && invalidFields.includes(fieldKey);
}
