import { JANG_IMAGE_PATHS } from "@taghvim/data/jang-images";
import type { TimelineDay, TimelineEvent } from "@taghvim/types/timeline";

/**
 * Seed events for the 2026 Iran war, from 9 Esfand 1404 (2026-02-28) through
 * today (mid-Tir 1405 / July 2026). Based on public reporting (AP, Wikipedia,
 * Britannica, regional outlets). Framed for the defense calendar.
 */

function persianParts(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(
    date,
  );
  const persianDate = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  return { weekday, persianDate };
}

function eventBase(
  partial: Omit<TimelineEvent, "createdAt" | "updatedAt"> & {
    createdAt?: string;
    updatedAt?: string;
  },
): TimelineEvent {
  const iso = `${partial.date}T${partial.time}:00Z`;
  return {
    ...partial,
    createdAt: partial.createdAt ?? iso,
    updatedAt: partial.updatedAt ?? iso,
  };
}

/** Bundled jang images (synced from Desktop/jang via scripts/sync-jang-images.ps1). */
function pick<T>(items: readonly T[], seed: number): T {
  return items[((seed % items.length) + items.length) % items.length]!;
}

function jangImage(seed: number): string {
  return pick(JANG_IMAGE_PATHS, seed);
}

/** Inclusive seed window: 9 Esfand 1404 → today */
export const SEED_RANGE_START = "2026-02-28";
export const SEED_RANGE_END = "2026-07-10";
export const TIMELINE_SEED_VERSION = "conflict-2026-jang-images-v1";

const IMG_POOL = JANG_IMAGE_PATHS;

