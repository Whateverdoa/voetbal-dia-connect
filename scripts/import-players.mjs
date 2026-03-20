#!/usr/bin/env node
/**
 * Import players from a CSV file into Convex.
 *
 * Usage:
 *   node scripts/import-players.mjs path/to/players.csv [--dry-run] [--ops-secret <secret>]
 *
 * CSV format: Team,Naam (or Team;Naam)
 * Names are auto-reordered from "Lastname Firstname" to "Firstname Lastname".
 * Only JO/MO teams are imported by default.
 */
import { execSync } from "child_process";
import { parsePlayersCsv, groupByTeam } from "./lib/csv-utils.mjs";

const args = process.argv.slice(2);
const csvPath = args.find((arg) => !arg.startsWith("--"));
const dryRun = args.includes("--dry-run");
const opsSecretIndex = args.indexOf("--ops-secret");
const opsSecret = opsSecretIndex !== -1 ? args[opsSecretIndex + 1] : process.env.CONVEX_OPS_SECRET;

if (!csvPath) {
  console.error("Usage: node scripts/import-players.mjs <csv-path> [--dry-run] [--ops-secret <secret>]");
  process.exit(1);
}

if (!opsSecret && !dryRun) {
  console.error("Missing ops secret. Provide --ops-secret or set CONVEX_OPS_SECRET.");
  process.exit(1);
}

console.log(`\n📂 Reading CSV: ${csvPath}`);
console.log(`🔐 Auth: ${opsSecret ? "ops-secret provided" : "dry-run without auth"}`);
console.log(`🏃 Mode: ${dryRun ? "DRY-RUN (no writes)" : "COMMIT (will write to DB)"}\n`);

const players = parsePlayersCsv(csvPath);
const grouped = groupByTeam(players);
const teamSlugs = Object.keys(grouped).sort();

console.log(`Found ${players.length} players across ${teamSlugs.length} teams:\n`);

for (const slug of teamSlugs) {
  const roster = grouped[slug];
  console.log(`  ${slug.toUpperCase().padEnd(10)} ${roster.length} spelers`);
}

console.log("");

if (dryRun) {
  console.log("=== DRY-RUN: showing what would be imported ===\n");
  for (const slug of teamSlugs) {
    console.log(`--- ${slug.toUpperCase()} ---`);
    for (const player of grouped[slug]) {
      console.log(`  #${String(player.number).padStart(2)} ${player.name}`);
    }
    console.log("");
  }
  console.log("No data was written. Remove --dry-run to commit.\n");
  process.exit(0);
}

console.log("=== IMPORTING ===\n");

for (const slug of teamSlugs) {
  const roster = grouped[slug];
  const payload = JSON.stringify({
    opsSecret,
    teamSlug: slug,
    players: roster,
    dryRun: false,
  });

  try {
    const result = execSync(
      `npx convex run "import/importPlayers:upsertTeamPlayers" '${payload}'`,
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
