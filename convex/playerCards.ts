import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { fcRatingsValidator, rankingValidator, voterKindValidator } from "./cardSchema";
import { fcPublicCardFields } from "./lib/fcCardValidators";
import { ballotViewValidator, deckPlayerValidator, roundPublicFields, seatViewValidator } from "./lib/cardValidators";
import { isFcAssessment, validPlayStyleIds } from "../src/lib/cards/fc27";
import {
  cardEligible, loadTeamRecognitions, matchesVoterSnapshot, MAX_VOTERS, ownMemberships, playerConsents,
  publicCardPlayer, publicRound, rankBallots, recentTeamRounds, requireCardStaff,
  selectionTeam, teamMemberships, teamPlayers,
} from "./lib/cardData";

export { inviteVoter, revokeVoter, acceptInvite } from "./cardVoters";
export { createRound, castBallot, setVeto, closeRound, expireRound } from "./cardRounds";
export { loadTeamRecognitions } from "./lib/cardRecognitions";

export const updatePlayerCard = mutation({
  args: { playerId: v.id("players"), fcRatings: v.optional(v.union(fcRatingsValidator, v.null())), playStyleIds: v.optional(v.array(v.string())) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Speler niet gevonden");
    await requireCardStaff(ctx, player.teamId);
    await selectionTeam(ctx, player.teamId);
    if (args.fcRatings != null && !isFcAssessment(args.fcRatings)) throw new Error("Ingevulde scores moeten hele getallen van 1 tot en met 99 zijn");
    if (args.playStyleIds && !validPlayStyleIds(args.playStyleIds)) throw new Error("Kies maximaal drie verschillende speelstijlen");
    await ctx.db.patch(player._id, {
      ...(args.fcRatings !== undefined ? { fcRatings: args.fcRatings ?? undefined } : {}),
      ...(args.playStyleIds !== undefined ? { playStyleIds: args.playStyleIds } : {}),
    });
    return null;
  },
});

export const getStaffTeam = query({
  args: { teamId: v.id("teams") },
  returns: v.object({
    team: v.object({ id: v.id("teams"), name: v.string(), slug: v.string(), isSelectionTeam: v.boolean() }),
    players: v.array(v.object({
      playerId: v.id("players"), name: v.string(), number: v.union(v.number(), v.null()),
      positionPrimary: v.union(v.string(), v.null()), photoUrl: v.union(v.string(), v.null()),
      ...fcPublicCardFields, active: v.boolean(), eligible: v.boolean(),
    })),
    memberships: v.array(v.object({ _id: v.id("cardVoterMemberships"), playerId: v.id("players"), kind: voterKindValidator, email: v.string(), active: v.boolean(), claimed: v.boolean() })),
    rounds: v.array(v.object({ ...roundPublicFields, vetoedIds: v.array(v.id("players")), ranking: rankingValidator })),
  }),
  handler: async (ctx, args) => {
    await requireCardStaff(ctx, args.teamId);
    const team = await selectionTeam(ctx, args.teamId);
    const awards = await loadTeamRecognitions(ctx, team._id);
    const roster = await teamPlayers(ctx, team._id);
    const memberships = await teamMemberships(ctx, team._id);
    const players = await Promise.all(roster.map(async (player) => ({
      playerId: player._id, name: player.name, number: player.number ?? null,
      positionPrimary: player.positionPrimary ?? null, photoUrl: player.photoUrl ?? null,
      fcRatings: player.fcRatings ?? null, playStyleIds: player.playStyleIds ?? [],
      recognitions: awards.get(String(player._id)) ?? [], active: player.active,
      eligible: player.active && cardEligible(await playerConsents(ctx, player._id)),
    })));
    const activeRosterIds = new Set(players.filter((player) => player.active).map((player) => player.playerId));
    const eligibleCandidateIds = new Set(players.filter((player) => player.eligible).map((player) => player.playerId));
    const rounds = [];
    for (const round of await recentTeamRounds(ctx, team._id)) {
      let ranking = round.ranking;
      if (round.status === "open" && round.mode === "vote") {
        const validSeats = new Set(round.voters.filter((voter) => activeRosterIds.has(voter.playerId) && memberships.some((seat) => matchesVoterSnapshot(voter, seat))).map((voter) => voter.membershipId));
        const ballots = await ctx.db.query("cardBallots").withIndex("by_round", (q) => q.eq("roundId", round._id)).take(MAX_VOTERS);
        ranking = rankBallots(round.candidateIds.filter((id) => eligibleCandidateIds.has(id)), ballots.filter((ballot) => validSeats.has(ballot.membershipId)));
      }
      rounds.push({ ...publicRound(round), vetoedIds: round.vetoedIds, ranking });
    }
    return {
      team: { id: team._id, name: team.name, slug: team.slug, isSelectionTeam: true }, players,
      memberships: memberships.map((seat) => ({ _id: seat._id, playerId: seat.playerId, kind: seat.kind, email: seat.email, active: seat.active, claimed: Boolean(seat.identity) })), rounds,
    };
  },
});

