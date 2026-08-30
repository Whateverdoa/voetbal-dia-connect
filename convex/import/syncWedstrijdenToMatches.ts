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
import { seasonKeyFromMs } from "../lib/season";
import { homeVenueFieldForMatch } from "../lib/diaFields";
import { extractDiaMatch } from "./diaTeamNormalize";
import { replaceMatchRoster } from "./matchRosterReplace";
import { buildFinishedScorePatch, isLiveOrHalftime } from "./syncScoreApply";

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

function extractForSync(
  thuisteam: string,
  uitteam: string,
  thuisteamLogo?: string,
  uitteamLogo?: string,
) {
  return extractDiaMatch(
    thuisteam,
    uitteam,
    thuisteamLogo,
    uitteamLogo,
    (opponent) => findLocalLogo(opponent) ?? undefined,
  );
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
      const extracted = extractForSync(
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
  const existingBySportlink = new Map<string, Doc<"matches">>();
  for (const match of existingMatches) {
    if (match.sportlinkWedstrijdcode) {
      existingBySportlink.set(match.sportlinkWedstrijdcode, match);
    }
  }
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
  let scoreOverwrites = 0;
  let discrepanciesFlagged = 0;
  let reassignedTeam = 0;

  for (const wedstrijd of wedstrijden) {
    const extracted = extractForSync(
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
    const sportlinkCode = wedstrijd.sportlink_wedstrijdcode?.trim();

    const resolveExisting = (): Doc<"matches"> | undefined => {
      if (sportlinkCode) {
        const byCode = existingBySportlink.get(sportlinkCode);
        if (byCode) return byCode;
      }
      return existingByKey.get(key);
    };

    // AFGELAST: mark the matching local row cancelled (if not already finished/live).
    if (wedstrijd.status === "afgelast") {
      const existingMatch = resolveExisting();
      const isLiveOrFinished =
        existingMatch &&
        (isLiveOrHalftime(existingMatch.status) ||
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
    const hasOfficialScore =
      wedstrijd.thuis_goals !== undefined && wedstrijd.uit_goals !== undefined;
    const homeGoals = wedstrijd.thuis_goals ?? 0;
    const awayGoals = wedstrijd.uit_goals ?? 0;
    const activePlayerIds = activePlayerIdsByTeamId.get(team._id) ?? [];
    let existingMatch = resolveExisting();

    if (existingMatch) {
      // Correct team when Sportlink mapping changed (e.g. O13-2JM → jo13-2).
      if (existingMatch.teamId !== team._id) {
        const canReplaceRoster =
          existingMatch.status === "scheduled" ||
          existingMatch.status === "lineup";
        if (!dryRun) {
          const coachId = coachByTeamId.get(team._id);
          await ctx.db.patch(existingMatch._id, {
            teamId: team._id,
            ...(coachId ? { coachId } : {}),
          });
          if (canReplaceRoster && !existingMatch.startedAt) {
            const rosterResult = await replaceMatchRoster(ctx, {
              matchId: existingMatch._id,
              playerIds: activePlayerIds,
              dryRun: false,
            });
            matchPlayerCountByMatchId.set(
              existingMatch._id,
              rosterResult.inserted,
            );
          }
        }
        reassignedTeam++;
        existingMatch = {
          ...existingMatch,
          teamId: team._id,
        };
        console.log(
          `[sync] team-herkoppel: ${sportlinkCode ?? key} -> ${team.slug}`,
        );
      }

      // DIA reverted a cancellation — clear it.
      if (existingMatch.cancelledAt) {
        if (!dryRun) {
          await ctx.db.patch(existingMatch._id, { cancelledAt: undefined });
        }
        uncancelledMatches++;
        console.log(
          `[sync] hervat: ${team.slug} vs ${opponent} (${amsterdamDateKey(wedstrijd.datum_ms)})`,
        );
      }

      // Backfill sportlink code onto date-keyed matches.
      if (
        sportlinkCode &&
        existingMatch.sportlinkWedstrijdcode !== sportlinkCode
      ) {
        if (!dryRun) {
          await ctx.db.patch(existingMatch._id, {
            sportlinkWedstrijdcode: sportlinkCode,
          });
        }
        existingBySportlink.set(sportlinkCode, {
          ...existingMatch,
          sportlinkWedstrijdcode: sportlinkCode,
        });
      }

      const venueField = homeVenueFieldForMatch(
        extracted.isHome,
        wedstrijd.veld,
      );
      if (
        extracted.isHome &&
        venueField &&
        existingMatch.venueField !== venueField
      ) {
        if (!dryRun) {
          await ctx.db.patch(existingMatch._id, { venueField });
        }
      }

      // TIJD-DRIFT: existing scheduled/lineup match whose kickoff moved.
      if (
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

      if (isFinished && !hasOfficialScore) {
        skippedExisting++;
        continue;
      }

      if (isFinished) {
        const { result, patch } = buildFinishedScorePatch(
          existingMatch,
          homeGoals,
          awayGoals,
          Date.now(),
        );
        if (result.kind === "skipped_live") {
          skippedExisting++;
          continue;
        }

        const scheduledAtChanged =
          existingMatch.scheduledAt !== wedstrijd.datum_ms;
        const venueField = homeVenueFieldForMatch(
          extracted.isHome,
          wedstrijd.veld,
        );
        if (!dryRun) {
          await ctx.db.patch(existingMatch._id, {
            status: "finished",
            currentQuarter: existingMatch.quarterCount,
            startedAt: existingMatch.startedAt ?? wedstrijd.datum_ms,
            finishedAt: existingMatch.finishedAt ?? wedstrijd.datum_ms + 3600000,
            ...(scheduledAtChanged ? { scheduledAt: wedstrijd.datum_ms } : {}),
            ...(sportlinkCode ? { sportlinkWedstrijdcode: sportlinkCode } : {}),
            ...(venueField && existingMatch.venueField !== venueField
              ? { venueField }
              : {}),
            ...patch,
          });
        }
        updatedFinished++;
        if (result.kind === "applied") {
          scoreOverwrites++;
          if (result.discrepancy) discrepanciesFlagged++;
        }
        continue;
      }

      skippedExisting++;
      continue;
    }

    const coachId = coachByTeamId.get(team._id);

    if (!dryRun) {
      const code = await generateUniqueCode(ctx);
      const venueField = homeVenueFieldForMatch(
        extracted.isHome,
        wedstrijd.veld,
      );
      const matchId = await ctx.db.insert("matches", {
        teamId: team._id,
        publicCode: code,
        ...(coachId ? { coachId } : {}),
        opponent,
        ...(extracted.opponentLogoUrl ? { opponentLogoUrl: extracted.opponentLogoUrl } : {}),
        isHome: extracted.isHome,
        scheduledAt: wedstrijd.datum_ms,
        ...(venueField ? { venueField } : {}),
        seasonKey: seasonKeyFromMs(wedstrijd.datum_ms),
        ...(sportlinkCode ? { sportlinkWedstrijdcode: sportlinkCode } : {}),
        status: isFinished && hasOfficialScore ? "finished" : "scheduled",
        currentQuarter: isFinished && hasOfficialScore ? 4 : 1,
        quarterCount: 4,
        homeScore: isFinished && hasOfficialScore ? homeGoals : 0,
        awayScore: isFinished && hasOfficialScore ? awayGoals : 0,
        showLineup: false,
        useBreakClock: true,
        breakClockAutoStart: true,
        startedAt: isFinished && hasOfficialScore ? wedstrijd.datum_ms : undefined,
        finishedAt: isFinished && hasOfficialScore ? wedstrijd.datum_ms + 3600000 : undefined,
        createdAt: Date.now(),
      });

      if (sportlinkCode) {
        existingBySportlink.set(sportlinkCode, {
          _id: matchId,
        } as Doc<"matches">);
      }

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
    scoreOverwrites,
    discrepanciesFlagged,
    reassignedTeam,
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
