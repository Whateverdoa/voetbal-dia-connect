import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { buildEventGameTimeStamp, getEffectiveEventTime } from "./lib/matchEventGameTime";
import { requireCoachTeamAccess } from "./authz";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";
import { recordPlayingTime, startPlayingTime } from "./playingTimeHelpers";

function toMatchMs(gameSecond?: number): number | undefined {
  return gameSecond == null ? undefined : gameSecond * 1000;
}

export const stageSubstitution = mutation({
  args: {
    matchId: v.id("matches"),
    playerOutId: v.id("players"),
    playerInId: v.id("players"),
    correlationId: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    await requireCoachTeamAccess(ctx, match);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status === "finished") {
      throw new Error("Wissels zijn niet toegestaan na het eindsignaal");
    }

    const accepted = await consumeCommandIdempotency(ctx, {
      matchId: args.matchId,
      commandType: "STAGE_SUBSTITUTION",
      correlationId: args.correlationId,
    });
    if (!accepted) {
      return { deduped: true };
    }

    const now = Date.now();
    const outInMatch = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerOutId)
      )
      .first();
    const inInMatch = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerInId)
      )
      .first();
    if (!outInMatch || !inInMatch) {
      throw new Error("Speler niet in deze wedstrijd");
    }
    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const openDuplicate = events.some((event) => {
      if (
        event.type !== "substitution_staged" ||
        event.playerId !== args.playerOutId ||
        event.relatedPlayerId !== args.playerInId
      ) {
        return false;
      }
      const closed = events.some(
        (other) =>
          other.stagedEventId === event._id &&
          (other.type === "substitution_cancelled" ||
            other.type === "substitution_executed")
      );
      return !closed;
    });
    if (openDuplicate) {
      throw new Error("Deze wissel staat al klaar");
    }

    const effectiveEventTime = getEffectiveEventTime(match, now);
    const stamp = buildEventGameTimeStamp(match, effectiveEventTime);

    const stagedEventId = await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "substitution_staged",
      playerId: args.playerOutId,
      relatedPlayerId: args.playerInId,
      quarter: match.currentQuarter,
      matchMs: toMatchMs(stamp.gameSecond),
      correlationId: args.correlationId,
      commandType: "STAGE_SUBSTITUTION",
      timestamp: effectiveEventTime,
      ...stamp,
      createdAt: now,
    });

    return { stagedEventId, deduped: false };
  },
});

