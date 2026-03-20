#!/usr/bin/env node
/**
 * Import matches from a CSV file into Convex.
 *
 * Usage:
 *   node scripts/import-matches.mjs path/to/matches.csv [--dry-run] [--ops-secret <secret>] [--coach-email <email>]
 *
 * CSV format (header required):
 *   team_slug,opponent,date,time,is_home,finished,home_score,away_score
 */
import { execSync } from "child_process";
import { parseMatchesCsv } from "./lib/csv-utils.mjs";

const args = process.argv.slice(2);
const csvPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");
const opsSecretIndex = args.indexOf("--ops-secret");
const coachEmailIndex = args.indexOf("--coach-email");
const opsSecret = opsSecretIndex !== -1 ? args[opsSecretIndex + 1] : process.env.CONVEX_OPS_SECRET;
const coachEmail = coachEmailIndex !== -1 ? args[coachEmailIndex + 1] : undefined;

if (!csvPath) {
  console.error(
    "Usage: node scripts/import-matches.mjs <csv-path> [--dry-run] [--ops-secret <secret>] [--coach-email <email>]",
  );
  process.exit(1);
}

if (!opsSecret && !dryRun) {
  console.error("Missing ops secret. Provide --ops-secret or set CONVEX_OPS_SECRET.");
  process.exit(1);
}

console.log(`\n📂 Reading CSV: ${csvPath}`);
console.log(`🔐 Auth: ${opsSecret ? "ops-secret provided" : "dry-run without auth"}`);
console.log(`🏃 Mode: ${dryRun ? "DRY-RUN (no writes)" : "COMMIT (will write to DB)"}`);
if (coachEmail) {
  console.log(`📧 Coach override: ${coachEmail}`);
}
console.log("");

const matches = parseMatchesCsv(csvPath);
const byTeam = {};
for (const match of matches) {
  if (!byTeam[match.teamSlug]) byTeam[match.teamSlug] = [];
  byTeam[match.teamSlug].push(match);
}

const teamSlugs = Object.keys(byTeam).sort();

console.log(`Found ${matches.length} matches across ${teamSlugs.length} teams:\n`);

for (const slug of teamSlugs) {
  const teamMatches = byTeam[slug];
  const finished = teamMatches.filter((match) => match.finished).length;
  const upcoming = teamMatches.length - finished;
  console.log(`  ${slug.toUpperCase().padEnd(10)} ${teamMatches.length} wedstrijden (${finished} gespeeld, ${upcoming} komend)`);
}

console.log("");

if (dryRun) {
  console.log("=== DRY-RUN: showing what would be imported ===\n");
  for (const slug of teamSlugs) {
    console.log(`--- ${slug.toUpperCase()} ---`);
    for (const match of byTeam[slug]) {
      const status = match.finished ? `${match.homeScore}-${match.awayScore}` : "gepland";
      const home = match.isHome ? "(thuis)" : "(uit)";
      console.log(`  ${match.date.slice(0, 10)} vs ${match.opponent} ${home} ${status}`);
    }
    console.log("");
  }
  console.log("No data was written. Remove --dry-run to commit.\n");
  process.exit(0);
}

console.log("=== IMPORTING ===\n");

for (const slug of teamSlugs) {
  const teamMatches = byTeam[slug].map(({ teamSlug: _teamSlug, ...rest }) => rest);
  const payload = JSON.stringify({
    opsSecret,
    teamSlug: slug,
    coachEmail,
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
      console.log(`  ✅ ${slug.toUpperCase()}: ${parsed.created} created, ${parsed.skipped} skipped`);
    }
  } catch (error) {
    console.error(`  ❌ ${slug.toUpperCase()}: ${error.message}`);
  }
}

console.log("\nDone!\n");
