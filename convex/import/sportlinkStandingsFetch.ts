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
import { v } from "convex/values";
import {
  mapPouleAssignments,
  mapStandingRows,
  type PouleAssignment,
  type RawPoulestandRow,
  type RawSportlinkTeam,
  type StandingRow,
} from "./sportlinkStandingsMapper";

const DEFAULT_BASE = "https://data.sportlink.com";
const REQUEST_TIMEOUT_MS = 8_000;
const SYNC_BUDGET_MS = 8 * 60_000;

const syncSummaryValidator = v.object({
  source: v.literal("sportlink"),
  ownTeamsInPoule: v.number(),
  teamsWritten: v.number(),
  poulesFetched: v.number(),
  skippedUnknownTeams: v.array(v.string()),
  prunedTeams: v.number(),
  failedPoules: v.array(v.string()),
  contentChanged: v.boolean(),
});

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Sportlink ${label}: HTTP ${res.status}`);
    }
    const payload: unknown = await res.json();
    if (!Array.isArray(payload)) {
      throw new Error(`Sportlink ${label}: onverwacht antwoord`);
    }
    return payload;
  } catch {
    // Fetch/parse errors can contain the URL, including the client credential.
    throw new Error(`Sportlink ${label}: ophalen mislukt`);
  } finally {
    clearTimeout(timeout);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIntegerValue(value: unknown): boolean {
  return (
    (typeof value === "number" && Number.isSafeInteger(value)) ||
    (typeof value === "string" && /^-?\d+$/.test(value.trim()) &&
      Number.isSafeInteger(Number(value)))
  );
}

const standingNumericFields = [
  "positie", "gespeeldewedstrijden", "gewonnen", "gelijk", "verloren",
  "doelpuntenvoor", "doelpuntentegen", "doelsaldo", "punten",
] as const;

async function fetchOwnTeams(
  baseUrl: string,
  clientId: string
): Promise<RawSportlinkTeam[]> {
  const url = new URL(`${baseUrl}/teams`);
  url.searchParams.set("client_id", clientId);
  const payload = await fetchJsonArray(url, "teams");
  if (payload.length === 0 || !payload.every((row) =>
    isRecord(row) && typeof row.teamnaam === "string" &&
    row.teamnaam.trim().length > 0 && typeof row.competitiesoort === "string" &&
    (row.poulecode == null || typeof row.poulecode === "string" ||
      (typeof row.poulecode === "number" && Number.isSafeInteger(row.poulecode)))
  )) {
    throw new Error("Sportlink teams: ongeldige teamlijst");
  }
  return payload as RawSportlinkTeam[];
}

async function fetchPoulestand(
  baseUrl: string,
  clientId: string,
  poulecode: string
): Promise<StandingRow[]> {
  const url = new URL(`${baseUrl}/poulestand`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("poulecode", poulecode);
  const payload = await fetchJsonArray(url, "poulestand");
  if (payload.length === 0 || !payload.every((row) =>
    isRecord(row) && typeof row.teamnaam === "string" &&
    row.teamnaam.trim().length > 0 &&
    standingNumericFields.every((field) => isIntegerValue(row[field])) &&
    (row.clublogo == null || typeof row.clublogo === "string")
  )) {
    throw new Error("Sportlink poulestand: ongeldige of lege stand");
  }
  return mapStandingRows(payload as RawPoulestandRow[]);
}

async function runStandingsSync(
  ctx: ActionCtx
): Promise<StandingsSyncSummary> {
  const deadline = Date.now() + SYNC_BUDGET_MS;
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
    if (Date.now() + REQUEST_TIMEOUT_MS > deadline) {
      failedPoules.push(poulecode);
      continue;
    }
    try {
      rowsByPoule.set(
        poulecode,
        await fetchPoulestand(baseUrl, clientId, poulecode)
      );
    } catch {
      // Keep the last valid cache and continue with the other poules.
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

  return {
    source: "sportlink",
    ownTeamsInPoule: assignments.length,
    teamsWritten: writtenSlugs.length,
    poulesFetched: rowsByPoule.size,
    skippedUnknownTeams,
    // Removal needs a separate, explicitly reviewed membership cleanup.
    prunedTeams: 0,
    failedPoules,
    contentChanged,
  };
}

/** Manual: npx convex run import/sportlinkStandingsFetch:syncStandings */
export const syncStandings = internalAction({
  args: {},
  returns: syncSummaryValidator,
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

type ScheduledPollResult =
  | {
    skipped: "outside_window" | "already_attempted" | "daily_limit" | "in_progress";
    amsterdamDate: string;
  }
  | {
    skipped: null;
    amsterdamDate: string;
    attempt: number;
    outcome: "changed" | "unchanged" | "partial" | "error";
    contentChanged: boolean;
    sync: StandingsSyncSummary;
  };

/**
 * Every scheduled round reserves a bounded calendar slot atomically. Earlier
 * updates and DIA's own match schedule cannot prove that a whole poule is fresh.
 */
export const syncStandingsWeekendPoll = internalAction({
  args: {},
  returns: v.union(
    v.object({
      skipped: v.union(v.literal("outside_window"), v.literal("already_attempted"),
        v.literal("daily_limit"), v.literal("in_progress")),
      amsterdamDate: v.string(),
    }),
    v.object({
      skipped: v.null(),
      amsterdamDate: v.string(),
      attempt: v.number(),
      outcome: v.union(v.literal("changed"), v.literal("unchanged"),
        v.literal("partial"), v.literal("error")),
      contentChanged: v.boolean(),
      sync: syncSummaryValidator,
    }),
  ),
  handler: async (ctx): Promise<ScheduledPollResult> => {
    const reservation = await ctx.runMutation(
      internal.import.standingsWrite.reserveStandingsPoll,
      {}
    );
    if (!reservation.allowed) {
      return { skipped: reservation.reason, amsterdamDate: amsterdamDateKey(Date.now()) };
    }

    let sync: StandingsSyncSummary;
    try {
      sync = await runStandingsSync(ctx);
    } catch {
      await ctx.runMutation(internal.import.standingsWrite.completeStandingsPoll, {
        slot: reservation.slot,
        outcome: "error",
        contentChanged: false,
        failedPouleCount: 0,
      });
      throw new Error("Sportlink-standen ophalen mislukt; bestaande standen blijven bewaard.");
    }
    const outcome = sync.failedPoules.length > 0
      ? (sync.teamsWritten === 0 ? "error" as const : "partial" as const)
      : (sync.contentChanged ? "changed" as const : "unchanged" as const);
    const completed: boolean = await ctx.runMutation(internal.import.standingsWrite.completeStandingsPoll, {
      slot: reservation.slot,
      outcome,
      contentChanged: sync.contentChanged,
      failedPouleCount: sync.failedPoules.length,
    });
    if (!completed) {
      throw new Error("Standencontrole kon niet worden afgerond: reservering verlopen.");
    }

    console.log(
      `[standingsPoll] outcome=${outcome} teamsWritten=${sync.teamsWritten} failedPoules=${sync.failedPoules.length}`
    );
    return {
      skipped: null,
      amsterdamDate: reservation.amsterdamDate,
      attempt: reservation.attempt,
      outcome,
      contentChanged: sync.contentChanged,
      sync,
    };
  },
});
