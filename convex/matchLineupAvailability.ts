/**
 * Match lineup availability mutations — absent / injured / public lineup.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyCoachTeamMembership } from "./pinHelpers";
import {
  availabilityFlagsForStatus,
  availabilityStatus,
  type PlayerAvailabilityStatus,
} from "./lib/matchPlayerAvailability";

const availabilityStatusValidator = v.union(
  v.literal("available"),
  v.literal("absent"),
  v.literal("injured")
);

/**
 * Set player availability for this match (available | absent | injured).
 * Only before kickoff. Unavailable players are moved off the field.
 */
export const setPlayerAvailability = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
    status: availabilityStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (match.status !== "scheduled" && match.status !== "lineup") {
      throw new Error(
        "Beschikbaarheid kan alleen vóór de aftrap worden gewijzigd"
      );
    }
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (!mp) throw new Error("Speler niet in deze wedstrijd");

    const flags = availabilityFlagsForStatus(args.status);
    const updates: {
      absent: boolean;
      injured: boolean;
      onField?: boolean;
      fieldSlotIndex?: number;
    } = { ...flags };

    if (args.status !== "available" && mp.onField) {
      updates.onField = false;
      updates.fieldSlotIndex = undefined;
    }

    await ctx.db.patch(mp._id, updates);
    return null;
  },
});

/**
 * Toggle player absent status (in squad but not physically present).
 * Prefer setPlayerAvailability for explicit status; kept for older clients.
 */
export const togglePlayerAbsent = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (match.status !== "scheduled" && match.status !== "lineup") {
      throw new Error("Afwezigheid kan alleen vóór de aftrap worden gewijzigd");
    }
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (!mp) throw new Error("Speler niet in deze wedstrijd");

    const current = availabilityStatus(mp);
    const next: PlayerAvailabilityStatus =
      current === "absent" ? "available" : "absent";
    const flags = availabilityFlagsForStatus(next);
    const updates: {
      absent: boolean;
      injured: boolean;
      onField?: boolean;
      fieldSlotIndex?: number;
    } = { ...flags };

    if (next !== "available" && mp.onField) {
      updates.onField = false;
      updates.fieldSlotIndex = undefined;
    }

    await ctx.db.patch(mp._id, updates);
    return null;
  },
});

export const toggleShowLineup = mutation({
  args: { matchId: v.id("matches") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    await ctx.db.patch(args.matchId, { showLineup: !match.showLineup });
    return null;
  },
});