/** Landmark / reported milestones — kept verbatim, then densified per day */
const landmarkConflictEvents: TimelineEvent[] = [
  eventBase({
    id: "e-20260228-opening-strike",
    eventType: "enemy",
    title: "حمله مشترک آمریکا و اسرائیل؛ آغاز جنگ ۲۰۲۶",
    summary:
      "در ۹ اسفند ۱۴۰۴، آمریکا و اسرائیل با حملات هوایی گسترده جنگ را آغاز کردند؛ رهبر انقلاب و شماری از مقامات عالی هدف قرار گرفتند.",
    description:
      "طبق گزارش‌های بین‌المللی (AP، ویکی‌پدیا)، حملات غافلگیرانه در میانه مذاکرات هسته‌ای رخ داد و به کشته شدن آیت‌الله خامنه‌ای و مقامات ارشد انجامید.",
    impact: "ورود کشور به جنگ تمام‌عیار؛ فعال‌سازی پدافند و پاسخ موشکی.",
    date: "2026-02-28",
    time: "03:15",
    severity: "critical",
    verificationStatus: "verified",
    category: "حمله آمریکا / اسرائیل",
    location: { province: "تهران", city: "تهران" },
    source: "AP News / Wikipedia — 2026 Iran war",
    imageUrl: jangImage(21),
    media: [
      {
        id: "e-20260228-opening-strike-m1",
        type: "image",
        url: jangImage(22),
        thumbnailUrl: jangImage(23),
      },
    ],
    tags: ["آمریکا", "اسرائیل", "۹ اسفند", "جنگ ۲۰۲۶"],
    relatedEventIds: [],
    relatedResponseIds: [
      "g-20260228-retaliation",
      "g-20260228-hormuz",
      "g-20260228-air-defense",
    ],
    commentsCount: 28,
  }),
  eventBase({
    id: "g-20260228-air-defense",
    eventType: "government",
    title: "آماده‌باش کامل پدافند هوایی و اعلام وضعیت جنگی",
    summary:
      "نیروهای پدافند و ستادهای عملیاتی بلافاصله پس از حمله در حالت آماده‌باش کامل قرار گرفتند.",
    date: "2026-02-28",
    time: "04:00",
    severity: "critical",
    verificationStatus: "published",
    actionStatus: "in_progress",
    category: "پدافند هوایی",
    location: { province: "تهران", city: "تهران" },
    organization: "نیروی پدافند هوایی",
    source: "سخنگوی نیروهای مسلح",
    imageUrl: jangImage(0),
    tags: ["پدافند", "آماده‌باش"],
    relatedEventIds: ["e-20260228-opening-strike"],
    relatedResponseIds: [],
    responseTimeMinutes: 45,
    commentsCount: 12,
  }),
  eventBase({
    id: "g-20260228-retaliation",
    eventType: "government",
    title: "پاسخ موشکی و پهپادی به اسرائیل و پایگاه‌های آمریکا در منطقه",
    summary:
      "ایران با موج موشک و پهپاد به اهداف در اسرائیل و پایگاه‌های آمریکا در خلیج فارس پاسخ داد.",
    date: "2026-02-28",
    time: "18:30",
    severity: "critical",
    verificationStatus: "published",
    actionStatus: "completed",
    category: "پاسخ موشکی",
    location: { province: "کرمانشاه", city: "کرمانشاه" },
    organization: "نیروی هوافضای سپاه",
    source: "رصد بین‌المللی / AP",
    imageUrl: jangImage(1),
    tags: ["پاسخ", "موشک", "پهپاد"],
    relatedEventIds: ["e-20260228-opening-strike"],
    relatedResponseIds: [],
    responseTimeMinutes: 915,
    commentsCount: 20,
  }),
  eventBase({
    id: "g-20260228-hormuz",
    eventType: "government",
    title: "اعمال کنترل بر تنگه هرمز",
    summary:
      "ایران کنترل تنگه هرمز را اعلام کرد؛ شریان حیاتی نفت و گاز جهان مختل شد.",
    description:
      "بستن یا محدودسازی عبور از هرمز یکی از محورهای فشار ایران در جنگ ۲۰۲۶ بود و بازار انرژی جهانی را متلاطم کرد.",
    date: "2026-02-28",
    time: "21:00",
    severity: "high",
    verificationStatus: "published",
    actionStatus: "in_progress",
    category: "عملیات دریایی",
    location: { province: "هرمزگان", city: "بندرعباس" },
    organization: "نیروی دریایی",
    source: "AP / Britannica",
    imageUrl: jangImage(2),
    tags: ["هرمز", "نفت", "دریایی"],
    relatedEventIds: ["e-20260228-opening-strike"],
    relatedResponseIds: [],
    responseTimeMinutes: 1065,
    commentsCount: 16,
  }),
  eventBase({
    id: "e-20260302-hezbollah",
    eventType: "enemy",
    title: "گسترش جبهه لبنان؛ حمله اسرائیل به جنوب لبنان پس از ورود حزب‌الله",
    summary:
      "پس از شلیک موشک حزب‌الله به شمال اسرائیل، اسرائیل با حمله گسترده و اشغال بخش‌هایی از جنوب لبنان پاسخ داد.",
    date: "2026-03-02",
    time: "08:20",
    severity: "high",
    verificationStatus: "verified",
    category: "جبهه منطقه‌ای",
    location: { province: "تهران", city: "تهران" },
    source: "AP / BBC",
    imageUrl: jangImage(24),
    tags: ["لبنان", "حزب‌الله", "اسرائیل"],
    relatedEventIds: [],
    relatedResponseIds: ["g-20260302-support-axis"],
    commentsCount: 9,
  }),
  eventBase({
    id: "g-20260302-support-axis",
    eventType: "government",
    title: "هماهنگی محور مقاومت و هشدار به گسترش جنگ منطقه‌ای",
    summary:
      "تهران بر حق دفاع مشروع محور مقاومت تأکید و نسبت به گسترش جنگ در لبنان هشدار داد.",
    date: "2026-03-02",
    time: "14:00",
    severity: "medium",
    verificationStatus: "published",
    actionStatus: "completed",
    category: "دیپلماسی",
    location: { province: "تهران", city: "تهران" },
    organization: "وزارت امور خارجه",
    source: "سخنگوی وزارت امور خارجه",
    imageUrl: jangImage(3),
    tags: ["دیپلماسی", "لبنان"],
    relatedEventIds: ["e-20260302-hezbollah"],
    relatedResponseIds: [],
    responseTimeMinutes: 340,
    commentsCount: 5,
  }),
  eventBase({
    id: "g-20260308-new-leader",
    eventType: "government",
    title: "معرفی رهبری جدید؛ مجتبی خامنه‌ای به‌عنوان رهبر جدید",
    summary:
      "ایران مجتبی خامنه‌ای را به‌عنوان رهبر جدید معرفی کرد؛ وی پس از جراحت در حملات آغازین در اختفا گزارش شد.",
    date: "2026-03-08",
    time: "12:00",
    severity: "high",
    verificationStatus: "published",
    actionStatus: "completed",
    category: "حاکمیت / امنیت ملی",
    location: { province: "تهران", city: "تهران" },
    organization: "شورای عالی امنیت ملی",
    source: "AP News",
    imageUrl: jangImage(4),
    tags: ["رهبری", "امنیت ملی"],
    relatedEventIds: [],
    relatedResponseIds: [],
    commentsCount: 14,
  }),
  eventBase({
    id: "e-20260321-hormuz-threat",
    eventType: "enemy",
    title: "تهدید آمریکا به هدف‌گیری زیرساخت انرژی و غیرنظامی",
    summary:
      "ترامپ تهدید کرد در صورت ادامه محدودیت هرمز، زیرساخت انرژی غیرنظامی ایران هدف قرار می‌گیرد.",
    date: "2026-03-21",
    time: "16:40",
    severity: "high",
    verificationStatus: "verified",
    category: "تهدید / فشار",
    location: { province: "بوشهر", city: "خارک" },
    source: "Britannica",
    imageUrl: jangImage(5),
    tags: ["هرمز", "انرژی", "آمریکا"],
    relatedEventIds: [],
    relatedResponseIds: ["g-20260321-energy-guard"],
    commentsCount: 8,
  }),
  eventBase({
    id: "g-20260321-energy-guard",
    eventType: "government",
    title: "تقویت حفاظت از تأسیسات انرژی و پایانه خارک",
    summary:
      "نیروهای امنیتی و پدافندی حفاظت از تأسیسات نفتی و پایانه‌های صادراتی را افزایش دادند.",
    date: "2026-03-21",
    time: "20:15",
    severity: "high",
    verificationStatus: "published",
    actionStatus: "in_progress",
    category: "امنیت زیرساخت",
    location: { province: "بوشهر", city: "خارک" },
    organization: "نیروهای مسلح / وزارت نفت",
    source: "رصد داخلی",
    tags: ["خارک", "نفت"],
    relatedEventIds: ["e-20260321-hormuz-threat"],
    relatedResponseIds: [],
    responseTimeMinutes: 215,
    commentsCount: 4,
  }),
  eventBase({
    id: "e-20260407-ceasefire",
    eventType: "enemy",
    title: "آتش‌بس دوهفته‌ای آمریکا–ایران (بدون اسرائیل)",
    summary:
      "آتش‌بس شکننده دوهفته‌ای میان آمریکا و ایران اعلام شد؛ اسرائیل در مذاکرات حضور نداشت.",
    date: "2026-04-07",
    time: "09:00",
    severity: "medium",
    verificationStatus: "verified",
    category: "دیپلماسی / آتش‌بس",
    location: { province: "تهران", city: "تهران" },
    source: "AP News",
    imageUrl: jangImage(6),
    tags: ["آتش‌بس", "آمریکا"],
    relatedEventIds: [],
    relatedResponseIds: ["g-20260407-monitor"],
    commentsCount: 11,
  }),
  eventBase({
    id: "g-20260407-monitor",
    eventType: "government",
    title: "پایش آتش‌بس و حفظ آماده‌باش در هرمز و پدافند",
    summary:
      "نیروهای مسلح ضمن پذیرش آتش‌بس، رصد نقض احتمالی و آماده‌باش پدافندی را ادامه دادند.",
    date: "2026-04-07",
    time: "11:30",
    severity: "medium",
    verificationStatus: "published",
    actionStatus: "in_progress",
    category: "پدافند هوایی",
    location: { province: "هرمزگان", city: "بندرعباس" },
    organization: "ستاد کل نیروهای مسلح",
    source: "سخنگوی نیروهای مسلح",
    tags: ["آتش‌بس", "پایش"],
    relatedEventIds: ["e-20260407-ceasefire"],
    relatedResponseIds: [],
    responseTimeMinutes: 150,
    commentsCount: 3,
  }),
  eventBase({
    id: "e-20260412-islamabad",
    eventType: "enemy",
    title: "شکست مذاکرات رودررو در اسلام‌آباد",
    summary:
      "مذاکرات تاریخی حضوری آمریکا و ایران در اسلام‌آباد بدون توافق پایان یافت.",
    date: "2026-04-12",
    time: "22:00",
    severity: "medium",
    verificationStatus: "verified",
    category: "دیپلماسی",
    location: { province: "تهران", city: "تهران" },
    source: "AP News",
    imageUrl: jangImage(7),
    tags: ["اسلام‌آباد", "مذاکره"],
    relatedEventIds: [],
    relatedResponseIds: [],
    commentsCount: 6,
  }),
  eventBase({
    id: "e-20260413-blockade",
    eventType: "enemy",
    title: "آغاز محاصره دریایی بنادر ایران توسط آمریکا",
    summary:
      "ترامپ اعلام کرد آمریکا برای فشار بر تهران محاصره بنادر ایران را آغاز کرده است.",
    date: "2026-04-13",
    time: "15:20",
    severity: "high",
    verificationStatus: "verified",
    category: "محاصره / تحریم",
    location: { province: "هرمزگان", city: "بندرعباس" },
    source: "AP News",
    imageUrl: jangImage(8),
    tags: ["محاصره", "بندر", "آمریکا"],
    relatedEventIds: [],
    relatedResponseIds: ["g-20260417-reopen"],
    commentsCount: 10,
  }),
  eventBase({
    id: "g-20260417-reopen",
    eventType: "government",
    title: "اعلام بازگشایی موقت تنگه هرمز به روی کشتیرانی",
    summary:
      "ایران اعلام کرد تنگه را به روی کشتیرانی باز کرده است؛ این وضعیت پایدار نماند.",
    date: "2026-04-17",
    time: "10:00",
    severity: "medium",
    verificationStatus: "published",
    actionStatus: "completed",
    category: "عملیات دریایی",
    location: { province: "هرمزگان", city: "بندرعباس" },
    organization: "نیروی دریایی",
    source: "AP News",
    tags: ["هرمز", "کشتیرانی"],
    relatedEventIds: ["e-20260413-blockade"],
    relatedResponseIds: [],
    responseTimeMinutes: 5500,
    commentsCount: 4,
  }),
  eventBase({
    id: "e-20260421-extend-ceasefire",
    eventType: "enemy",
    title: "تمدید نامحدود آتش‌بس از سوی آمریکا",
    summary:
      "ترامپ اعلام کرد آتش‌بس را به‌صورت نامحدود تمدید می‌کند؛ تنش‌ها همچنان ادامه داشت.",
    date: "2026-04-21",
    time: "13:00",
    severity: "low",
    verificationStatus: "verified",
    category: "دیپلماسی / آتش‌بس",
    location: { province: "تهران", city: "تهران" },
    source: "AP News",
    imageUrl: jangImage(9),
    tags: ["آتش‌بس", "تمدید"],
    relatedEventIds: [],
    relatedResponseIds: [],
    commentsCount: 3,
  }),
  eventBase({
    id: "e-20260607-iran-israel-fire",
    eventType: "enemy",
    title: "ازسرگیری تبادل آتش مستقیم ایران و اسرائیل",
    summary:
      "ایران برای نخستین‌بار پس از آتش‌بس آوریل به اسرائیل شلیک کرد؛ اسرائیل پاسخ داد.",
    description:
      "این تبادل پس از حملات اسرائیل در بیروت و تنش لبنان رخ داد و اولین رویارویی مستقیم از ابتدای آتش‌بس بود.",
    date: "2026-06-07",
    time: "23:10",
    severity: "high",
    verificationStatus: "verified",
    category: "حمله هوایی / موشکی",
    location: { province: "ایلام", city: "مهران" },
    source: "AP / Britannica",
    imageUrl: jangImage(10),
    tags: ["اسرائیل", "آتش‌بس", "موشک"],
    relatedEventIds: [],
    relatedResponseIds: ["g-20260607-retaliation"],
    commentsCount: 13,
  }),
  eventBase({
    id: "g-20260607-retaliation",
    eventType: "government",
    title: "موج موشکی ایران به اهداف در سرزمین‌های اشغالی",
    summary:
      "نیروهای مسلح موج بالستیک را در پاسخ به تجاوزات و نقض آتش‌بس شلیک کردند.",
    date: "2026-06-07",
    time: "23:40",
    severity: "high",
    verificationStatus: "published",
    actionStatus: "completed",
    category: "پاسخ موشکی",
    location: { province: "کرمانشاه", city: "قصرشیرین" },
    organization: "نیروی هوافضای سپاه",
    source: "رصد بین‌المللی",
    imageUrl: jangImage(11),
    tags: ["پاسخ", "اسرائیل"],
    relatedEventIds: ["e-20260607-iran-israel-fire"],
    relatedResponseIds: [],
    responseTimeMinutes: 30,
    commentsCount: 8,
  }),
  eventBase({
    id: "e-20260617-versailles-deal",
    eventType: "enemy",
    title: "امضای توافق موقت آمریکا–ایران (ورسای / تهران)",
    summary:
      "ترامپ توافقی را امضا کرد که کاهش اورانیوم غنی‌شده و تعلیق تحریم‌های نفتی را شامل می‌شد؛ رئیس‌جمهور پزشکیان نیز در تهران آن را تأیید کرد.",
    date: "2026-06-17",
    time: "18:00",
    severity: "medium",
    verificationStatus: "verified",
    category: "دیپلماسی",
    location: { province: "تهران", city: "تهران" },
    source: "AP / Wikipedia",
    imageUrl: jangImage(12),
    tags: ["توافق", "تحریم", "نفت"],
    relatedEventIds: [],
    relatedResponseIds: ["g-20260618-blockade-lift"],
    commentsCount: 15,
  }),
  eventBase({
    id: "g-20260618-blockade-lift",
    eventType: "government",
    title: "رفع محاصره دوجانبه و ازسرگیری نسبی عبور از هرمز",
    summary:
      "پس از توافق، محاصره دوجانبه برداشته شد و تردد در تنگه به‌تدریج افزایش یافت.",
    date: "2026-06-18",
    time: "09:30",
    severity: "medium",
    verificationStatus: "published",
    actionStatus: "completed",
    category: "عملیات دریایی",
    location: { province: "هرمزگان", city: "بندرعباس" },
    organization: "نیروی دریایی",
    source: "Wikipedia — 2026 Iran war",
    tags: ["هرمز", "توافق"],
    relatedEventIds: ["e-20260617-versailles-deal"],
    relatedResponseIds: [],
    responseTimeMinutes: 930,
    commentsCount: 5,
  }),
  eventBase({
    id: "g-20260702-shipping-warning",
    eventType: "government",
    title: "هشدار فرماندهی مشترک به نفتکش‌ها درباره مسیرهای مصوب هرمز",
    summary:
      "فرماندهی مشترک نظامی هشدار داد نفتکش‌هایی که از مسیرهای مصوب ایران خارج شوند با پاسخ قاطع روبه‌رو می‌شوند.",
    date: "2026-07-02",
    time: "11:00",
    severity: "medium",
    verificationStatus: "published",
    actionStatus: "completed",
    category: "عملیات دریایی",
    location: { province: "هرمزگان", city: "بندرعباس" },
    organization: "فرماندهی مشترک نیروهای مسلح",
    source: "AP News",
    imageUrl: jangImage(13),
    tags: ["هرمز", "نفتکش"],
    relatedEventIds: [],
    relatedResponseIds: [],
    commentsCount: 7,
  }),
  eventBase({
    id: "e-20260707-us-strikes",
    eventType: "enemy",
    title: "حمله آمریکا به ده‌ها هدف نظامی در ایران پس از اتهام حمله به کشتی‌ها",
    summary:
      "آمریکا پس از متهم‌کردن ایران به حمله به سه کشتی در هرمز، ده‌ها هدف نظامی را زد و تحریم نفت را بازگرداند.",
    description:
      "طبق گزارش‌ها بیش از ۱۷۰ هدف از جمله پدافند و شناورهای سپاه هدف قرار گرفت؛ وزارت بهداشت ایران از کشته و زخمی شدن ده‌ها نفر خبر داد.",
    date: "2026-07-07",
    time: "06:30",
    severity: "critical",
    verificationStatus: "verified",
    category: "حمله آمریکا",
    location: { province: "بوشهر", city: "بوشهر" },
    source: "AP / The National",
    imageUrl: jangImage(25),
    media: [
      {
        id: "e-20260707-us-strikes-m1",
        type: "image",
        url: jangImage(14),
        thumbnailUrl: jangImage(15),
      },
    ],
    tags: ["آمریکا", "هرمز", "تحریم"],
    relatedEventIds: [],
    relatedResponseIds: ["g-20260708-response", "g-20260708-mfa"],
    commentsCount: 24,
  }),
  eventBase({
    id: "e-20260708-ceasefire-over",
    eventType: "enemy",
    title: "اعلام پایان آتش‌بس از سوی ترامپ",
    summary:
      "ترامپ آتش‌بس را «تمام‌شده» اعلام کرد اما گفت مذاکرات می‌تواند ادامه یابد؛ بیم از شعله‌ور شدن دوباره جنگ.",
    date: "2026-07-08",
    time: "14:00",
    severity: "critical",
    verificationStatus: "verified",
    category: "دیپلماسی / آتش‌بس",
    location: { province: "تهران", city: "تهران" },
    source: "AP / The National",
    imageUrl: jangImage(16),
    tags: ["آتش‌بس", "ترامپ"],
    relatedEventIds: ["e-20260707-us-strikes"],
    relatedResponseIds: [],
    commentsCount: 18,
  }),
  eventBase({
    id: "g-20260708-response",
    eventType: "government",
    title: "پاسخ پهپادی و موشکی به نیروهای آمریکا و هشدار در کشورهای خلیج",
    summary:
      "ایران با پهپاد و موشک به نیروهای آمریکا و اهداف مرتبط پاسخ داد؛ آژیر در کویت، بحرین و قطر فعال شد.",
    date: "2026-07-08",
    time: "20:45",
    severity: "high",
    verificationStatus: "published",
    actionStatus: "completed",
    category: "پاسخ به آمریکا",
    location: { province: "خوزستان", city: "اهواز" },
    organization: "سپاه پاسداران",
    source: "The National / AP",
    imageUrl: jangImage(17),
    tags: ["پاسخ", "خلیج فارس", "آمریکا"],
    relatedEventIds: ["e-20260707-us-strikes"],
    relatedResponseIds: [],
    responseTimeMinutes: 855,
    commentsCount: 12,
  }),
  eventBase({
    id: "g-20260708-mfa",
    eventType: "government",
    title: "محکومیت حمله آمریکا به‌عنوان جنایت جنگی و نقض آتش‌بس",
    summary:
      "وزارت امور خارجه آمریکا را به نقض فاحش آتش‌بس و جنایت جنگی متهم کرد.",
    date: "2026-07-08",
    time: "22:10",
    severity: "medium",
    verificationStatus: "published",
    actionStatus: "completed",
    category: "دیپلماسی",
    location: { province: "تهران", city: "تهران" },
    organization: "وزارت امور خارجه",
    source: "The National",
    imageUrl: jangImage(18),
    tags: ["دیپلماسی", "محکومیت"],
    relatedEventIds: ["e-20260707-us-strikes"],
    relatedResponseIds: [],
    responseTimeMinutes: 940,
    commentsCount: 6,
  }),
  eventBase({
    id: "e-20260709-second-wave",
    eventType: "enemy",
    title: "موج دوم حملات آمریکا؛ حدود ۹۰ هدف نظامی",
    summary:
      "سنتکام اعلام کرد موج دوم حملات هوایی حدود ۹۰ هدف نظامی ایران را برای تضعیف تهدید هرمز زده است.",
    date: "2026-07-09",
    time: "05:50",
    severity: "critical",
    verificationStatus: "verified",
    category: "حمله آمریکا",
    location: { province: "هرمزگان", city: "بندرعباس" },
    source: "The National / CENTCOM",
    imageUrl: jangImage(26),
    tags: ["سنتکام", "هرمز", "آمریکا"],
    relatedEventIds: [],
    relatedResponseIds: ["g-20260709-defense"],
    commentsCount: 15,
  }),
  eventBase({
    id: "g-20260709-defense",
    eventType: "government",
    title: "پدافند و تثبیت وضعیت؛ کاهش تردد در تنگه هرمز",
    summary:
      "با تبادل آتش، تردد در هرمز تقریباً متوقف شد؛ پدافند و رصد دریایی در بالاترین سطح قرار گرفت.",
    date: "2026-07-09",
    time: "12:00",
    severity: "high",
    verificationStatus: "published",
    actionStatus: "in_progress",
    category: "پدافند هوایی",
    location: { province: "هرمزگان", city: "بندرعباس" },
    organization: "نیروی پدافند هوایی / نیروی دریایی",
    source: "رصد میدانی",
    imageUrl: jangImage(19),
    tags: ["پدافند", "هرمز"],
    relatedEventIds: ["e-20260709-second-wave"],
    relatedResponseIds: [],
    responseTimeMinutes: 370,
    commentsCount: 5,
  }),
  eventBase({
    id: "g-20260710-today-status",
    eventType: "government",
    title: "وضعیت امروز: رصد مستمر، آماده‌باش و پیگیری دیپلماتیک",
    summary:
      "تا ۱۹ تیر ۱۴۰۵، نیروهای مسلح آماده‌باش را حفظ و مسیرهای دیپلماتیک برای مهار تنش را پیگیری می‌کنند.",
    date: "2026-07-10",
    time: "09:00",
    severity: "medium",
    verificationStatus: "published",
    actionStatus: "in_progress",
    category: "امنیت ملی",
    location: { province: "تهران", city: "تهران" },
    organization: "ستاد کل نیروهای مسلح",
    source: "جمع‌بندی رصد روزانه",
    imageUrl: jangImage(20),
    tags: ["امروز", "آماده‌باش"],
    relatedEventIds: [],
    relatedResponseIds: [],
    commentsCount: 2,
  }),
];

