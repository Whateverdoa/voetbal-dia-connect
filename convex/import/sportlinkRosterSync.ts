"use node";

/**
 * Fetch Sportlink teams + team-indeling and upsert into DIA Live.
 *
 *   npx convex run import/sportlinkRosterSync:syncPilotJo13 '{"opsSecret":"...","dryRun":true}'
 *   npx convex run import/sportlinkRosterSync:syncAllLocalYouth '{"opsSecret":"...","dryRun":false}'
 */
import { action, internalAction, type ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { hasValidOpsSecret } from "../lib/opsAuth";
import {
  fetchSportlinkJson,
  parseIndelingRows,
  parseSportlinkTeamKey,
  slugFromSportlinkTeamName,
  sportlinkTeamKey,
  type SportlinkIndelingRow,
  type SportlinkTeamRow,
} from "../lib/sportlinkRoster";

import { parsePublicRoster } from "../lib/sportlinkPublicRoster";

const PILOT_SLUGS = new Set(["jo13-2", "jo13-1"]);

const teamResultV = v.object({
  teamSlug: v.string(),
  teamName: v.string(),
  sportlinkTeamCode: v.string(),
  peopleVisible: v.number(),
  playersCreated: v.number(),
  playersSkipped: v.number(),
  playersDeactivated: v.number(),
  coachesCreated: v.number(),
  coachesUpdated: v.number(),
});

type TeamSyncResult = {
  teamSlug: string;
  teamName: string;
  sportlinkTeamCode: string;
  peopleVisible: number;
  playersCreated: number;
  playersSkipped: number;
  playersDeactivated: number;
  coachesCreated: number;
  coachesUpdated: number;
};

function requireOps(opsSecret?: string) {
  if (!hasValidOpsSecret(opsSecret)) {
    throw new Error("Ops-secret vereist voor Sportlink sync");
  }
}

function getClientConfig() {
  const clientId = process.env.SPORTLINK_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("SPORTLINK_CLIENT_ID ontbreekt in Convex env");
  }
  const baseUrl =
    process.env.SPORTLINK_BASE_URL?.trim() || "https://data.sportlink.com";
  return { clientId, baseUrl };
}

function isLocalYouthTeam(t: SportlinkTeamRow): boolean {
  if (t.teamsoort !== "lokaal") return false;
  const slug = slugFromSportlinkTeamName(t.teamnaam);
  return slug !== null && /^(jo|mo)\d+-\d+[a-z]*$/.test(slug);
}

function diaTeamName(teamnaam: string): string {
  const bare = teamnaam.replace(/^DIA\s+/i, "").trim();
  return /^JO/i.test(bare) ? bare.toUpperCase() : bare;
}

async function syncOneTeam(
  ctx: ActionCtx,
  clientId: string,
  baseUrl: string,
  team: SportlinkTeamRow,
  dryRun: boolean,
  isSelectionTeam: boolean,
  deactivateMissing: boolean,
): Promise<TeamSyncResult> {
  const slug = slugFromSportlinkTeamName(team.teamnaam)!;
  const key = sportlinkTeamKey(team.teamcode, team.lokaleteamcode);
  const indeling = await fetchSportlinkJson<SportlinkIndelingRow[]>(
    baseUrl,
    "/entity/team-indeling",
    clientId,
    { teamcode: team.teamcode, lokaleteamcode: team.lokaleteamcode },
  );
  const people = parseIndelingRows(indeling);
  const upserted = await ctx.runMutation(
    internal.import.sportlinkRosterMutations.upsertTeamRoster,
    {
      teamSlug: slug,
      teamName: diaTeamName(team.teamnaam),
      sportlinkTeamCode: key,
      isSelectionTeam,
      people,
      dryRun,
      deactivateMissing,
    },
  );
  return {
    teamSlug: slug,
    teamName: team.teamnaam,
    sportlinkTeamCode: key,
    peopleVisible: people.length,
    playersCreated: upserted.playersCreated,
    playersSkipped: upserted.playersSkipped,
    playersDeactivated: upserted.playersDeactivated,
    coachesCreated: upserted.coachesCreated,
    coachesUpdated: upserted.coachesUpdated,
  };
}

export const listSportlinkTeams = action({
  args: { opsSecret: v.optional(v.string()) },
  returns: v.array(
    v.object({
      teamnaam: v.string(),
      slug: v.union(v.string(), v.null()),
      teamcode: v.number(),
      lokaleteamcode: v.number(),
      sportlinkTeamCode: v.string(),
      teamsoort: v.optional(v.string()),
    }),
  ),
  handler: async (_ctx, args) => {
    requireOps(args.opsSecret);
    const { clientId, baseUrl } = getClientConfig();
    const teams = await fetchSportlinkJson<SportlinkTeamRow[]>(
      baseUrl,
      "/entity/teams",
      clientId,
    );
    return teams.map((t) => ({
      teamnaam: t.teamnaam,
      slug: slugFromSportlinkTeamName(t.teamnaam),
      teamcode: t.teamcode,
      lokaleteamcode: t.lokaleteamcode,
      sportlinkTeamCode: sportlinkTeamKey(t.teamcode, t.lokaleteamcode),
      teamsoort: t.teamsoort,
    }));
  },
});

