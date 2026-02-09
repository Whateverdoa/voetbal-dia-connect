import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Club level (DIA, etc)
  clubs: defineTable({
    name: v.string(),
    slug: v.string(), // "dia"
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  // Teams within a club
  teams: defineTable({
    clubId: v.id("clubs"),
    name: v.string(), // "JO12-1"
    slug: v.string(), // "jo12-1"
    createdAt: v.number(),
  })
    .index("by_club", ["clubId"])
    .index("by_slug", ["clubId", "slug"])
    .index("by_slug_only", ["slug"]), // For getBySlug query

  // Coaches can manage one or more teams
  coaches: defineTable({
    name: v.string(),
    pin: v.string(), // 4-6 digit PIN
    teamIds: v.array(v.id("teams")),
    createdAt: v.number(),
  }).index("by_pin", ["pin"]),

  // Players per team
  players: defineTable({
    teamId: v.id("teams"),
    name: v.string(),
    number: v.optional(v.number()), // Shirt number
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_team", ["teamId"]),

  // Matches
  matches: defineTable({
    teamId: v.id("teams"),
    publicCode: v.string(), // 6-char code for public access
    coachPin: v.string(), // PIN to control this match
    
    // Match info
    opponent: v.string(),
    isHome: v.boolean(),
    scheduledAt: v.optional(v.number()),
    
    // Match state
    status: v.union(
      v.literal("scheduled"),
      v.literal("lineup"),
      v.literal("live"),
      v.literal("halftime"),
      v.literal("finished")
    ),
    currentQuarter: v.number(), // 1-4 (or 1-2 for halves)
    quarterCount: v.number(), // 2 or 4
    
    // Score
    homeScore: v.number(),
    awayScore: v.number(),
    
    // Public display options
    showLineup: v.boolean(), // Show lineup to public?
    
    // Timestamps
    startedAt: v.optional(v.number()),
    quarterStartedAt: v.optional(v.number()), // When current quarter began (for match clock)
    finishedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_code", ["publicCode"])
    .index("by_status", ["status"]),

  // Match lineup - which players are in this match
  matchPlayers: defineTable({
    matchId: v.id("matches"),
    playerId: v.id("players"),
    isKeeper: v.boolean(),
    onField: v.boolean(), // Currently on field?
    // Playing time tracking
    minutesPlayed: v.optional(v.number()), // Total minutes played this match
    lastSubbedInAt: v.optional(v.number()), // Timestamp when player went on field
    createdAt: v.number(),
  })
    .index("by_match", ["matchId"])
    .index("by_match_player", ["matchId", "playerId"])
    .index("by_player", ["playerId"]), // For getPlayerStats query

  // Events during match (goals, assists, subs)
  matchEvents: defineTable({
    matchId: v.id("matches"),
    type: v.union(
      v.literal("goal"),
      v.literal("assist"),
      v.literal("sub_in"),
      v.literal("sub_out"),
      v.literal("quarter_start"),
      v.literal("quarter_end"),
      v.literal("yellow_card"),
      v.literal("red_card")
    ),
    playerId: v.optional(v.id("players")), // Who did it
    relatedPlayerId: v.optional(v.id("players")), // Assist giver, or sub replacement
    quarter: v.number(),
    isOwnGoal: v.optional(v.boolean()),
    isOpponentGoal: v.optional(v.boolean()), // Goal by opponent
    note: v.optional(v.string()),
    timestamp: v.number(), // When event occurred
    createdAt: v.number(),
  })
    .index("by_match", ["matchId"])
    .index("by_match_type", ["matchId", "type"]),
});
