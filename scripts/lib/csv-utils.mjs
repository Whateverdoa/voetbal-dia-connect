/**
 * Shared CSV parsing utilities for DIA Live import scripts.
 * Handles Dutch name conventions and team CSV format.
 */
import { readFileSync } from "fs";

const DUTCH_PARTICLES = new Set([
  "van", "de", "der", "den", "het", "ten", "ter", "te",
  "el", "al", "von", "la", "le", "du", "di", "da",
]);

/**
 * Convert "Lastname Firstname [particles]" → "Firstname [particles] Lastname".
 * Handles Dutch tussenvoegsels (van, de, van der, etc.).
 */
export function reorderDutchName(csvName) {
  const parts = csvName.trim().split(/\s+/);
  if (parts.length <= 1) return csvName.trim();

  const lastname = parts[0];
  const rest = parts.slice(1);

  // Scan from end to find consecutive particles
  let particleStart = rest.length;
  for (let i = rest.length - 1; i >= 1; i--) {
    if (DUTCH_PARTICLES.has(rest[i].toLowerCase())) {
      particleStart = i;
    } else {
      break;
    }
  }

  const firstname = rest.slice(0, particleStart).join(" ");
  const particles = rest
    .slice(particleStart)
    .map((p) => p.toLowerCase())
    .join(" ");

  if (particles) {
    return `${firstname} ${particles} ${lastname}`;
  }
  return `${firstname} ${lastname}`;
}

/**
 * Parse a players CSV file (Team,Naam or Team;Naam format).
 * Returns array of { team, name } with names reordered to "Firstname Lastname".
 * Handles carry-forward: if Team cell is empty, inherits from previous row.
 */
export function parsePlayersCsv(filePath, { joMoOnly = true } = {}) {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const rows = lines.slice(1); // skip header

  let currentTeam = "";
  const results = [];

  for (const row of rows) {
    const [teamCell, nameCell] = row.split(delimiter).map((c) => c.trim());

    if (teamCell) currentTeam = teamCell;
    if (!nameCell || !currentTeam) continue;

    if (joMoOnly && !currentTeam.startsWith("JO") && !currentTeam.startsWith("MO")) {
      continue;
    }

    results.push({
      team: currentTeam,
      teamSlug: currentTeam.toLowerCase(),
      name: reorderDutchName(nameCell),
    });
  }

  return results;
}

/**
 * Group parsed player rows by team slug.
 * Returns Record<teamSlug, Array<{name, number}>>.
 */
export function groupByTeam(players) {
  const grouped = {};
  for (const p of players) {
    if (!grouped[p.teamSlug]) grouped[p.teamSlug] = [];
    grouped[p.teamSlug].push({
      name: p.name,
      number: grouped[p.teamSlug].length + 1,
    });
  }
  return grouped;
}

/**
 * Parse a matches CSV file.
 * Expected format: team_slug,opponent,date,time,is_home,finished,home_score,away_score
 */
export function parseMatchesCsv(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const rows = lines.slice(1);

  return rows.map((row) => {
    const cols = row.split(delimiter).map((c) => c.trim());
    const [teamSlug, opponent, date, time, isHome, finished, homeScore, awayScore] = cols;

    return {
      teamSlug,
      opponent,
      date: `${date}T${time || "10:00"}:00`,
      isHome: isHome === "true" || isHome === "1",
      finished: finished === "true" || finished === "1",
      homeScore: homeScore ? parseInt(homeScore, 10) : undefined,
      awayScore: awayScore ? parseInt(awayScore, 10) : undefined,
    };
  });
}
