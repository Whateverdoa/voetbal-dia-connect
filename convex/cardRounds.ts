import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { cardKindValidator, roundModeValidator } from "./cardSchema";
import { cardAwardExpiresAt, cardPeriodKey, amsterdamLocalToUtc } from "../src/lib/cards/cardPeriods";
import {
  cardEligible, matchesVoterSnapshot, MAX_VOTERS, playerConsents, rankBallots, requireCardStaff,
  requireVoterIdentity, selectionTeam, teamMemberships, teamPlayers, votedWinners,
} from "./lib/cardData";

function validPeriod(periodKey: string, kind: "week" | "month"): boolean {
  const date = kind === "month" ? `${periodKey}-01` : periodKey;
  if (!(kind === "month" ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/).test(periodKey)) return false;
  const ms = amsterdamLocalToUtc(`${date}T12:00:00`);
  return Number.isFinite(ms) && cardPeriodKey(ms, kind) === periodKey;
}

async function publishRound(ctx: MutationCtx, round: Doc<"cardRounds">, ranking: Doc<"cardRounds">["ranking"], winnerIds: Id<"players">[]) {
  const publishedAt = Date.now();
  const expiresAt = cardAwardExpiresAt(publishedAt, round.kind);
  await ctx.db.patch(round._id, { status: "published", ranking, winnerIds, originalWinnerIds: winnerIds, publishedAt, expiresAt, updatedAt: publishedAt });
  await ctx.scheduler.runAfter(Math.max(0, expiresAt - publishedAt), internal.cardRounds.expireRound, { roundId: round._id, expectedExpiresAt: expiresAt });
}

export const createRound = mutation({
  args: {
    teamId: v.id("teams"), kind: cardKindValidator, mode: roundModeValidator,
    periodKey: v.string(), winnerCount: v.optional(v.number()), closesAt: v.optional(v.number()),
    playerIds: v.optional(v.array(v.id("players"))),
  },
  returns: v.id("cardRounds"),
  handler: async (ctx, args) => {
    const actor = await requireCardStaff(ctx, args.teamId);
    await selectionTeam(ctx, args.teamId);
    if (!validPeriod(args.periodKey, args.kind)) throw new Error("Kies een geldige maand of week (maandag)");
    const existing = await ctx.db.query("cardRounds").withIndex("by_team_kind_period", (q) => q.eq("teamId", args.teamId).eq("kind", args.kind).eq("periodKey", args.periodKey)).unique();
    if (existing) throw new Error("Voor deze periode bestaat al een ronde");
    const roster = (await teamPlayers(ctx, args.teamId)).filter((player) => player.active);
    const candidates = [];
    for (const player of roster) if (cardEligible(await playerConsents(ctx, player._id))) candidates.push(player._id);
    const candidateSet = new Set(candidates);
    const chosen = args.playerIds ?? [];
    if (chosen.length !== new Set(chosen).size || chosen.some((id) => !candidateSet.has(id))) throw new Error("Kies verschillende actieve spelers met toestemming");
    const now = Date.now();
    const closesAt = args.mode === "manual" ? now : args.closesAt;
    if (closesAt == null || !Number.isFinite(closesAt) || (args.mode === "vote" && closesAt <= now)) throw new Error("Kies een sluitmoment in de toekomst");
    const winnerCount = args.mode === "manual" ? chosen.length : args.winnerCount;
    if (winnerCount == null || !Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > candidates.length) throw new Error("Kies een geldig aantal winnaars");
    const rosterIds = new Set(roster.map((player) => player._id));
    const voters: Doc<"cardRounds">["voters"] = (await teamMemberships(ctx, args.teamId))
      .filter((seat) => seat.active && Boolean(seat.identity) && rosterIds.has(seat.playerId))
      .map((seat) => ({ membershipId: seat._id, identity: seat.identity!, playerId: seat.playerId, kind: seat.kind, bindingVersion: seat.bindingVersion ?? 0 }));
    if (args.mode === "vote" && voters.length === 0) throw new Error("Laat eerst minimaal één stemmer de uitnodiging activeren");
    const roundId = await ctx.db.insert("cardRounds", {
      teamId: args.teamId, kind: args.kind, mode: args.mode, periodKey: args.periodKey,
      status: "open", winnerCount, closesAt, candidateIds: candidates,
      voters, winnerIds: [], originalWinnerIds: [], vetoedIds: [], ranking: [],
      createdBy: actor, createdAt: now, updatedAt: now,
    });
    if (args.mode === "manual") {
      const round = await ctx.db.get(roundId);
      await publishRound(ctx, round!, candidates.map((playerId) => ({ playerId, count: 0 })), chosen);
    } else {
      await ctx.scheduler.runAfter(closesAt - now, internal.cardRounds.closeRound, { roundId, expectedClosesAt: closesAt });
    }
    return roundId;
  },
});

