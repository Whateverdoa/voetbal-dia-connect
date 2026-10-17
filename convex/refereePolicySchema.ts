import { v } from "convex/values";

export const refereePolicyValidator = v.object({
  version: v.literal(1),
  generation: v.number(),
  commandVersion: v.number(),
  elapsedMs: v.number(),
  runningSince: v.union(v.number(), v.null()),
  periodStartedElapsedMs: v.optional(v.number()),
  safetyMarginMinutes: v.number(),
  stoppageStartedAt: v.optional(v.number()),
  confirmedStoppageMs: v.number(),
  clockReviewReason: v.optional(v.union(v.literal("period_limit"), v.literal("long_stoppage"), v.literal("unknown_anchor"))),
  clockLimitElapsedMs: v.optional(v.number()),
  clockLimitAt: v.optional(v.number()),
});
