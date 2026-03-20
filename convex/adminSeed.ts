/**
 * Admin seed functions for development/testing.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { upsertUserAccess } from "./lib/userAccess";
import { requireAdminOrOps } from "./lib/opsAuth";

export const seedDIA = mutation({
  args: {
    opsSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);

    const existing = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", "dia"))
      .first();

    if (existing) {
      return { message: "DIA already exists", clubId: existing._id };
    }

    const clubId = await ctx.db.insert("clubs", {
      name: "DIA",
      slug: "dia",
      createdAt: Date.now(),
    });

    const teamId = await ctx.db.insert("teams", {
      clubId,
      name: "JO12-1",
      slug: "jo12-1",
      createdAt: Date.now(),
    });

    const coachEmail = "coach.mike@dia.local";
    const coachId = await ctx.db.insert("coaches", {
      name: "Coach Mike",
      email: coachEmail,
      teamIds: [teamId],
      createdAt: Date.now(),
    });

    await upsertUserAccess(ctx, {
      email: coachEmail,
      roles: ["coach"],
      coachId,
      source: "admin_manual",
    });

    const samplePlayers = [
      { name: "Lukas", number: 1 },
      { name: "Luc", number: 2 },
      { name: "Loek", number: 3 },
      { name: "Max", number: 4 },
      { name: "Sem", number: 5 },
      { name: "Jip", number: 6 },
      { name: "Bora", number: 7 },
      { name: "Devon", number: 8 },
      { name: "Maceo", number: 9 },
      { name: "Oliver", number: 10 },
      { name: "Revi", number: 11 },
    ];

    const playerIds = [];
    for (const player of samplePlayers) {
      const id = await ctx.db.insert("players", {
        teamId,
        name: player.name,
        number: player.number,
        active: true,
        createdAt: Date.now(),
      });
      playerIds.push(id);
    }

    return {
      message: "DIA seeded successfully",
      clubId,
      teamId,
      coachId,
      coachEmail,
      playerCount: playerIds.length,
    };
  },
});

export const seedMatches = mutation({
  args: {
    opsSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);

    const club = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", "dia"))
      .first();

    if (!club) {
      throw new Error("DIA club not found. Run seedDIA first.");
    }

    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("clubId", club._id).eq("slug", "jo12-1"))
      .first();

    if (!team) {
      throw new Error("JO12-1 team not found");
    }

    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", "coach.mike@dia.local"))
      .first();

    if (!coach) {
      throw new Error("Coach Mike not found");
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();

    const playerIds = players.map((player) => player._id);

    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    };

    const schedule = [
      { date: "2026-01-24T10:00:00", opponent: "SCO JO12-2", isHome: true, finished: true, homeScore: 3, awayScore: 2 },
      { date: "2026-01-31T08:45:00", opponent: "VOAB JO12-2", isHome: false },
      { date: "2026-02-07T08:30:00", opponent: "Terheijden JO12-1", isHome: true },
      { date: "2026-02-28T08:30:00", opponent: "Oosterhout JO12-2", isHome: false },
      { date: "2026-03-07T11:30:00", opponent: "Baronie JO12-4", isHome: false },
      { date: "2026-03-14T09:00:00", opponent: "Boeimeer JO12-2", isHome: true },
      { date: "2026-03-21T09:00:00", opponent: "Madese Boys JO12-1", isHome: false },
    ];

    const createdMatches = [];

    for (const match of schedule) {
      const scheduledAt = new Date(match.date).getTime();
      const existingMatches = await ctx.db
        .query("matches")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();

      const alreadyExists = existingMatches.some(
        (entry) => entry.opponent === match.opponent && entry.scheduledAt === scheduledAt
      );

      if (alreadyExists) {
        continue;
      }

      const publicCode = generateCode();

      const matchId = await ctx.db.insert("matches", {
        teamId: team._id,
        publicCode,
        coachId: coach._id,
        opponent: match.opponent,
        isHome: match.isHome,
        scheduledAt,
        status: match.finished ? "finished" : "scheduled",
        currentQuarter: match.finished ? 4 : 1,
        quarterCount: 4,
        homeScore: match.homeScore ?? 0,
        awayScore: match.awayScore ?? 0,
        showLineup: false,
        startedAt: match.finished ? scheduledAt : undefined,
        finishedAt: match.finished ? scheduledAt + 3600000 : undefined,
        createdAt: Date.now(),
      });

      for (const playerId of playerIds) {
        await ctx.db.insert("matchPlayers", {
          matchId,
          playerId,
          isKeeper: false,
          onField: false,
          createdAt: Date.now(),
        });
      }

      createdMatches.push({
        opponent: match.opponent,
        date: match.date,
        code: publicCode,
        result: match.finished ? `${match.homeScore}-${match.awayScore}` : null,
      });
    }

    return {
      message: `${createdMatches.length} wedstrijden aangemaakt`,
      matches: createdMatches,
    };
  },
});
