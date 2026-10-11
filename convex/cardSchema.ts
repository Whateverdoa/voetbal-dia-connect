import { defineTable } from "convex/server";
import { v } from "convex/values";

export { fcRatingsValidator, recognitionValidator } from "./lib/fcCardValidators";
export const cardKindValidator = v.union(v.literal("week"), v.literal("month"));
export const voterKindValidator = v.union(v.literal("player"), v.literal("parent"));
export const roundModeValidator = v.union(v.literal("manual"), v.literal("vote"));
export const roundStatusValidator = v.union(v.literal("open"), v.literal("published"), v.literal("cancelled"));
export const rankingValidator = v.array(v.object({ playerId: v.id("players"), count: v.number() }));

/** Two voter seats per roster player, independent of staff roles. */
export const cardVoterMembershipsTable = defineTable({
  teamId: v.id("teams"), playerId: v.id("players"), kind: voterKindValidator,
  email: v.string(), active: v.boolean(), identity: v.optional(v.string()),
  bindingVersion: v.number(),
  inviteHash: v.optional(v.string()), inviteExpiresAt: v.optional(v.number()),
  claimedAt: v.optional(v.number()), createdAt: v.number(), updatedAt: v.number(),
})
  .index("by_team_player_kind", ["teamId", "playerId", "kind"])
  .index("by_team", ["teamId"])
  .index("by_identity", ["identity"])
  .index("by_inviteHash", ["inviteHash"]);

/** Invitation history is independent of the durable voter seat. */
export const cardVoterInvitationsTable = defineTable({
  membershipId: v.id("cardVoterMemberships"), email: v.string(),
  tokenHash: v.string(), bindingVersion: v.number(), expiresAt: v.number(),
  status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("revoked")),
  acceptedIdentity: v.optional(v.string()), acceptedAt: v.optional(v.number()),
  createdBy: v.optional(v.string()), createdAt: v.number(), updatedAt: v.number(),
})
  .index("by_tokenHash", ["tokenHash"])
  .index("by_membership_status", ["membershipId", "status"]);

export const cardRoundsTable = defineTable({
  teamId: v.id("teams"), kind: cardKindValidator, mode: roundModeValidator,
  periodKey: v.string(), status: roundStatusValidator, winnerCount: v.number(),
  closesAt: v.number(), candidateIds: v.array(v.id("players")),
  voters: v.array(v.object({
    membershipId: v.id("cardVoterMemberships"), identity: v.string(),
    playerId: v.id("players"), kind: voterKindValidator,
    bindingVersion: v.number(),
  })),
  winnerIds: v.array(v.id("players")), originalWinnerIds: v.array(v.id("players")),
  vetoedIds: v.array(v.id("players")), ranking: rankingValidator,
  publishedAt: v.optional(v.number()), expiresAt: v.optional(v.number()),
  expiredAt: v.optional(v.number()), createdBy: v.string(),
  createdAt: v.number(), updatedAt: v.number(),
})
  .index("by_team_kind_period", ["teamId", "kind", "periodKey"])
  .index("by_team", ["teamId"])
  .index("by_team_expiresAt", ["teamId", "expiresAt"]);

export const cardBallotsTable = defineTable({
  roundId: v.id("cardRounds"), membershipId: v.id("cardVoterMemberships"),
  playerIds: v.array(v.id("players")), updatedAt: v.number(),
})
  .index("by_round_membership", ["roundId", "membershipId"])
  .index("by_round", ["roundId"]);

export const cardAwardAuditTable = defineTable({
  roundId: v.id("cardRounds"), playerId: v.id("players"),
  veto: v.boolean(), reason: v.string(), actor: v.string(), createdAt: v.number(),
}).index("by_round", ["roundId"]);
