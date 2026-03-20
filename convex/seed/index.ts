/**
 * Modular seed system - orchestrates all seed operations.
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
} from "./seedData";
import { seedPlayersForTeam } from "./seedPlayers";
import { seedMatchesForTeam } from "./seedMatches";
import { upsertUserAccess } from "../lib/userAccess";

export const init = action({
  handler: async (ctx) => {
    const existingClub = await ctx.runQuery(api.admin.getClubBySlug, { slug: CLUB.slug });
    if (existingClub) {
      return {
        message: "Seed data already exists. DIA club found.",
        created: false,
      };
    }

    const clubId = await ctx.runMutation(internal.seed.createSeedClub, {
      name: CLUB.name,
      slug: CLUB.slug,
    });

    const teamMap: Record<string, Id<"teams">> = {};
    const teamSummary: Array<{ name: string; players: number }> = [];
    const usedNames = new Set<string>();

    for (const cfg of TEAM_CONFIGS) {
      const teamId = await ctx.runMutation(internal.seed.createSeedTeam, {
        clubId,
        name: cfg.name,
        slug: cfg.slug,
      });
      teamMap[cfg.slug] = teamId;

      const count = await seedPlayersForTeam(ctx, teamId, cfg.slug, usedNames);
      teamSummary.push({ name: cfg.name, players: count });
    }

    const coachMap: Record<string, Id<"coaches">> = {};
    const coachSummary: Array<{ name: string; email: string }> = [];
    for (const cfg of COACH_CONFIGS) {
      const teamIds = cfg.teamSlugs.map((slug) => teamMap[slug]).filter(Boolean);
      const id = await ctx.runMutation(internal.seed.createSeedCoach, {
        name: cfg.name,
        email: cfg.email,
        teamIds,
      });
      coachMap[cfg.email] = id;
      coachSummary.push({ name: cfg.name, email: cfg.email });
    }

    const refereeMap: Record<string, Id<"referees">> = {};
    const refereeSummary: Array<{ name: string; email: string }> = [];
    for (const cfg of REFEREE_CONFIGS) {
      const id = await ctx.runMutation(internal.seed.createSeedReferee, {
        name: cfg.name,
        email: cfg.email,
      });
      const slug = cfg.name.toLowerCase().replace(/[^a-z]/g, "-").replace(/-+/g, "-");
      refereeMap[slug] = id;
      refereeSummary.push({ name: cfg.name, email: cfg.email });
    }

    const jo12Id = teamMap["jo12-1"];
    const jo12CoachId = coachMap["remco.hendriks@dia.local"];
    if (!jo12Id || !jo12CoachId) {
      throw new Error("JO12 seeddata mist team of hoofdcoach");
    }

    const matchResults = await seedMatchesForTeam(
      ctx,
      jo12Id,
      jo12CoachId,
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

export const createSeedClub = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clubs", {
      name: args.name,
      slug: args.slug.toLowerCase(),
      createdAt: Date.now(),
    });
  },
});

export const createSeedTeam = internalMutation({
  args: {
    clubId: v.id("clubs"),
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("teams", {
      clubId: args.clubId,
      name: args.name,
      slug: args.slug.toLowerCase(),
      createdAt: Date.now(),
    });
  },
});

export const createSeedPlayers = internalMutation({
  args: {
    teamId: v.id("teams"),
    players: v.array(
      v.object({
        name: v.string(),
        number: v.optional(v.number()),
        positionPrimary: v.optional(v.string()),
        positionSecondary: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const player of args.players) {
      const id = await ctx.db.insert("players", {
        teamId: args.teamId,
        name: player.name,
        number: player.number,
        positionPrimary: player.positionPrimary,
        positionSecondary: player.positionSecondary,
        active: true,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

export const createSeedCoach = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    teamIds: v.array(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const coachId = await ctx.db.insert("coaches", {
      name: args.name,
      email: args.email.trim().toLowerCase(),
      teamIds: args.teamIds,
      createdAt: Date.now(),
    });

    await upsertUserAccess(ctx, {
      email: args.email,
      roles: ["coach"],
      coachId,
      source: "admin_manual",
    });

    return coachId;
  },
});

export const createSeedReferee = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const refereeId = await ctx.db.insert("referees", {
      name: args.name,
      email: args.email.trim().toLowerCase(),
      active: true,
      createdAt: Date.now(),
    });

    await upsertUserAccess(ctx, {
      email: args.email,
      roles: ["referee"],
      refereeId,
      source: "admin_manual",
    });

    return refereeId;
  },
});

export const createSeedMatch = internalMutation({
  args: {
    teamId: v.id("teams"),
    publicCode: v.string(),
    coachId: v.id("coaches"),
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
      coachId: args.coachId,
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
      "userAccess",
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

export const clearMatchesOnly = mutation({
  handler: async (ctx) => {
    const tableNames = ["matchEvents", "matchPlayers", "matches"] as const;

    let total = 0;
    for (const table of tableNames) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      total += docs.length;
    }
    return {
      message: `Cleared ${total} match records across ${tableNames.length} tables.`,
      total,
      tablesCleared: [...tableNames],
    };
  },
});
