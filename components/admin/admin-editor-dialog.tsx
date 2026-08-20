"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Unified width for all admin create/edit form cards. */
export type AdminEditorDialogSize = "2xl";

const SIZE_CLASS: Record<AdminEditorDialogSize, string> = {
  "2xl": "max-w-2xl",
};

export const ADMIN_EDITOR_DIALOG_CLASS =
  "!flex min-h-0 max-h-[92vh] flex-col gap-0 overflow-hidden rounded-xl p-0";

/** Scroll body: inset from the left so the RTL scrollbar does not clip the card curve. */
export const ADMIN_EDITOR_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overscroll-y-contain pl-2";

/** Field stack: space-y-4 between fields; pb-4 so the last field is not flush with the footer. */
export const ADMIN_EDITOR_SCROLL_INNER_CLASS = "space-y-4 px-6 pb-4";

/** Footer padding matches field gap (space-y-4) and header py-4. */
export const ADMIN_EDITOR_FOOTER_CLASS =
  "flex shrink-0 items-center gap-2 border-t bg-card px-6 py-4";

export const ADMIN_EDITOR_HEADER_CLASS =
  "shrink-0 border-b px-6 py-4 pl-12";

const PIN_TOP_CLASS =
  "!top-4 !translate-x-[-50%] !translate-y-0 sm:!top-6";

interface AdminEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: string;
  /** Show description under the title instead of screen-reader only. */
  descriptionVisible?: boolean;
  /** Kept for call-site compatibility; all form cards use max-w-2xl. */
  size?: AdminEditorDialogSize | "lg" | "xl";
  /** Pin dialog near the top of the viewport (useful for tall media forms). */
  pinTop?: boolean;
  children: ReactNode;
  /**
   * Sticky footer actions. When omitted, children are rendered as a full embedded
   * editor that already includes its own scroll area and footer (posters/videos).
   */
  footer?: ReactNode;
  /** Wrap the scroll body + footer in a <form>. */
  formProps?: ComponentPropsWithoutRef<"form">;
  contentClassName?: string;
}

export function AdminEditorDialog({
  open,
  onOpenChange,
  title,
  description,
  descriptionVisible = false,
  size: _size = "2xl",
  pinTop = false,
  children,
  footer,
  formProps,
  contentClassName,
}: AdminEditorDialogProps) {
  void _size;
  const hasExternalFooter = footer !== undefined;

  const body = hasExternalFooter ? (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-4">
      <div className={ADMIN_EDITOR_SCROLL_CLASS}>
        <div className={ADMIN_EDITOR_SCROLL_INNER_CLASS}>{children}</div>
      </div>
      <div className={ADMIN_EDITOR_FOOTER_CLASS}>{footer}</div>
    </div>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-4">{children}</div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          ADMIN_EDITOR_DIALOG_CLASS,
          SIZE_CLASS["2xl"],
          pinTop && PIN_TOP_CLASS,
          contentClassName
        )}
        onPointerDownOutside={(event) => {
          // Nested pickers portal above this form; ignore outside events while they are open.
          if (document.querySelector("[data-nested-dialog-content]")) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (document.querySelector("[data-nested-dialog-content]")) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className={ADMIN_EDITOR_HEADER_CLASS}>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription className={descriptionVisible ? undefined : "sr-only"}>
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {formProps ? (
          <form {...formProps} className={cn("flex min-h-0 flex-1 flex-col", formProps.className)}>
            {body}
          </form>
        ) : (
          body
        )}
      </DialogContent>
    </Dialog>
  );
}

interface AdminEditorDialogActionsProps {
  saveLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
  saveDisabled?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  deleteDisabled?: boolean;
  /** Use type="submit" for the save button (when wrapped in a form). */
  submit?: boolean;
  onSave?: () => void;
  extra?: ReactNode;
}

export function AdminEditorDialogActions({
  saveLabel = "ذخیره",
  pendingLabel = "در حال ذخیره...",
  isPending = false,
  saveDisabled = false,
  onDelete,
  deleteLabel = "حذف",
  deleteDisabled = false,
  submit = false,
  onSave,
  extra,
}: AdminEditorDialogActionsProps) {
  return (
    <>
      {extra}
      <Button
        type={submit ? "submit" : "button"}
        onClick={submit ? undefined : onSave}
        disabled={isPending || saveDisabled}
        className="flex-1"
      >
        {isPending ? pendingLabel : saveLabel}
      </Button>
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isPending || deleteDisabled}
          aria-label={deleteLabel}
          title={deleteLabel}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ) : null}
    </>
  );
}
