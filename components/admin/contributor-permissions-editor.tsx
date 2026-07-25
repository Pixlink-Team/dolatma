"use client";

import {
  contributorPermissionLabels,
  panelManagementKeys,
  panelManagementPermissionLabels,
  subtreeManagementKeys,
  type ContributorPermissionKey,
  type ContributorPermissions,
} from "@/lib/contributor-permissions";
import { subtreeManagementPermissionLabels } from "@/lib/org-role-presets";
import { Switch } from "@/components/ui/switch";

const contentKeys = Object.keys(contributorPermissionLabels) as ContributorPermissionKey[];

interface ContributorPermissionsEditorProps {
  permissions: ContributorPermissions;
  onChange: (next: ContributorPermissions) => void;
  /** When set, keys not grantable are hidden (or shown disabled if showDisabled). */
  ceiling?: ContributorPermissions | null;
  showPanelManagement?: boolean;
  showSubtreeManagement?: boolean;
  disabled?: boolean;
}

function isAllowed(
  key: ContributorPermissionKey,
  ceiling: ContributorPermissions | null | undefined
): boolean {
  if (!ceiling) return true;
  return Boolean(ceiling[key]);
}

export function ContributorPermissionsEditor({
  permissions,
  onChange,
  ceiling = null,
  showPanelManagement = true,
  showSubtreeManagement = true,
  disabled = false,
}: ContributorPermissionsEditorProps) {
  const toggle = (key: ContributorPermissionKey, value: boolean) => {
    if (ceiling && value && !ceiling[key]) return;
    onChange({ ...permissions, [key]: value });
  };

  const visibleContent = contentKeys.filter((key) => isAllowed(key, ceiling));
  const visiblePanel = showPanelManagement
    ? panelManagementKeys.filter((key) => isAllowed(key, ceiling))
    : [];
  const visibleSubtree = showSubtreeManagement
    ? subtreeManagementKeys.filter((key) => isAllowed(key, ceiling))
    : [];

  if (
    visibleContent.length === 0 &&
    visiblePanel.length === 0 &&
    visibleSubtree.length === 0
  ) {
    return (
      <p className="text-sm text-destructive">
        هیچ دسترسی مجازی برای این سطح تعریف نشده است.
      </p>
    );
  }

  return (
    <div className="rounded-lg border p-3 space-y-3">
      {visibleContent.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">بخش‌های محتوا</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleContent.map((key) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 text-sm rounded-md border px-3 py-2"
              >
                <span>{contributorPermissionLabels[key]}</span>
                <Switch
                  checked={Boolean(permissions[key])}
                  disabled={disabled}
                  onCheckedChange={(value) => toggle(key, value)}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {visiblePanel.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            بخش‌های تنظیمات و مدیریت
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visiblePanel.map((key) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 text-sm rounded-md border px-3 py-2"
              >
                <span>{panelManagementPermissionLabels[key]}</span>
                <Switch
                  checked={Boolean(permissions[key])}
                  disabled={disabled}
                  onCheckedChange={(value) => toggle(key, value)}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {visibleSubtree.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            قابلیت‌های مدیریتی زیرشاخه
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleSubtree.map((key) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 text-sm rounded-md border px-3 py-2"
              >
                <span>{subtreeManagementPermissionLabels[key]}</span>
                <Switch
                  checked={Boolean(permissions[key])}
                  disabled={disabled}
                  onCheckedChange={(value) => toggle(key, value)}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
