/**
 * Score adjustment mutations for referee (and coach) score editing.
 *
 * Split from matchActions.ts to respect the 300-LOC rule.
 * Re-exported via matchActions for a single public API surface.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyCoachTeamMembership, isMatchLead } from "./pinHelpers";
import { fetchRefereeForMatch } from "./refereeHelpers";

/**
 * Adjust the match score by +1 or -1 for a given team.
 *
 * - Both coach and referee PINs are accepted.
 * - When delta is +1 and a scorerNumber (shirt number) is provided,
 *   a lightweight "goal" event is logged with the shirt number in the note.
 *   The coach can later resolve this to a named player.
 * - When delta is -1 (correction) or no scorerNumber, no event is created.
 * - Score is clamped to a minimum of 0.
 */
export const adjustScore = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    team: v.union(v.literal("home"), v.literal("away")),
    delta: v.union(v.literal(1), v.literal(-1)),
    scorerNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    // Try coach first
    const coach = await verifyCoachTeamMembership(ctx, match, args.pin);
    if (coach) {
      if (!isMatchLead(match, coach._id)) {
        throw new Error("Alleen de wedstrijdleider kan dit doen");
      }
    } else {
      // Not a coach — check referee
      const referee = await fetchRefereeForMatch(ctx, match);
      if (!referee || referee.pin !== args.pin) {
        throw new Error("Ongeldige PIN of geen toegang");
      }
      // Referee is always allowed — no lead check needed
    }

    // Calculate new score, clamped to 0
    const currentScore =
      args.team === "home" ? match.homeScore : match.awayScore;
    const newScore = Math.max(0, currentScore + args.delta);

    // Patch the correct score field
    if (args.team === "home") {
      await ctx.db.patch(args.matchId, { homeScore: newScore });
    } else {
      await ctx.db.patch(args.matchId, { awayScore: newScore });
    }

    // When incrementing with a shirt number, log a lightweight goal event
    if (args.delta === 1 && args.scorerNumber != null) {
      const isOpponentGoal =
        (args.team === "home" && !match.isHome) ||
        (args.team === "away" && match.isHome);

      const now = Date.now();
      await ctx.db.insert("matchEvents", {
        matchId: args.matchId,
        type: "goal",
        quarter: match.currentQuarter,
        isOpponentGoal: isOpponentGoal || undefined,
        note: `Rugnummer: ${args.scorerNumber}`,
        timestamp: now,
        createdAt: now,
      });
    }
  },
});
