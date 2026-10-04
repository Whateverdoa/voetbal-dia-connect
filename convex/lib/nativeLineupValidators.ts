import { v } from "convex/values";

export const savedLineupPlayer = v.object({
  id: v.id("matchPlayers"), onField: v.boolean(), isKeeper: v.boolean(),
  fieldSlotIndex: v.optional(v.number()), minutesPlayed: v.optional(v.number()), lastSubbedInAt: v.optional(v.number()),
});
export const savedLineupPlan = v.object({
  id: v.id("substitutionPlans"), status: v.union(v.literal("pending"), v.literal("executed"), v.literal("skipped")),
  executedAt: v.optional(v.number()), executedGameSecond: v.optional(v.number()), updatedAt: v.number(),
});
