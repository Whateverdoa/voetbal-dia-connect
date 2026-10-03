import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { deriveActiveTimePenalties, disciplineBadgeByPlayerId, matchPenaltyClockNow } from "../../src/lib/cards/cardRules";

/** Use the same discipline projection as DIA; no mobile-specific penalty durations. */
export async function assertPlayerMayEnter(ctx: MutationCtx, match: Doc<"matches">, playerId: Id<"players">) {
  const cards = await ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", match._id)).take(501);
  if (cards.length > 500) throw new Error("Te veel registraties om de kaartstatus veilig te controleren");
  const { clockNow, frozen } = matchPenaltyClockNow(Date.now(), match);
  if (disciplineBadgeByPlayerId(cards).get(playerId) === "red") throw new Error("Deze speler is uitgesloten");
  const penalties = deriveActiveTimePenalties(cards, clockNow, frozen).filter(p => p.remainingMs > 0);
  if (penalties.some(p => p.playerId === playerId)) throw new Error("De tijdstraf van deze speler loopt nog");
  return new Set(penalties.map(p => p.playerId)).size;
}
