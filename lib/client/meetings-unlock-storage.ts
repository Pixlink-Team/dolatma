import type { MeetingPublicDetail } from "@/lib/types";

function storageKey(campaignSlug: string) {
  return `campaign-meetings-unlocked:${campaignSlug}`;
}

export function loadUnlockedMeetings(campaignSlug: string): Record<string, MeetingPublicDetail> | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(storageKey(campaignSlug));
  if (!raw) return null;

  try {
    const meetings = JSON.parse(raw) as MeetingPublicDetail[];
    return Object.fromEntries(meetings.map((meeting) => [meeting.id, meeting]));
  } catch {
    sessionStorage.removeItem(storageKey(campaignSlug));
    return null;
  }
}

export function saveUnlockedMeetings(campaignSlug: string, meetings: MeetingPublicDetail[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(storageKey(campaignSlug), JSON.stringify(meetings));
}

export function clearUnlockedMeetings(campaignSlug: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKey(campaignSlug));
}
