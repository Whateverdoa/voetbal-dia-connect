import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUserAccess, requireCoachForMatch } from "./lib/userAccess";
import { hasAdminRole } from "./lib/adminOverride";
import {
  finalizePlayerReviewAnswers,
  playerMatchReviewViewValidator,
  playerReviewValidator,
} from "./lib/playerMatchReview";
import { getPlayerReviewProgress, isPlayerReview } from "../src/lib/team-portal/playerReview";

type ReaderCtx = QueryCtx | MutationCtx;
const MAX_MATCH_REVIEWS = 200;

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message });
}

async function requireReviewAccess(ctx: ReaderCtx, matchId: Id<"matches">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.tokenIdentifier?.trim()) fail("UNAUTHENTICATED", "Log in om een spelersverslag te openen.");
  const match = await ctx.db.get(matchId);
  if (!match) fail("FORBIDDEN", "Geen toegang tot deze wedstrijd.");
  const access = await getCurrentUserAccess(ctx);
  if (!hasAdminRole(access)) {
    try {
      await requireCoachForMatch(ctx, match);
    } catch {
      fail("FORBIDDEN", "Alleen de coaches van dit team en admins kunnen een spelersverslag maken.");
    }
  }
  if (match.status !== "finished" || match.cancelledAt !== undefined) {
    fail("MATCH_NOT_FINISHED", "Een spelersverslag kan pas na een gespeelde, afgeronde wedstrijd.");
  }
  return { match, authorTokenIdentifier: identity.tokenIdentifier };
}

async function requireMatchPlayer(ctx: ReaderCtx, match: Doc<"matches">, playerId: Id<"players">) {
  const matchPlayer = await ctx.db.query("matchPlayers")
    .withIndex("by_match_player", (index) => index.eq("matchId", match._id).eq("playerId", playerId))
    .first();
  const player = matchPlayer ? await ctx.db.get(playerId) : null;
  if (!matchPlayer || !player || player.teamId !== match.teamId) {
    fail("PLAYER_NOT_IN_MATCH", "Deze speler hoort niet bij de selectie van deze wedstrijd.");
  }
  if (matchPlayer.absent) fail("PLAYER_ABSENT", "Deze speler stond als afwezig geregistreerd voor deze wedstrijd.");
}

function ownReview(ctx: ReaderCtx, matchId: Id<"matches">, authorTokenIdentifier: string, playerId: Id<"players">) {
  return ctx.db.query("playerMatchReviews")
    .withIndex("by_match_and_author_and_player", (index) => index.eq("matchId", matchId).eq("authorTokenIdentifier", authorTokenIdentifier).eq("playerId", playerId))
    .unique();
}

function assertRevision(existing: Doc<"playerMatchReviews"> | null, expectedRevision: number | null) {
  if (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)) {
    fail("INVALID_REVISION", "De versie van dit verslag is ongeldig. Open het verslag opnieuw.");
  }
  if ((existing?.revision ?? null) !== expectedRevision) {
    fail("CONFLICT", "Dit verslag is intussen gewijzigd. Open de nieuwste versie voordat je verdergaat.");
  }
}

function toView(review: Doc<"playerMatchReviews">) {
  return {
    _id: review._id,
    matchId: review.matchId,
    teamId: review.teamId,
    playerId: review.playerId,
    draft: review.draft,
    finalized: review.finalized ?? null,
    finalizedAt: review.finalizedAt ?? null,
    updatedAt: review.updatedAt,
    revision: review.revision,
  };
}

export const listForMatch = query({
  args: { matchId: v.id("matches") },
  returns: v.array(playerMatchReviewViewValidator),
  handler: async (ctx, args) => {
    const { match, authorTokenIdentifier } = await requireReviewAccess(ctx, args.matchId);
    const reviews = await ctx.db.query("playerMatchReviews")
      .withIndex("by_match_and_author_and_player", (index) => index.eq("matchId", match._id).eq("authorTokenIdentifier", authorTokenIdentifier))
      .take(MAX_MATCH_REVIEWS + 1);
    if (reviews.length > MAX_MATCH_REVIEWS) fail("TOO_MANY_REVIEWS", "Er zijn te veel verslagen bij deze wedstrijd om tegelijk te openen.");
    return reviews.filter((review) => review.teamId === match.teamId).map(toView);
  },
});

export const saveDraft = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
    answers: playerReviewValidator,
    expectedRevision: v.union(v.number(), v.null()),
  },
  returns: playerMatchReviewViewValidator,
  handler: async (ctx, args) => {
    const { match, authorTokenIdentifier } = await requireReviewAccess(ctx, args.matchId);
    await requireMatchPlayer(ctx, match, args.playerId);
    if (!isPlayerReview(args.answers)) fail("INVALID_ANSWERS", "Gebruik maximaal 800 tekens per antwoord.");
    const existing = await ownReview(ctx, args.matchId, authorTokenIdentifier, args.playerId);
    if (existing && existing.teamId !== match.teamId) fail("FORBIDDEN", "Dit verslag hoort niet bij dit team.");
    assertRevision(existing, args.expectedRevision);
    const now = Date.now();
    if (existing) {
      const patch = { draft: args.answers, revision: existing.revision + 1, updatedAt: now };
      await ctx.db.patch(existing._id, patch);
      return toView({ ...existing, ...patch });
    }
    const created = {
      matchId: match._id,
      teamId: match.teamId,
      playerId: args.playerId,
      authorTokenIdentifier,
      draft: args.answers,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    const reviewId = await ctx.db.insert("playerMatchReviews", created);
    return toView({ ...created, _id: reviewId, _creationTime: now });
  },
});

export const finalize = mutation({
  args: { matchId: v.id("matches"), playerId: v.id("players"), expectedRevision: v.number() },
  returns: playerMatchReviewViewValidator,
  handler: async (ctx, args) => {
    const { match, authorTokenIdentifier } = await requireReviewAccess(ctx, args.matchId);
    await requireMatchPlayer(ctx, match, args.playerId);
    const existing = await ownReview(ctx, args.matchId, authorTokenIdentifier, args.playerId);
    if (!existing) fail("NOT_FOUND", "Bewaar eerst een concept voor deze speler.");
    if (existing.teamId !== match.teamId) fail("FORBIDDEN", "Dit verslag hoort niet bij dit team.");
    assertRevision(existing, args.expectedRevision);
    if (!isPlayerReview(existing.draft) || getPlayerReviewProgress(existing.draft).status !== "ready") {
      fail("INCOMPLETE_REVIEW", "Vul de drie kernvragen in en beschrijf minstens één eigen observatie.");
    }
    const now = Date.now();
    const patch = {
      finalized: finalizePlayerReviewAnswers(existing.draft),
      finalizedAt: now,
      revision: existing.revision + 1,
      updatedAt: now,
    };
    await ctx.db.patch(existing._id, patch);
    return toView({ ...existing, ...patch });
  },
});
