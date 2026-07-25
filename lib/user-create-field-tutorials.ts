export const USER_CREATE_FIELD_KEYS = [
  "name",
  "email",
  "ownUnit",
  "ministry",
  "organization",
  "password",
  "orgRole",
] as const;

export type UserCreateFieldKey = (typeof USER_CREATE_FIELD_KEYS)[number];

export interface UserCreateFieldTutorial {
  title: string;
  body: string;
}

export const userCreateFieldTutorials: Record<
  UserCreateFieldKey,
  UserCreateFieldTutorial
> = {
  name: {
    title: "نام سازمان یعنی چه؟",
    body: "این نام نمایشی کاربر در پنل است — معمولاً نام واحد یا سازمانی که این کاربر نماینده‌اش است. در فهرست کاربران و گزارش‌ها همین عنوان دیده می‌شود.",
  },
  email: {
    title: "نام کاربری",
    body: "شناسه ورود به پنل است و باید با حروف لاتین نوشته شود (مثلاً BAZARBAYJAN). ایمیل کامل لازم نیست؛ همین نام کاربری برای ورود کافی است.",
  },
  ownUnit: {
    title: "برای خود سازمان / وزارتخانه",
    body: "اگر این گزینه روشن باشد، کاربر جدید به خود واحد شما وصل می‌شود. برای اتصال به یک زیرمجموعه، این تیک را خاموش بگذارید و از لیست زیرمجموعه انتخاب کنید.",
  },
  ministry: {
    title: "وزارتخانه",
    body: "وزارتخانه یا دستگاه والد را انتخاب کنید. بعد می‌توانید خود وزارتخانه یا یکی از زیرمجموعه‌هایش را برای کاربر مشخص کنید.",
  },
  organization: {
    title: "زیرمجموعه",
    body: "زیرمجموعه‌ای را انتخاب کنید که کاربر به آن وصل شود. اگر هنوز وجود ندارد، گزینه «ایجاد زیرمجموعه جدید…» را بزنید و نامش را وارد کنید.",
  },
  password: {
    title: "رمز عبور",
    body: "رمز ورود اولیه کاربر است. بعداً خودش می‌تواند از پروفایل عوض کند؛ برای ساخت کاربر جدید پر کردن این فیلد الزامی است.",
  },
  orgRole: {
    title: "سمت",
    body: "نقش سازمانی کاربر را مشخص می‌کند: مدیر، ناظر، معاون یا روابط عمومی. این سمت روی دسترسی‌های پیش‌فرض پنل اثر می‌گذارد.",
  },
};

export function isUserCreateFieldKey(value: unknown): value is UserCreateFieldKey {
  return (
    typeof value === "string" &&
    (USER_CREATE_FIELD_KEYS as readonly string[]).includes(value)
  );
}