const LOCATIONS = [
  { province: "تهران", city: "تهران" },
  { province: "اصفهان", city: "اصفهان" },
  { province: "کرمانشاه", city: "قصرشیرین" },
  { province: "ایلام", city: "مهران" },
  { province: "بوشهر", city: "بوشهر" },
  { province: "هرمزگان", city: "بندرعباس" },
  { province: "خوزستان", city: "اهواز" },
  { province: "آذربایجان غربی", city: "ارومیه" },
  { province: "فارس", city: "شیراز" },
  { province: "یزد", city: "یزد" },
] as const;

const ENEMY_TEMPLATES = [
  {
    title: "حمله پهپادی به تأسیسات پدافندی",
    summary: "پهپادهای دشمن به نقاط پدافندی و راداری حمله کردند؛ خسارت محدود گزارش شد.",
    category: "حمله پهپادی",
    severity: "high" as const,
    tags: ["پهپاد", "پدافند"],
  },
  {
    title: "موج حملات سایبری به زیرساخت ارتباطی",
    summary: "مراکز داده و شبکه‌های ارتباطی هدف نفوذ سایبری قرار گرفتند.",
    category: "حملات سایبری",
    severity: "medium" as const,
    tags: ["سایبری", "زیرساخت"],
  },
  {
    title: "حمله هوایی به پایگاه نظامی",
    summary: "جنگنده‌ها و مهمات هدایت‌شونده پایگاه‌های نظامی را هدف گرفتند.",
    category: "حمله هوایی",
    severity: "critical" as const,
    tags: ["هوایی", "پایگاه"],
  },
  {
    title: "اقدام اطلاعاتی و خرابکاری میدانی",
    summary: "عوامل دشمن در عملیات اطلاعاتی و خرابکاری محدود شناسایی شدند.",
    category: "عملیات اطلاعاتی",
    severity: "medium" as const,
    tags: ["اطلاعاتی", "امنیت"],
  },
  {
    title: "فشار تحریمی و تهدید انرژی",
    summary: "تهدید جدید علیه صادرات انرژی و کشتیرانی اعلام شد.",
    category: "تحریم و فشار",
    severity: "low" as const,
    tags: ["تحریم", "انرژی"],
  },
  {
    title: "شلیک موشک به مناطق مرزی",
    summary: "موشک‌های کوتاه‌برد به نقاط مرزی شلیک شد؛ پدافند بخشی را رهگیری کرد.",
    category: "حمله موشکی",
    severity: "high" as const,
    tags: ["موشک", "مرز"],
  },
  {
    title: "حمله به شناور و مسیر دریایی",
    summary: "تنش دریایی در مسیرهای نزدیک هرمز و بنادر جنوبی گزارش شد.",
    category: "عملیات دریایی دشمن",
    severity: "high" as const,
    tags: ["دریایی", "هرمز"],
  },
] as const;

