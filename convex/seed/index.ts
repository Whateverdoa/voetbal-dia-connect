/**
 * Modular seed system — orchestrates all seed operations.
 *
 * Run with: npx convex run seed:init
 */
import { action, internalMutation, mutation } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import {
  CLUB,
  TEAM_CONFIGS,
  COACH_CONFIGS,
  REFEREE_CONFIGS,
  SEED_ADMIN_PIN,
} from "./seedData";
import { seedPlayersForTeam } from "./seedPlayers";
import { seedMatchesForTeam } from "./seedMatches";

/**
 * Idempotent seed action for DIA Live development data.
 * Creates: 1 club, 3 teams, 14 players each, 4 coaches,
 *          4 referees, 3 matches with referee assignments.
 */
export const init = action({
  handler: async (ctx) => {
    // Idempotency check
    const existingClub = await ctx.runQuery(api.admin.getClubBySlug, { slug: CLUB.slug });
    if (existingClub) {
      return {
        message: "Seed data already exists. DIA club found.",
        created: false,
      };
    }

    // ========= CLUB =========
    const clubId = await ctx.runMutation(api.admin.createClub, {
      name: CLUB.name,
      slug: CLUB.slug,
      adminPin: SEED_ADMIN_PIN,
    });

    // ========= TEAMS + PLAYERS =========
    const teamMap: Record<string, Id<"teams">> = {};
    const teamSummary: Array<{ name: string; players: number }> = [];
    const usedNames = new Set<string>();

    for (const cfg of TEAM_CONFIGS) {
      const teamId = await ctx.runMutation(api.admin.createTeam, {
        clubId,
        name: cfg.name,
        slug: cfg.slug,
        adminPin: SEED_ADMIN_PIN,
      });
      teamMap[cfg.slug] = teamId;

      const count = await seedPlayersForTeam(ctx, teamId, usedNames);
      teamSummary.push({ name: cfg.name, players: count });
    }

    // ========= COACHES =========
    const coachSummary: Array<{ name: string; pin: string }> = [];
    for (const cfg of COACH_CONFIGS) {
      const teamIds = cfg.teamSlugs.map((s) => teamMap[s]).filter(Boolean);
      await ctx.runMutation(api.admin.createCoach, {
        name: cfg.name,
        pin: cfg.pin,
        teamIds,
        adminPin: SEED_ADMIN_PIN,
      });
      coachSummary.push({ name: cfg.name, pin: cfg.pin });
    }

    // ========= REFEREES =========
    const refereeMap: Record<string, Id<"referees">> = {};
    const refereeSummary: Array<{ name: string; pin: string }> = [];
    for (const cfg of REFEREE_CONFIGS) {
      const id = await ctx.runMutation(api.admin.createReferee, {
        name: cfg.name,
        pin: cfg.pin,
        adminPin: SEED_ADMIN_PIN,
      });
      // Create a slug from the name for referral in match schedule
      const slug = cfg.name.toLowerCase().replace(/[^a-z]/g, "-").replace(/-+/g, "-");
      refereeMap[slug] = id;
      refereeSummary.push({ name: cfg.name, pin: cfg.pin });
    }

    // ========= MATCHES =========
    const jo12Id = teamMap["jo12-1"];
    const matchResults = await seedMatchesForTeam(
      ctx,
      jo12Id,
      "1234", // Coach Mike's PIN
      refereeMap,
    );

    return {
      message: "Seed data created successfully!",
      created: true,
      teams: teamSummary,
      coaches: coachSummary,
      referees: refereeSummary,
      matches: matchResults,
    };
  },
});

// Internal mutation for creating seed match (not PIN-protected since it's seed data)
export const createSeedMatch = internalMutation({
  args: {
    teamId: v.id("teams"),
    publicCode: v.string(),
    coachPin: v.string(),
    opponent: v.string(),
    isHome: v.boolean(),
    scheduledAt: v.number(),
    finished: v.boolean(),
    homeScore: v.number(),
    awayScore: v.number(),
    refereeId: v.optional(v.id("referees")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("matches", {
      teamId: args.teamId,
      publicCode: args.publicCode,
      coachPin: args.coachPin,
      opponent: args.opponent,
      isHome: args.isHome,
      scheduledAt: args.scheduledAt,
      status: args.finished ? "finished" : "scheduled",
      currentQuarter: args.finished ? 4 : 1,
      quarterCount: 4,
      homeScore: args.homeScore,
      awayScore: args.awayScore,
      showLineup: false,
      refereeId: args.refereeId,
      startedAt: args.finished ? args.scheduledAt : undefined,
      finishedAt: args.finished ? args.scheduledAt + 3600000 : undefined,
      createdAt: now,
    });
  },
});

export const addPlayerToMatch = internalMutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("matchPlayers", {
      matchId: args.matchId,
      playerId: args.playerId,
      isKeeper: false,
      onField: false,
      createdAt: Date.now(),
    });
  },
});

/** Wipe all data from all tables. Dev-only — run before re-seeding. */
export const clearAll = mutation({
  handler: async (ctx) => {
    const tableNames = [
      "matchEvents",
      "matchPlayers",
      "matches",
      "players",
      "coaches",
      "referees",
      "teams",
      "clubs",
    ] as const;

    let total = 0;
    for (const table of tableNames) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      total += docs.length;
    }
    return { message: `Cleared ${total} records across ${tableNames.length} tables.`, total };
  },
});
