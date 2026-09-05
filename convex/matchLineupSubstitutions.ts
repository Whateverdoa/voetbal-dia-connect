/**
 * Match lineup substitution mutations.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  verifyCoachTeamMembership,
  verifyIsMatchLead,
} from "./pinHelpers";
import { applyBenchSubstitutionWithSlotTransfer } from "./lib/benchSubstitutionCore";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";

// Substitution from field view — same as substitute but transfers fieldSlotIndex
// and records sub_out/sub_in events so timeline stays in sync
export const substituteFromField = mutation({
  args: {
    matchId: v.id("matches"),
    correlationId: v.string(),
    playerOutId: v.id("players"),
    playerInId: v.id("players"),
  },
  returns: v.object({ deduped: v.boolean() }),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    if (match.status !== "live" && match.status !== "halftime") {
      throw new Error("Wissels zijn alleen mogelijk tijdens een actieve wedstrijd");
    }
    if (!(await verifyIsMatchLead(ctx, match))) {
      throw new Error("Alleen de wedstrijdleider mag wissels uitvoeren");
    }

    const accepted = await consumeCommandIdempotency(ctx, {
      matchId: args.matchId,
      commandType: "SUBSTITUTE_FROM_FIELD",
      correlationId: args.correlationId,
    });
    if (!accepted) {
      return { deduped: true };
    }

    await applyBenchSubstitutionWithSlotTransfer(ctx, {
      matchId: args.matchId,
      playerOutId: args.playerOutId,
      playerInId: args.playerInId,
      correlationId: args.correlationId,
      commandType: "SUBSTITUTE_FROM_FIELD",
    });
    return { deduped: false };
  },
});
