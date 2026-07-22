export type AiProviderId = "openai" | "gemini";

export type AiFeatureId =
  | "directive_understanding"
  | "action_assistant"
  | "campaign_advisor"
  | "autopsy"
  | "memory_extract";

export interface AiProviderConfig {
  /** Stored encrypted (enc:v1:...) or legacy plaintext */
  apiKeyEncrypted: string | null;
  /** Optional OpenAI-compatible or Gemini override base URL */
  baseUrl: string | null;
  model: string;
}

export interface AiSettings {
  enabled: boolean;
  defaultProvider: AiProviderId;
  openai: AiProviderConfig;
  gemini: AiProviderConfig;
  featureProviders: Record<AiFeatureId, AiProviderId>;
  /** null = unlimited */
  dailyTokenLimit: number | null;
  /** YYYY-MM-DD UTC */
  usageDate: string | null;
  usageTokens: number;
}

export interface AiProviderPublic {
  hasApiKey: boolean;
  baseUrl: string;
  model: string;
  configured: boolean;
}

export interface AiSettingsPublic {
  enabled: boolean;
  defaultProvider: AiProviderId;
  openai: AiProviderPublic;
  gemini: AiProviderPublic;
  featureProviders: Record<AiFeatureId, AiProviderId>;
  dailyTokenLimit: number | null;
  usageTokens: number;
  usageDate: string | null;
  limitExceeded: boolean;
  /** enabled && at least one provider configured */
  configured: boolean;
}

/** Decrypted credentials for server-side AI calls only. Never send to the client. */
export interface AiProviderRuntime {
  apiKey: string | null;
  baseUrl: string | null;
  model: string;
}

export interface AiSettingsRuntime {
  enabled: boolean;
  defaultProvider: AiProviderId;
  openai: AiProviderRuntime;
  gemini: AiProviderRuntime;
  featureProviders: Record<AiFeatureId, AiProviderId>;
  dailyTokenLimit: number | null;
  usageDate: string | null;
  usageTokens: number;
}

export const AI_PROVIDER_IDS: AiProviderId[] = ["openai", "gemini"];

export const AI_FEATURE_IDS: AiFeatureId[] = [
  "directive_understanding",
  "action_assistant",
  "campaign_advisor",
  "autopsy",
  "memory_extract",
];

export const AI_FEATURE_LABELS: Record<AiFeatureId, string> = {
  directive_understanding: "درک دستورکار",
  action_assistant: "دستیار اقدام",
  campaign_advisor: "مشاور کمپین",
  autopsy: "کالبدشکافی",
  memory_extract: "استخراج حافظه",
};

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

function defaultFeatureProviders(defaultProvider: AiProviderId): Record<AiFeatureId, AiProviderId> {
  return {
    directive_understanding: defaultProvider,
    action_assistant: defaultProvider,
    campaign_advisor: defaultProvider,
    autopsy: defaultProvider,
    memory_extract: defaultProvider,
  };
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  defaultProvider: "openai",
  openai: {
    apiKeyEncrypted: null,
    baseUrl: null,
    model: DEFAULT_OPENAI_MODEL,
  },
  gemini: {
    apiKeyEncrypted: null,
    baseUrl: null,
    model: DEFAULT_GEMINI_MODEL,
  },
  featureProviders: defaultFeatureProviders("openai"),
  dailyTokenLimit: null,
  usageDate: null,
  usageTokens: 0,
};

function normalizeProviderId(value: unknown, fallback: AiProviderId): AiProviderId {
  if (value === "openai" || value === "gemini") return value;
  return fallback;
}

function normalizeProviderConfig(
  value: unknown,
  defaults: AiProviderConfig
): AiProviderConfig {
  if (!value || typeof value !== "object") {
    return { ...defaults };
  }

  const record = value as Partial<AiProviderConfig>;
  return {
    apiKeyEncrypted:
      typeof record.apiKeyEncrypted === "string" && record.apiKeyEncrypted.trim()
        ? record.apiKeyEncrypted.trim()
        : null,
    baseUrl:
      typeof record.baseUrl === "string" && record.baseUrl.trim()
        ? record.baseUrl.trim()
        : null,
    model:
      typeof record.model === "string" && record.model.trim()
        ? record.model.trim()
        : defaults.model,
  };
}

