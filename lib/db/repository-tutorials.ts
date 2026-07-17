import { getSql } from "@/lib/db/client";
import {
  TUTORIAL_SECTION_KEYS,
  isTutorialSectionKey,
  normalizeTutorialSteps,
  type SectionTutorial,
  type TutorialSectionKey,
  type TutorialStep,
  type TutorialCompletionStatus,
  tutorialSectionLabels,
} from "@/lib/section-tutorials";

function mapTutorialFromDb(row: Record<string, unknown>): SectionTutorial | null {
  const sectionKey = row.section_key;
  if (!isTutorialSectionKey(sectionKey)) return null;

  return {
    sectionKey,
    title: String(row.title ?? tutorialSectionLabels[sectionKey]),
    version: Number(row.version) || 1,
    steps: normalizeTutorialSteps(row.steps),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function pgListSectionTutorials(): Promise<SectionTutorial[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT section_key, title, version, steps, updated_at
    FROM section_tutorials
    ORDER BY section_key
  `;

  return rows
    .map((row) => mapTutorialFromDb(row as Record<string, unknown>))
    .filter((item): item is SectionTutorial => Boolean(item));
}

export async function pgGetSectionTutorial(
  sectionKey: TutorialSectionKey
): Promise<SectionTutorial | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT section_key, title, version, steps, updated_at
    FROM section_tutorials
    WHERE section_key = ${sectionKey}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapTutorialFromDb(rows[0] as Record<string, unknown>);
}

export async function pgSaveSectionTutorial(input: {
  sectionKey: TutorialSectionKey;
  title: string;
  steps: TutorialStep[];
  bumpVersion?: boolean;
}): Promise<{ success: true; tutorial: SectionTutorial } | { success: false; error: string }> {
  const sql = getSql();
  const now = new Date().toISOString();
  const steps = normalizeTutorialSteps(input.steps);
  const title = input.title.trim() || tutorialSectionLabels[input.sectionKey];
  const bumpVersion = input.bumpVersion !== false;

  const existing = await pgGetSectionTutorial(input.sectionKey);
  const nextVersion = existing
    ? bumpVersion
      ? existing.version + 1
      : existing.version
    : 1;

  await sql`
    INSERT INTO section_tutorials (section_key, title, version, steps, updated_at)
    VALUES (
      ${input.sectionKey},
      ${title},
      ${nextVersion},
      ${sql.json(JSON.parse(JSON.stringify(steps)))},
      ${now}
    )
    ON CONFLICT (section_key) DO UPDATE SET
      title = EXCLUDED.title,
      version = EXCLUDED.version,
      steps = EXCLUDED.steps,
      updated_at = EXCLUDED.updated_at
  `;

  return {
    success: true,
    tutorial: {
      sectionKey: input.sectionKey,
      title,
      version: nextVersion,
      steps,
      updatedAt: now,
    },
  };
}

export async function pgGetTutorialCompletion(
  userId: string,
  sectionKey: TutorialSectionKey
): Promise<{ tutorialVersion: number; completedAt: string } | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT tutorial_version, completed_at
    FROM user_tutorial_completions
    WHERE user_id = ${userId}
      AND section_key = ${sectionKey}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return {
    tutorialVersion: Number(rows[0].tutorial_version) || 0,
    completedAt: String(rows[0].completed_at),
  };
}

export async function pgCompleteTutorial(input: {
  userId: string;
  sectionKey: TutorialSectionKey;
  tutorialVersion: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const sql = getSql();
  const now = new Date().toISOString();

  await sql`
    INSERT INTO user_tutorial_completions (user_id, section_key, tutorial_version, completed_at)
    VALUES (
      ${input.userId},
      ${input.sectionKey},
      ${input.tutorialVersion},
      ${now}
    )
    ON CONFLICT (user_id, section_key) DO UPDATE SET
      tutorial_version = EXCLUDED.tutorial_version,
      completed_at = EXCLUDED.completed_at
  `;

  return { success: true };
}

export async function pgGetTutorialCompletionStatus(
  userId: string,
  sectionKey: TutorialSectionKey
): Promise<TutorialCompletionStatus> {
  const tutorial = await pgGetSectionTutorial(sectionKey);
  const completion = await pgGetTutorialCompletion(userId, sectionKey);
  const steps = tutorial?.steps ?? [];
  const hasContent = steps.length > 0;
  const version = tutorial?.version ?? 0;
  const completedVersion = completion?.tutorialVersion ?? null;
  const isCompleted =
    hasContent && completedVersion !== null && completedVersion >= version;

  return {
    sectionKey,
    hasContent,
    title: tutorial?.title || tutorialSectionLabels[sectionKey],
    version,
    steps,
    isCompleted,
    completedVersion,
  };
}

export async function pgListTutorialCompletionStatuses(
  userId: string
): Promise<TutorialCompletionStatus[]> {
  const tutorials = await pgListSectionTutorials();
  const sql = getSql();
  const completionRows = await sql`
    SELECT section_key, tutorial_version
    FROM user_tutorial_completions
    WHERE user_id = ${userId}
  `;

  const completionMap = new Map<string, number>();
  for (const row of completionRows) {
    if (isTutorialSectionKey(row.section_key)) {
      completionMap.set(String(row.section_key), Number(row.tutorial_version) || 0);
    }
  }

  const tutorialMap = new Map(tutorials.map((item) => [item.sectionKey, item]));

  return TUTORIAL_SECTION_KEYS.map((sectionKey) => {
    const tutorial = tutorialMap.get(sectionKey);
    const steps = tutorial?.steps ?? [];
    const hasContent = steps.length > 0;
    const version = tutorial?.version ?? 0;
    const completedVersion = completionMap.get(sectionKey) ?? null;
    const isCompleted =
      hasContent && completedVersion !== null && completedVersion >= version;

    return {
      sectionKey,
      hasContent,
      title: tutorial?.title || tutorialSectionLabels[sectionKey],
      version,
      steps,
      isCompleted,
      completedVersion,
    };
  });
}
