import { v } from "convex/values";

export const fcRatingsValidator = v.object({ snl: v.optional(v.number()), sch: v.optional(v.number()), pas: v.optional(v.number()), dri: v.optional(v.number()), vrd: v.optional(v.number()), fys: v.optional(v.number()) });
export const recognitionValidator = v.object({
  roundId: v.string(), kind: v.union(v.literal("week"), v.literal("month")),
  periodKey: v.string(), publishedAt: v.number(), expiresAt: v.number(),
});
export const fcPublicCardFields = {
  fcRatings: v.union(fcRatingsValidator, v.null()),
  playStyleIds: v.array(v.string()),
  recognitions: v.array(recognitionValidator),
};
export const publicCardProfileValidator = v.union(v.object({
  xp: v.number(), level: v.number(), rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic")),
  seasonStats: v.object({ matches: v.number(), goals: v.number(), assists: v.number(), cleanSheets: v.number() }),
  badges: v.optional(v.array(v.string())),
}), v.null());
