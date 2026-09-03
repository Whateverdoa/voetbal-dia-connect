/**
 * Map Sportlink Club.Dataservice `teams` / `poulestand` rows onto our own shapes.
 *
 * `teams` lists every club team, including local (non-bond) teams that have no
 * poulecode; only bond teams in a regular competition have a standing.
 */
import { normalizeDiaSlug } from "./diaTeamNormalize";

export type RawSportlinkTeam = {
  teamcode?: number | string;
  poulecode?: number | string | null;
  teamnaam?: string;
  competitienaam?: string;
  klasse?: string;
  poule?: string;
  klassepoule?: string;
  competitiesoort?: string;
};

export type RawPoulestandRow = {
  positie?: number | string;
  teamnaam?: string;
  clublogo?: string | null;
  gespeeldewedstrijden?: number | string;
  gewonnen?: number | string;
  gelijk?: number | string;
  verloren?: number | string;
  doelpuntenvoor?: number | string;
  doelpuntentegen?: number | string;
  doelsaldo?: number | string;
  punten?: number | string;
  eigenteam?: string | boolean;
};

export type PouleAssignment = {
  /** Local team slug, e.g. "jo13-2". */
  teamSlug: string;
  poulecode: string;
  competitionName: string;
  klassepoule: string;
  /** Bond team name as Sportlink spells it, e.g. "DIA O13-2JM". */
  sportlinkTeamName: string;
};

export type StandingRow = {
  position: number;
  teamName: string;
  clubLogoUrl?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isOwnClub: boolean;
};

function str(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseInt(str(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Strip the club prefix so "DIA O13-2JM" maps onto our own slug. */
function teamSlugFromBondName(teamnaam: string): string {
  const name = teamnaam.trim();
  const withoutClub = /^dia\s+/i.test(name) ? name.slice(4).trim() : name;
  return normalizeDiaSlug(withoutClub);
}

/**
 * Pick the poule each own team plays its league matches in.
 *
 * Cup entries are skipped: parents want the league table. When a team appears in
 * several regular poules (a competition split into fases), the highest poulecode
 * wins, because Sportlink issues codes in chronological order.
 */
export function mapPouleAssignments(
  rows: readonly RawSportlinkTeam[]
): PouleAssignment[] {
  const byTeamSlug = new Map<string, PouleAssignment>();

  for (const row of rows) {
    if (str(row.competitiesoort).toLowerCase() !== "regulier") continue;

    const poulecode = str(row.poulecode);
    if (!poulecode) continue;

    const sportlinkTeamName = str(row.teamnaam);
    const teamSlug = teamSlugFromBondName(sportlinkTeamName);
    if (!teamSlug) continue;

    const assignment: PouleAssignment = {
      teamSlug,
      poulecode,
      competitionName: str(row.competitienaam),
      klassepoule: str(row.klassepoule) || str(row.klasse),
      sportlinkTeamName,
    };

    const previous = byTeamSlug.get(teamSlug);
    if (previous && num(previous.poulecode) >= num(poulecode)) continue;
    byTeamSlug.set(teamSlug, assignment);
  }

  return [...byTeamSlug.values()];
}

/** Normalise one poulestand payload, dropping rows without a team name. */
export function mapStandingRows(
  rows: readonly RawPoulestandRow[]
): StandingRow[] {
  return rows
    .map((row) => {
      const teamName = str(row.teamnaam);
      if (!teamName) return null;
      const logo = str(row.clublogo);
      return {
        position: num(row.positie),
        teamName,
        ...(logo && { clubLogoUrl: logo }),
        played: num(row.gespeeldewedstrijden),
        won: num(row.gewonnen),
        drawn: num(row.gelijk),
        lost: num(row.verloren),
        goalsFor: num(row.doelpuntenvoor),
        goalsAgainst: num(row.doelpuntentegen),
        goalDifference: num(row.doelsaldo),
        points: num(row.punten),
        isOwnClub: str(row.eigenteam).toLowerCase() === "true",
      } satisfies StandingRow;
    })
    .filter((row): row is StandingRow => row !== null)
    .sort((a, b) => a.position - b.position);
}
