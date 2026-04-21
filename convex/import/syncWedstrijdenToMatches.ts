/**
 * Sync imported VoetbalAssist `wedstrijden` docs into `matches`.
 *
 * Usage (admin dashboard mutation, or CLI with ops secret):
 *   npx convex run import/syncWedstrijdenToMatches:syncAll '{"opsSecret":"<CONVEX_OPS_SECRET>","dryRun":true}'
 */
import { internalMutation, mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { generatePublicCode } from "../seed/helpers";
import { findLocalLogo } from "../lib/localLogos";
import { requireAdminOrOps } from "../lib/opsAuth";

type SyncExtraction = {
  teamSlug: string;
  opponent: string;
  isHome: boolean;
  opponentLogoUrl?: string;
};

function cleanTeamName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Return `YYYY-MM-DD` in Europe/Amsterdam for a given UTC ms timestamp.
 *
 * Used as part of the sync match-key so a DIA fixture whose kickoff time
 * shifted after initial import still resolves to the same local match row.
 */
function amsterdamDateKey(ms: number | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "no-date";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function extractDiaMatch(
  thuisteam: string,
  uitteam: string,
  thuisteamLogo?: string,
  uitteamLogo?: string,
): SyncExtraction | null {
  const home = cleanTeamName(thuisteam);
  const away = cleanTeamName(uitteam);
  const prefix = "DIA ";

  if (home.toUpperCase().startsWith(prefix)) {
    const diaTeam = home.slice(prefix.length).trim();
    const opponent = away;
    return {
      teamSlug: diaTeam.toLowerCase(),
      opponent,
      isHome: true,
      opponentLogoUrl: findLocalLogo(opponent) ?? uitteamLogo ?? undefined,
    };
  }

  if (away.toUpperCase().startsWith(prefix)) {
    const diaTeam = away.slice(prefix.length).trim();
    const opponent = home;
    return {
      teamSlug: diaTeam.toLowerCase(),
      opponent,
      isHome: false,
      opponentLogoUrl: findLocalLogo(opponent) ?? thuisteamLogo ?? undefined,
    };
  }

  return null;
}

export function hasManualResult(
  match: Pick<Doc<"matches">, "status" | "homeScore" | "awayScore" | "finishedAt">
) {
  if (match.status === "finished") {
    return true;
  }

  return Boolean(match.finishedAt) || match.homeScore !== 0 || match.awayScore !== 0;
}

async function generateUniqueCode(ctx: MutationCtx) {
  let attempts = 0;
  let code = generatePublicCode();
  while (
    await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", code))
      .unique()
  ) {
    code = generatePublicCode();
    attempts++;
    if (attempts > 20) {
      throw new Error("Kon geen unieke wedstrijdcode genereren");
    }
  }
  return code;
}

async function seedMatchPlayersForRoster(
  ctx: MutationCtx,
  args: {
    matchId: Id<"matches">;
    playerIds: Id<"players">[];
    dryRun: boolean;
  }
) {
  if (args.playerIds.length === 0) {
    return 0;
  }

  if (!args.dryRun) {
    const now = Date.now();
    await Promise.all(
      args.playerIds.map((playerId) =>
        ctx.db.insert("matchPlayers", {
          matchId: args.matchId,
          playerId,
          isKeeper: false,
          onField: false,
          createdAt: now,
        })
      )
    );
  }

  return args.playerIds.length;
}

export const listUnknownTeams = query({
  args: {
    opsSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);

    const wedstrijden = await ctx.db.query("wedstrijden").collect();
    const teams = await ctx.db.query("teams").collect();
    const teamsBySlug = new Set(teams.map((team) => team.slug));
    const unknown = new Map<
      string,
      {
        teamSlug: string;
        count: number;
        diaTeams: Set<string>;
        examples: Set<string>;
      }
    >();

    for (const wedstrijd of wedstrijden) {
      if (wedstrijd.status === "afgelast") continue;
      const extracted = extractDiaMatch(
        wedstrijd.thuisteam,
        wedstrijd.uitteam,
        wedstrijd.thuisteamLogo,
        wedstrijd.uitteamLogo,
      );
      if (!extracted) continue;
      if (teamsBySlug.has(extracted.teamSlug)) continue;

      const current = unknown.get(extracted.teamSlug) ?? {
        teamSlug: extracted.teamSlug,
        count: 0,
        diaTeams: new Set<string>(),
        examples: new Set<string>(),
      };
      current.count += 1;
      if (wedstrijd.dia_team) {
        current.diaTeams.add(wedstrijd.dia_team);
      }
      if (current.examples.size < 3) {
        current.examples.add(`${wedstrijd.thuisteam} - ${wedstrijd.uitteam}`);
      }
      unknown.set(extracted.teamSlug, current);
    }

    return Array.from(unknown.values())
      .map((entry) => ({
        teamSlug: entry.teamSlug,
        count: entry.count,
        diaTeams: Array.from(entry.diaTeams).sort((a, b) => a.localeCompare(b, "nl-NL")),
        examples: Array.from(entry.examples),
      }))
      .sort((left, right) => right.count - left.count || left.teamSlug.localeCompare(right.teamSlug, "nl-NL"));
  },
});

async function performSyncAll(ctx: MutationCtx, dryRun: boolean) {
  const wedstrijden = await ctx.db.query("wedstrijden").collect();
  const teams = await ctx.db.query("teams").collect();
  const coaches = await ctx.db.query("coaches").collect();
  const players = await ctx.db.query("players").collect();
  const matchPlayers = await ctx.db.query("matchPlayers").collect();

  const teamsBySlug = new Map(teams.map((team) => [team.slug, team]));
  const coachByTeamId = new Map<Id<"teams">, Id<"coaches">>();
  for (const coach of coaches) {
    for (const teamId of coach.teamIds) {
      if (!coachByTeamId.has(teamId)) {
        coachByTeamId.set(teamId, coach._id);
      }
    }
  }

  const activePlayerIdsByTeamId = new Map<Id<"teams">, Id<"players">[]>();
  for (const player of players) {
    if (!player.active) continue;
    const current = activePlayerIdsByTeamId.get(player.teamId) ?? [];
    current.push(player._id);
    activePlayerIdsByTeamId.set(player.teamId, current);
  }

  const matchPlayerCountByMatchId = new Map<Id<"matches">, number>();
  for (const matchPlayer of matchPlayers) {
    matchPlayerCountByMatchId.set(
      matchPlayer.matchId,
      (matchPlayerCountByMatchId.get(matchPlayer.matchId) ?? 0) + 1,
    );
  }

  const existingMatches = await ctx.db.query("matches").collect();
  const matchKey = (
    teamId: Id<"teams">,
    opponent: string,
    ms: number | undefined,
  ): string =>
    `${teamId}|${opponent.trim().toLowerCase()}|${amsterdamDateKey(ms)}`;

  // NOTE: key uses Europe/Amsterdam date (YYYY-MM-DD), not exact ms. This allows
  // the sync to still match a local row after DIA shifted the kickoff time.
  // Assumes: at most one match per (team, opponent, Amsterdam-day). Safe for youth football.
  const existingByKey = new Map(
    existingMatches.map((match) => [
      matchKey(match.teamId, match.opponent, match.scheduledAt),
      match,
    ]),
  );
  const existingKeys = new Set(existingByKey.keys());

  let created = 0;
  let createdMatchPlayers = 0;
  let backfilledMatchRosters = 0;
  let skippedExisting = 0;
  let skippedExistingWithResult = 0;
  let skippedNoDiaTeam = 0;
  let skippedUnknownTeam = 0;
  let skippedCancelled = 0;
  let skippedNoDate = 0;
  let updatedFinished = 0;
  let updatedScheduledAt = 0;
  let cancelledMatches = 0;
  let uncancelledMatches = 0;

  for (const wedstrijd of wedstrijden) {
    const extracted = extractDiaMatch(
      wedstrijd.thuisteam,
      wedstrijd.uitteam,
      wedstrijd.thuisteamLogo,
      wedstrijd.uitteamLogo,
    );
    if (!extracted) {
      skippedNoDiaTeam++;
      continue;
    }

    const team = teamsBySlug.get(extracted.teamSlug);
    if (!team) {
      skippedUnknownTeam++;
      continue;
    }

    if (!Number.isFinite(wedstrijd.datum_ms) || wedstrijd.datum_ms <= 0) {
      skippedNoDate++;
      continue;
    }

    const opponent = extracted.opponent.trim();
    const key = matchKey(team._id, opponent, wedstrijd.datum_ms);

    // AFGELAST: mark the matching local row cancelled (if not already finished/live).
    if (wedstrijd.status === "afgelast") {
      const existingMatch = existingByKey.get(key);
      const isLiveOrFinished =
        existingMatch &&
        (existingMatch.status === "live" ||
          existingMatch.status === "halftime" ||
          existingMatch.status === "finished");
      if (existingMatch && !existingMatch.cancelledAt && !isLiveOrFinished) {
        if (!dryRun) {
          await ctx.db.patch(existingMatch._id, { cancelledAt: Date.now() });
        }
        cancelledMatches++;
        console.log(
          `[sync] afgelast: ${team.slug} vs ${opponent} (${amsterdamDateKey(wedstrijd.datum_ms)})`,
        );
      } else {
        skippedCancelled++;
      }
      continue;
    }

    const isFinished = wedstrijd.status === "gespeeld";
    const homeGoals = wedstrijd.thuis_goals ?? 0;
    const awayGoals = wedstrijd.uit_goals ?? 0;
    const activePlayerIds = activePlayerIdsByTeamId.get(team._id) ?? [];

    if (existingKeys.has(key)) {
      const existingMatch = existingByKey.get(key);

      // DIA reverted a cancellation — clear it.
      if (existingMatch && existingMatch.cancelledAt) {
        if (!dryRun) {
          await ctx.db.patch(existingMatch._id, { cancelledAt: undefined });
        }
        uncancelledMatches++;
        console.log(
          `[sync] hervat: ${team.slug} vs ${opponent} (${amsterdamDateKey(wedstrijd.datum_ms)})`,
        );
      }

      // TIJD-DRIFT: existing scheduled/lineup match whose kickoff moved in DIA.
      if (
        existingMatch &&
        !isFinished &&
        (existingMatch.status === "scheduled" || existingMatch.status === "lineup") &&
        existingMatch.scheduledAt !== wedstrijd.datum_ms
      ) {
        if (!dryRun) {
          await ctx.db.patch(existingMatch._id, { scheduledAt: wedstrijd.datum_ms });
        }
        updatedScheduledAt++;
        console.log(
          `[sync] tijd-drift: ${team.slug} vs ${opponent} ${existingMatch.scheduledAt ?? "?"} -> ${wedstrijd.datum_ms}`,
        );
      }

      if (existingMatch) {
        const matchPlayerCount = matchPlayerCountByMatchId.get(existingMatch._id) ?? 0;
        if (!isFinished && matchPlayerCount === 0 && activePlayerIds.length > 0) {
          createdMatchPlayers += await seedMatchPlayersForRoster(ctx, {
            matchId: existingMatch._id,
            playerIds: activePlayerIds,
            dryRun,
          });
          backfilledMatchRosters++;
          matchPlayerCountByMatchId.set(existingMatch._id, activePlayerIds.length);
        }
      }

      if (existingMatch && existingMatch.status === "scheduled" && isFinished) {
        if (hasManualResult(existingMatch)) {
          skippedExistingWithResult++;
          continue;
        }

        if (!dryRun) {
          const scheduledAtChanged =
            existingMatch.scheduledAt !== wedstrijd.datum_ms;
          await ctx.db.patch(existingMatch._id, {
            status: "finished",
            currentQuarter: existingMatch.quarterCount,
            homeScore: homeGoals,
            awayScore: awayGoals,
            startedAt: existingMatch.startedAt ?? wedstrijd.datum_ms,
            finishedAt: wedstrijd.datum_ms + 3600000,
            // Keep scheduledAt aligned with DIA's actual kickoff ms so the UI
            // reflects the rescheduled time after finalisation.
            ...(scheduledAtChanged ? { scheduledAt: wedstrijd.datum_ms } : {}),
          });
        }
        updatedFinished++;
        continue;
      }
      skippedExisting++;
      continue;
    }

    const coachId = coachByTeamId.get(team._id);

    if (!dryRun) {
      const code = await generateUniqueCode(ctx);
      const matchId = await ctx.db.insert("matches", {
        teamId: team._id,
        publicCode: code,
        ...(coachId ? { coachId } : {}),
        opponent,
        ...(extracted.opponentLogoUrl ? { opponentLogoUrl: extracted.opponentLogoUrl } : {}),
        isHome: extracted.isHome,
        scheduledAt: wedstrijd.datum_ms,
        status: isFinished ? "finished" : "scheduled",
        currentQuarter: isFinished ? 4 : 1,
        quarterCount: 4,
        homeScore: isFinished ? homeGoals : 0,
        awayScore: isFinished ? awayGoals : 0,
        showLineup: false,
        startedAt: isFinished ? wedstrijd.datum_ms : undefined,
        finishedAt: isFinished ? wedstrijd.datum_ms + 3600000 : undefined,
        createdAt: Date.now(),
      });

      if (!isFinished && activePlayerIds.length > 0) {
        createdMatchPlayers += await seedMatchPlayersForRoster(ctx, {
          matchId,
          playerIds: activePlayerIds,
          dryRun,
        });
      }
    } else if (!isFinished && activePlayerIds.length > 0) {
      createdMatchPlayers += activePlayerIds.length;
    }

    existingKeys.add(key);
    created++;
  }

  return {
    totalWedstrijden: wedstrijden.length,
    dryRun,
    created,
    createdMatchPlayers,
    backfilledMatchRosters,
    updatedFinished,
    updatedScheduledAt,
    cancelledMatches,
    uncancelledMatches,
    skippedExisting,
    skippedExistingWithResult,
    skippedNoDiaTeam,
    skippedUnknownTeam,
    skippedCancelled,
    skippedNoDate,
  };
}

export const syncAll = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    opsSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const dryRun = args.dryRun ?? false;
    return await performSyncAll(ctx, dryRun);
  },
});

/** Cron-only: no user/ops auth. Invoked only from other Convex functions. */
export const syncAllInternal = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    return await performSyncAll(ctx, dryRun);
  },
});
