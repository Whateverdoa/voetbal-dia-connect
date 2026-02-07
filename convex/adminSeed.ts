/**
 * Admin seed functions for development/testing
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyAdminPin } from "./adminAuth";

// ============ SEED DATA ============

export const seedDIA = mutation({
  args: {
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    
    // Check if DIA already exists
    const existing = await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", "dia"))
      .first();

    if (existing) {
      return { message: "DIA already exists", clubId: existing._id };
    }

    // Create DIA club
    const clubId = await ctx.db.insert("clubs", {
      name: "DIA",
      slug: "dia",
      createdAt: Date.now(),
    });

    // Create JO12-1 team
    const teamId = await ctx.db.insert("teams", {
      clubId,
      name: "JO12-1",
      slug: "jo12-1",
      createdAt: Date.now(),
    });

    // Create coach with PIN 1234
    const coachId = await ctx.db.insert("coaches", {
      name: "Coach Mike",
      pin: "1234",
      teamIds: [teamId],
      createdAt: Date.now(),
    });

    // JO12-1 spelers (seizoen 2025-2026)
    const samplePlayers = [
      { name: "Lukas", number: 1 },
      { name: "Luc", number: 2 },
      { name: "Loek", number: 3 },
      { name: "Max", number: 4 },
      { name: "Sem", number: 5 },
      { name: "Jip", number: 6 },
      { name: "Bora", number: 7 },
      { name: "Devon", number: 8 },
      { name: "Maçeo", number: 9 },
      { name: "Oliver", number: 10 },
      { name: "Revi", number: 11 },
    ];

    const playerIds = [];
    for (const p of samplePlayers) {
      const id = await ctx.db.insert("players", {
        teamId,
        name: p.name,
        number: p.number,
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
      playerCount: playerIds.length,
      defaultPin: "1234",
    };
  },
});

// Seed upcoming matches for JO12-1 (voorjaar 2026)
export const seedMatches = mutation({
  args: {
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    
    // Find JO12-1 team
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

    // Get all players
    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();

    const playerIds = players.map((p) => p._id);

    // Generate unique 6-char codes
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      return code;
    };

    // Match schedule seizoen 2025-2026 (vanaf januari)
    const schedule = [
      // Gespeeld
      { date: "2026-01-24T10:00:00", opponent: "SCO JO12-2", isHome: true, finished: true, homeScore: 3, awayScore: 2 },
      // Nog te spelen
      { date: "2026-01-31T08:45:00", opponent: "VOAB JO12-2", isHome: false },
      { date: "2026-02-07T08:30:00", opponent: "Terheijden JO12-1", isHome: true },
      { date: "2026-02-28T08:30:00", opponent: "Oosterhout JO12-2", isHome: false },
      { date: "2026-03-07T11:30:00", opponent: "Baronie JO12-4", isHome: false },
      { date: "2026-03-14T09:00:00", opponent: "Boeimeer JO12-2", isHome: true },
      { date: "2026-03-21T09:00:00", opponent: "Madese Boys JO12-1", isHome: false },
    ];

    const createdMatches = [];

    for (const match of schedule) {
      // Check if match already exists
      const scheduledAt = new Date(match.date).getTime();
      const existingMatches = await ctx.db
        .query("matches")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();

      const alreadyExists = existingMatches.some(
        (m) => m.opponent === match.opponent && m.scheduledAt === scheduledAt
      );

      if (alreadyExists) {
        continue;
      }

      const publicCode = generateCode();

      const matchId = await ctx.db.insert("matches", {
        teamId: team._id,
        publicCode,
        coachPin: "1234",
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
        finishedAt: match.finished ? scheduledAt + 3600000 : undefined, // +1 hour
        createdAt: Date.now(),
      });

      // Add all players to match
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