const GOV_TEMPLATES = [
  {
    title: "رهگیری و انهدام اهداف متخاصم توسط پدافند",
    summary: "سامانه‌های پدافندی اهداف متخاصم را رهگیری و بخشی را منهدم کردند.",
    category: "پدافند هوایی",
    organization: "نیروی پدافند هوایی",
    severity: "high" as const,
    tags: ["پدافند", "رهگیری"],
  },
  {
    title: "پاسخ موشکی و پهپادی محدود",
    summary: "نیروهای مسلح با موج محدود موشک و پهپاد به تجاوز پاسخ دادند.",
    category: "پاسخ موشکی",
    organization: "نیروی هوافضای سپاه",
    severity: "high" as const,
    tags: ["پاسخ", "موشک"],
  },
  {
    title: "تقویت امنیت سایبری و بازیابی سرویس‌ها",
    summary: "مراکز سایبری نفوذ را مهار و سرویس‌های حیاتی را بازیابی کردند.",
    category: "امنیت سایبری",
    organization: "پلیس فتا / مراکز سایبری",
    severity: "medium" as const,
    tags: ["سایبری", "بازیابی"],
  },
  {
    title: "بیانیه دیپلماتیک و رایزنی منطقه‌ای",
    summary: "وزارت امور خارجه تجاوز را محکوم و رایزنی با شرکای منطقه‌ای را آغاز کرد.",
    category: "دیپلماسی",
    organization: "وزارت امور خارجه",
    severity: "low" as const,
    tags: ["دیپلماسی", "محکومیت"],
  },
  {
    title: "آماده‌باش میدانی و استقرار یگان‌ها",
    summary: "یگان‌های عملیاتی در مناطق حساس مستقر و آماده‌باش را تمدید کردند.",
    category: "امنیت ملی",
    organization: "ستاد کل نیروهای مسلح",
    severity: "medium" as const,
    tags: ["آماده‌باش", "استقرار"],
  },
  {
    title: "رصد دریایی و اسکورت مسیرهای مصوب",
    summary: "نیروی دریایی رصد تنگه و اسکورت مسیرهای مصوب کشتیرانی را ادامه داد.",
    category: "عملیات دریایی",
    organization: "نیروی دریایی",
    severity: "medium" as const,
    tags: ["دریایی", "اسکورت"],
  },
  {
    title: "حمایت امدادی و اطلاع‌رسانی عمومی",
    summary: "ستادهای امدادی به مناطق آسیب‌دیده اعزام و اطلاع‌رسانی عمومی انجام شد.",
    category: "حمایت مردمی",
    organization: "هلال احمر / ستاد بحران",
    severity: "low" as const,
    tags: ["امداد", "مردم"],
  },
] as const;

