/**
 * Shared bench substitution: transfer fieldSlotIndex + sub_in/sub_out events.
 */
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { recordPlayingTime } from "../playingTimeHelpers";
import {
  buildEventGameTimeStamp,
  getEffectiveEventTime,
} from "./matchEventGameTime";

export async function applyBenchSubstitutionWithSlotTransfer(
  ctx: MutationCtx,
  args: {
    matchId: Id<"matches">;
    playerOutId: Id<"players">;
    playerInId: Id<"players">;
    correlationId?: string;
    commandType: string;
  }
): Promise<void> {
  const match = await ctx.db.get(args.matchId);
  if (!match) {
    throw new Error("Wedstrijd niet gevonden");
  }

  const now = Date.now();
  const effectiveEventTime = getEffectiveEventTime(match, now);
  const substitutionStamp = buildEventGameTimeStamp(match, effectiveEventTime);

  const mpOut = await ctx.db
    .query("matchPlayers")
    .withIndex("by_match_player", (q) =>
      q.eq("matchId", args.matchId).eq("playerId", args.playerOutId)
    )
    .first();

  const mpIn = await ctx.db
    .query("matchPlayers")
    .withIndex("by_match_player", (q) =>
      q.eq("matchId", args.matchId).eq("playerId", args.playerInId)
    )
    .first();

  if (!mpOut || !mpIn) {
    throw new Error("Speler niet in deze wedstrijd");
  }
  if (!mpOut.onField) {
    throw new Error("Speler die eruit gaat moet op het veld staan");
  }
  if (mpIn.onField) {
    throw new Error("Speler die erin gaat moet op de bank staan");
  }
  if (mpIn.absent) {
    throw new Error("Afwezige speler kan niet worden ingewisseld");
  }

  const slotToTransfer = mpOut.fieldSlotIndex;

  if (mpOut.lastSubbedInAt) {
    await recordPlayingTime(ctx, mpOut, now);
  }
  await ctx.db.patch(mpOut._id, {
    onField: false,
    lastSubbedInAt: undefined,
    fieldSlotIndex: undefined,
  });

  const mpInUpdates: {
    onField: boolean;
    lastSubbedInAt: number;
    fieldSlotIndex?: number;
  } = {
    onField: true,
    lastSubbedInAt: now,
  };
  if (slotToTransfer !== undefined && slotToTransfer !== null) {
    mpInUpdates.fieldSlotIndex = slotToTransfer;
  }
  await ctx.db.patch(mpIn._id, mpInUpdates);

  const ms = substitutionStamp.gameSecond * 1000;

  await ctx.db.insert("matchEvents", {
    matchId: args.matchId,
    type: "sub_out",
    playerId: args.playerOutId,
    relatedPlayerId: args.playerInId,
    quarter: match.currentQuarter,
    matchMs: ms,
    correlationId: args.correlationId,
    commandType: args.commandType,
    timestamp: effectiveEventTime,
    ...substitutionStamp,
    createdAt: now,
  });

  await ctx.db.insert("matchEvents", {
    matchId: args.matchId,
    type: "sub_in",
    playerId: args.playerInId,
    relatedPlayerId: args.playerOutId,
    quarter: match.currentQuarter,
    matchMs: ms,
    correlationId: args.correlationId,
    commandType: args.commandType,
    timestamp: effectiveEventTime,
    ...substitutionStamp,
    createdAt: now,
  });
}
