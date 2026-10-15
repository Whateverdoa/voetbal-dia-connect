import { v, type Infer } from "convex/values";

const team = v.union(v.literal("home"), v.literal("away"));
const disposition = v.optional(v.union(v.literal("include"), v.literal("discard")));
export const refereeActionValidator = v.union(
  v.object({ kind: v.literal("start") }),
  v.object({ kind: v.literal("pause") }),
  v.object({ kind: v.literal("start_period") }),
  v.object({ kind: v.literal("resume"), stoppageDisposition: disposition }),
  v.object({ kind: v.literal("end_period"), stoppageDisposition: disposition }),
  v.object({ kind: v.literal("finish"), stoppageDisposition: disposition }),
  v.object({ kind: v.literal("configure"), periodCount: v.number(), periodMinutes: v.number(), safetyMarginMinutes: v.number() }),
  v.object({ kind: v.literal("set_safety_margin"), safetyMarginMinutes: v.number() }),
  v.object({ kind: v.literal("goal"), team, scorerId: v.optional(v.id("players")), assistId: v.optional(v.id("players")), isOwnGoal: v.optional(v.boolean()) }),
  v.object({ kind: v.literal("correct_goal"), eventId: v.id("matchEvents") }),
  v.object({ kind: v.literal("enrich_goal"), eventId: v.id("matchEvents"), scorerId: v.optional(v.id("players")), assistId: v.optional(v.id("players")) }),
  v.object({ kind: v.literal("yellow_card"), team, playerId: v.optional(v.id("players")), reportedName: v.optional(v.string()), reportedNumber: v.optional(v.number()) }),
  v.object({ kind: v.literal("red_card"), team, playerId: v.optional(v.id("players")), reportedName: v.optional(v.string()), reportedNumber: v.optional(v.number()) }),
  v.object({ kind: v.literal("incident"), note: v.optional(v.string()) }),
  v.object({ kind: v.literal("annotate_event"), eventId: v.id("matchEvents"), note: v.optional(v.string()), reportedName: v.optional(v.string()), reportedNumber: v.optional(v.number()) }),
);
export const refereeCommandArgs = {
  matchId: v.id("matches"), expectedVersion: v.number(), correlationId: v.string(), action: refereeActionValidator,
};
export const refereeCommandResult = v.object({
  commandEventId: v.id("matchEvents"), commandCorrelationId: v.string(), version: v.number(),
});
export type RefereeAction = Infer<typeof refereeActionValidator>;
