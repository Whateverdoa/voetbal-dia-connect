/**
 * Referee pool: list eligible open matches, claim, release.
 */
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireRefereeAccess } from "./lib/userAccess";
import { getPlayWeekBounds } from "./lib/playWeek";
import {
  hasScheduleOverlap,
  isQualificationEligible,
} from "../src/lib/referee/eligibility";
import { matchesInPlayWeek } from "./lib/matchesInPlayWeek";
import { isRefereeInClaimPool } from "./lib/refereeClaimPool";

async function getEffectiveOpenWindow(
  ctx: QueryCtx | MutationCtx,
  weekStartMs: number,
  now: number
) {
  const doc = await ctx.db
    .query("refereeClaimWindows")
    .withIndex("by_week", (q) => q.eq("weekStartMs", weekStartMs))
    .unique();
  if (!doc) return null;
  if (doc.status !== "open") return null;
  if (now < doc.opensAt || now >= doc.closesAt) return null;
  return doc;
}

export const getOpenClaimWindowPublic = query({
  args: {},
  returns: v.union(
    v.object({
      weekStartMs: v.number(),
      weekEndMs: v.number(),
      closesAt: v.number(),
      isOpen: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    try {
      await requireRefereeAccess(ctx);
    } catch {
      return null;
    }
    const now = Date.now();
    const { weekStartMs, weekEndMs } = getPlayWeekBounds(now);
    const window = await getEffectiveOpenWindow(ctx, weekStartMs, now);
    if (!window) {
      return { weekStartMs, weekEndMs, closesAt: 0, isOpen: false };
    }
    return {
      weekStartMs: window.weekStartMs,
      weekEndMs: window.weekEndMs,
      closesAt: window.closesAt,
      isOpen: true,
    };
  },
});

export const listEligibleOpenMatches = query({
  args: {},
  returns: v.union(
    v.object({
      isWindowOpen: v.boolean(),
      closesAt: v.optional(v.number()),
      matches: v.array(
        v.object({
          id: v.id("matches"),
          publicCode: v.string(),
          opponent: v.string(),
          isHome: v.boolean(),
          status: v.string(),
          scheduledAt: v.optional(v.number()),
          teamName: v.string(),
          teamLogoUrl: v.optional(v.string()),
          clubLogoUrl: v.optional(v.string()),
          opponentLogoUrl: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    try {
      const { referee } = await requireRefereeAccess(ctx);
      const now = Date.now();
      const { weekStartMs } = getPlayWeekBounds(now);
      const window = await getEffectiveOpenWindow(ctx, weekStartMs, now);

      if (!isRefereeInClaimPool(referee)) {
        return {
          isWindowOpen: Boolean(window),
          closesAt: window?.closesAt,
          matches: [],
        };
      }

      if (!window) {
        return { isWindowOpen: false, matches: [] };
      }

      const candidates = await matchesInPlayWeek(
        ctx,
        window.weekStartMs,
        window.weekEndMs
      );

      const mine = await ctx.db
        .query("matches")
        .withIndex("by_refereeId", (q) => q.eq("refereeId", referee._id))
        .collect();

      const result = [];
      for (const match of candidates) {
        if (match.refereeId) continue;
        if (match.status !== "scheduled" && match.status !== "lineup") continue;
        if (match.scheduledAt === undefined) continue;

        const team = await ctx.db.get(match.teamId);
        const teamName = team?.name ?? "Team";
        if (
          !isQualificationEligible(
            teamName,
            match.quarterCount,
            referee.qualificationTags
          )
        ) {
          continue;
        }

        if (
          hasScheduleOverlap(
            {
              scheduledAt: match.scheduledAt,
              regulationDurationMinutes: match.regulationDurationMinutes,
            },
            mine
          )
        ) {
          continue;
        }

        const club = team ? await ctx.db.get(team.clubId) : null;
        result.push({
          id: match._id,
          publicCode: match.publicCode,
          opponent: match.opponent,
          isHome: match.isHome,
          status: match.status,
          scheduledAt: match.scheduledAt,
          teamName,
          teamLogoUrl: team?.logoUrl,
          clubLogoUrl: club?.logoUrl,
          opponentLogoUrl: match.opponentLogoUrl,
        });
      }

      result.sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));

      return {
        isWindowOpen: true,
        closesAt: window.closesAt,
        matches: result,
      };
    } catch {
      return null;
    }
  },
});

export const claimMatch = mutation({
  args: { matchId: v.id("matches") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { referee } = await requireRefereeAccess(ctx);
    if (!isRefereeInClaimPool(referee)) {
      throw new Error(
        "Je staat niet in de claimpoule. Vraag de club je toe te voegen."
      );
    }
    if (!referee.active) {
      throw new Error("Scheidsrechteraccount is niet actief");
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.refereeId) {
      throw new Error("Deze wedstrijd is al toegewezen");
    }
    if (match.cancelledAt) {
      throw new Error("Wedstrijd is afgelast");
    }
    if (match.status !== "scheduled" && match.status !== "lineup") {
      throw new Error("Alleen geplande wedstrijden kun je claimen");
    }
    if (match.scheduledAt === undefined) {
      throw new Error("Wedstrijd heeft geen speeltijd");
    }

    const now = Date.now();
    const { weekStartMs } = getPlayWeekBounds(match.scheduledAt);
    const window = await getEffectiveOpenWindow(ctx, weekStartMs, now);
    if (!window) {
      throw new Error("Er is geen open claimronde voor deze speelweek");
    }
    if (
      match.scheduledAt < window.weekStartMs ||
      match.scheduledAt >= window.weekEndMs
    ) {
      throw new Error("Wedstrijd valt buiten de open claimronde");
    }

    const team = await ctx.db.get(match.teamId);
    const teamName = team?.name ?? "Team";
    if (
      !isQualificationEligible(
        teamName,
        match.quarterCount,
        referee.qualificationTags
      )
    ) {
      throw new Error("Je kwalificatie past niet bij deze wedstrijd");
    }

    const mine = await ctx.db
      .query("matches")
      .withIndex("by_refereeId", (q) => q.eq("refereeId", referee._id))
      .collect();

    if (
      hasScheduleOverlap(
        {
          scheduledAt: match.scheduledAt,
          regulationDurationMinutes: match.regulationDurationMinutes,
        },
        mine
      )
    ) {
      throw new Error("Je hebt al een overlappende wedstrijd");
    }

    const fresh = await ctx.db.get(args.matchId);
    if (!fresh || fresh.refereeId) {
      throw new Error("Deze wedstrijd is net door iemand anders geclaimd");
    }

    await ctx.db.patch(args.matchId, { refereeId: referee._id });

    await ctx.scheduler.runAfter(0, internal.refereeNotifications.notifyAssigned, {
      refereeId: referee._id,
      matchId: args.matchId,
      body: `Je hebt ${teamName} vs ${match.opponent} geclaimd.`,
    });

    return null;
  },
});

export const releaseMatch = mutation({
  args: { matchId: v.id("matches") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { referee } = await requireRefereeAccess(ctx);
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.refereeId !== referee._id) {
      throw new Error("Je bent niet toegewezen aan deze wedstrijd");
    }
    if (match.status !== "scheduled") {
      throw new Error("Je kunt alleen loslaten vóór de wedstrijd start");
    }

    const now = Date.now();
    const weekStartMs = match.scheduledAt
      ? getPlayWeekBounds(match.scheduledAt).weekStartMs
      : getPlayWeekBounds(now).weekStartMs;
    const window = await getEffectiveOpenWindow(ctx, weekStartMs, now);
    if (!window) {
      throw new Error(
        "Loslaten kan alleen tijdens een open claimronde; vraag anders de admin"
      );
    }

    await ctx.db.patch(args.matchId, { refereeId: undefined });
    return null;
  },
});