export const castBallot = mutation({
  args: { roundId: v.id("cardRounds"), membershipId: v.id("cardVoterMemberships"), playerIds: v.array(v.id("players")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireVoterIdentity(ctx);
    const round = await ctx.db.get(args.roundId);
    if (!round || round.mode !== "vote" || round.status !== "open" || Date.now() >= round.closesAt) throw new Error("Deze stemronde is gesloten");
    await selectionTeam(ctx, round.teamId);
    const seat = await ctx.db.get(args.membershipId);
    const voter = round.voters.find((entry) => entry.membershipId === args.membershipId && entry.identity === identity.tokenIdentifier);
    if (!seat || seat.identity !== identity.tokenIdentifier || seat.teamId !== round.teamId || !voter || !matchesVoterSnapshot(voter, seat)) throw new Error("Geen stemrecht in deze ronde");
    const rosterPlayer = await ctx.db.get(seat.playerId);
    if (!rosterPlayer?.active || rosterPlayer.teamId !== round.teamId) throw new Error("Geen actief stemrecht");
    if (args.playerIds.length > round.winnerCount || new Set(args.playerIds).size !== args.playerIds.length || args.playerIds.some((id) => !round.candidateIds.includes(id))) throw new Error("Kies maximaal het toegestane aantal verschillende spelers");
    if (voter.kind === "player" && args.playerIds.includes(voter.playerId)) throw new Error("Je kunt niet op jezelf stemmen");
    for (const id of args.playerIds) {
      const candidate = await ctx.db.get(id);
      if (!candidate?.active || candidate.teamId !== round.teamId || !cardEligible(await playerConsents(ctx, id))) throw new Error("Deze speler is niet meer verkiesbaar");
    }
    const existing = await ctx.db.query("cardBallots").withIndex("by_round_membership", (q) => q.eq("roundId", args.roundId).eq("membershipId", args.membershipId)).unique();
    const fields = { playerIds: args.playerIds, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("cardBallots", { roundId: args.roundId, membershipId: args.membershipId, ...fields });
    return null;
  },
});

export const closeRound = internalMutation({
  args: { roundId: v.id("cardRounds"), expectedClosesAt: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round || round.mode !== "vote" || round.status !== "open" || round.closesAt !== args.expectedClosesAt || Date.now() < round.closesAt) return null;
    const team = await ctx.db.get(round.teamId);
    if (!team?.isSelectionTeam) {
      await ctx.db.patch(round._id, { status: "cancelled", updatedAt: Date.now() });
      return null;
    }
    const candidates: Id<"players">[] = [];
    for (const id of round.candidateIds) {
      const player = await ctx.db.get(id);
      if (player?.active && player.teamId === round.teamId && cardEligible(await playerConsents(ctx, id))) candidates.push(id);
    }
    const currentSeats = await teamMemberships(ctx, round.teamId);
    const activeRoster = new Set((await teamPlayers(ctx, round.teamId)).filter((player) => player.active).map((player) => player._id));
    const allowedSeats = new Set(round.voters.filter((voter) => activeRoster.has(voter.playerId) && currentSeats.some((seat) => matchesVoterSnapshot(voter, seat))).map((voter) => voter.membershipId));
    const ballots = await ctx.db.query("cardBallots").withIndex("by_round", (q) => q.eq("roundId", round._id)).take(MAX_VOTERS + 1);
    if (ballots.length > MAX_VOTERS) throw new Error("Te veel stembiljetten");
    const ranking = rankBallots(candidates, ballots.filter((ballot) => allowedSeats.has(ballot.membershipId)));
    await publishRound(ctx, round, ranking, votedWinners(ranking, round.winnerCount));
    return null;
  },
});

export const expireRound = internalMutation({
  args: { roundId: v.id("cardRounds"), expectedExpiresAt: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round || round.status !== "published" || round.expiresAt !== args.expectedExpiresAt || round.expiredAt || Date.now() < args.expectedExpiresAt) return null;
    await ctx.db.patch(round._id, { expiredAt: Date.now(), updatedAt: Date.now() });
    return null;
  },
});

export const setVeto = mutation({
  args: { roundId: v.id("cardRounds"), playerId: v.id("players"), veto: v.boolean(), reason: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) throw new Error("Ronde niet gevonden");
    const actor = await requireCardStaff(ctx, round.teamId);
    await selectionTeam(ctx, round.teamId);
    if (round.status !== "published" || !round.candidateIds.includes(args.playerId)) throw new Error("Deze ronde heeft geen gepubliceerde uitslag");
    if (args.veto && round.vetoedIds.includes(args.playerId)) return null;
    if (args.veto && !round.winnerIds.includes(args.playerId)) throw new Error("Alleen een winnaar kan worden uitgesloten");
    if (!args.veto && !round.vetoedIds.includes(args.playerId)) return null;
    const reason = args.reason.trim();
    if (!reason || reason.length > 500) throw new Error("Geef een korte reden (maximaal 500 tekens)");
    const vetoedIds = args.veto ? [...new Set([...round.vetoedIds, args.playerId])] : round.vetoedIds.filter((id) => id !== args.playerId);
    const eligible = new Set<Id<"players">>();
    for (const id of round.candidateIds) {
      const player = await ctx.db.get(id);
      if (player?.active && player.teamId === round.teamId && cardEligible(await playerConsents(ctx, id))) eligible.add(id);
    }
    const winnerIds = round.mode === "vote"
      ? votedWinners(round.ranking.filter((row) => eligible.has(row.playerId) && !vetoedIds.includes(row.playerId)), round.winnerCount)
      : round.originalWinnerIds.filter((id) => eligible.has(id) && !vetoedIds.includes(id));
    await ctx.db.patch(round._id, { vetoedIds, winnerIds, updatedAt: Date.now() });
    await ctx.db.insert("cardAwardAudit", { roundId: round._id, playerId: args.playerId, veto: args.veto, reason, actor, createdAt: Date.now() });
    return null;
  },
});