export const confirmSubstitution = mutation({
  args: {
    matchId: v.id("matches"),
    stagedEventId: v.id("matchEvents"),
    correlationId: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    await requireCoachTeamAccess(ctx, match);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status === "finished") {
      throw new Error("Wissels zijn niet toegestaan na het eindsignaal");
    }

    const accepted = await consumeCommandIdempotency(ctx, {
      matchId: args.matchId,
      commandType: "CONFIRM_SUBSTITUTION",
      correlationId: args.correlationId,
    });
    if (!accepted) {
      return { deduped: true };
    }

    const staged = await ctx.db.get(args.stagedEventId);
    if (!staged || staged.matchId !== args.matchId || staged.type !== "substitution_staged") {
      throw new Error("Klaargezette wissel niet gevonden");
    }

    const blockingEvents = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const alreadyClosed = blockingEvents.some(
      (event) =>
        event.stagedEventId === args.stagedEventId &&
        (event.type === "substitution_cancelled" || event.type === "substitution_executed")
    );
    if (alreadyClosed) {
      throw new Error("Deze wissel is al bevestigd of geannuleerd");
    }

    if (!staged.playerId || !staged.relatedPlayerId) {
      throw new Error("Ongeldige staged wissel");
    }

    const mpOut = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", staged.playerId!)
      )
      .first();
    const mpIn = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", staged.relatedPlayerId!)
      )
      .first();

    if (!mpOut || !mpIn) {
      throw new Error("Speler niet in deze wedstrijd");
    }
    if (!mpOut.onField) {
      throw new Error("Wissel mislukt: speler die eruit gaat staat niet meer op het veld");
    }
    if (mpIn.onField || mpIn.absent) {
      throw new Error("Wissel mislukt: speler die erin moet is niet beschikbaar op de bank");
    }

    const slotToTransfer = mpOut.fieldSlotIndex;
    const now = Date.now();
    const shouldTrackPlayingTime = match.status === "live";
    const effectiveEventTime = getEffectiveEventTime(match, now);
    const stamp = buildEventGameTimeStamp(match, effectiveEventTime);

    if (shouldTrackPlayingTime && mpOut.lastSubbedInAt) {
      await recordPlayingTime(ctx, mpOut, now);
    }
    await ctx.db.patch(mpOut._id, {
      onField: false,
      lastSubbedInAt: undefined,
      fieldSlotIndex: undefined,
    });
    if (shouldTrackPlayingTime) {
      await startPlayingTime(ctx, mpIn._id, now);
    } else {
      await ctx.db.patch(mpIn._id, { onField: true, lastSubbedInAt: undefined });
    }
    if (slotToTransfer !== undefined && slotToTransfer !== null) {
      await ctx.db.patch(mpIn._id, { fieldSlotIndex: slotToTransfer });
    }

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "substitution_executed",
      playerId: staged.playerId,
      relatedPlayerId: staged.relatedPlayerId,
      quarter: match.currentQuarter,
      stagedEventId: args.stagedEventId,
      matchMs: toMatchMs(stamp.gameSecond),
      correlationId: args.correlationId,
      commandType: "CONFIRM_SUBSTITUTION",
      timestamp: effectiveEventTime,
      ...stamp,
      createdAt: now,
    });

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "sub_out",
      playerId: staged.playerId,
      relatedPlayerId: staged.relatedPlayerId,
      quarter: match.currentQuarter,
      stagedEventId: args.stagedEventId,
      matchMs: toMatchMs(stamp.gameSecond),
      correlationId: args.correlationId,
      commandType: "CONFIRM_SUBSTITUTION",
      timestamp: effectiveEventTime,
      ...stamp,
      createdAt: now,
    });

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "sub_in",
      playerId: staged.relatedPlayerId,
      relatedPlayerId: staged.playerId,
      quarter: match.currentQuarter,
      stagedEventId: args.stagedEventId,
      matchMs: toMatchMs(stamp.gameSecond),
      correlationId: args.correlationId,
      commandType: "CONFIRM_SUBSTITUTION",
      timestamp: effectiveEventTime,
      ...stamp,
      createdAt: now,
    });

    return { deduped: false };
  },
});

export const cancelStagedSubstitution = mutation({
  args: {
    matchId: v.id("matches"),
    stagedEventId: v.id("matchEvents"),
    correlationId: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    await requireCoachTeamAccess(ctx, match);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status === "finished") {
      throw new Error("Wissels zijn niet toegestaan na het eindsignaal");
    }

    const accepted = await consumeCommandIdempotency(ctx, {
      matchId: args.matchId,
      commandType: "CANCEL_STAGED_SUBSTITUTION",
      correlationId: args.correlationId,
    });
    if (!accepted) {
      return { deduped: true };
    }

    const staged = await ctx.db.get(args.stagedEventId);
    if (!staged || staged.matchId !== args.matchId || staged.type !== "substitution_staged") {
      throw new Error("Klaargezette wissel niet gevonden");
    }

    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const alreadyClosed = events.some(
      (event) =>
        event.stagedEventId === args.stagedEventId &&
        (event.type === "substitution_cancelled" || event.type === "substitution_executed")
    );
    if (alreadyClosed) {
      throw new Error("Deze wissel is al bevestigd of geannuleerd");
    }

    const now = Date.now();
    const effectiveEventTime = getEffectiveEventTime(match, now);
    const stamp = buildEventGameTimeStamp(match, effectiveEventTime);

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "substitution_cancelled",
      quarter: match.currentQuarter,
      stagedEventId: args.stagedEventId,
      matchMs: toMatchMs(stamp.gameSecond),
      correlationId: args.correlationId,
      commandType: "CANCEL_STAGED_SUBSTITUTION",
      timestamp: effectiveEventTime,
      ...stamp,
      createdAt: now,
    });

    return { deduped: false };
  },
});
