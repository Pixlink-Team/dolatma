import type { AppErrorCode, AppErrorGuide, ResolvedAppError } from "@/lib/app-errors/types";

type CatalogEntry = AppErrorGuide & {
  /** Exact message match (trimmed). */
  exact?: string[];
  /** Case-sensitive substring / regex match against the message. */
  match?: RegExp[];
};

const STALE_PAGE_MESSAGE_PATTERNS: RegExp[] = [
  /unexpected response was received from the server/i,
  /Server Action/i,
  /failed-to-find-server-action/i,
  /was not found on the server/i,
  /Failed to find Server Action/i,
  /Minified React error #418/i,
  /Hydration failed/i,
  /ChunkLoadError/i,
  /Loading chunk .+ failed/i,
  /Failed to fetch dynamically imported module/i,
];

const GENERIC: AppErrorGuide = {
  code: "generic",
  title: "مشکلی پیش آمد",
  why: "عملیات انجام نشد یا پاسخ سرور نامشخص بود.",
  whatToDo:
    "یک‌بار دیگر تلاش کنید. اگر دوباره خطا دیدید، صفحه را تازه کنید یا از دکمه «گزارش مشکل» جزئیات را برای پشتیبانی بفرستید.",
  severity: "error",
  showModal: true,
};

const CATALOG: CatalogEntry[] = [
  {
    code: "unauthorized",
    exact: ["Unauthorized", "ورود لازم است", "برای ارسال گزارش باید وارد شوید"],
    match: [/Unauthorized/i, /وارد شوید/, /نشست.*منقضی/, /session/i],
    title: "نشست شما معتبر نیست",
    why: "وارد سیستم نیستید یا نشست شما تمام شده است.",
    whatToDo: "از صفحه ورود دوباره وارد شوید و عملیات را تکرار کنید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "database",
    exact: [
      "Database required",
      "دیتابیس فعال نیست",
      "پایگاه‌داده پیکربندی نشده است.",
      "ارسال گزارش فقط با دیتابیس فعال است",
    ],
    match: [/Database required/i, /دیتابیس/, /پایگاه.?داده/],
    title: "ارتباط با پایگاه‌داده برقرار نیست",
    why: "سامانه فعلاً به پایگاه‌داده وصل نیست یا پیکربندی نشده است.",
    whatToDo: "چند دقیقه صبر کنید و دوباره تلاش کنید. اگر ادامه داشت به مدیر سیستم اطلاع دهید.",
    severity: "error",
    showModal: true,
  },
  {
    code: "rate_limit",
    match: [
      /تلاش.?های ورود بیش از حد/,
      /ثانیه دیگر دوباره/,
      /ورود موقتاً قفل/,
      /تلاش بیش از حد/,
      /تلاش‌های ناموفق زیاد/,
    ],
    title: "ورود موقتاً قفل شده است",
    why: "به‌خاطر چند بار وارد کردن رمز اشتباه، برای امنیت حساب ورود موقتاً محدود شده است.",
    whatToDo: "تا پایان زمان اعلام‌شده صبر کنید؛ در این مدت حتی رمز درست هم کار نمی‌کند. بعد دوباره وارد شوید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "login_failed",
    exact: ["ایمیل یا رمز عبور اشتباه است"],
    match: [/ایمیل یا رمز/, /رمز عبور اشتباه/],
    title: "ورود ناموفق بود",
    why: "نام کاربری یا رمز عبور با اطلاعات ثبت‌شده هم‌خوانی ندارد.",
    whatToDo: "اطلاعات را با دقت وارد کنید. اگر رمز را فراموش کرده‌اید با مدیر سیستم هماهنگ کنید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "permission",
    exact: [
      "دسترسی مجاز نیست",
      "دسترسی به این بخش را ندارید",
      "دسترسی به این دستگاه ندارید",
      "فقط مدیر می‌تواند گزارش را رسیدگی کند",
      "فقط مدیر می‌تواند پاسخ دهد",
      "فقط ادمین می‌تواند گزارش را رسیدگی کند",
      "فقط ادمین می‌تواند پاسخ دهد",
      "فقط مسئول همین دستگاه می‌تواند شناسنامه را تکمیل کند",
      "برای کاربران انتخاب‌شده امکان تنظیم دسترسی پنل وجود ندارد",
      "فقط مدیر می‌تواند مالک محتوا را تغییر دهد",
    ],
    match: [/دسترسی ندارید/, /دسترسی مجاز نیست/, /مجاز نیست/],
    title: "دسترسی کافی ندارید",
    why: "نقش یا مجوز شما برای این کار تنظیم نشده است.",
    whatToDo:
      "اگر باید این کار را انجام دهید، از مدیر بخواهید دسترسی لازم را در بخش کاربران / دستگاه‌ها فعال کند.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "campaign_missing",
    exact: [
      "راستا انتخاب نشده است",
      "راستایی برای اختصاص دسترسی تعریف نشده است",
      "راستا فعال مشخص نیست",
    ],
    title: "راستا (کمپین) انتخاب نشده است",
    why: "بیشتر عملیات پنل به یک راستا وابسته است و الان راستایی در بالای صفحه انتخاب نشده.",
    whatToDo: "از انتخاب‌گر راستا در نوار کناری یا بالای پنل یک راستا انتخاب کنید و دوباره تلاش کنید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "validation_required",
    exact: [
      "نام زیرمجموعه الزامی است",
      "نام وزارتخانه الزامی است",
      "وزارتخانه الزامی است",
      "رمز عبور الزامی است",
      "تصویر پوستر لازم است",
      "ویدیو لازم است",
      "نوع ویدیو را انتخاب کنید",
      "عنوان فایل الزامی است",
      "عنوان فرم الزامی است",
      "عنوان ظرفیت الزامی است",
      "عنوان الزامی است",
      "متن دستورکار الزامی است",
      "تاریخ شروع و پایان الزامی است",
      "عنوان و متن الزامی است",
      "نام موضوع را وارد کنید",
      "برای ساخت موضوع محتوا، نام موضوع را وارد کنید",
      "ابتدا لینک مطلب را وارد کنید",
      "ابتدا لینک را وارد کنید",
      "متن پاسخ را بنویسید",
      "حداقل یک فیلد برای تغییر انتخاب کنید",
      "هیچ موردی انتخاب نشده است",
      "هیچ تغییری برای اعمال انتخاب نشده است",
      "هیچ کاربری انتخاب نشده است",
      "سازمان را انتخاب کنید.",
      "عنوان، خلاصه و متن کامل الزامی است.",
      "نسخه جدید را تکمیل کنید",
      "نوع مأموریت را انتخاب کنید",
    ],
    match: [
      /الزامی است/,
      /لازم است/,
      /را انتخاب کنید/,
      /را وارد کنید/,
      /فیلد «.+» الزامی/,
      /حداقل/,
    ],
    title: "اطلاعات لازم کامل نیست",
    why: "یکی از فیلدهای ضروری خالی مانده یا مقدار معتبری ندارد.",
    whatToDo: "پیام خطا را بخوانید، همان فیلد را پر کنید و دوباره ذخیره کنید.",
    severity: "info",
    // Toast at top is enough; avoid a redundant modal for missing fields.
    showModal: false,
  },
  {
    code: "validation_choice",
    exact: [
      "ابتدا وزارتخانه را انتخاب کنید",
      "برای کاربر دستگاه انتخاب وزارتخانه الزامی است",
      "یکی از زیرمجموعه‌ها را انتخاب کنید",
      "اتصال به خود سازمان ممکن نیست",
      "ابتدا کاربر مالک محتوا را انتخاب کنید",
      "سازمان را انتخاب کنید.",
    ],
    match: [/انتخاب کنید/, /ممکن نیست/],
    title: "انتخاب لازم است",
    why: "قبل از ادامه باید یک گزینه مشخص (مثل وزارتخانه یا زیرمجموعه) انتخاب شود.",
    whatToDo: "از فهرست مربوطه مورد درست را انتخاب کنید و دوباره تلاش کنید.",
    severity: "info",
    // Same as validation_required: toast only, no modal.
    showModal: false,
  },
  {
    code: "duplicate",
    exact: [
      "این نام وزارتخانه قبلاً ثبت شده است",
      "این زیرمجموعه قبلاً برای این وزارتخانه ثبت شده است",
      "این نام دستگاه قبلاً ثبت شده است",
    ],
    match: [/قبلاً ثبت/, /تکراری/, /duplicate/i],
    title: "این مورد قبلاً ثبت شده است",
    why: "نام یا شناسه تکراری است و سامانه اجازه ثبت دوباره نمی‌دهد.",
    whatToDo: "نام دیگری انتخاب کنید یا همان مورد موجود را از فهرست پیدا و ویرایش کنید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "linked_users",
    exact: [
      "ابتدا کاربران متصل به این دستگاه را حذف یا جابه‌جا کنید",
      "ابتدا کاربران متصل به این وزارتخانه را حذف یا جابه‌جا کنید",
      "ابتدا کاربران متصل به این زیرمجموعه را حذف یا جابه‌جا کنید",
    ],
    match: [/کاربران متصل/],
    title: "کاربرانی به این مورد وصل هستند",
    why: "تا وقتی کاربری به این دستگاه/زیرمجموعه متصل باشد، حذف آن مجاز نیست.",
    whatToDo:
      "به بخش «کاربران» بروید، کاربران مرتبط را به دستگاه دیگری منتقل کنید یا حذف کنید، بعد دوباره حذف را بزنید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "has_children",
    exact: ["ابتدا زیرمجموعه‌های این دستگاه را حذف یا جابه‌جا کنید"],
    match: [/زیرمجموعه‌های این دستگاه/],
    title: "این دستگاه زیرمجموعه دارد",
    why: "حذف دستگاه والد وقتی هنوز فرزند دارد ممکن نیست.",
    whatToDo: "ابتدا همه زیرمجموعه‌ها را حذف یا جابه‌جا کنید، سپس دستگاه اصلی را حذف کنید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "cannot_delete_home",
    exact: ["نمی‌توانید دستگاه اصلی خودتان را حذف کنید"],
    match: [/دستگاه اصلی خودتان/],
    title: "حذف دستگاه اصلی ممکن نیست",
    why: "دستگاهی که حساب شما به آن وصل است، ریشه دسترسی شماست و نباید حذف شود.",
    whatToDo: "فقط زیرمجموعه‌ها را حذف کنید. برای حذف دستگاه اصلی با مدیر سیستم هماهنگ کنید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "device_cycle",
    exact: ["این والد باعث حلقه در درخت دستگاه‌ها می‌شود", "دستگاه نمی‌تواند زیرمجموعه خودش باشد"],
    match: [/حلقه در درخت/, /زیرمجموعه خودش/],
    title: "ساختار درختی نامعتبر است",
    why: "انتخاب این والد باعث می‌شود دستگاه زیرمجموعهٔ خودش شود (حلقه).",
    whatToDo: "والد دیگری انتخاب کنید که زیرمجموعهٔ همین دستگاه نباشد.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "device_delete_blocked",
    exact: [
      "حذف ممکن نیست؛ ابتدا وابستگی‌های این دستگاه را برطرف کنید",
      "حذف دستگاه ناموفق بود",
    ],
    match: [/حذف.*دستگاه/, /وابستگی‌های این دستگاه/],
    title: "حذف دستگاه انجام نشد",
    why: "هنوز داده‌ها یا وابستگی‌هایی به این دستگاه وصل است یا خطای سرور رخ داده.",
    whatToDo:
      "کاربران و زیرمجموعه‌های متصل را بررسی کنید. اگر پیام دقیق‌تری دیدید همان را انجام دهید؛ در غیر این صورت گزارش مشکل بفرستید.",
    severity: "error",
    showModal: true,
  },
  {
    code: "upload_required",
    exact: [
      "آپلود نامه رسمی (PDF یا تصویر) الزامی است",
      "آپلود نامه رسمی الزامی است",
      "ابتدا فایل را آپلود کنید",
      "ویدیو لازم است",
      "تصویر پوستر لازم است",
    ],
    match: [/آپلود.*الزامی/, /ابتدا فایل را آپلود/, /فایل اقدام/],
    title: "فایل لازم آپلود نشده است",
    why: "برای این عملیات باید فایل (تصویر، ویدیو، PDF و …) پیوست شود.",
    whatToDo: "فایل را آپلود کنید و بعد ذخیره/ارسال را بزنید.",
    severity: "info",
    showModal: true,
  },
  {
    code: "upload_type",
    exact: [
      "فقط PDF یا تصویر مجاز است",
      "آپلود فایل SVG مجاز نیست",
      "محتوای فایل با نوع تصویر هم‌خوانی ندارد",
      "محتوای فایل با نوع ویدیو هم‌خوانی ندارد",
      "محتوای فایل با نوع صدا هم‌خوانی ندارد",
      "محتوای فایل با نوع سند هم‌خوانی ندارد",
      "نوع فایل برای راش تصاویر مجاز نیست",
      "محتوای فایل با راش تصاویر هم‌خوانی ندارد",
      "نوع فایل برای راش ویدیو مجاز نیست",
      "محتوای فایل با راش ویدیو هم‌خوانی ندارد",
    ],
    match: [/مجاز نیست/, /هم‌خوانی ندارد/, /فقط PDF/, /نوع فایل/],
    title: "نوع فایل پذیرفته نشد",
    why: "فرمت فایل با آنچه این بخش قبول می‌کند یکی نیست یا محتوای فایل مشکوک است.",
    whatToDo: "فایل را با فرمت مجاز (مثلاً JPG، PNG، MP4، PDF) دوباره انتخاب و آپلود کنید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "upload_size",
    match: [/حجم ویدیو/, /بیشتر از حد مجاز/, /حداکثر .+ فایل مجاز/],
    title: "حجم یا تعداد فایل بیش از حد است",
    why: "فایل خیلی بزرگ است یا تعداد فایل‌های انتخاب‌شده از سقف مجاز بیشتر شده.",
    whatToDo: "فایل را فشرده کنید یا تعداد کمتری انتخاب کنید و دوباره آپلود کنید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "upload_failed",
    exact: ["خطا در آپلود فایل", "خطا در آپلود ZIP"],
    match: [/خطا در آپلود/],
    title: "آپلود ناموفق بود",
    why: "ارسال فایل به سرور قطع شد یا سرور فایل را نپذیرفت.",
    whatToDo: "اتصال اینترنت را بررسی کنید و دوباره آپلود کنید. اگر تکرار شد گزارش مشکل بفرستید.",
    severity: "error",
    showModal: true,
  },
  {
    code: "save_failed",
    exact: [
      "ذخیره نشد",
      "ذخیره فایل ناموفق بود",
      "ذخیره رمز نشد",
      "خطا در ذخیره",
      "ثبت تأیید ناموفق بود",
      "ثبت گزارش با خطا مواجه شد",
    ],
    match: [/ذخیره نشد/, /ذخیره .*ناموفق/, /خطا در ذخیره/, /ثبت .*ناموفق/],
    title: "ذخیره انجام نشد",
    why: "سرور نتوانست تغییرات را ثبت کند؛ ممکن است اعتبارسنجی رد شده یا ارتباط قطع شده باشد.",
    whatToDo:
      "پیام جزئی‌تر زیر این عنوان را بخوانید. فیلدها را اصلاح کنید و دوباره ذخیره کنید. اگر پیام کلی است، صفحه را تازه کرده و تکرار کنید.",
    severity: "error",
    showModal: true,
  },
  {
    code: "delete_failed",
    exact: ["حذف نشد", "خطا در حذف", "حذف پشتیبان ناموفق بود"],
    match: [/حذف نشد/, /خطا در حذف/, /حذف .*ناموفق/],
    title: "حذف انجام نشد",
    why: "مورد هنوز وابستگی دارد یا سرور اجازه حذف نداده است.",
    whatToDo: "اگر پیام دقیق‌تری آمده همان را انجام دهید؛ وگرنه چند دقیقه بعد دوباره تلاش کنید.",
    severity: "error",
    showModal: true,
  },
  {
    code: "not_found",
    exact: [
      "دستگاه یافت نشد",
      "فرم یافت نشد",
      "پاسخ یافت نشد",
      "خبر یافت نشد.",
      "پرونده یافت نشد.",
      "سازمان یافت نشد.",
      "گزارش یافت نشد یا به‌روزرسانی نشد",
      "کاربر مقصد یافت نشد",
      "ویدیو در آپارات پیدا نشد.",
    ],
    match: [/یافت نشد/, /پیدا نشد/],
    title: "مورد پیدا نشد",
    why: "این رکورد حذف شده، جابه‌جا شده، یا به آن دسترسی ندارید.",
    whatToDo: "به فهرست برگردید و صفحه را تازه کنید. اگر باید ببینیدش، از مدیر دسترسی بخواهید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "tutorial_blocked",
    exact: [
      "آموزش این بخش هنوز توسط مدیر آماده نشده است",
      "بررسی آموزش ناموفق بود",
      "ثبت تکمیل آموزش ناموفق بود",
    ],
    match: [/آموزش این بخش/, /آموزش ناموفق/],
    title: "آموزش بخش تکمیل نشده است",
    why: "برای افزودن در این بخش باید آموزش را ببینید یا مدیر هنوز آموزش را فعال نکرده است.",
    whatToDo:
      "اگر پنجره آموزش باز شد، مراحل را تا آخر بروید. اگر آموزش آماده نیست، صبر کنید تا مدیر آن را فعال کند.",
    severity: "info",
    showModal: true,
  },
  {
    code: "network",
    match: [/Failed to fetch/i, /NetworkError/i, /Load failed/i, /شبکه/, /ارتباط/],
    title: "ارتباط قطع شد",
    why: "درخواست به سرور نرسید یا پاسخ برنگشت (اینترنت یا سرور).",
    whatToDo: "اتصال اینترنت را چک کنید و دوباره تلاش کنید. اگر همه کاربران مشکل دارند، به مدیر اطلاع دهید.",
    severity: "error",
    showModal: true,
  },
  {
    code: "stale_page",
    match: STALE_PAGE_MESSAGE_PATTERNS,
    title: "نسخهٔ صفحه قدیمی است",
    why: "صفحهٔ بازشده در مرورگر با نسخهٔ فعلی سرور هم‌خوان نیست (معمولاً بعد از به‌روزرسانی یا قطع کوتاه ارتباط).",
    whatToDo: "روی «تازه‌سازی سایت» بزنید تا نسخهٔ جدید بارگذاری شود، سپس دوباره همان کار را انجام دهید.",
    severity: "warning",
    showModal: true,
  },
  {
    code: "client_crash",
    exact: [
      "Application error: a client-side exception has occurred",
      "خطای غیرمنتظره در صفحه",
    ],
    match: [/client-side exception/i, /Maximum call stack/i],
    title: "صفحه با خطای غیرمنتظره متوقف شد",
    why: "یک خطای فنی در مرورگر رخ داده (مثلاً داده ناسازگار یا باگ موقت).",
    whatToDo:
      "صفحه را تازه کنید. اگر دوباره تکرار شد، مسیر صفحه و کاری که می‌کردید را با «گزارش مشکل» بفرستید.",
    severity: "error",
    showModal: true,
  },
];