function normalizeFeatureProviders(
  value: unknown,
  defaultProvider: AiProviderId
): Record<AiFeatureId, AiProviderId> {
  const base = defaultFeatureProviders(defaultProvider);
  if (!value || typeof value !== "object") {
    return base;
  }

  const record = value as Partial<Record<AiFeatureId, unknown>>;
  for (const feature of AI_FEATURE_IDS) {
    base[feature] = normalizeProviderId(record[feature], defaultProvider);
  }
  return base;
}

export function normalizeAiSettings(value: unknown): AiSettings {
  if (!value || typeof value !== "object") {
    return {
      ...DEFAULT_AI_SETTINGS,
      openai: { ...DEFAULT_AI_SETTINGS.openai },
      gemini: { ...DEFAULT_AI_SETTINGS.gemini },
      featureProviders: { ...DEFAULT_AI_SETTINGS.featureProviders },
    };
  }

  const record = value as Partial<AiSettings>;
  const defaultProvider = normalizeProviderId(record.defaultProvider, "openai");
  const dailyTokenLimit =
    typeof record.dailyTokenLimit === "number" &&
    Number.isFinite(record.dailyTokenLimit) &&
    record.dailyTokenLimit > 0
      ? Math.floor(record.dailyTokenLimit)
      : null;

  return {
    enabled: Boolean(record.enabled),
    defaultProvider,
    openai: normalizeProviderConfig(record.openai, DEFAULT_AI_SETTINGS.openai),
    gemini: normalizeProviderConfig(record.gemini, DEFAULT_AI_SETTINGS.gemini),
    featureProviders: normalizeFeatureProviders(record.featureProviders, defaultProvider),
    dailyTokenLimit,
    usageDate:
      typeof record.usageDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.usageDate)
        ? record.usageDate
        : null,
    usageTokens:
      typeof record.usageTokens === "number" && Number.isFinite(record.usageTokens)
        ? Math.max(0, Math.floor(record.usageTokens))
        : 0,
  };
}

function isProviderConfigured(config: AiProviderConfig): boolean {
  return Boolean(config.apiKeyEncrypted?.trim() && config.model.trim());
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isDailyTokenLimitExceeded(settings: Pick<
  AiSettings,
  "dailyTokenLimit" | "usageDate" | "usageTokens"
>): boolean {
  if (settings.dailyTokenLimit == null) return false;
  const today = utcToday();
  const used = settings.usageDate === today ? settings.usageTokens : 0;
  return used >= settings.dailyTokenLimit;
}

export function isAiAvailable(settings: AiSettings): boolean {
  if (!settings.enabled) return false;
  if (isDailyTokenLimitExceeded(settings)) return false;
  return (
    isProviderConfigured(settings.openai) || isProviderConfigured(settings.gemini)
  );
}

export function getProviderForFeature(
  settings: Pick<AiSettings, "defaultProvider" | "featureProviders">,
  feature: AiFeatureId
): AiProviderId {
  return settings.featureProviders[feature] ?? settings.defaultProvider;
}

export function toPublicAiSettings(settings: AiSettings): AiSettingsPublic {
  const openaiConfigured = isProviderConfigured(settings.openai);
  const geminiConfigured = isProviderConfigured(settings.gemini);
  const limitExceeded = isDailyTokenLimitExceeded(settings);

  return {
    enabled: settings.enabled,
    defaultProvider: settings.defaultProvider,
    openai: {
      hasApiKey: Boolean(settings.openai.apiKeyEncrypted?.trim()),
      baseUrl: settings.openai.baseUrl ?? "",
      model: settings.openai.model,
      configured: openaiConfigured,
    },
    gemini: {
      hasApiKey: Boolean(settings.gemini.apiKeyEncrypted?.trim()),
      baseUrl: settings.gemini.baseUrl ?? "",
      model: settings.gemini.model,
      configured: geminiConfigured,
    },
    featureProviders: { ...settings.featureProviders },
    dailyTokenLimit: settings.dailyTokenLimit,
    usageTokens: settings.usageDate === utcToday() ? settings.usageTokens : 0,
    usageDate: settings.usageDate,
    limitExceeded,
    configured: settings.enabled && (openaiConfigured || geminiConfigured),
  };
}
