import { defineTable } from "convex/server";
import { v } from "convex/values";

/** Shared gamification profile shape on `players`. */
export const cardProfileValidator = v.object({
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
});

/** Parent/player consent for selection-team photos & gamification (AVG). */
export const playerConsentsTable = defineTable({
  playerId: v.id("players"),
  teamId: v.id("teams"),
  consentType: v.union(
    v.literal("photo"),
    v.literal("gamification"),
    v.literal("public_display")
  ),
  status: v.union(
    v.literal("pending"),
    v.literal("granted"),
    v.literal("revoked")
  ),
  grantedBy: v.optional(v.union(v.literal("parent"), v.literal("player"))),
  grantedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
  parentEmail: v.optional(v.string()),
  documentVersion: v.string(),
  /** Unguessable token for /consent/[token] parent form. */
  token: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_player", ["playerId"])
  .index("by_player_type", ["playerId", "consentType"])
  .index("by_team", ["teamId"])
  .index("by_token", ["token"]);

/** VoetbalAssist / Sportlink staged fixtures. */
export const wedstrijdenTable = defineTable({
  voetbalassist_id: v.number(),
  datum: v.string(),
  tijd: v.string(),
  datum_ms: v.number(),
  thuisteam: v.string(),
  uitteam: v.string(),
  thuis_goals: v.optional(v.number()),
  uit_goals: v.optional(v.number()),
  status: v.string(),
  type: v.string(),
  categorie: v.string(),
  leeftijd: v.number(),
  dia_team: v.string(),
  veld: v.string(),
  scheidsrechter: v.string(),
  thuisteamLogo: v.optional(v.string()),
  uitteamLogo: v.optional(v.string()),
  sportlink_wedstrijdcode: v.optional(v.string()),
})
  .index("by_voetbalassist_id", ["voetbalassist_id"])
  .index("by_datum", ["datum_ms"])
  .index("by_team", ["dia_team"])
  .index("by_sportlink_code", ["sportlink_wedstrijdcode"]);

/** Free-drag tactic board tokens (independent of official lineup slots). */
export const tacticBoardsTable = defineTable({
  matchId: v.id("matches"),
  tokens: v.array(
    v.object({
      playerId: v.id("players"),
      x: v.number(),
      y: v.number(),
      onBoard: v.boolean(),
    })
  ),
  updatedAt: v.number(),
}).index("by_match", ["matchId"]);

/** One row of a bond poule standing, as published by Sportlink. */
export const standingRowValidator = v.object({
  position: v.number(),
  teamName: v.string(),
  clubLogoUrl: v.optional(v.string()),
  played: v.number(),
  won: v.number(),
  drawn: v.number(),
  lost: v.number(),
  goalsFor: v.number(),
  goalsAgainst: v.number(),
  goalDifference: v.number(),
  points: v.number(),
  /** Sportlink marks every team of our own club, which may be more than one. */
  isOwnClub: v.boolean(),
});

/**
 * Cached bond standing per own team. One document per team slug, refreshed by
 * the Sportlink cron; a poule holds at most ~16 teams so the rows live inline.
 */
export const standingsTable = defineTable({
  teamSlug: v.string(),
  poulecode: v.string(),
  competitionName: v.string(),
  klassepoule: v.string(),
  /** Bond team name ("DIA O13-2JM"), used to highlight the exact row. */
  sportlinkTeamName: v.string(),
  rows: v.array(standingRowValidator),
  fetchedAt: v.number(),
}).index("by_team_slug", ["teamSlug"]);
