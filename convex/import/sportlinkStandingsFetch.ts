/**
 * Fetch bond poule standings from Sportlink Club.Dataservice and cache them.
 *
 * Two articles are used: `teams` maps each own team onto a poulecode, and
 * `poulestand` returns the table for one poule. Teams that share a poule are
 * fetched once and written for every team slug in it.
 *
 * Env: SPORTLINK_CLIENT_ID (required), SPORTLINK_BASE_URL (optional).
 */
import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  mapPouleAssignments,
  mapStandingRows,
  type PouleAssignment,
  type RawPoulestandRow,
  type RawSportlinkTeam,
  type StandingRow,
} from "./sportlinkStandingsMapper";

const DEFAULT_BASE = "https://data.sportlink.com";

export type StandingsSyncSummary = {
  source: "sportlink";
  ownTeamsInPoule: number;
  teamsWritten: number;
  poulesFetched: number;
  skippedUnknownTeams: string[];
  prunedTeams: number;
  failedPoules: string[];
};

function sportlinkConfig(): { clientId: string; baseUrl: string } {
  const clientId = process.env.SPORTLINK_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("SPORTLINK_CLIENT_ID ontbreekt");
  }
  const baseUrl = (
    process.env.SPORTLINK_BASE_URL?.trim() || DEFAULT_BASE
  ).replace(/\/$/, "");
  return { clientId, baseUrl };
}

async function fetchJsonArray(url: URL, label: string): Promise<unknown[]> {
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Sportlink ${label} fout: ${res.status} ${res.statusText}`);
  }
  const payload: unknown = await res.json();
  if (!Array.isArray(payload)) {
    throw new Error(`Sportlink ${label}: onverwacht antwoord`);
  }
  return payload;
}

async function fetchOwnTeams(
  baseUrl: string,
  clientId: string
): Promise<RawSportlinkTeam[]> {
  const url = new URL(`${baseUrl}/teams`);
  url.searchParams.set("client_id", clientId);
  return (await fetchJsonArray(url, "teams")) as RawSportlinkTeam[];
}

async function fetchPoulestand(
  baseUrl: string,
  clientId: string,
  poulecode: string
): Promise<StandingRow[]> {
  const url = new URL(`${baseUrl}/poulestand`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("poulecode", poulecode);
  const payload = (await fetchJsonArray(
    url,
    `poulestand ${poulecode}`
  )) as RawPoulestandRow[];
  return mapStandingRows(payload);
}

async function runStandingsSync(
  ctx: ActionCtx
): Promise<StandingsSyncSummary> {
  const { clientId, baseUrl } = sportlinkConfig();

  const assignments = mapPouleAssignments(
    await fetchOwnTeams(baseUrl, clientId)
  );
  const knownSlugs = new Set<string>(
    await ctx.runQuery(internal.import.standingsWrite.listTeamSlugs, {})
  );

  const wanted: PouleAssignment[] = [];
  const skippedUnknownTeams: string[] = [];
  for (const assignment of assignments) {
    if (knownSlugs.has(assignment.teamSlug)) {
      wanted.push(assignment);
    } else {
      skippedUnknownTeams.push(assignment.teamSlug);
    }
  }

  // One HTTP call per poule, even when two own teams share it.
  const rowsByPoule = new Map<string, StandingRow[]>();
  const failedPoules: string[] = [];
  for (const poulecode of new Set(wanted.map((a) => a.poulecode))) {
    try {
      rowsByPoule.set(
        poulecode,
        await fetchPoulestand(baseUrl, clientId, poulecode)
      );
    } catch (error) {
      // One broken poule must not throw away the rest of the sync.
      console.error("poulestand fout", poulecode, error);
      failedPoules.push(poulecode);
    }
  }

  const writtenSlugs: string[] = [];
  for (const assignment of wanted) {
    const rows = rowsByPoule.get(assignment.poulecode);
    if (!rows || rows.length === 0) continue;

    await ctx.runMutation(internal.import.standingsWrite.upsertStanding, {
      ...assignment,
      rows,
    });
    writtenSlugs.push(assignment.teamSlug);
  }

  const prunedTeams = await ctx.runMutation(
    internal.import.standingsWrite.pruneStandings,
    { keepTeamSlugs: writtenSlugs }
  );

  return {
    source: "sportlink",
    ownTeamsInPoule: assignments.length,
    teamsWritten: writtenSlugs.length,
    poulesFetched: rowsByPoule.size,
    skippedUnknownTeams,
    prunedTeams,
    failedPoules,
  };
}

/** Manual: npx convex run import/sportlinkStandingsFetch:syncStandings */
export const syncStandings = internalAction({
  args: {},
  handler: async (ctx) => runStandingsSync(ctx),
});