export const syncPilotJo13 = action({
  args: {
    opsSecret: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({ dryRun: v.boolean(), teams: v.array(teamResultV) }),
  handler: async (ctx, args) => {
    requireOps(args.opsSecret);
    const dryRun = args.dryRun ?? true;
    const { clientId, baseUrl } = getClientConfig();
    const teams = await fetchSportlinkJson<SportlinkTeamRow[]>(
      baseUrl,
      "/entity/teams",
      clientId,
    );
    const pilot = teams.filter((t) => {
      const slug = slugFromSportlinkTeamName(t.teamnaam);
      return slug !== null && PILOT_SLUGS.has(slug) && t.teamsoort === "lokaal";
    });
    const results: TeamSyncResult[] = [];
    for (const team of pilot) {
      results.push(
        await syncOneTeam(ctx, clientId, baseUrl, team, dryRun, true, false),
      );
    }
    return { dryRun, teams: results };
  },
});

/**
 * Sync all local JO/MO youth rosters from Sportlink (visible names only).
 * Adds missing players/coaches. With deactivateMissing (default true), turns off
 * active players not in the current Sportlink indeling (cleans last-season names).
 * Afgeschermd names are skipped. Selection flag only for jo13-1 / jo13-2.
 */
export const syncAllLocalYouth = action({
  args: {
    opsSecret: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    deactivateMissing: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    teamCount: v.number(),
    playersCreatedTotal: v.number(),
    playersDeactivatedTotal: v.number(),
    peopleVisibleTotal: v.number(),
    teams: v.array(teamResultV),
  }),
  handler: async (ctx, args) => {
    requireOps(args.opsSecret);
    const dryRun = args.dryRun ?? true;
    const deactivateMissing = args.deactivateMissing ?? true;
    const { clientId, baseUrl } = getClientConfig();
    const teams = await fetchSportlinkJson<SportlinkTeamRow[]>(
      baseUrl,
      "/entity/teams",
      clientId,
    );
    const localYouth = teams.filter(isLocalYouthTeam);
    const results: TeamSyncResult[] = [];
    for (const team of localYouth) {
      const slug = slugFromSportlinkTeamName(team.teamnaam)!;
      results.push(
        await syncOneTeam(
          ctx,
          clientId,
          baseUrl,
          team,
          dryRun,
          PILOT_SLUGS.has(slug),
          deactivateMissing,
        ),
      );
    }
    return {
      dryRun,
      teamCount: results.length,
      playersCreatedTotal: results.reduce((n, t) => n + t.playersCreated, 0),
      playersDeactivatedTotal: results.reduce(
        (n, t) => n + t.playersDeactivated,
        0,
      ),
      peopleVisibleTotal: results.reduce((n, t) => n + t.peopleVisible, 0),
      teams: results,
    };
  },
});

type PrivacyRefreshResult = {
  refreshed: number;
  failed: number;
  skipped: boolean;
};
async function refreshSourcePrivacy(
  ctx: ActionCtx,
): Promise<PrivacyRefreshResult> {
  if (
    process.env.CONVEX_CLOUD_URL ===
      "https://brainy-buffalo-707.eu-west-1.convex.cloud" ||
    process.env.DISABLE_EXTERNAL_IMPORTS === "true" ||
    process.env.SPORTLINK_PRIVACY_SYNC_ENABLED !== "true"
  ) {
    return { refreshed: 0, failed: 0, skipped: true };
  }
  const { clientId, baseUrl } = getClientConfig();
  // Use exactly the public Dataservice endpoint: no member-login or privileged feed.
  if (new URL(baseUrl).origin !== "https://data.sportlink.com")
    throw new Error("Privacybron moet de publieke Sportlink Dataservice zijn");
  const teams = await ctx.runQuery(
    internal.import.sportlinkRosterMutations.listPrivacyTeams,
    {},
  );
  let refreshed = 0;
  let failed = 0;
  async function refreshTeam(team: (typeof teams)[number]) {
    const generation = await ctx.runMutation(
      internal.import.sportlinkRosterMutations.beginPrivacyRefresh,
      { teamId: team.teamId },
    );
    try {
      const key = parseSportlinkTeamKey(team.teamCode);
      if (!key) throw new Error("Ongeldige teamcode");
      const rows = await fetchSportlinkJson<SportlinkIndelingRow[]>(
        baseUrl,
        "/entity/team-indeling",
        clientId,
        { ...key, toonlidfoto: "JA" },
      );
      const applied = await ctx.runMutation(
        internal.import.sportlinkRosterMutations.applyPrivacySnapshot,
        {
          teamId: team.teamId,
          teamCode: team.teamCode,
          generation,
          rows: parsePublicRoster(rows),
        },
      );
      if (applied) refreshed++;
      else failed++;
    } catch {
      // Keep the invalidated generation. Do not log names, identifiers or URLs containing client_id.
      failed++;
    }
  }
  for (let offset = 0; offset < teams.length; offset += 4) {
    await Promise.all(teams.slice(offset, offset + 4).map(refreshTeam));
  }
  return { refreshed, failed, skipped: false };
}
const privacyResultV = v.object({
  refreshed: v.number(),
  failed: v.number(),
  skipped: v.boolean(),
});
export const refreshPrivacy = internalAction({
  args: {},
  returns: privacyResultV,
  handler: refreshSourcePrivacy,
});
export const refreshPrivacyNow = action({
  args: { opsSecret: v.optional(v.string()) },
  returns: privacyResultV,
  handler: async (ctx, args): Promise<PrivacyRefreshResult> => {
    if (!hasValidOpsSecret(args.opsSecret)) {
      const access = await ctx.runQuery(
        api.adminAuth.verifyAdminAccessQuery,
        {},
      );
      if (!access.valid)
        throw new Error("Beheerder vereist voor privacyverversing");
    }
    return refreshSourcePrivacy(ctx);
  },
});
