import type { Sentiment } from "@/lib/monitoring/types";

export interface ExternalNewsItem {
  externalId: string;
  title: string;
  summary: string;
  fullText: string;
  sourceUrl: string | null;
  thumbnail: string | null;
  platform: string;
  publishedAt: string | null;
  authorName: string | null;
  authorUsername: string | null;
  sourceName: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  repostCount: number;
  matchedKeyword: string | null;
  sentimentHint?: Sentiment;
}

export interface ExternalTrendItem {
  externalId: string;
  title: string;
  description: string;
  keywords: string[];
  hashtags: string[];
  growthPercentage: number;
  mentionCount: number;
  estimatedReach: number;
  sentiment: Sentiment;
}

export interface ExternalMetricsUpdate {
  externalId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  growthRate: number;
}

export interface MonitoringProvider {
  id: string;
  fetchNews(keywords: string[]): Promise<ExternalNewsItem[]>;
  fetchSocialPosts(keywords: string[]): Promise<ExternalNewsItem[]>;
  fetchTrends(keywords: string[]): Promise<ExternalTrendItem[]>;
  fetchMetrics(externalIds: string[]): Promise<ExternalMetricsUpdate[]>;
  searchByKeywords(keywords: string[]): Promise<ExternalNewsItem[]>;
  fetchItemUpdates(externalIds: string[]): Promise<ExternalNewsItem[]>;
}

const MOCK_NEWS: ExternalNewsItem[] = [
  {
    externalId: "mock-news-1",
    title: "انتقاد کاربران از تأخیر در اجرای طرح توسعه شبکه برق",
    summary:
      "کاربران شبکه‌های اجتماعی نسبت به تأخیر در اجرای طرح توسعه شبکه برق در چند استان انتقاد کرده‌اند.",
    fullText:
      "طی ساعات اخیر، موجی از انتقادها درباره تأخیر در اجرای طرح توسعه شبکه برق شکل گرفته است. کاربران خواستار شفاف‌سازی زمان‌بندی و پاسخ مسئولان شده‌اند.",
    sourceUrl: "https://example.com/news/power-delay",
    thumbnail: null,
    platform: "instagram",
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    authorName: "خبرگزاری نمونه",
    authorUsername: "namooneh_news",
    sourceName: "خبرگزاری نمونه",
    viewCount: 2400,
    likeCount: 310,
    commentCount: 96,
    shareCount: 140,
    repostCount: 55,
    matchedKeyword: "وزارت نیرو",
    sentimentHint: "negative",
  },
  {
    externalId: "mock-news-2",
    title: "گزارش اختلال موقت در سامانه نوبت‌دهی خدمات شهروندی",
    summary: "برخی شهروندان از کندی و قطعی موقت سامانه نوبت‌دهی خبر داده‌اند.",
    fullText:
      "کاربران در چند شهر گزارش کرده‌اند که سامانه نوبت‌دهی خدمات شهروندی با اختلال روبه‌رو شده و صف انتظار افزایش یافته است.",
    sourceUrl: "https://example.com/news/service-outage",
    thumbnail: null,
    platform: "telegram",
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    authorName: "کانال پیگیری شهری",
    authorUsername: "shahr_follow",
    sourceName: "کانال پیگیری شهری",
    viewCount: 8700,
    likeCount: 420,
    commentCount: 210,
    shareCount: 380,
    repostCount: 120,
    matchedKeyword: "نوبت‌دهی",
    sentimentHint: "negative",
  },
  {
    externalId: "mock-news-3",
    title: "بازتاب مثبت افتتاح فاز جدید بیمارستان تخصصی",
    summary: "افتتاح فاز جدید بیمارستان تخصصی با استقبال کاربران همراه بوده است.",
    fullText:
      "انتشار تصاویر افتتاح فاز جدید بیمارستان تخصصی موجب شکل‌گیری روایت مثبت درباره توسعه خدمات درمانی شده است.",
    sourceUrl: "https://example.com/news/hospital-phase",
    thumbnail: null,
    platform: "news",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    authorName: "خبرگزاری سلامت",
    authorUsername: "salamat_agency",
    sourceName: "خبرگزاری سلامت",
    viewCount: 5200,
    likeCount: 640,
    commentCount: 88,
    shareCount: 150,
    repostCount: 40,
    matchedKeyword: "وزارت بهداشت",
    sentimentHint: "positive",
  },
];

