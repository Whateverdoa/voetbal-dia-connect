import { v } from "convex/values";

export const assistantPlanValidator = v.object({
  format: v.optional(v.literal("dia-substitution-plan")), version: v.optional(v.literal(1)),
  match: v.object({ regulationDurationMinutes: v.number(), fieldPlayerCountIncludingKeeper: v.number(), halftimeAtMinute: v.optional(v.union(v.number(), v.null())) }),
  formation: v.object({ id: v.optional(v.string()), name: v.optional(v.string()), slots: v.array(v.object({ id: v.number(), position: v.string(), x: v.number(), y: v.number() })) }),
  players: v.array(v.object({ key: v.string(), name: v.string(), number: v.optional(v.union(v.number(), v.null())), absent: v.optional(v.boolean()),
    unavailableReason: v.optional(v.literal("injured")), sourceBenchMinutes: v.optional(v.union(v.number(), v.null())) })),
  startingLineup: v.object({ keeperKey: v.string(), field: v.array(v.object({ playerKey: v.string(), slotId: v.number() })), bench: v.array(v.string()) }),
  steps: v.array(v.object({ id: v.string(), matchMinute: v.number(), actions: v.array(v.object({ id: v.string(), kind: v.union(v.literal("substitution"), v.literal("positionSwap")),
    playerOutKey: v.string(), playerInKey: v.string(), keeperKey: v.optional(v.string()) })), sourceBench: v.optional(v.array(v.string())) })),
  review: v.optional(v.object({ unresolved: v.optional(v.array(v.string())), sourceConfirmed: v.optional(v.boolean()), integrationRequired: v.optional(v.array(v.string())) })),
});
