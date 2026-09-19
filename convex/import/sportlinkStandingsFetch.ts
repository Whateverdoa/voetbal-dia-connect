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
import { parseAmsterdamTimestamp } from "../lib/timezone";
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
  contentChanged: boolean;
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
  let contentChanged = false;
  for (const assignment of wanted) {
    const rows = rowsByPoule.get(assignment.poulecode);
    if (!rows || rows.length === 0) continue;

    const result = await ctx.runMutation(
      internal.import.standingsWrite.upsertStanding,
      {
        ...assignment,
        rows,
      }
    );
    if (result === "created" || result === "updated") {
      contentChanged = true;
    }
    writtenSlugs.push(assignment.teamSlug);
  }

  const prunedTeams = await ctx.runMutation(
    internal.import.standingsWrite.pruneStandings,
    { keepTeamSlugs: writtenSlugs }
  );
  if (prunedTeams > 0) {
    contentChanged = true;
  }

  return {
    source: "sportlink",
    ownTeamsInPoule: assignments.length,
    teamsWritten: writtenSlugs.length,
    poulesFetched: rowsByPoule.size,
    skippedUnknownTeams,
    prunedTeams,
    failedPoules,
    contentChanged,
  };
}

/** Manual: npx convex run import/sportlinkStandingsFetch:syncStandings */
export const syncStandings = internalAction({
  args: {},
  handler: async (ctx) => runStandingsSync(ctx),
});

function amsterdamDateKey(nowMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}

type WeekendPollState = {
  amsterdamDate: string;
  baselineFingerprint: string;
  sawUpdate: boolean;
  updatedAt: number;
} | null;

type WeekendPollResult =
  | { skipped: "already_fresh" | "no_matches_ended"; amsterdamDate: string }
  | {
      skipped: null;
      amsterdamDate: string;
      sawUpdate: boolean;
      contentChanged: boolean;
      sync: StandingsSyncSummary;
    };

/**
 * Weekend poll: after matches end, sync every ~15 min until Sportlink shows a
 * new table for that Amsterdam day; then stop. Weekdays stay on the midweek cron.
 */
export const syncStandingsWeekendPoll = internalAction({
  args: {},
  handler: async (ctx): Promise<WeekendPollResult> => {
    const now = Date.now();
    const amsterdamDate = amsterdamDateKey(now);

    const pollState: WeekendPollState = await ctx.runQuery(
      internal.import.standingsWrite.getWeekendPollState,
      {}
    );
    if (
      pollState &&
      pollState.amsterdamDate === amsterdamDate &&
      pollState.sawUpdate
    ) {
      console.log(
        `[standingsWeekendPoll] skipped: already fresh for ${amsterdamDate}`
      );
      return { skipped: "already_fresh", amsterdamDate };
    }

    const todayStart = parseAmsterdamTimestamp(`${amsterdamDate}T00:00:00`);
    let dayEnd = parseAmsterdamTimestamp(`${amsterdamDate}T23:59:59.999`);
    if (!Number.isFinite(dayEnd) || Number.isNaN(dayEnd)) {
      dayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
    }

    const matchesEnded: boolean = await ctx.runQuery(
      internal.import.weeklyUpdate.anyMatchEndedOnAmsterdamDay,
      {
        // Include yesterday: Saturday scores often land late evening / Sunday morning.
        dayStart: todayStart - 36 * 60 * 60 * 1000,
        dayEnd,
        now,
      }
    );
    if (!matchesEnded) {
      console.log("[standingsWeekendPoll] skipped: no matches ended yet");
      return { skipped: "no_matches_ended", amsterdamDate };
    }

    const fingerprintBefore: string = await ctx.runQuery(
      internal.import.standingsWrite.getStandingsFingerprint,
      {}
    );
    const sync = await runStandingsSync(ctx);
    const fingerprintAfter: string = await ctx.runQuery(
      internal.import.standingsWrite.getStandingsFingerprint,
      {}
    );

    const sameDay =
      pollState !== null && pollState.amsterdamDate === amsterdamDate;
    const baselineFingerprint: string = sameDay
      ? pollState.baselineFingerprint
      : fingerprintBefore;
    const sawUpdate: boolean =
      fingerprintAfter !== baselineFingerprint ||
      (sameDay && pollState.sawUpdate);

    await ctx.runMutation(internal.import.standingsWrite.saveWeekendPollState, {
      amsterdamDate,
      baselineFingerprint,
      sawUpdate,
    });

    console.log(
      `[standingsWeekendPoll] synced contentChanged=${sync.contentChanged} sawUpdate=${sawUpdate} teamsWritten=${sync.teamsWritten}`
    );
    return {
      skipped: null,
      amsterdamDate,
      sawUpdate,
      contentChanged: sync.contentChanged,
      sync,
    };
  },
});