const DAY_TIMES = ["06:20", "09:45", "13:10", "17:30", "21:15"] as const;
const SOURCES = [
  "رصد خبری دفاعی",
  "AP / رصد میدانی",
  "خبرگزاری داخلی",
  "سخنگوی نیروهای مسلح",
  "جمع‌بندی اتاق خبر",
] as const;

/** Keep IDs aligned with `agency-store` seed */
const AGENCY_CATALOG = [
  { id: "agency-health", name: "وزارت بهداشت، درمان و آموزش پزشکی", shortName: "بهداشت و درمان" },
  { id: "agency-defense", name: "ستاد کل نیروهای مسلح / وزارت دفاع", shortName: "دفاع و نیروهای مسلح" },
  { id: "agency-mfa", name: "وزارت امور خارجه", shortName: "امور خارجه" },
  { id: "agency-oil", name: "وزارت نفت", shortName: "نفت و انرژی" },
  { id: "agency-ict", name: "وزارت ارتباطات و فناوری اطلاعات", shortName: "ارتباطات و فناوری" },
  { id: "agency-interior", name: "وزارت کشور", shortName: "کشور" },
  { id: "agency-intel", name: "وزارت اطلاعات", shortName: "اطلاعات" },
  { id: "agency-roads", name: "وزارت راه و شهرسازی", shortName: "راه و شهرسازی" },
] as const;

