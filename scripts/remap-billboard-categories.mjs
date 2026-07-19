import postgres from "postgres";

/**
 * Remap legacy billboard.category values to the current taxonomy.
 * Requires DATABASE_URL in the environment.
 *
 * Usage: node scripts/remap-billboard-categories.mjs
 */
const REMAPS = [
  { from: ["banner", "narde", "sakhteman"], to: "fence_wall_banner" },
  { from: ["lightbox"], to: "other" },
  { from: ["monitor"], to: "urban_tv" },
  { from: ["bus_shelter"], to: "bus_metro" },
  { from: ["darbast"], to: "scaffolding" },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const before = await sql`
      SELECT category, COUNT(*)::int AS count
      FROM billboards
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `;
    console.log("Before remap:");
    for (const row of before) {
      console.log(`  ${row.category}: ${row.count}`);
    }

    let totalUpdated = 0;
    for (const remap of REMAPS) {
      const result = await sql`
        UPDATE billboards
        SET category = ${remap.to}, updated_at = now()
        WHERE category IN ${sql(remap.from)}
      `;
      const count = result.count ?? 0;
      totalUpdated += count;
      if (count > 0) {
        console.log(`  ${remap.from.join(", ")} → ${remap.to}: ${count}`);
      }
    }

    const after = await sql`
      SELECT category, COUNT(*)::int AS count
      FROM billboards
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `;
    console.log(`Done. Updated ${totalUpdated} rows.`);
    console.log("After remap:");
    for (const row of after) {
      console.log(`  ${row.category}: ${row.count}`);
    }
  } catch (error) {
    console.error("Remap failed:", error);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main();
