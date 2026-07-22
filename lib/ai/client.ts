import {
  getProviderForFeature,
  isDailyTokenLimitExceeded,
  type AiFeatureId,
  type AiProviderId,
  type AiProviderRuntime,
  type AiSettingsRuntime,
} from "@/lib/ai/settings";
import {
  pgGetAiSettingsForRuntime,
  pgIncrementAiTokenUsage,
} from "@/lib/db/ai-settings";
import { isPostgresConfigured } from "@/lib/utils";

const OPENAI_DEFAULT_BASE = "https://api.openai.com/v1";
const GEMINI_DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta";
const PERSIAN_FORCE = "همیشه به فارسی پاسخ بده.";

function ensurePersianSystemPrompt(system: string): string {
  const trimmed = system.trim();
  if (trimmed.includes(PERSIAN_FORCE)) {
    return trimmed;
  }
  return trimmed ? `${trimmed}\n\n${PERSIAN_FORCE}` : PERSIAN_FORCE;
}

function persianFriendlyError(message: string): Error {
  return new Error(message);
}

function getProviderRuntime(
  settings: AiSettingsRuntime,
  provider: AiProviderId
): AiProviderRuntime {
  return provider === "openai" ? settings.openai : settings.gemini;
}

function assertCanCallAi(
  settings: AiSettingsRuntime,
  provider: AiProviderId
): AiProviderRuntime {
  if (!settings.enabled) {
    throw persianFriendlyError("قابلیت هوش مصنوعی غیرفعال است.");
  }
  if (isDailyTokenLimitExceeded(settings)) {
    throw persianFriendlyError("سقف مصرف روزانه توکن به پایان رسیده است.");
  }

  const runtime = getProviderRuntime(settings, provider);
  if (!runtime.apiKey?.trim()) {
    throw persianFriendlyError(
      provider === "openai"
        ? "کلید API مربوط به OpenAI تنظیم نشده است."
        : "کلید API مربوط به Gemini تنظیم نشده است."
    );
  }
  if (!runtime.model?.trim()) {
    throw persianFriendlyError("مدل هوش مصنوعی تنظیم نشده است.");
  }

  return runtime;
}

async function callOpenAiChat(opts: {
  apiKey: string;
  baseUrl: string | null;
  model: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ text: string; tokensUsed: number }> {
  const base = (opts.baseUrl?.trim() || OPENAI_DEFAULT_BASE).replace(/\/$/, "");
  const url = `${base}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: opts.temperature ?? 0.3,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      }),
    });
  } catch {
    throw persianFriendlyError("اتصال به سرویس OpenAI برقرار نشد.");
  }

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
  } | null;

  if (!response.ok) {
    throw persianFriendlyError(
      payload?.error?.message?.trim()
        ? `خطای OpenAI: ${payload.error.message}`
        : `درخواست OpenAI ناموفق بود (${response.status}).`
    );
  }

  const text = payload?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw persianFriendlyError("پاسخ خالی از OpenAI دریافت شد.");
  }

  const tokensUsed =
    typeof payload?.usage?.total_tokens === "number"
      ? payload.usage.total_tokens
      : (payload?.usage?.prompt_tokens ?? 0) + (payload?.usage?.completion_tokens ?? 0);

  return { text, tokensUsed: Math.max(0, tokensUsed) };
}

async function callGeminiChat(opts: {
  apiKey: string;
  baseUrl: string | null;
  model: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ text: string; tokensUsed: number }> {
  const base = (opts.baseUrl?.trim() || GEMINI_DEFAULT_BASE).replace(/\/$/, "");
  const modelPath = opts.model.startsWith("models/")
    ? opts.model
    : `models/${opts.model}`;
  const url = `${base}/${modelPath}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.user }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
        },
      }),
    });
  } catch {
    throw persianFriendlyError("اتصال به سرویس Gemini برقرار نشد.");
  }

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      totalTokenCount?: number;
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
  } | null;

  if (!response.ok) {
    throw persianFriendlyError(
      payload?.error?.message?.trim()
        ? `خطای Gemini: ${payload.error.message}`
        : `درخواست Gemini ناموفق بود (${response.status}).`
    );
  }

  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";

  if (!text) {
    throw persianFriendlyError("پاسخ خالی از Gemini دریافت شد.");
  }

  const tokensUsed =
    typeof payload?.usageMetadata?.totalTokenCount === "number"
      ? payload.usageMetadata.totalTokenCount
      : (payload?.usageMetadata?.promptTokenCount ?? 0) +
        (payload?.usageMetadata?.candidatesTokenCount ?? 0);

  return { text, tokensUsed: Math.max(0, tokensUsed) };
}

export async function testAiProviderConnection(
  provider: AiProviderId
): Promise<{ ok: boolean; error?: string; model?: string }> {
  if (!isPostgresConfigured()) {
    return { ok: false, error: "پایگاه داده پیکربندی نشده است." };
  }

  try {
    const settings = await pgGetAiSettingsForRuntime();
    const runtime = getProviderRuntime(settings, provider);

    if (!runtime.apiKey?.trim()) {
      return {
        ok: false,
        error:
          provider === "openai"
            ? "کلید API مربوط به OpenAI تنظیم نشده است."
            : "کلید API مربوط به Gemini تنظیم نشده است.",
      };
    }

    const system = ensurePersianSystemPrompt("تو یک تست اتصال کوتاه انجام می‌دهی.");
    const user = "فقط بنویس: ok";

    if (provider === "openai") {
      const result = await callOpenAiChat({
        apiKey: runtime.apiKey,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        system,
        user,
        temperature: 0,
      });
      if (result.tokensUsed > 0) {
        await pgIncrementAiTokenUsage(result.tokensUsed);
      }
      return { ok: true, model: runtime.model };
    }

    const result = await callGeminiChat({
      apiKey: runtime.apiKey,
      baseUrl: runtime.baseUrl,
      model: runtime.model,
      system,
      user,
      temperature: 0,
    });
    if (result.tokensUsed > 0) {
      await pgIncrementAiTokenUsage(result.tokensUsed);
    }
    return { ok: true, model: runtime.model };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "تست اتصال ناموفق بود.",
    };
  }
}

export async function completeAiChat(opts: {
  feature: AiFeatureId;
  providerOverride?: AiProviderId;
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ text: string; tokensUsed: number; provider: AiProviderId }> {
  if (!isPostgresConfigured()) {
    throw persianFriendlyError("پایگاه داده پیکربندی نشده است.");
  }

  const settings = await pgGetAiSettingsForRuntime();
  const provider =
    opts.providerOverride ?? getProviderForFeature(settings, opts.feature);
  const runtime = assertCanCallAi(settings, provider);
  const system = ensurePersianSystemPrompt(opts.system);

  const result =
    provider === "openai"
      ? await callOpenAiChat({
          apiKey: runtime.apiKey!,
          baseUrl: runtime.baseUrl,
          model: runtime.model,
          system,
          user: opts.user,
          temperature: opts.temperature,
        })
      : await callGeminiChat({
          apiKey: runtime.apiKey!,
          baseUrl: runtime.baseUrl,
          model: runtime.model,
          system,
          user: opts.user,
          temperature: opts.temperature,
        });

  if (result.tokensUsed > 0) {
    await pgIncrementAiTokenUsage(result.tokensUsed);
  }

  return {
    text: result.text,
    tokensUsed: result.tokensUsed,
    provider,
  };
}