const BY_CODE = new Map<AppErrorCode, AppErrorGuide>(
  CATALOG.map((entry) => [
    entry.code,
    {
      code: entry.code,
      title: entry.title,
      why: entry.why,
      whatToDo: entry.whatToDo,
      severity: entry.severity,
      showModal: entry.showModal,
    },
  ])
);

function normalizeMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim();
}

/** Browser/extension noise that should not trigger user-facing error UI. */
const IGNORE_CLIENT_ERROR_PATTERNS: RegExp[] = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /Non-Error promise rejection captured/i,
  /AbortError/i,
  /The user aborted a request/i,
  /The operation was aborted/i,
  /cancelled/i,
];

export function shouldIgnoreClientError(message: unknown): boolean {
  const text =
    typeof message === "string"
      ? normalizeMessage(message)
      : message instanceof Error
        ? normalizeMessage(message.message)
        : "";
  if (!text) return true;
  return IGNORE_CLIENT_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Resolve a raw error / toast message into a user-facing guide.
 * Prefer exact matches, then first pattern match; otherwise generic.
 */
export function resolveAppError(
  message: unknown,
  options?: { code?: AppErrorCode }
): ResolvedAppError {
  const text =
    typeof message === "string"
      ? normalizeMessage(message)
      : message && typeof message === "object" && "message" in message
        ? normalizeMessage(String((message as { message?: unknown }).message ?? ""))
        : "";

  if (options?.code && BY_CODE.has(options.code)) {
    const guide = BY_CODE.get(options.code)!;
    return { ...guide, message: text || guide.title };
  }

  if (text) {
    for (const entry of CATALOG) {
      if (entry.exact?.some((item) => normalizeMessage(item) === text)) {
        return {
          code: entry.code,
          title: entry.title,
          why: entry.why,
          whatToDo: entry.whatToDo,
          severity: entry.severity,
          showModal: entry.showModal,
          message: text,
        };
      }
    }
    for (const entry of CATALOG) {
      if (entry.match?.some((pattern) => pattern.test(text))) {
        return {
          code: entry.code,
          title: entry.title,
          why: entry.why,
          whatToDo: entry.whatToDo,
          severity: entry.severity,
          showModal: entry.showModal,
          message: text,
        };
      }
    }
  }

  return {
    ...GENERIC,
    message: text || GENERIC.title,
  };
}

export function getAppErrorGuide(code: AppErrorCode): AppErrorGuide {
  return BY_CODE.get(code) ?? GENERIC;
}

/** Deploy/cache mismatch or broken Server Action bundle — user should reload. */
export function isStalePageError(
  error: Pick<ResolvedAppError, "code" | "message">
): boolean {
  if (error.code === "stale_page") return true;
  const text = normalizeMessage(error.message);
  if (!text) return false;
  return STALE_PAGE_MESSAGE_PATTERNS.some((pattern) => pattern.test(text));
}

export function refreshSite(): void {
  if (typeof window === "undefined") return;
  window.location.reload();
}

export { GENERIC as GENERIC_APP_ERROR };
