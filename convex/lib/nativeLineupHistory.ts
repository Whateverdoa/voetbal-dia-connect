import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { readEventState } from "../mobileMatchEvents";

export async function lineupSnapshot(ctx: QueryCtx | MutationCtx, matchId: Id<"matches">) {
  const rows = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("matchId", matchId)).take(51);
  const plans = await ctx.db.query("substitutionPlans").withIndex("by_match", q => q.eq("matchId", matchId)).take(201);
  if (rows.length > 50 || plans.length > 200) throw new Error("Deze opstelling is te groot voor mobiele correcties");
  return {
    players: rows.map(p => ({ id: p._id, onField: p.onField, isKeeper: p.isKeeper, fieldSlotIndex: p.fieldSlotIndex, minutesPlayed: p.minutesPlayed, lastSubbedInAt: p.lastSubbedInAt })),
    plans: plans.map(p => ({ id: p._id, status: p.status, executedAt: p.executedAt, executedGameSecond: p.executedGameSecond, updatedAt: p.updatedAt })),
    planSignature: JSON.stringify(plans.map(p => [p._id, p.status, p.updatedAt, p.executedAt, p.executedGameSecond, p.playerOutId, p.playerInId, p.kind, p.targetMinute, p.targetQuarter, p.sequence, p.note])),
  };
}

export async function recordLineupChange(ctx: MutationCtx, args: {
  matchId: Id<"matches">; correlationId: string; before: Awaited<ReturnType<typeof lineupSnapshot>>;
  beforeEventIds: Id<"matchEvents">[]; label: string; playerOutId?: Id<"players">;
}) {
  const state = await readEventState(ctx, args.matchId);
  if (!state) throw new Error("Geen toegang tot deze opstelling");
  const after = await lineupSnapshot(ctx, args.matchId);
  const previous = new Set(args.beforeEventIds);
  await ctx.db.insert("nativeLineupChanges", {
    matchId: args.matchId, correlationId: args.correlationId, createdAt: Date.now(), undone: false,
    label: args.label, playerOutId: args.playerOutId,
    beforePlayers: args.before.players, beforePlans: args.before.plans,
    createdEventIds: state.events.filter(e => !previous.has(e._id)).map(e => e._id),
    afterRevision: state.revision, afterPlansSignature: after.planSignature,
  });
}
