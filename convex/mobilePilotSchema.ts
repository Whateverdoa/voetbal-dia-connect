import { defineTable } from "convex/server";
import { v } from "convex/values";

// Empty by default. A scope grants neither a role nor official match control.
export const mobilePilotScopes = defineTable({
  subject: v.string(),
  matchId: v.id("matches"),
  teamId: v.id("teams"),
  enabled: v.boolean(),
  writesEnabled: v.optional(v.boolean()),
  expiresAt: v.number(),
  updatedAt: v.number(),
}).index("by_subject", ["subject"])
  .index("by_subject_and_match", ["subject", "matchId"]);
