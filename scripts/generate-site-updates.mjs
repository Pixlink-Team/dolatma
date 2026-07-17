import { execFileSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, "..", "lib", "site-updates.generated.json");

const MAX_ENTRIES = 200;
const FIELD_SEPARATOR = "\u001f";
const RECORD_SEPARATOR = "\u001e";
const PERSIAN_CHARS = /[\u0600-\u06FF]/g;
const FA_TITLE_PREFIX = /^FA:\s*/i;

/** A subject counts as Persian when most of its letters are Persian, not just a quoted word. */
function isMostlyPersian(text) {
  const persianCount = (text.match(PERSIAN_CHARS) ?? []).length;
  const latinCount = (text.match(/[A-Za-z]/g) ?? []).length;
  return persianCount > 0 && persianCount >= latinCount;
}

/**
 * Extract the Persian title for a commit.
 * Priority: explicit "FA: ..." line in the body → mostly-Persian subject → null (hidden).
 */
function resolvePersianTitle(subject, body) {
  const faLine = body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => FA_TITLE_PREFIX.test(line));
  if (faLine) {
    const title = faLine.replace(FA_TITLE_PREFIX, "").trim();
    if (title) return title;
  }
  if (isMostlyPersian(subject)) return subject.trim();
  return null;
}

function readExistingEntries() {
  try {
    if (existsSync(outputPath)) {
      const parsed = JSON.parse(readFileSync(outputPath, "utf8"));
      if (Array.isArray(parsed.entries)) return parsed.entries;
    }
  } catch {
    // Ignore malformed existing file and regenerate from scratch.
  }
  return [];
}

function generate() {
  let raw;
  try {
    raw = execFileSync(
      "git",
      [
        "log",
        `--pretty=format:%H${FIELD_SEPARATOR}%aI${FIELD_SEPARATOR}%s${FIELD_SEPARATOR}%b${RECORD_SEPARATOR}`,
        `-n`,
        String(MAX_ENTRIES),
      ],
      { cwd: join(__dirname, ".."), encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    // No git available (e.g. production image without .git) — keep the committed JSON as-is.
    console.log("site-updates: git unavailable, keeping existing generated file.");
    return;
  }

  const commits = raw
    .split(RECORD_SEPARATOR)
    .map((record) => record.replace(/^\n/, ""))
    .filter((record) => record.trim().length > 0)
    .map((record) => {
      const [hash, committedAt, subject = "", body = ""] = record.split(FIELD_SEPARATOR);
      return { hash, committedAt, subject: subject.trim(), body };
    })
    .filter((commit) => Boolean(commit.hash && commit.committedAt));

  const entries = commits
    .map((commit) => {
      const title = resolvePersianTitle(commit.subject, commit.body);
      if (!title) return null;
      return {
        hash: commit.hash,
        committedAt: commit.committedAt,
        title,
        subject: commit.subject,
      };
    })
    .filter((entry) => entry !== null);

  // Merge with previously generated entries so older commits beyond MAX_ENTRIES are preserved.
  // Commits present in the current git log are re-evaluated, not preserved blindly.
  const scannedHashes = new Set(commits.map((commit) => commit.hash));
  const preserved = readExistingEntries().filter((entry) => !scannedHashes.has(entry.hash));
  const merged = [...entries, ...preserved].sort((a, b) =>
    b.committedAt.localeCompare(a.committedAt)
  );

  writeFileSync(outputPath, `${JSON.stringify({ entries: merged }, null, 2)}\n`, "utf8");
  console.log(`site-updates: wrote ${merged.length} entries.`);
}

generate();
