#!/usr/bin/env node
/**
 * Import matches from a CSV file into Convex.
 *
 * Usage:
 *   node scripts/import-matches.mjs path/to/matches.csv [--dry-run] [--pin 9999] [--coach-pin 1234]
 *
 * CSV format (header required):
 *   team_slug,opponent,date,time,is_home,finished,home_score,away_score
 *
 * Example row:
 *   jo12-1,SCO JO12-2,2026-01-24,10:00,true,true,3,2
 */
import { execSync } from "child_process";
import { parseMatchesCsv } from "./lib/csv-utils.mjs";

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const pinIdx = args.indexOf("--pin");
const adminPin = pinIdx !== -1 ? args[pinIdx + 1] : "9999";
const cpIdx = args.indexOf("--coach-pin");
const coachPin = cpIdx !== -1 ? args[cpIdx + 1] : "1234";

if (!csvPath) {
  console.error(
    "Usage: node scripts/import-matches.mjs <csv-path> [--dry-run] [--pin <pin>] [--coach-pin <pin>]",
  );
  process.exit(1);
}

console.log(`\n📂 Reading CSV: ${csvPath}`);
console.log(`🔑 Admin PIN: ${"*".repeat(adminPin.length)}`);
console.log(`🏃 Mode: ${dryRun ? "DRY-RUN (no writes)" : "COMMIT (will write to DB)"}\n`);

const matches = parseMatchesCsv(csvPath);

// Group by team slug
const byTeam = {};
for (const m of matches) {
  if (!byTeam[m.teamSlug]) byTeam[m.teamSlug] = [];
  byTeam[m.teamSlug].push(m);
}

const teamSlugs = Object.keys(byTeam).sort();

console.log(`Found ${matches.length} matches across ${teamSlugs.length} teams:\n`);

for (const slug of teamSlugs) {
  const teamMatches = byTeam[slug];
  const finished = teamMatches.filter((m) => m.finished).length;
  const upcoming = teamMatches.length - finished;
  console.log(`  ${slug.toUpperCase().padEnd(10)} ${teamMatches.length} wedstrijden (${finished} gespeeld, ${upcoming} komend)`);
}

console.log("");

if (dryRun) {
  console.log("=== DRY-RUN: showing what would be imported ===\n");
  for (const slug of teamSlugs) {
    console.log(`--- ${slug.toUpperCase()} ---`);
    for (const m of byTeam[slug]) {
      const status = m.finished ? `${m.homeScore}-${m.awayScore}` : "gepland";
      const home = m.isHome ? "(thuis)" : "(uit)";
      console.log(`  ${m.date.slice(0, 10)} vs ${m.opponent} ${home} ${status}`);
    }
    console.log("");
  }
  console.log("No data was written. Remove --dry-run to commit.\n");
  process.exit(0);
}

console.log("=== IMPORTING ===\n");

for (const slug of teamSlugs) {
  const teamMatches = byTeam[slug].map(({ teamSlug: _, ...rest }) => rest);
  const payload = JSON.stringify({
    adminPin,
    teamSlug: slug,
    coachPin,
    matches: teamMatches,
    dryRun: false,
  });

  try {
    const result = execSync(
      `npx convex run "import/importMatches:importMatchBatch" '${payload}'`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );
    const parsed = JSON.parse(result.trim());

    if (parsed.error) {
      console.log(`  ❌ ${slug.toUpperCase()}: ${parsed.error}`);
    } else {
      console.log(
        `  ✅ ${slug.toUpperCase()}: ${parsed.created} created, ${parsed.skipped} skipped`,
      );
    }
  } catch (err) {
    console.error(`  ❌ ${slug.toUpperCase()}: ${err.message}`);
  }
}

console.log("\nDone!\n");
