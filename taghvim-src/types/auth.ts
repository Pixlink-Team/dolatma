export type UserRole = "super_admin" | "editor";

export type Permission =
  | "view_admin_views"
  | "manage_content"
  | "publish"
  | "manage_subusers"
  | "manage_users"
  | "manage_settings"
  | "manage_agencies"
  | "manage_form_schema"
  | "view_archive"
  | "force_delete"
  | "run_backup";

export type AdminUser = {
  id: string;
  name: string;
  username: string;
  /** Iranian mobile in 09xxxxxxxxx form — reserved for future SMS 2FA */
  mobile?: string | null;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  parent_id?: string | number | null;
  permissions: Permission[];
  /** Assigned government agencies/ministries this user can fill data for */
  agencyIds: string[];
  /** Only used when creating/updating locally; never returned from API */
  password?: string;
};

export type AuthSession = {
  token: string;
  user: AdminUser;
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_admin_views: "مشاهده ویوهای اصلی",
  manage_content: "مدیریت محتوا",
  publish: "انتشار",
  manage_subusers: "مدیریت زیردستان",
  manage_users: "مدیریت همه کاربران",
  manage_settings: "تنظیمات",
  manage_agencies: "وزارتخانه‌ها",
  manage_form_schema: "فرم‌ساز",
  view_archive: "مشاهده آرشیو",
  force_delete: "حذف دائم",
  run_backup: "بکاپ",
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "مدیر",
  editor: "ویرایشگر",
};

export function userHasPermission(
  user: AdminUser | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return user.permissions?.includes(permission) ?? false;
}

export function canViewAdminViews(user: AdminUser | null | undefined): boolean {
  return userHasPermission(user, "view_admin_views") || user?.role === "super_admin";
}

/** Legacy role map — prefer permission checks */
export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    manageUsers: boolean;
    manageSettings: boolean;
    manageAgencies: boolean;
    manageContent: boolean;
    publish: boolean;
    viewDashboard: boolean;
  }
> = {
  super_admin: {
    manageUsers: true,
    manageSettings: true,
    manageAgencies: true,
    manageContent: true,
    publish: true,
    viewDashboard: true,
  },
  editor: {
    manageUsers: false,
    manageSettings: false,
    manageAgencies: false,
    manageContent: true,
    publish: true,
    viewDashboard: true,
  },
};