export class MockMonitoringProvider implements MonitoringProvider {
  id = "mock";

  async fetchNews(keywords: string[]) {
    return this.searchByKeywords(keywords);
  }

  async fetchSocialPosts(keywords: string[]) {
    return (await this.searchByKeywords(keywords)).filter((item) =>
      ["instagram", "telegram", "x"].includes(item.platform)
    );
  }

  async fetchTrends(keywords: string[]) {
    const tag = keywords[0] ?? "خدمت عمومی";
    return [
      {
        externalId: `mock-trend-${tag}`,
        title: `رشد گفتگو درباره ${tag}`,
        description: `در ۲۴ ساعت گذشته اشاره به «${tag}» افزایش یافته است.`,
        keywords: keywords.slice(0, 5),
        hashtags: [`#${tag.replace(/\s+/g, "")}`],
        growthPercentage: 126,
        mentionCount: 1840,
        estimatedReach: 920000,
        sentiment: "mixed" as const,
      },
    ];
  }

  async fetchMetrics(externalIds: string[]) {
    return externalIds.map((externalId) => ({
      externalId,
      viewCount: 1000 + Math.floor(Math.random() * 5000),
      likeCount: 100 + Math.floor(Math.random() * 400),
      commentCount: 40 + Math.floor(Math.random() * 200),
      shareCount: 30 + Math.floor(Math.random() * 250),
      growthRate: 40 + Math.floor(Math.random() * 160),
    }));
  }

  async searchByKeywords(keywords: string[]) {
    if (keywords.length === 0) return MOCK_NEWS;
    const lowered = keywords.map((k) => k.toLowerCase());
    return MOCK_NEWS.filter((item) =>
      lowered.some(
        (k) =>
          item.title.includes(k) ||
          item.summary.includes(k) ||
          (item.matchedKeyword ?? "").includes(k) ||
          item.sourceName.includes(k)
      )
    ).concat(MOCK_NEWS.filter((item) => item.sentimentHint === "negative").slice(0, 2));
  }

  async fetchItemUpdates(externalIds: string[]) {
    return MOCK_NEWS.filter((item) => externalIds.includes(item.externalId));
  }
}

export class ManualMonitoringProvider implements MonitoringProvider {
  id = "manual";

  async fetchNews() {
    return [];
  }
  async fetchSocialPosts() {
    return [];
  }
  async fetchTrends() {
    return [];
  }
  async fetchMetrics() {
    return [];
  }
  async searchByKeywords() {
    return [];
  }
  async fetchItemUpdates() {
    return [];
  }
}

let activeMonitoringProvider: MonitoringProvider = new MockMonitoringProvider();

export function getMonitoringProvider(): MonitoringProvider {
  const fromEnv = process.env.MONITORING_PROVIDER?.trim().toLowerCase();
  if (fromEnv === "manual") {
    activeMonitoringProvider = new ManualMonitoringProvider();
  } else {
    activeMonitoringProvider = new MockMonitoringProvider();
  }
  return activeMonitoringProvider;
}

export function setMonitoringProvider(provider: MonitoringProvider) {
  activeMonitoringProvider = provider;
}

export function normalizeExternalItem(item: ExternalNewsItem) {
  return {
    ...item,
    title: item.title.trim(),
    summary: item.summary.trim(),
    fullText: item.fullText.trim(),
    platform: item.platform || "other",
    engagementCount:
      item.likeCount + item.commentCount + item.shareCount + item.repostCount,
  };
}