export const getMyTeams = query({
  args: {}, returns: v.array(v.object({ teamId: v.id("teams"), teamName: v.string(), teamSlug: v.string() })),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const teams = new Map<string, { teamId: Doc<"teams">["_id"]; teamName: string; teamSlug: string }>();
    for (const seat of await ownMemberships(ctx, identity.tokenIdentifier)) {
      const player = await ctx.db.get(seat.playerId);
      const team = await ctx.db.get(seat.teamId);
      if (player?.active && player.teamId === seat.teamId && team?.isSelectionTeam) teams.set(String(team._id), { teamId: team._id, teamName: team.name, teamSlug: team.slug });
    }
    return Array.from(teams.values());
  },
});

export const getPortal = query({
  args: { teamSlug: v.string() },
  returns: v.union(v.null(), v.object({
    team: v.object({ id: v.id("teams"), name: v.string(), slug: v.string() }),
    seats: v.array(seatViewValidator), players: v.array(deckPlayerValidator),
    rounds: v.array(v.object({ ...roundPublicFields, candidates: v.array(v.id("players")), myBallots: v.array(ballotViewValidator) })),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const team = await ctx.db.query("teams").withIndex("by_slug_only", (q) => q.eq("slug", args.teamSlug.toLowerCase())).unique();
    if (!team?.isSelectionTeam) return null;
    const roster = (await teamPlayers(ctx, team._id)).filter((player) => player.active);
    const rosterIds = new Set(roster.map((player) => player._id));
    const seats = (await ownMemberships(ctx, identity.tokenIdentifier)).filter((seat) => seat.teamId === team._id && rosterIds.has(seat.playerId));
    if (!seats.length) {
      try { await requireCardStaff(ctx, team._id); } catch { return null; }
    }
    const awards = await loadTeamRecognitions(ctx, team._id);
    const players = await Promise.all(roster.map((player) => publicCardPlayer(ctx, player, awards)));
    const eligibleIds = new Set<string>();
    for (const player of roster) if (cardEligible(await playerConsents(ctx, player._id))) eligibleIds.add(String(player._id));
    const rounds = [];
    for (const round of await recentTeamRounds(ctx, team._id)) {
      const myBallots = [];
      for (const seat of seats) {
        if (!round.voters.some((voter) => voter.identity === identity.tokenIdentifier && matchesVoterSnapshot(voter, seat))) continue;
        const ballot = await ctx.db.query("cardBallots").withIndex("by_round_membership", (q) => q.eq("roundId", round._id).eq("membershipId", seat._id)).unique();
        myBallots.push({ membershipId: seat._id, playerIds: ballot?.playerIds.filter((id) => eligibleIds.has(String(id))) ?? [] });
      }
      const candidateIds = round.candidateIds.filter((id) => eligibleIds.has(String(id)));
      rounds.push({ ...publicRound(round), candidateIds, winnerIds: round.winnerIds.filter((id) => eligibleIds.has(String(id))), candidates: candidateIds, myBallots });
    }
    return {
      team: { id: team._id, name: team.name, slug: team.slug },
      seats: seats.map((seat) => ({ _id: seat._id, playerId: seat.playerId, kind: seat.kind })), players, rounds,
    };
  },
});

/** Audit reasons are staff-only; individual ballots never leave the backend. */
export const getRoundAudit = query({
  args: { roundId: v.id("cardRounds") },
  returns: v.array(v.object({ playerId: v.id("players"), veto: v.boolean(), reason: v.string(), actor: v.string(), createdAt: v.number() })),
  handler: async (ctx, args) => {
    const round = await ctx.db.get(args.roundId);
    if (!round) return [];
    await requireCardStaff(ctx, round.teamId);
    const rows = await ctx.db.query("cardAwardAudit").withIndex("by_round", (q) => q.eq("roundId", round._id)).order("desc").take(100);
    return rows.map(({ playerId, veto, reason, actor, createdAt }) => ({ playerId, veto, reason, actor, createdAt }));
  },
});
