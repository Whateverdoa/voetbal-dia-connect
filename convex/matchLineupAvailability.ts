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
import { recordPlayingTime } from "./playingTimeHelpers";

const availabilityStatusValidator = v.union(
  v.literal("available"),
  v.literal("absent"),
  v.literal("injured")
);

function isPregame(status: string): boolean {
  return status === "scheduled" || status === "lineup";
}

function isInPlay(status: string): boolean {
  return status === "live" || status === "halftime";
}

/**
 * Set player availability for this match (available | absent | injured).
 * Absent only before kickoff. Injured may also be set during live/halftime.
 * Unavailable players are moved off the field.
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
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    const pregame = isPregame(match.status);
    const inPlay = isInPlay(match.status);
    if (!pregame && !inPlay) {
      throw new Error("Beschikbaarheid kan niet meer worden gewijzigd");
    }
    if (args.status === "absent" && !pregame) {
      throw new Error("Afwezigheid kan alleen vóór de aftrap worden gewijzigd");
    }
    if (
      !pregame &&
      args.status !== "injured" &&
      args.status !== "available"
    ) {
      throw new Error("Tijdens de wedstrijd alleen blessure of beschikbaar");
    }

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (!mp) throw new Error("Speler niet in deze wedstrijd");

    const flags = availabilityFlagsForStatus(args.status);
    const now = Date.now();
    const leavingField = args.status !== "available" && mp.onField;

    if (leavingField && inPlay && mp.lastSubbedInAt) {
      await recordPlayingTime(ctx, mp, now);
    }

    const updates: {
      absent: boolean;
      injured: boolean;
      onField?: boolean;
      fieldSlotIndex?: undefined;
      lastSubbedInAt?: undefined;
    } = { ...flags };

    if (leavingField) {
      updates.onField = false;
      updates.fieldSlotIndex = undefined;
      updates.lastSubbedInAt = undefined;
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
    if (!isPregame(match.status)) {
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
      fieldSlotIndex?: undefined;
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
