import { lineupSnapshot, recordLineupChange } from "./lib/nativeLineupHistory";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { readEventState } from "./mobileMatchEvents";
import { verifyCoachTeamMembership, verifyIsMatchLead } from "./pinHelpers";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";
import { FORMATIONS } from "../src/lib/formations";

export const nativePrepare = mutation({
  args: { matchId: v.id("matches"), revision: v.string(), correlationId: v.string(),
    playerId: v.optional(v.id("players")), slot: v.optional(v.number()), formationId: v.optional(v.string()), customFormationTemplateId: v.optional(v.id("formationTemplates")) },
  returns: v.object({ deduped: v.boolean() }),
  handler: async (ctx, args): Promise<{ deduped: boolean }> => {
    const state = await readEventState(ctx, args.matchId);
    if (!state || !(await verifyCoachTeamMembership(ctx, state.match))) throw new Error("Geen toegang tot deze opstelling");
    if (!args.correlationId.trim() || args.correlationId.length > 160) throw new Error("Ongeldige opdrachtcode");
    if (!(await consumeCommandIdempotency(ctx, { ...args, commandType: "NATIVE_PREPARE" }))) return { deduped: true };
    if (state.revision !== args.revision) throw new Error("De opstelling is gewijzigd. Controleer opnieuw.");
    const live = state.match.status === "live" || state.match.status === "halftime";
    if (state.match.status === "finished") throw new Error("Deze wedstrijd is afgelopen");
    if (live && !(await verifyIsMatchLead(ctx, state.match))) throw new Error("Alleen de wedstrijdleider mag het veld aanvullen");
    if (live && (args.formationId || args.customFormationTemplateId)) throw new Error("Kies de formatie vóór de wedstrijd");
    if (args.formationId || args.customFormationTemplateId) {
      if (args.formationId && !FORMATIONS[args.formationId]) throw new Error("Onbekende formatie");
      await ctx.runMutation(api.matchLineup.setMatchFormation, { matchId: args.matchId, formationId: args.formationId, customFormationTemplateId: args.customFormationTemplateId });
      return { deduped: false };
    }
    const template = state.match.customFormationTemplateId ? await ctx.db.get(state.match.customFormationTemplateId) : null;
    const slots = template?.slots ?? (FORMATIONS[state.match.formationId ?? ""] ?? FORMATIONS[state.match.pitchType === "half" ? "8v8_1-3-3-1" : "11v11_1-4-3-3"]).slots;
    const slot = slots.find(slot => slot.id === args.slot);
    if (!args.playerId || !slot) throw new Error("Kies een speler en een geldige veldpositie");
    const rows = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("matchId", args.matchId)).take(51);
    const incoming = rows.find(p => p.playerId === args.playerId);
    if (!incoming || incoming.absent || incoming.injured) throw new Error("Deze speler is niet beschikbaar");
    const out = rows.find(p => p.onField && p.fieldSlotIndex === args.slot && p.playerId !== args.playerId);
    if (live && (out || incoming.onField)) throw new Error("Kies een lege veldpositie en een bankspeler, of gebruik Wisselen");
    const before = await lineupSnapshot(ctx, args.matchId);
    const positionSwap = incoming.onField;
    if (out && incoming.onField && incoming.fieldSlotIndex !== undefined) {
      await ctx.runMutation(api.matchLineup.swapFieldPositions, { matchId: args.matchId, playerAId: out.playerId, playerBId: incoming.playerId });
    } else {
      if (out) await ctx.runMutation(api.matchLineup.togglePlayerOnField, { matchId: args.matchId, playerId: out.playerId });
      await ctx.runMutation(api.matchLineup.assignPlayerToSlot, { matchId: args.matchId, playerId: incoming.playerId, fieldSlotIndex: slot.id });
      if ((slot.position === "GK") !== incoming.isKeeper) await ctx.runMutation(api.matchLineup.toggleKeeper, { matchId: args.matchId, playerId: incoming.playerId });
    }
    const inName = (await ctx.db.get(args.playerId))?.name ?? "Speler";
    const outName = out ? (await ctx.db.get(out.playerId))?.name : undefined;
    await recordLineupChange(ctx, { matchId: args.matchId, correlationId: args.correlationId, before, beforeEventIds: state.events.map(e => e._id), label: outName ? `${outName} ${positionSwap ? "↔" : "→"} ${inName}` : `${inName} op positie ${slot.id + 1}`, playerOutId: out?.playerId });
    return { deduped: false };
  },
});
