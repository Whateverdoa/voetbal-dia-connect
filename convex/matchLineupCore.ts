import { assertPlayerMayEnter } from "./lib/cardEntryEligibility";
import { FORMATIONS } from "../src/lib/formations";
/**
 * Match lineup core mutations - field, keeper and formation controls
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { recordPlayingTime, startPlayingTime } from "./playingTimeHelpers";
import {
  verifyCoachTeamMembership,
  verifyIsMatchLead,
} from "./pinHelpers";
import { isUnavailable, throwIfUnavailable } from "./lib/matchPlayerAvailability";

// Toggle player on/off field
export const togglePlayerOnField = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const coach = await verifyCoachTeamMembership(ctx, match);
    if (!coach) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    if (
      (match.status === "live" || match.status === "halftime") &&
      !(await verifyIsMatchLead(ctx, match))
    ) {
      throw new Error("Alleen de wedstrijdleider mag wissels uitvoeren");
    }

    const now = Date.now();

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (!mp) {
      return;
    }
    if (isUnavailable(mp) && !mp.onField) {
      throwIfUnavailable(mp, "field");
    }
    if (mp.onField) {
      if (match.status === "live" && mp.lastSubbedInAt) {
        await recordPlayingTime(ctx, mp, now);
      }
      await ctx.db.patch(mp._id, {
        onField: false,
        lastSubbedInAt: undefined,
        fieldSlotIndex: undefined,
      });
      return;
    }

    if (match.status === "live") {
      await startPlayingTime(ctx, mp._id, now);
      return;
    }
    await ctx.db.patch(mp._id, { onField: true });
  },
});

// Toggle keeper status
export const toggleKeeper = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const coach = await verifyCoachTeamMembership(ctx, match);
    if (!coach) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    if (
      (match.status === "live" || match.status === "halftime") &&
      !(await verifyIsMatchLead(ctx, match))
    ) {
      throw new Error("Alleen de wedstrijdleider mag wijzigingen uitvoeren");
    }

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (!mp) {
      return;
    }

    const allMps = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const other of allMps) {
      if (other.isKeeper && other._id !== mp._id) {
        await ctx.db.patch(other._id, { isKeeper: false });
      }
    }

    await ctx.db.patch(mp._id, { isKeeper: !mp.isKeeper });
  },
});

// Assign player to a field slot (field view). Clears slot from previous occupant.
export const assignPlayerToSlot = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
    fieldSlotIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    if (
      (match.status === "live" || match.status === "halftime") &&
      !(await verifyIsMatchLead(ctx, match))
    ) {
      throw new Error("Alleen de wedstrijdleider mag opstelling wijzigen");
    }

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();
    if (!mp) throw new Error("Player not in this match");
    throwIfUnavailable(mp, "field");

    const now = Date.now();
    const allMps = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    if (!mp.onField && (match.status === "live" || match.status === "halftime")) {
      const unavailableSlots = await assertPlayerMayEnter(ctx, match, mp.playerId);
      const template = match.customFormationTemplateId ? await ctx.db.get(match.customFormationTemplateId) : null;
      const maxPlayers = template?.slots.length ?? (FORMATIONS[match.formationId ?? ""]?.slots.length ?? (match.pitchType === "half" ? 8 : 11));
      if (allMps.filter(p => p.onField).length >= maxPlayers - unavailableSlots) throw new Error("Het veld kan pas na de lopende tijdstraf worden aangevuld");
    }
    for (const other of allMps) {
      if (other.fieldSlotIndex === args.fieldSlotIndex && other._id !== mp._id) {
        await ctx.db.patch(other._id, { fieldSlotIndex: undefined });
      }
    }

    const updates: { onField: boolean; fieldSlotIndex: number } = {
      onField: true,
      fieldSlotIndex: args.fieldSlotIndex,
    };
    if (!mp.onField && match.status === "live" && match.activeStoppageStartedAt == null && match.pausedAt == null) {
      await startPlayingTime(ctx, mp._id, now);
    }
    await ctx.db.patch(mp._id, updates);
  },
});

// Swap field positions of two on-field players (exchange their fieldSlotIndex)
export const swapFieldPositions = mutation({
  args: {
    matchId: v.id("matches"),
    playerAId: v.id("players"),
    playerBId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    if (
      (match.status === "live" || match.status === "halftime") &&
      !(await verifyIsMatchLead(ctx, match))
    ) {
      throw new Error("Alleen de wedstrijdleider mag opstelling wijzigen");
    }

    const mpA = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerAId)
      )
      .first();
    const mpB = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerBId)
      )
      .first();

    if (!mpA || !mpB) throw new Error("Player not in this match");
    if (!mpA.onField || !mpB.onField) throw new Error("Both players must be on field");

    const slotA = mpA.fieldSlotIndex;
    const slotB = mpB.fieldSlotIndex;
    const keeperA = mpA.isKeeper;
    const keeperB = mpB.isKeeper;
    await ctx.db.patch(mpA._id, { fieldSlotIndex: slotB, isKeeper: keeperB });
    await ctx.db.patch(mpB._id, { fieldSlotIndex: slotA, isKeeper: keeperA });
  },
});

// Set match formation preset and/or custom team template (field view)
export const setMatchFormation = mutation({
  args: {
    matchId: v.id("matches"),
    formationId: v.optional(v.string()),
    /** Saved team template from formationTemplates; clears preset formationId when set. */
    customFormationTemplateId: v.optional(v.id("formationTemplates")),
    pitchType: v.optional(v.union(v.literal("full"), v.literal("half"))),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    if (
      (match.status === "live" || match.status === "halftime") &&
      !(await verifyIsMatchLead(ctx, match))
    ) {
      throw new Error("Alleen de wedstrijdleider mag formatie wijzigen");
    }

    const patch: {
      pitchType?: "full" | "half";
      formationId?: string;
      customFormationTemplateId?: Id<"formationTemplates">;
    } = {};

    if (args.pitchType !== undefined) {
      patch.pitchType = args.pitchType;
    }

    if (args.customFormationTemplateId !== undefined) {
      const tpl = await ctx.db.get(args.customFormationTemplateId);
      if (!tpl || !tpl.active || tpl.teamId !== match.teamId) {
        throw new Error("Ongeldige formatie-template");
      }
      patch.customFormationTemplateId = args.customFormationTemplateId;
      patch.formationId = undefined;
      await ctx.db.patch(args.matchId, patch);
      return;
    }

    if (args.formationId !== undefined) {
      const trimmed = args.formationId.trim();
      patch.formationId = trimmed === "" ? undefined : trimmed;
      patch.customFormationTemplateId = undefined;
      await ctx.db.patch(args.matchId, patch);
      return;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.matchId, patch);
    }
  },
});
