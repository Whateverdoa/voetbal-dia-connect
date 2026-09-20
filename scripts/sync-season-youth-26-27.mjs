/**
 * Create missing 26-27 youth teams, hide leftover JO/MO, then import rosters.
 * Never writes JO13-2 players.
 */
import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import {
  groupByTeam,
  isFrozenJo132Slug,
  parsePlayersCsv,
} from "./lib/csv-utils.mjs";

function loadEnvLocal() {
  const text = readFileSync(".env.local", "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function convexRun(functionName, args) {
  try {
    const out = execFileSync(
      process.execPath,
      [
        "node_modules/convex/bin/main.js",
        "run",
        "--typecheck",
        "disable",
        functionName,
        JSON.stringify(args),
      ],
      { encoding: "utf8", windowsHide: true },
    );
    const redacted = out.replace(/opsSecret":\s*"[^"]+"/g, 'opsSecret":"***"');
    const start = redacted.indexOf("{");
    const end = redacted.lastIndexOf("}");
    if (start < 0 || end < start) {
      throw new Error(`No JSON in convex output: ${redacted.slice(0, 400)}`);
    }
    return JSON.parse(redacted.slice(start, end + 1));
  } catch (error) {
    const raw = `${error.stderr ?? ""} ${error.stdout ?? ""} ${error.message ?? ""}`;
    throw new Error(
      raw.replace(/opsSecret":\s*"[^"]+"/g, 'opsSecret":"***"').slice(0, 500),
    );
  }
}

loadEnvLocal();
const opsSecret = process.env.CONVEX_OPS_SECRET;
if (!opsSecret) {
  console.error("CONVEX_OPS_SECRET ontbreekt");
  process.exit(1);
}

const players = parsePlayersCsv("docs/Teamindelingen_26-27.csv", {
  reorderNames: false,
});
const grouped = groupByTeam(players);
const slugs = [...new Set([...Object.keys(grouped), "jo13-2"])].sort();

console.log(`Sync ${slugs.length} 26-27 jeugdteams`);
const sync = convexRun("import/syncSeasonYouthTeams:apply", {
  opsSecret,
  slugs,
  dryRun: false,
});
console.log(
  `created=${sync.created.join(",") || "-"} hidden=${sync.hidden.join(",") || "-"} playersOff=${sync.playersDeactivated}`,
);

const importSlugs = slugs.filter((slug) => !isFrozenJo132Slug(slug));
for (const slug of importSlugs) {
  const roster = grouped[slug];
  if (!roster) {
    continue;
  }
  try {
    const result = convexRun("import/importPlayers:upsertTeamPlayers", {
      opsSecret,
      teamSlug: slug,
      players: roster,
      dryRun: false,
      deactivateMissing: true,
    });
    if (result.error) {
      console.log(`${slug}: ${result.error}`);
    } else {
      console.log(
        `${slug}: +${result.created} ~${result.skipped} -${result.deactivated ?? 0}`,
      );
    }
  } catch (error) {
    console.log(`${slug}: FAIL ${String(error.message).slice(0, 180)}`);
  }
}
