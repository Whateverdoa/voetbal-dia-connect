import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============ CLUBS ============

export const createClub = mutation({
  args: { name: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("clubs", {
      name: args.name,
      slug: args.slug.toLowerCase(),
      createdAt: Date.now(),
    });
  },
});

export const getClubBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug.toLowerCase()))
      .first();
  },
});

export const listClubs = query({
  handler: async (ctx) => {
    return await ctx.db.query("clubs").collect();
  },
});

// ============ TEAMS ============

export const createTeam = mutation({
  args: { clubId: v.id("clubs"), name: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("teams", {
      clubId: args.clubId,
      name: args.name,
      slug: args.slug.toLowerCase(),
      createdAt: Date.now(),
    });
  },
});

export const listTeamsByClub = query({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();
  },
});

export const getTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.teamId);
  },
});

// ============ COACHES ============

export const createCoach = mutation({
  args: {
    name: v.string(),
    pin: v.string(),
    teamIds: v.array(v.id("teams")),
  },
  handler: async (ctx, args) => {
    // Check PIN is unique
    const existing = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();
    
    if (existing) {
      throw new Error("PIN already in use");
    }

    return await ctx.db.insert("coaches", {
      name: args.name,
      pin: args.pin,
      teamIds: args.teamIds,
      createdAt: Date.now(),
    });
  },
});

export const listCoaches = query({
  handler: async (ctx) => {
    const coaches = await ctx.db.query("coaches").collect();
    
    // Enrich with team names
    return await Promise.all(
      coaches.map(async (c) => {
        const teams = await Promise.all(c.teamIds.map((id) => ctx.db.get(id)));
        return {
          ...c,
          teams: teams.filter(Boolean).map((t) => ({ id: t!._id, name: t!.name })),
        };
      })
    );
  },
});

// ============ PLAYERS ============

export const createPlayer = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    number: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("players", {
      teamId: args.teamId,
      name: args.name,
      number: args.number,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const createPlayers = mutation({
  args: {
    teamId: v.id("teams"),
    players: v.array(v.object({
      name: v.string(),
      number: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const p of args.players) {
      const id = await ctx.db.insert("players", {
        teamId: args.teamId,
        name: p.name,
        number: p.number,
        active: true,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

export const listPlayersByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const updatePlayer = mutation({
  args: {
    playerId: v.id("players"),
    name: v.optional(v.string()),
    number: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { playerId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(playerId, filtered);
  },
});

// ============ SEED DATA ============

export const seedDIA = mutation({
  handler: async (ctx) => {
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
  handler: async (ctx) => {
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
