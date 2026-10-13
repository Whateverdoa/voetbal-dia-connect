import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { CardRecognition } from "../../src/lib/cards/fc27";
import { getCurrentUserAccess, requireCoachForTeam } from "./userAccess";
import { hasAdminRole } from "./adminOverride";
import { assertConsentGranted, redactPlayerForPublic, type ConsentRow } from "./privacyFilter";
export { loadTeamRecognitions } from "./cardRecognitions";

export type CardCtx = MutationCtx | QueryCtx;
export const MAX_CARD_PLAYERS = 64;
export const MAX_VOTERS = MAX_CARD_PLAYERS * 2;
export const MAX_ROUNDS = 100;

export async function requireCardStaff(ctx: CardCtx, teamId: Id<"teams">): Promise<string> {
  const access = await getCurrentUserAccess(ctx);
  if (hasAdminRole(access) && access) return access.email;
  const { access: coachAccess } = await requireCoachForTeam(ctx, teamId);
  return coachAccess.email;
}

export async function selectionTeam(ctx: CardCtx, teamId: Id<"teams">) {
  const team = await ctx.db.get(teamId);
  if (!team?.isSelectionTeam) throw new Error("Spelerskaarten zijn alleen beschikbaar voor selectieteams");
  return team;
}

export async function teamPlayers(ctx: CardCtx, teamId: Id<"teams">) {
  const players = await ctx.db.query("players").withIndex("by_team", (q) => q.eq("teamId", teamId)).take(MAX_CARD_PLAYERS + 1);
  if (players.length > MAX_CARD_PLAYERS) throw new Error("Maximaal 64 spelers per team ondersteund");
  return players;
}

export async function teamMemberships(ctx: CardCtx, teamId: Id<"teams">) {
  const seats = await ctx.db.query("cardVoterMemberships").withIndex("by_team", (q) => q.eq("teamId", teamId)).take(MAX_VOTERS + 1);
  if (seats.length > MAX_VOTERS) throw new Error("Te veel stemrechten voor dit team");
  return seats;
}

export async function playerConsents(ctx: CardCtx, playerId: Id<"players">): Promise<ConsentRow[]> {
  return ctx.db.query("playerConsents").withIndex("by_player", (q) => q.eq("playerId", playerId)).take(20);
}

export function cardEligible(consents: readonly ConsentRow[]): boolean {
  return assertConsentGranted([...consents], "gamification") && assertConsentGranted([...consents], "public_display");
}

export async function publicCardPlayer(ctx: CardCtx, player: Doc<"players">, awards: Map<string, CardRecognition[]>) {
  const consents = await playerConsents(ctx, player._id);
  return redactPlayerForPublic({ ...player, _id: String(player._id), recognitions: awards.get(String(player._id)) ?? [] }, consents);
}

export function publicRound(round: Doc<"cardRounds">) {
  return {
    _id: round._id, kind: round.kind, periodKey: round.periodKey,
    mode: round.mode, status: round.status, winnerCount: round.winnerCount,
    closesAt: round.closesAt, publishedAt: round.publishedAt ?? null,
    expiresAt: round.expiresAt ?? null, candidateIds: round.candidateIds,
    winnerIds: round.winnerIds,
  };
}

export async function recentTeamRounds(ctx: CardCtx, teamId: Id<"teams">) {
  return ctx.db.query("cardRounds").withIndex("by_team", (q) => q.eq("teamId", teamId)).order("desc").take(MAX_ROUNDS);
}

export function rankBallots(candidateIds: readonly Id<"players">[], ballots: readonly { playerIds: readonly Id<"players">[] }[]) {
  const counts = new Map(candidateIds.map((id) => [id, 0]));
  for (const ballot of ballots) for (const id of new Set(ballot.playerIds)) if (counts.has(id)) counts.set(id, counts.get(id)! + 1);
  return Array.from(counts, ([playerId, count]) => ({ playerId, count })).sort((a, b) => b.count - a.count || String(a.playerId).localeCompare(String(b.playerId)));
}

/** Positive votes only; everyone tied at the last place is included. */
export function votedWinners(ranking: readonly { playerId: Id<"players">; count: number }[], winnerCount: number) {
  const positive = ranking.filter((row) => row.count > 0);
  const cutoff = positive[Math.min(winnerCount, positive.length) - 1]?.count;
  return cutoff == null ? [] : positive.filter((row) => row.count >= cutoff).map((row) => row.playerId);
}

/** Reissuing/revoking a seat must not restore its earlier round's authority. */
export function matchesVoterSnapshot(voter: Doc<"cardRounds">["voters"][number], seat: Doc<"cardVoterMemberships">): boolean {
  return seat.active && seat._id === voter.membershipId && seat.identity === voter.identity &&
    seat.playerId === voter.playerId && seat.kind === voter.kind &&
    (seat.bindingVersion ?? 0) === (voter.bindingVersion ?? 0);
}

export async function requireVoterIdentity(ctx: CardCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Log in om te stemmen");
  return identity;
}

export async function ownMemberships(ctx: CardCtx, identity: string) {
  const seats = await ctx.db.query("cardVoterMemberships").withIndex("by_identity", (q) => q.eq("identity", identity)).take(MAX_VOTERS);
  return seats.filter((seat) => seat.active);
}
