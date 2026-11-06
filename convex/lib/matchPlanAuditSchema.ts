import { defineTable } from "convex/server";
import { v } from "convex/values";

export const matchPlanAuditTable = defineTable({
  matchId: v.id("matches"),
  domain: v.union(v.literal("lineup"), v.literal("plan")),
  actorSubject: v.string(),
  actorName: v.string(),
  action: v.string(),
  created: v.boolean(),
  existingBefore: v.boolean(),
  createdAt: v.number(),
})
  .index("by_match_domain", ["matchId", "domain", "createdAt"])
  .index("by_match_domain_created", ["matchId", "domain", "created", "createdAt"])
  .index("by_match", ["matchId", "createdAt"]);
