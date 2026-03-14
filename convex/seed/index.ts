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
  JO12_TEAM_CONFIGS,
  COACH_CONFIGS,
  REFEREE_CONFIGS,
  JO12_SCHEDULES,
} from "./seedData";
import { seedPlayersForTeam } from "./seedPlayers";
import { seedMatchesForTeam } from "./seedMatches";

/**
 * Idempotent seed action for DIA Live: 4 JO12 teams, coaches, players, full match schedules.
 * Creates: 1 club, 4 teams (JO12-1..4), 13 coaches, 4 referees, all gespeeld + komend matches.
 */
export const init = action({
  handler: async (ctx) => {
    const existingClub = await ctx.runQuery(api.admin.getClubBySlug, { slug: CLUB.slug });
    if (existingClub) {
      return {
        message: "Seed data already exists. DIA club found.",
        created: false,
      };
    }

    const clubId = await ctx.runMutation(api.admin.createClub, {
      name: CLUB.name,
      slug: CLUB.slug,
    });

    const teamMap: Record<string, Id<"teams">> = {};
    const teamSummary: Array<{ name: string; players: number }> = [];
    const usedNames = new Set<string>();

    for (const cfg of JO12_TEAM_CONFIGS) {
      const teamId = await ctx.runMutation(api.admin.createTeam, {
        clubId,
        name: cfg.name,
        slug: cfg.slug,
      });
      teamMap[cfg.slug] = teamId;
      const count = await seedPlayersForTeam(ctx, teamId, cfg.slug, usedNames);
      teamSummary.push({ name: cfg.name, players: count });
    }

    const coachSummary: Array<{ name: string; email?: string }> = [];
    for (const cfg of COACH_CONFIGS) {
      const teamIds = cfg.teamSlugs.map((s) => teamMap[s]).filter(Boolean);
      await ctx.runMutation(api.admin.createCoach, {
        name: cfg.name,
        email: cfg.email,
        teamIds,
      });
      coachSummary.push({ name: cfg.name, email: cfg.email });
    }

    const refereeMap: Record<string, Id<"referees">> = {};
    const refereeSummary: Array<{ name: string; email?: string }> = [];
    for (const cfg of REFEREE_CONFIGS) {
      const id = await ctx.runMutation(api.admin.createReferee, {
        name: cfg.name,
        email: cfg.email,
      });
      const slug = cfg.name.toLowerCase().replace(/[^a-z]/g, "-").replace(/-+/g, "-");
      refereeMap[slug] = id;
      refereeSummary.push({ name: cfg.name, email: cfg.email });
    }

    const allMatchResults: Array<{ team: string; opponent: string; code: string; date: string; result: string | null }> = [];
    for (const cfg of JO12_TEAM_CONFIGS) {
      const teamId = teamMap[cfg.slug];
      const defaultCoach = await ctx.runQuery(api.admin.listCoaches, {});
      const coach = defaultCoach.find((c) => c.teamIds.includes(teamId));
      if (!coach) {
        throw new Error(`Geen coach gevonden voor team ${cfg.name}`);
      }
      const schedule = JO12_SCHEDULES[cfg.slug];
      const results = await seedMatchesForTeam(
        ctx,
        teamId,
        coach._id,
        refereeMap,
        schedule
      );
      for (const r of results) {
        allMatchResults.push({ team: cfg.name, ...r });
      }
    }

    return {
      message: "Seed data created successfully!",
      created: true,
      teams: teamSummary,
      coaches: coachSummary,
      referees: refereeSummary,
      matches: allMatchResults,
    };
  },
});

// Internal mutation for creating seed match.
export const createSeedMatch = internalMutation({
  args: {
    teamId: v.id("teams"),
    coachId: v.id("coaches"),
    publicCode: v.string(),
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
      coachId: args.coachId,
      publicCode: args.publicCode,
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

/** Clear only match-related data: matchEvents, matchPlayers, matches.
 *  Leaves clubs, teams, coaches, players, referees intact.
 *  Safe for production — use before re-importing match schedules. */
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
