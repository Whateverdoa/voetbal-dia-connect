import { v } from "convex/values";
import { cardKindValidator, roundModeValidator, roundStatusValidator, voterKindValidator } from "../cardSchema";
import { fcPublicCardFields, publicCardProfileValidator } from "./fcCardValidators";

export const roundPublicFields = {
  _id: v.id("cardRounds"), kind: cardKindValidator, periodKey: v.string(),
  mode: roundModeValidator, status: roundStatusValidator, winnerCount: v.number(),
  closesAt: v.number(), publishedAt: v.union(v.number(), v.null()),
  expiresAt: v.union(v.number(), v.null()), candidateIds: v.array(v.id("players")),
  winnerIds: v.array(v.id("players")),
};
export const deckPlayerValidator = v.object({
  playerId: v.string(), displayName: v.string(), number: v.union(v.number(), v.null()),
  positionPrimary: v.union(v.string(), v.null()), positionSecondary: v.union(v.string(), v.null()),
  photoUrl: v.union(v.string(), v.null()), cardProfile: publicCardProfileValidator,
  showFullIdentity: v.boolean(), ...fcPublicCardFields,
});
export const ballotViewValidator = v.object({ membershipId: v.id("cardVoterMemberships"), playerIds: v.array(v.id("players")) });
export const seatViewValidator = v.object({ _id: v.id("cardVoterMemberships"), playerId: v.id("players"), kind: voterKindValidator });
