import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// Dutch first names for realistic player data
const DUTCH_NAMES = [
  "Daan", "Sem", "Liam", "Lucas", "Finn", "Luuk", "Milan", "Jesse",
  "Noah", "Bram", "Lars", "Tim", "Thijs", "Max", "Ruben", "Thomas",
  "Jayden", "Stijn", "Julian", "Sven", "Niels", "Joep", "Mees", "Cas",
  "Tijn", "Teun", "Gijs", "Jens", "Bas", "Floris", "Pepijn", "Olivier",
  "Hidde", "Ties", "Vince", "Sam", "Luca", "Rick", "Niek", "Koen",
  "Ravi", "Jasper", "Wouter", "Pieter", "Sander", "Matthijs", "Daniël", "Tobias",
];

// Generate 14 unique players with realistic shirt numbers
function generatePlayers(usedNames: Set<string>): Array<{ name: string; number: number }> {
  const players: Array<{ name: string; number: number }> = [];
  const availableNames = DUTCH_NAMES.filter((n) => !usedNames.has(n));
  
  // Shuffle available names
  const shuffled = [...availableNames].sort(() => Math.random() - 0.5);
  
  // Common youth football shirt numbers (1-99, but typically 1-25)
  const shirtNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  
  for (let i = 0; i < 14; i++) {
    const name = shuffled[i];
    usedNames.add(name);
    players.push({ name, number: shirtNumbers[i] });
  }
  
  return players;
}

// Generate unique 6-char public code (no ambiguous chars)
function generatePublicCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No O/0/I/1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Idempotent seed action for DIA Live development data.
 * Run with: npx convex run seed:init
 */
export const init = action({
  handler: async (ctx): Promise<{
    message: string;
    created: boolean;
    data?: {
      clubId: Id<"clubs">;
      teams: Array<{ id: Id<"teams">; name: string; playerCount: number }>;
      coaches: Array<{ id: Id<"coaches">; name: string; pin: string }>;
      match?: { id: Id<"matches">; code: string; opponent: string };
    };
  }> => {
    // Check idempotency: does DIA club already exist?
    const existingClub = await ctx.runQuery(api.admin.getClubBySlug, { slug: "dia" });
    
    if (existingClub) {
      return {
        message: "Seed data already exists. DIA club found.",
        created: false,
        data: {
          clubId: existingClub._id,
          teams: [],
          coaches: [],
        },
      };
    }

    // ============ CREATE CLUB ============
    const seedAdminPin = "9999"; // Default dev admin PIN
    const clubId = await ctx.runMutation(api.admin.createClub, {
      name: "DIA",
      slug: "dia",
      adminPin: seedAdminPin,
    });

    // ============ CREATE TEAMS ============
    const teamConfigs = [
      { name: "JO11-1", slug: "jo11-1" },
      { name: "JO12-1", slug: "jo12-1" },
      { name: "JO13-2", slug: "jo13-2" },
    ];

    const teams: Array<{ id: Id<"teams">; name: string; playerCount: number }> = [];
    const teamMap: Record<string, Id<"teams">> = {};
    const usedNames = new Set<string>();

    for (const config of teamConfigs) {
      const teamId = await ctx.runMutation(api.admin.createTeam, {
        clubId,
        name: config.name,
        slug: config.slug,
        adminPin: seedAdminPin,
      });

      teamMap[config.slug] = teamId;

      // Create 14 players for this team
      const players = generatePlayers(usedNames);
      await ctx.runMutation(api.admin.createPlayers, {
        teamId,
        players,
        adminPin: seedAdminPin,
      });

      teams.push({ id: teamId, name: config.name, playerCount: players.length });
    }

    // ============ CREATE COACHES ============
    // Coach Mike: PIN 1234, manages JO12-1
    const coachMikeId = await ctx.runMutation(api.admin.createCoach, {
      name: "Coach Mike",
      pin: "1234",
      teamIds: [teamMap["jo12-1"]],
      adminPin: seedAdminPin,
    });

    // Coach Lisa: PIN 5678, manages JO11-1 and JO13-2
    const coachLisaId = await ctx.runMutation(api.admin.createCoach, {
      name: "Coach Lisa",
      pin: "5678",
      teamIds: [teamMap["jo11-1"], teamMap["jo13-2"]],
      adminPin: seedAdminPin,
    });

    const coaches = [
      { id: coachMikeId, name: "Coach Mike", pin: "1234" },
      { id: coachLisaId, name: "Coach Lisa", pin: "5678" },
    ];

    // ============ CREATE SAMPLE MATCH ============
    // Create a match for JO12-1 vs VV Oranje
    const jo12TeamId = teamMap["jo12-1"];
    const publicCode = generatePublicCode();

    // Use internal mutation for match creation (not exposed in admin.ts)
    const matchId = await ctx.runMutation(internal.seed.createSeedMatch, {
      teamId: jo12TeamId,
      publicCode,
      coachPin: "1234",
      opponent: "VV Oranje",
      isHome: true,
    });

    // Get all JO12-1 players and add them to the match
    const jo12Players = await ctx.runQuery(api.admin.listPlayersByTeam, {
      teamId: jo12TeamId,
    });

    for (const player of jo12Players) {
      await ctx.runMutation(internal.seed.addPlayerToMatch, {
        matchId,
        playerId: player._id,
      });
    }

    return {
      message: "Seed data created successfully!",
      created: true,
      data: {
        clubId,
        teams,
        coaches,
        match: {
          id: matchId,
          code: publicCode,
          opponent: "VV Oranje",
        },
      },
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("matches", {
      teamId: args.teamId,
      publicCode: args.publicCode,
      coachPin: args.coachPin,
      opponent: args.opponent,
      isHome: args.isHome,
      scheduledAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week from now
      status: "scheduled",
      currentQuarter: 1,
      quarterCount: 4,
      homeScore: 0,
      awayScore: 0,
      showLineup: false,
      createdAt: Date.now(),
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
