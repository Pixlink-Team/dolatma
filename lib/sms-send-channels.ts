export const SMS_SEND_CHANNEL_OPTIONS = [
  "sms",
  "bale",
  "eitaa",
  "telegram",
  "rubika",
  "soroush",
  "other",
] as const;

export type SmsSendChannel = (typeof SMS_SEND_CHANNEL_OPTIONS)[number];

const SMS_SEND_CHANNEL_SET = new Set<string>(SMS_SEND_CHANNEL_OPTIONS);

const SMS_SEND_CHANNEL_LABELS: Record<SmsSendChannel, string> = {
  sms: "پیامک",
  bale: "بله",
  eitaa: "ایتا",
  telegram: "تلگرام",
  rubika: "روبیکا",
  soroush: "سروش",
  other: "سایر",
};

export function isSmsSendChannel(value: unknown): value is SmsSendChannel {
  return typeof value === "string" && SMS_SEND_CHANNEL_SET.has(value);
}

export function getSmsSendChannelLabel(channel: SmsSendChannel): string {
  return SMS_SEND_CHANNEL_LABELS[channel];
}

export function parseSmsSendChannels(value: unknown): SmsSendChannel[] {
  const raw =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return [];
          }
        })()
      : value;

  if (!Array.isArray(raw)) return [];

  const seen = new Set<SmsSendChannel>();
  const channels: SmsSendChannel[] = [];
  for (const item of raw) {
    if (!isSmsSendChannel(item) || seen.has(item)) continue;
    seen.add(item);
    channels.push(item);
  }
  return channels;
}

/** Persist at most one channel — bulk send reports are single-media. */
export function normalizeSmsSendChannels(value: unknown): SmsSendChannel[] {
  const channels = parseSmsSendChannels(value);
  return channels.length > 0 ? [channels[0]] : [];
}
