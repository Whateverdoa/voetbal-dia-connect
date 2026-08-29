/**
 * Server-side XP / badge engine for selection teams (post-match).
 */
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  levelFromXp,
  minutesToXp,
  rarityFromLevel,
  XP_ASSIST,
  XP_GOAL,
} from "../src/lib/gamification/levels";

const EMPTY_STATS = {
  matches: 0,
  minutes: 0,
  goals: 0,
  assists: 0,
  cleanSheets: 0,
};

function ensureProfile(player: {
  cardProfile?: {
    xp: number;
    level: number;
    rarity: "common" | "rare" | "epic";
    seasonStats: typeof EMPTY_STATS;
    badges?: string[];
  };
}) {
  return (
    player.cardProfile ?? {
      xp: 0,
      level: 1,
      rarity: "common" as const,
      seasonStats: { ...EMPTY_STATS },
      badges: [] as string[],
    }
  );
}

function milestoneBadges(stats: typeof EMPTY_STATS, badges: string[]): string[] {
  const next = new Set(badges);
  if (stats.matches >= 1) next.add("eerste_wedstrijd");
  if (stats.matches >= 10) next.add("10_wedstrijden");
  if (stats.goals >= 1) next.add("eerste_doelpunt");
  if (stats.assists >= 1) next.add("eerste_assist");
  if (stats.cleanSheets >= 1) next.add("clean_sheet");
  if (stats.minutes >= 300) next.add("300_minuten");
  return Array.from(next);
}

async function awardMatchXpCore(
  ctx: MutationCtx,
  matchId: Id<"matches">
): Promise<{ updated: number; skipped: number }> {
  const match = await ctx.db.get(matchId);
  if (!match) throw new Error("Wedstrijd niet gevonden");
  if (match.status !== "finished") {
    throw new Error("XP alleen na afloop van de wedstrijd");
  }

  const team = await ctx.db.get(match.teamId);
  if (!team?.isSelectionTeam) {
    return { updated: 0, skipped: 0 };
  }

  const matchPlayers = await ctx.db
    .query("matchPlayers")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();

  const events = await ctx.db
    .query("matchEvents")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();

  let updated = 0;
  let skipped = 0;

  for (const mp of matchPlayers) {
    const consents = await ctx.db
      .query("playerConsents")
      .withIndex("by_player_type", (q) =>
        q.eq("playerId", mp.playerId).eq("consentType", "gamification")
      )
      .collect();
    if (!consents.some((c) => c.status === "granted")) {
      skipped++;
      continue;
    }

    const player = await ctx.db.get(mp.playerId);
    if (!player) {
      skipped++;
      continue;
    }

    const goals = events.filter(
      (e) =>
        e.type === "goal" &&
        e.playerId === mp.playerId &&
        !e.isOpponentGoal &&
        !e.isOwnGoal
    ).length;
    const assists = events.filter(
      (e) => e.type === "assist" && e.playerId === mp.playerId
    ).length;
    const minutes = mp.minutesPlayed ?? 0;
    const isKeeper = mp.isKeeper || player.positionPrimary === "GK";
    const cleanSheet =
      isKeeper && minutes > 0 && match.awayScore === 0 && match.isHome
        ? 1
        : isKeeper && minutes > 0 && match.homeScore === 0 && !match.isHome
          ? 1
          : 0;

    const gained = minutesToXp(minutes) + goals * XP_GOAL + assists * XP_ASSIST;
    const profile = ensureProfile(player);
    const xp = profile.xp + gained;
    const level = levelFromXp(xp);
    const seasonStats = {
      matches: profile.seasonStats.matches + 1,
      minutes: profile.seasonStats.minutes + minutes,
      goals: profile.seasonStats.goals + goals,
      assists: profile.seasonStats.assists + assists,
      cleanSheets: profile.seasonStats.cleanSheets + cleanSheet,
    };
    const badges = milestoneBadges(seasonStats, profile.badges ?? []);

    await ctx.db.patch(player._id, {
      cardProfile: {
        xp,
        level,
        rarity: rarityFromLevel(level),
        seasonStats,
        badges,
      },
    });
    updated++;
  }

  return { updated, skipped };
}

export const awardMatchXpInternal = internalMutation({
  args: { matchId: v.id("matches") },
  returns: v.object({ updated: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => awardMatchXpCore(ctx, args.matchId),
});

/** Award XP after a finished match for selection-team players with gamification consent. */
export const awardMatchXp = mutation({
  args: { matchId: v.id("matches") },
  returns: v.object({
    updated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => awardMatchXpCore(ctx, args.matchId),
});

export const getTeamDeck = query({
  args: { teamId: v.id("teams") },
  returns: v.array(
    v.object({
      playerId: v.id("players"),
      name: v.string(),
      number: v.union(v.number(), v.null()),
      positionPrimary: v.union(v.string(), v.null()),
      photoUrl: v.union(v.string(), v.null()),
      cardProfile: v.union(
        v.object({
          xp: v.number(),
          level: v.number(),
          rarity: v.union(
            v.literal("common"),
            v.literal("rare"),
            v.literal("epic")
          ),
          seasonStats: v.object({
            matches: v.number(),
            minutes: v.number(),
            goals: v.number(),
            assists: v.number(),
            cleanSheets: v.number(),
          }),
          badges: v.optional(v.array(v.string())),
        }),
        v.null()
      ),
      showGamification: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return [];

    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const result = [];
    for (const player of players.filter((p) => p.active)) {
      const gameConsents = await ctx.db
        .query("playerConsents")
        .withIndex("by_player_type", (q) =>
          q.eq("playerId", player._id).eq("consentType", "gamification")
        )
        .collect();
      const photoConsents = await ctx.db
        .query("playerConsents")
        .withIndex("by_player_type", (q) =>
          q.eq("playerId", player._id).eq("consentType", "photo")
        )
        .collect();
      const publicConsents = await ctx.db
        .query("playerConsents")
        .withIndex("by_player_type", (q) =>
          q.eq("playerId", player._id).eq("consentType", "public_display")
        )
        .collect();

      const publicOk = publicConsents.some((c) => c.status === "granted");
      const gameOk =
        publicOk && gameConsents.some((c) => c.status === "granted");
      const photoOk =
        publicOk && photoConsents.some((c) => c.status === "granted");

      result.push({
        playerId: player._id,
        name: player.name,
        number: player.number ?? null,
        positionPrimary: player.positionPrimary ?? null,
        photoUrl: photoOk ? player.photoUrl ?? null : null,
        cardProfile: gameOk ? player.cardProfile ?? null : null,
        showGamification: gameOk,
      });
    }

    return result.sort((a, b) => {
      const la = a.cardProfile?.level ?? 0;
      const lb = b.cardProfile?.level ?? 0;
      return lb - la;
    });
  },
});
