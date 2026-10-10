import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { readEventState } from "./mobileMatchEvents";
import { verifyCoachTeamMembership, verifyIsMatchLead } from "./pinHelpers";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";
import { lineupSnapshot } from "./lib/nativeLineupHistory";

export const undoNativeLineup = mutation({
  args: { matchId: v.id("matches"), changeId: v.id("nativeLineupChanges"), revision: v.string(), correlationId: v.string() },
  returns: v.object({ deduped: v.boolean() }),
  handler: async (ctx, args) => {
    const state = await readEventState(ctx, args.matchId);
    if (!state || !(await verifyCoachTeamMembership(ctx, state.match))) throw new Error("Geen toegang tot deze opstelling");
    const live = state.match.status === "live" || state.match.status === "halftime";
    if (live && !(await verifyIsMatchLead(ctx, state.match))) throw new Error("Alleen de wedstrijdleider mag een wissel herstellen");
    if (!args.correlationId.trim() || args.correlationId.length > 160) throw new Error("Ongeldige opdrachtcode");
    if (!(await consumeCommandIdempotency(ctx, { ...args, commandType: "NATIVE_LINEUP_UNDO" }))) return { deduped: true };
    if (state.match.status === "finished") throw new Error("Deze wedstrijd is afgelopen");
    const change = await ctx.db.get(args.changeId);
    const last = await ctx.db.query("nativeLineupChanges").withIndex("by_match_undone", q => q.eq("matchId", args.matchId).eq("undone", false)).order("desc").first();
    if (!change || change.matchId !== args.matchId || change.undone || last?._id !== change._id) throw new Error("Alleen de laatste opstellingswijziging kan worden hersteld");
    const current = await lineupSnapshot(ctx, args.matchId);
    if (state.revision !== args.revision || state.revision !== change.afterRevision || current.planSignature !== change.afterPlansSignature) throw new Error("Er is daarna iets gewijzigd in de wedstrijd. Deze wissel kan niet veilig worden teruggedraaid.");
    // Exact reversal, not another substitution: restore original clock anchors and accumulated minutes.
    for (const p of change.beforePlayers) await ctx.db.patch(p.id, { onField: p.onField, isKeeper: p.isKeeper, fieldSlotIndex: p.fieldSlotIndex, minutesPlayed: p.minutesPlayed, lastSubbedInAt: p.lastSubbedInAt });
    for (const p of change.beforePlans) await ctx.db.patch(p.id, { status: p.status, executedAt: p.executedAt, executedGameSecond: p.executedGameSecond, updatedAt: p.updatedAt });
    for (const id of change.createdEventIds) await ctx.db.delete(id);
    await ctx.db.patch(change._id, { undone: true });
    return { deduped: false };
  },
});
