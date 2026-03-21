/**
 * Sync imported VoetbalAssist `wedstrijden` docs into `matches`.
 *
 * Usage:
 *   npx convex run import/syncWedstrijdenToMatches:syncAll
 */
import { mutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { generatePublicCode } from "../seed/helpers";
import { findLocalLogo } from "../lib/localLogos";

type SyncExtraction = {
  teamSlug: string;
  opponent: string;
  isHome: boolean;
  opponentLogoUrl?: string;
};

function cleanTeamName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
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

export const syncAll = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const wedstrijden = await ctx.db.query("wedstrijden").collect();
    const teams = await ctx.db.query("teams").collect();
    const coaches = await ctx.db.query("coaches").collect();

    const teamsBySlug = new Map(teams.map((team) => [team.slug, team]));
    const coachByTeamId = new Map<Id<"teams">, Id<"coaches">>();
    for (const coach of coaches) {
      for (const teamId of coach.teamIds) {
        if (!coachByTeamId.has(teamId)) {
          coachByTeamId.set(teamId, coach._id);
        }
      }
    }

    const existingMatches = await ctx.db.query("matches").collect();
    const existingByKey = new Map(
      existingMatches.map((match) => [
        `${match.teamId}|${match.opponent.trim().toLowerCase()}|${match.scheduledAt ?? 0}`,
        match,
      ]),
    );
    const existingKeys = new Set(
      existingMatches.map(
        (match) =>
          `${match.teamId}|${match.opponent.trim().toLowerCase()}|${match.scheduledAt ?? 0}`,
      ),
    );

    let created = 0;
    let skippedExisting = 0;
    let skippedNoDiaTeam = 0;
    let skippedUnknownTeam = 0;
    let skippedCancelled = 0;
    let skippedNoDate = 0;
    let updatedFinished = 0;

    for (const wedstrijd of wedstrijden) {
      if (wedstrijd.status === "afgelast") {
        skippedCancelled++;
        continue;
      }

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
      const key = `${team._id}|${opponent.toLowerCase()}|${wedstrijd.datum_ms}`;
      const isFinished = wedstrijd.status === "gespeeld";
      const homeGoals = wedstrijd.thuis_goals ?? 0;
      const awayGoals = wedstrijd.uit_goals ?? 0;

      if (existingKeys.has(key)) {
        const existingMatch = existingByKey.get(key);
        if (
          existingMatch &&
          existingMatch.status === "scheduled" &&
          isFinished
        ) {
          if (!dryRun) {
            await ctx.db.patch(existingMatch._id, {
              status: "finished",
              currentQuarter: 4,
              homeScore: homeGoals,
              awayScore: awayGoals,
              startedAt: existingMatch.startedAt ?? wedstrijd.datum_ms,
              finishedAt: wedstrijd.datum_ms + 3600000,
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
        await ctx.db.insert("matches", {
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
      }

      existingKeys.add(key);
      created++;
    }

    return {
      totalWedstrijden: wedstrijden.length,
      dryRun,
      created,
      updatedFinished,
      skippedExisting,
      skippedNoDiaTeam,
      skippedUnknownTeam,
      skippedCancelled,
      skippedNoDate,
    };
  },
});

