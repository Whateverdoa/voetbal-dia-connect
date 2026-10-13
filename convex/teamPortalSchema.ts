import { defineTable } from "convex/server";
import { v } from "convex/values";

export const memberRole = v.union(
  v.literal("parent"),
  v.literal("player"),
  v.literal("team_manager"),
);
export const feedbackContent = v.object({
  compliment: v.string(),
  nextStep: v.string(),
  report: v.string(),
});
export const taskStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("change_requested"),
  v.literal("done"),
);
export const portalTables = {
  portalMemberships: defineTable({
    teamId: v.id("teams"),
    accountKey: v.string(),
    role: memberRole,
    playerIds: v.array(v.id("players")),
    active: v.boolean(),
    label: v.string(),
    updatedBy: v.string(),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_team_account_role", ["teamId", "accountKey", "role"]),
  portalConsents: defineTable({
    teamId: v.id("teams"),
    playerId: v.id("players"),
    teamProfile: v.boolean(),
    publicProfile: v.boolean(),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_player", ["playerId"]),
  portalFeedback: defineTable({
    teamId: v.id("teams"),
    playerId: v.id("players"),
    author: v.string(),
    draft: feedbackContent,
    published: v.optional(feedbackContent),
    publishedAt: v.optional(v.number()),
    revision: v.number(),
    updatedAt: v.number(),
  })
    .index("by_player_author", ["playerId", "author"])
    .index("by_team_player_author", ["teamId", "playerId", "author"])
    .index("by_team_player", ["teamId", "playerId"])
    .index("by_player", ["playerId"]),
  portalTasks: defineTable({
    teamId: v.id("teams"),
    matchId: v.id("matches"),
    title: v.string(),
    assigneeId: v.id("portalMemberships"),
    status: taskStatus,
    response: v.string(),
    revision: v.number(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  }).index("by_team", ["teamId"]),
};