function resolveAgencyFromText(...parts: Array<string | undefined>) {
  const hay = parts.filter(Boolean).join(" ").toLowerCase();
  if (/بهداشت|درمان|امداد|هلال|بیمار/.test(hay)) return AGENCY_CATALOG[0];
  if (/سایبر|ارتباط|فناوری|فتا|داده/.test(hay)) return AGENCY_CATALOG[4];
  if (/نفت|انرژی|خارک|تحریم/.test(hay)) return AGENCY_CATALOG[3];
  if (/دیپلماس|امور خارجه|مذاکره|آتش‌بس|توافق/.test(hay)) return AGENCY_CATALOG[2];
  if (/اطلاعاتی|خرابکار/.test(hay)) return AGENCY_CATALOG[6];
  if (/کشور|استان|بحران|مردم/.test(hay)) return AGENCY_CATALOG[5];
  if (/بندر|راه|حمل|کشتیرانی|هرمز/.test(hay)) return AGENCY_CATALOG[7];
  return AGENCY_CATALOG[1];
}

function withAgencyFields(
  event: TimelineEvent,
  agency = resolveAgencyFromText(
    event.category,
    event.organization,
    event.title,
    ...(event.tags ?? []),
  ),
): TimelineEvent {
  return {
    ...event,
    agencyId: event.agencyId ?? agency.id,
    agencyName: event.agencyName ?? agency.name,
    organization: event.organization ?? agency.shortName,
  };
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function eachDateInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor <= last) {
    out.push(toLocalDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function buildMediaBundle(
  id: string,
  seed: number,
  withVideo: boolean,
): NonNullable<TimelineEvent["media"]> {
  const imgA = pick(IMG_POOL, seed);
  const imgB = pick(IMG_POOL, seed + 3);
  const media: NonNullable<TimelineEvent["media"]> = [
    {
      id: `${id}-img1`,
      type: "image",
      url: imgA,
      thumbnailUrl: imgA,
      title: "تصویر میدانی",
    },
    {
      id: `${id}-img2`,
      type: "image",
      url: imgB,
      thumbnailUrl: imgB,
      title: "تصویر تکمیلی",
    },
  ];

  if (withVideo) {
    // Extra local still instead of remote sample videos (often blocked).
    const imgC = pick(IMG_POOL, seed + 7);
    media.push({
      id: `${id}-img3`,
      type: "image",
      url: imgC,
      thumbnailUrl: imgC,
      title: "تصویر تکمیلی",
    });
  }

  return media;
}

function makeDailyEvent(
  date: string,
  dayIndex: number,
  slot: number,
  preferEnemy: boolean,
): TimelineEvent {
  const seed = dayIndex * 17 + slot * 9;
  const isEnemy = preferEnemy ? slot % 2 === 0 : slot % 2 === 1;
  const location = pick(LOCATIONS, seed);
  const time = DAY_TIMES[Math.min(slot, DAY_TIMES.length - 1)]!;
  const id = `${isEnemy ? "e" : "g"}-gen-${date.replaceAll("-", "")}-${slot + 1}`;

  if (isEnemy) {
    const tpl = pick(ENEMY_TEMPLATES, seed);
    const media = buildMediaBundle(id, seed, slot === 1 || slot === 3);
    const agency = resolveAgencyFromText(tpl.category, tpl.title, ...tpl.tags);
    return withAgencyFields(
      eventBase({
        id,
        eventType: "enemy",
        title: tpl.title,
        summary: tpl.summary,
        description: `${tpl.summary} گزارش اتاق خبر برای ${date}.`,
        impact: "افزایش تنش عملیاتی و نیاز به پاسخ پدافندی.",
        date,
        time,
        severity: tpl.severity,
        verificationStatus: "verified",
        category: tpl.category,
        location: { ...location },
        source: pick(SOURCES, seed + 1),
        imageUrl: media[0]!.url,
        media,
        tags: [...tpl.tags],
        relatedEventIds: [],
        relatedResponseIds: [],
        commentsCount: 2 + (seed % 12),
      }),
      agency,
    );
  }

  const tpl = pick(GOV_TEMPLATES, seed);
  const media = buildMediaBundle(id, seed, slot === 2 || slot === 4);
  const agency = resolveAgencyFromText(
    tpl.category,
    tpl.organization,
    tpl.title,
    ...tpl.tags,
  );
  return withAgencyFields(
    eventBase({
      id,
      eventType: "government",
      title: tpl.title,
      summary: tpl.summary,
      description: `${tpl.summary} اقدام ثبت‌شده در ${date}.`,
      impact: "حفظ آماده‌باش و کاهش آسیب به زیرساخت حیاتی.",
      date,
      time,
      severity: tpl.severity,
      verificationStatus: "published",
      actionStatus: slot % 3 === 0 ? "completed" : "in_progress",
      category: tpl.category,
      location: { ...location },
      organization: tpl.organization,
      source: pick(SOURCES, seed + 2),
      imageUrl: media[0]!.url,
      media,
      tags: [...tpl.tags],
      relatedEventIds: [],
      relatedResponseIds: [],
      responseTimeMinutes: 20 + (seed % 180),
      commentsCount: 1 + (seed % 8),
    }),
    agency,
  );
}

/** Ensure every day in the seed window has 4–5 news actions with media. */
function densifyConflictEvents(
  landmarks: TimelineEvent[],
): TimelineEvent[] {
  const byDate = new Map<string, TimelineEvent[]>();

  for (const event of landmarks) {
    const list = byDate.get(event.date) ?? [];
    let enriched = withAgencyFields(event);
    if (!enriched.imageUrl || !enriched.media?.length) {
      const media = buildMediaBundle(
        enriched.id,
        enriched.date.length + list.length,
        true,
      );
      enriched = {
        ...enriched,
        imageUrl: enriched.imageUrl ?? media[0]!.url,
        media: enriched.media?.length ? enriched.media : media,
      };
    }
    list.push(enriched);
    byDate.set(event.date, list);
  }

  const dates = eachDateInclusive(SEED_RANGE_START, SEED_RANGE_END);
  dates.forEach((date, dayIndex) => {
    const existing = byDate.get(date) ?? [];
    const target = 4 + (dayIndex % 2); // 4 or 5
    let slot = 0;
    while (existing.length < target) {
      existing.push(makeDailyEvent(date, dayIndex, slot, dayIndex % 3 !== 0));
      slot += 1;
    }
    byDate.set(date, existing);
  });

  return [...byDate.values()]
    .flat()
    .sort((a, b) =>
      a.date === b.date
        ? b.time.localeCompare(a.time)
        : b.date.localeCompare(a.date),
    );
}

export const conflictSeedEvents: TimelineEvent[] =
  densifyConflictEvents(landmarkConflictEvents);

export function buildDaysFromEvents(events: TimelineEvent[]): TimelineDay[] {
  const byDate = new Map<string, TimelineEvent[]>();

  for (const event of events) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }

  const days: TimelineDay[] = [...byDate.entries()].map(([date, dayEvents]) => {
    const { weekday, persianDate } = persianParts(date);
    const sorted = [...dayEvents].sort((a, b) => b.time.localeCompare(a.time));
    const enemyActionsCount = sorted.filter((e) => e.eventType === "enemy").length;
    const governmentActionsCount = sorted.filter(
      (e) => e.eventType === "government",
    ).length;
    const totalEvents = sorted.length;
    const hasCritical = sorted.some((e) => e.severity === "critical");
    const intensity = Math.min(
      100,
      Math.round(
        totalEvents * 12 +
          enemyActionsCount * 10 +
          (hasCritical ? 25 : 0) +
          (sorted.some((e) => e.severity === "high") ? 10 : 0),
      ),
    );

    return {
      date,
      persianDate,
      weekday,
      totalEvents,
      enemyActionsCount,
      governmentActionsCount,
      intensity,
      isCritical: intensity >= 85 || hasCritical,
      events: sorted,
    };
  });

  return days.sort((a, b) => b.date.localeCompare(a.date));
}

export const conflictSeedDays: TimelineDay[] =
  buildDaysFromEvents(conflictSeedEvents);

/** @deprecated use conflictSeedDays */
export const timelineMockDays = conflictSeedDays;

export function getAllEvents(days: TimelineDay[] = conflictSeedDays): TimelineEvent[] {
  return days.flatMap((day) => day.events);
}

export function findEventById(
  id: string,
  days: TimelineDay[] = conflictSeedDays,
): TimelineEvent | undefined {
  return getAllEvents(days).find((event) => event.id === id);
}

export function computeSummary(days: TimelineDay[]) {
  const enemy = days.reduce((s, d) => s + d.enemyActionsCount, 0);
  const government = days.reduce((s, d) => s + d.governmentActionsCount, 0);
  const total = enemy + government;
  const responseRatio =
    enemy === 0
      ? government > 0
        ? 100
        : 0
      : Math.round((government / enemy) * 100);

  const responseTimes = getAllEvents(days)
    .map((e) => e.responseTimeMinutes)
    .filter((m): m is number => typeof m === "number" && m > 0);
  const avgResponseMinutes =
    responseTimes.length === 0
      ? 0
      : Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        );

  return {
    totalEvents: total,
    enemy,
    government,
    responseRatio,
    avgResponseMinutes,
    activeUsers: 128,
    criticalDays: days.filter((d) => d.isCritical || d.intensity >= 85).length,
  };
}
