import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acceptInvite, castBallot, createRound, getPortal, getRoundAudit, getStaffTeam, inviteVoter, revokeVoter, setVeto, updatePlayerCard } from "./playerCards";
import { closeRound, expireRound } from "./cardRounds";
import { getCurrentUserAccess, requireCoachForTeam } from "./lib/userAccess";
import { cardEligible, rankBallots, votedWinners } from "./lib/cardData";
import type { Id } from "./_generated/dataModel";

vi.mock("./lib/userAccess", () => ({ getCurrentUserAccess: vi.fn(), requireCoachForTeam: vi.fn() }));

type Row = Record<string, unknown> & { _id: string };
type Identity = { tokenIdentifier: string; email: string; emailVerified: boolean };
const now = Date.parse("2026-10-11T12:00:00+02:00");
const ids = ["a", "b", "c"].map((id) => id as Id<"players">);
const ratings = { snl: 71, sch: 72, pas: 73, dri: 74, vrd: 75, fys: 76 };

function invoke<T = unknown>(fn: unknown, ctx: unknown, args: Record<string, unknown> = {}): Promise<T> {
  return (fn as { _handler: (context: unknown, values: Record<string, unknown>) => Promise<T> })._handler(ctx, args);
}

/** A boundary double runs the real registered handlers, including their auth and projections. */
function fixture() {
  const tables: Record<string, Row[]> = {
    teams: [{ _id: "team", name: "JO13-2", slug: "jo13-2", isSelectionTeam: true }],
    players: ids.map((id) => ({ _id: id, teamId: "team", name: `${id.toUpperCase()} Achternaam`, number: 1, active: true, fcRatings: ratings, playStyleIds: ["dribbler"], photoUrl: "https://example.test/photo.jpg", cardProfile: { xp: 30, level: 1, rarity: "common", seasonStats: { matches: 1, minutes: 60, goals: 1, assists: 0, cleanSheets: 0 } } })),
    playerConsents: ids.flatMap((playerId) => ["gamification", "public_display", "photo"].map((consentType) => ({ _id: `${playerId}-${consentType}`, playerId, teamId: "team", consentType, status: "granted" }))),
    cardVoterMemberships: [{ _id: "seat", teamId: "team", playerId: "a", kind: "parent", email: "parent@example.test", active: true, identity: "clerk|parent" }],
    cardVoterInvitations: [], cardRounds: [], cardBallots: [], cardAwardAudit: [],
  };
  const state = { identity: { tokenIdentifier: "clerk|parent", email: "parent@example.test", emailVerified: true } as Identity | null };
  let next = 0;
  const db = {
    get: vi.fn(async (id: string) => Object.values(tables).flat().find((row) => row._id === id) ?? null),
    query: vi.fn((table: string) => {
      const constraints: [string, unknown][] = [];
      let descending = false;
      const index = { eq: (field: string, value: unknown) => { constraints.push([field, value]); return index; } };
      const rows = () => {
        const found = (tables[table] ?? []).filter((row) => constraints.every(([field, value]) => row[field] === value));
        return descending ? [...found].reverse() : found;
      };
      const chain = {
        withIndex: (_name: string, apply: (value: typeof index) => unknown) => { apply(index); return chain; },
        order: (direction: string) => { descending = direction === "desc"; return chain; },
        take: async (limit: number) => rows().slice(0, limit),
        unique: async () => { if (rows().length > 1) throw new Error("Duplicate index key"); return rows()[0] ?? null; },
      };
      return chain;
    }),
    insert: vi.fn(async (table: string, values: Record<string, unknown>) => {
      const id = `${table}-${++next}`;
      (tables[table] ??= []).push({ ...values, _id: id });
      return id;
    }),
    patch: vi.fn(async (id: string, values: Record<string, unknown>) => {
      const row = Object.values(tables).flat().find((entry) => entry._id === id);
      if (!row) throw new Error("Missing document");
      Object.assign(row, values);
    }),
  };
  const ctx = { db, auth: { getUserIdentity: vi.fn(async () => state.identity) }, scheduler: { runAfter: vi.fn<(...args: unknown[]) => Promise<string>>().mockResolvedValue("scheduled") } };
  function round(extra: Record<string, unknown> = {}) {
    const value: Row = {
      _id: "round", teamId: "team", kind: "week", periodKey: "2026-10-05", mode: "vote", status: "open", winnerCount: 1,
      closesAt: now + 60_000, candidateIds: ids,
      voters: [{ membershipId: "seat", identity: "clerk|parent", playerId: "a", kind: "parent" }],
      winnerIds: [], originalWinnerIds: [], vetoedIds: [], ranking: [], createdBy: "coach@example.test", createdAt: now,
      ...extra,
    };
    tables.cardRounds.push(value);
    return value;
  }
  return { ctx, state, tables, round };
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.resetAllMocks();
  vi.mocked(getCurrentUserAccess).mockResolvedValue({ email: "admin@example.test", roles: ["admin"], active: true });
  vi.mocked(requireCoachForTeam).mockRejectedValue(new Error("Geen toegang tot dit team"));
});
afterEach(() => vi.useRealTimers());

describe("coach assessments and access", () => {
  it("keeps XP intact while validating six scores and maximum three distinct styles", async () => {
    const { ctx, tables } = fixture();
    await invoke(updatePlayerCard, ctx, { playerId: "a", fcRatings: ratings, playStyleIds: ["dribbler", "tireless"] });
    expect(tables.players[0].cardProfile).toMatchObject({ xp: 30 });
    await expect(invoke(updatePlayerCard, ctx, { playerId: "a", fcRatings: { ...ratings, snl: 99.5 } })).rejects.toThrow("hele getallen");
    await expect(invoke(updatePlayerCard, ctx, { playerId: "a", playStyleIds: ["dribbler", "dribbler"] })).rejects.toThrow("drie");
    await invoke(updatePlayerCard, ctx, { playerId: "a", fcRatings: null });
    expect(tables.players[0].fcRatings).toBeUndefined();
    await invoke(updatePlayerCard, ctx, { playerId: "a", fcRatings: { snl: 80 } });
    expect(tables.players[0].fcRatings).toEqual({ snl: 80 });
  });

  it("denies non-staff callers, allows admin without coachId, and selection-gates writes", async () => {
    const { ctx, tables } = fixture();
    vi.mocked(getCurrentUserAccess).mockResolvedValue(null);
    await expect(invoke(updatePlayerCard, ctx, { playerId: "a", fcRatings: ratings })).rejects.toThrow("Geen toegang");
    expect(ctx.db.patch).not.toHaveBeenCalled();
    vi.mocked(getCurrentUserAccess).mockResolvedValue({ email: "admin@example.test", roles: ["admin"], active: true });
    await invoke(updatePlayerCard, ctx, { playerId: "a", fcRatings: ratings });
    tables.teams[0].isSelectionTeam = false;
    await expect(invoke(updatePlayerCard, ctx, { playerId: "a", fcRatings: ratings })).rejects.toThrow("selectieteams");
  });

  it("uses revoked-wins consent for eligibility", () => {
    expect(cardEligible([{ consentType: "public_display", status: "granted" }, { consentType: "gamification", status: "granted" }, { consentType: "gamification", status: "revoked" }])).toBe(false);
  });
});

describe("Clerk-bound invitations", () => {
  it("binds only expected e-mail, is retry-safe, and keeps the two seats on distinct accounts", async () => {
    const { ctx, state, tables } = fixture();
    const invite = await invoke<{ token: string }>(inviteVoter, ctx, { teamId: "team", playerId: "a", kind: "player", email: "player@example.test" });
    const invitation = tables.cardVoterInvitations[0];
    const seat = tables.cardVoterMemberships.find((row) => row.kind === "player")!;
    expect(invitation).toMatchObject({ membershipId: seat._id, email: "player@example.test", bindingVersion: seat.bindingVersion, status: "pending", expiresAt: now + 7 * 86_400_000 });
    expect(invitation.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(invitation.tokenHash).not.toBe(invite.token);
    await expect(invoke(acceptInvite, ctx, invite)).rejects.toThrow("e-mailadres");
    expect(invitation.status).toBe("pending");
    state.identity = { tokenIdentifier: "clerk|player", email: "player@example.test", emailVerified: true };
    expect(await invoke(acceptInvite, ctx, invite)).toEqual({ teamSlug: "jo13-2" });
    expect(invitation).toMatchObject({ status: "accepted", acceptedIdentity: "clerk|player", acceptedAt: now });
    vi.setSystemTime(now + 1000);
    expect(await invoke(acceptInvite, ctx, invite)).toEqual({ teamSlug: "jo13-2" });
    expect(invitation.acceptedAt).toBe(now);
    expect(tables.cardVoterMemberships.find((row) => row.kind === "player")?.identity).toBe("clerk|player");
    await expect(invoke(inviteVoter, ctx, { teamId: "team", playerId: "a", kind: "parent", email: "player@example.test" })).rejects.toThrow("verschillende accounts");
  });

  it("expires in seven days and a reissued invitation invalidates the prior token", async () => {
    const { ctx, tables } = fixture();
    const first = await invoke<{ token: string }>(inviteVoter, ctx, { teamId: "team", playerId: "b", kind: "parent", email: "parent@example.test" });
    const second = await invoke<{ token: string }>(inviteVoter, ctx, { teamId: "team", playerId: "b", kind: "parent", email: "parent@example.test" });
    expect(tables.cardVoterInvitations.map((entry) => entry.status)).toEqual(["revoked", "pending"]);
    expect(tables.cardVoterInvitations[0].membershipId).toBe(tables.cardVoterInvitations[1].membershipId);
    await expect(invoke(acceptInvite, ctx, first)).rejects.toThrow("verlopen");
    vi.setSystemTime(now + 7 * 86_400_000);
    await expect(invoke(acceptInvite, ctx, second)).rejects.toThrow("verlopen");
  });

  it("revokes accepted links on reissue and revoke while preserving invitation history", async () => {
    const { ctx, tables } = fixture();
    const first = await invoke<{ token: string }>(inviteVoter, ctx, { teamId: "team", playerId: "b", kind: "parent", email: "parent@example.test" });
    await invoke(acceptInvite, ctx, first);
    const second = await invoke<{ token: string }>(inviteVoter, ctx, { teamId: "team", playerId: "b", kind: "parent", email: "parent@example.test" });
    expect(tables.cardVoterInvitations[0]).toMatchObject({ status: "revoked", acceptedIdentity: "clerk|parent", acceptedAt: now });
    await expect(invoke(acceptInvite, ctx, first)).rejects.toThrow("verlopen");
    await invoke(acceptInvite, ctx, second);
    await invoke(revokeVoter, ctx, { membershipId: tables.cardVoterInvitations[1].membershipId });
    expect(tables.cardVoterInvitations.map((entry) => entry.status)).toEqual(["revoked", "revoked"]);
    await expect(invoke(acceptInvite, ctx, second)).rejects.toThrow("verlopen");
  });

  it("rejects stale seat bindings and an accepted link claimed by another Clerk identity", async () => {
    const { ctx, state, tables } = fixture();
    const invitation = await invoke<{ token: string }>(inviteVoter, ctx, { teamId: "team", playerId: "b", kind: "parent", email: "parent@example.test" });
    await invoke(acceptInvite, ctx, invitation);
    state.identity = { tokenIdentifier: "clerk|other", email: "parent@example.test", emailVerified: true };
    await expect(invoke(acceptInvite, ctx, invitation)).rejects.toThrow("al gebruikt");
    state.identity = { tokenIdentifier: "clerk|parent", email: "parent@example.test", emailVerified: true };
    const seat = tables.cardVoterMemberships.find((row) => row.playerId === "b")!;
    seat.bindingVersion = Number(seat.bindingVersion) + 1;
    await expect(invoke(acceptInvite, ctx, invitation)).rejects.toThrow("verlopen");
    expect(tables.cardVoterInvitations[0].status).toBe("accepted");
  });

  it("checks Clerk identity as well as e-mail to keep player and parent accounts distinct", async () => {
    const { ctx, state } = fixture();
    const invitation = await invoke<{ token: string }>(inviteVoter, ctx, { teamId: "team", playerId: "a", kind: "player", email: "player@example.test" });
    state.identity = { tokenIdentifier: "clerk|parent", email: "player@example.test", emailVerified: true };
    await expect(invoke(acceptInvite, ctx, invitation)).rejects.toThrow("verschillende accounts");
  });

  it("revocation removes portal access and invitations cannot be accepted anonymously", async () => {
    const { ctx, state } = fixture();
    await invoke(revokeVoter, ctx, { membershipId: "seat" });
    vi.mocked(getCurrentUserAccess).mockResolvedValue(null);
    expect(await invoke(getPortal, ctx, { teamSlug: "jo13-2" })).toBeNull();
    state.identity = null;
    await expect(invoke(acceptInvite, ctx, { token: "unused" })).rejects.toThrow("Log in");
  });
});

describe("ballots and scheduled publication", () => {
  it("allows parent own-child vote, edits one ballot, and rejects duplicate, oversized and foreign choices", async () => {
    const { ctx, tables, round } = fixture(); round();
    await invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["a"] });
    await invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["b"] });
    expect(tables.cardBallots).toHaveLength(1);
    expect(tables.cardBallots[0].playerIds).toEqual(["b"]);
    for (const playerIds of [["a", "b"], ["b", "b"], ["outside"]]) await expect(invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds })).rejects.toThrow("verschillende spelers");
  });

  it("rejects player self-votes and seats accepted after the opening snapshot", async () => {
    const { ctx, tables, round } = fixture();
    tables.cardVoterMemberships[0].kind = "player";
    round({ voters: [{ membershipId: "seat", identity: "clerk|parent", playerId: "a", kind: "player" }] });
    await expect(invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["a"] })).rejects.toThrow("jezelf");
    tables.cardVoterMemberships.push({ _id: "new-seat", teamId: "team", playerId: "b", kind: "parent", identity: "clerk|parent", active: true });
    await expect(invoke(castBallot, ctx, { roundId: "round", membershipId: "new-seat", playerIds: ["b"] })).rejects.toThrow("stemrecht");
  });

  it("reassigned seat cannot inherit the old round ballot or snapshot rights", async () => {
    const { ctx, tables, round, state } = fixture(); round();
    await invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["b"] });
    const invitation = await invoke<{ token: string }>(inviteVoter, ctx, { teamId: "team", playerId: "a", kind: "parent", email: "replacement@example.test" });
    state.identity = { tokenIdentifier: "clerk|replacement", email: "replacement@example.test", emailVerified: true };
    await invoke(acceptInvite, ctx, invitation);
    await expect(invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["c"] })).rejects.toThrow("stemrecht");
    const portal = await invoke<{ rounds: Row[] }>(getPortal, ctx, { teamSlug: "jo13-2" });
    expect(portal.rounds[0].myBallots).toEqual([]);
    vi.setSystemTime(now + 60_000);
    await invoke(closeRound, ctx, { roundId: "round", expectedClosesAt: now + 60_000 });
    expect(tables.cardRounds[0].winnerIds).toEqual([]);
  });

  it("same-account revoke/reinvite cannot resurrect a ballot or voting rights from an old snapshot", async () => {
    const { ctx, tables, round } = fixture(); round();
    await invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["b"] });
    await invoke(revokeVoter, ctx, { membershipId: "seat" });
    const invitation = await invoke<{ token: string }>(inviteVoter, ctx, { teamId: "team", playerId: "a", kind: "parent", email: "parent@example.test" });
    await invoke(acceptInvite, ctx, invitation);
    await expect(invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["c"] })).rejects.toThrow("stemrecht");
    const portal = await invoke<{ rounds: Row[] }>(getPortal, ctx, { teamSlug: "jo13-2" });
    expect(portal.rounds[0].myBallots).toEqual([]);
    const nextRoundId = await invoke<string>(createRound, ctx, { teamId: "team", kind: "month", mode: "vote", periodKey: "2026-10", winnerCount: 1, closesAt: now + 60_000 });
    await invoke(castBallot, ctx, { roundId: nextRoundId, membershipId: "seat", playerIds: ["c"] });
    vi.setSystemTime(now + 60_000);
    await invoke(closeRound, ctx, { roundId: "round", expectedClosesAt: now + 60_000 });
    await invoke(closeRound, ctx, { roundId: nextRoundId, expectedClosesAt: now + 60_000 });
    expect(tables.cardRounds[0].winnerIds).toEqual([]);
    expect(tables.cardRounds[1].winnerIds).toEqual(["c"]);
  });

  it("enforces deadline even before scheduler executes and publication/expiry are idempotent", async () => {
    const { ctx, tables, round } = fixture(); const row = round();
    await invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["b"] });
    vi.setSystemTime(now + 60_000);
    await expect(invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["c"] })).rejects.toThrow("gesloten");
    await invoke(closeRound, ctx, { roundId: "round", expectedClosesAt: now + 60_000 });
    const expiry = row.expiresAt;
    expect(row.winnerIds).toEqual(["b"]);
    await invoke(closeRound, ctx, { roundId: "round", expectedClosesAt: now + 60_000 });
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
    expect(tables.cardRounds[0].expiresAt).toBe(expiry);
    vi.setSystemTime(Number(expiry));
    await invoke(expireRound, ctx, { roundId: "round", expectedExpiresAt: expiry });
    const writes = ctx.db.patch.mock.calls.length;
    await invoke(expireRound, ctx, { roundId: "round", expectedExpiresAt: expiry });
    expect(ctx.db.patch).toHaveBeenCalledTimes(writes);
    expect(row.expiredAt).toBe(expiry);
  });

  it("publishes no arbitrary zero-vote winner and includes every positive cutoff tie", () => {
    expect(votedWinners(rankBallots(ids, []), 1)).toEqual([]);
    expect(votedWinners(rankBallots(ids, [{ playerIds: [ids[0]] }, { playerIds: [ids[1]] }]), 1)).toEqual([ids[0], ids[1]]);
  });

  it("ignores votes from a now-inactive roster voter and withdrawn candidates at close", async () => {
    const { ctx, tables, round } = fixture(); const row = round();
    await invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["b"] });
    tables.players[0].active = false;
    vi.setSystemTime(now + 60_000);
    await invoke(closeRound, ctx, { roundId: "round", expectedClosesAt: now + 60_000 });
    expect(row.winnerIds).toEqual([]);
  });

  it("excludes withdrawn and inactive candidates at close while retaining a valid parent ballot", async () => {
    const { ctx, tables, round } = fixture(); const row = round({ winnerCount: 2 });
    await invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["b", "c"] });
    tables.playerConsents.find((entry) => entry._id === "b-gamification")!.status = "revoked";
    tables.players[2].active = false;
    vi.setSystemTime(now + 60_000);
    await invoke(closeRound, ctx, { roundId: "round", expectedClosesAt: now + 60_000 });
    expect(row.winnerIds).toEqual([]);
    expect(row.ranking).toEqual([{ playerId: "a", count: 0 }]);
  });

  it("snapshots voters and consent candidates on creation and schedules the exact close", async () => {
    const { ctx, tables } = fixture();
    tables.playerConsents.find((entry) => entry._id === "c-public_display")!.status = "revoked";
    await invoke(createRound, ctx, { teamId: "team", kind: "month", mode: "vote", periodKey: "2026-10", winnerCount: 1, closesAt: now + 3600_000 });
    expect(tables.cardRounds[0]).toMatchObject({ candidateIds: ["a", "b"], voters: [{ membershipId: "seat", identity: "clerk|parent", playerId: "a", kind: "parent" }], status: "open" });
    expect(ctx.scheduler.runAfter.mock.calls[0][0]).toBe(3600_000);
  });

  it("creates a unique manual period with zero-count staff ranking and fixed published expiry", async () => {
    const { ctx, tables } = fixture();
    const args = { teamId: "team", kind: "week", mode: "manual", periodKey: "2026-10-05", playerIds: ["a", "b"] };
    await invoke(createRound, ctx, args);
    expect(tables.cardRounds[0]).toMatchObject({ status: "published", winnerIds: ["a", "b"], publishedAt: now });
    expect(tables.cardRounds[0].ranking).toHaveLength(3);
    await expect(invoke(createRound, ctx, args)).rejects.toThrow("bestaat al");
  });
});

describe("staff vetoes and private projections", () => {
  it("promotes the next positive candidates, preserves cutoff ties and expiry, and undo restores winners", async () => {
    const { ctx, tables, round } = fixture();
    const row = round({ status: "published", publishedAt: now, expiresAt: now + 7 * 86_400_000, winnerIds: ["a"], originalWinnerIds: ["a"], ranking: [{ playerId: "a", count: 3 }, { playerId: "b", count: 2 }, { playerId: "c", count: 2 }] });
    await invoke(setVeto, ctx, { roundId: "round", playerId: "a", veto: true, reason: "Onvoldoende sportiviteit" });
    expect(row.winnerIds).toEqual(["b", "c"]);
    expect(row.expiresAt).toBe(now + 7 * 86_400_000);
    expect(row.originalWinnerIds).toEqual(["a"]);
    await invoke(setVeto, ctx, { roundId: "round", playerId: "a", veto: false, reason: "Na gesprek hersteld" });
    expect(row.winnerIds).toEqual(["a"]);
    expect(tables.cardAwardAudit).toHaveLength(2);
  });

  it("skips inactive/withdrawn runners-up during veto and undo", async () => {
    const { ctx, tables, round } = fixture();
    const row = round({ status: "published", winnerIds: ["a"], originalWinnerIds: ["a"], ranking: [{ playerId: "a", count: 3 }, { playerId: "b", count: 2 }, { playerId: "c", count: 1 }] });
    tables.playerConsents.find((entry) => entry._id === "b-gamification")!.status = "revoked";
    await invoke(setVeto, ctx, { roundId: "round", playerId: "a", veto: true, reason: "Besluit coach" });
    expect(row.winnerIds).toEqual(["c"]);
    tables.players[0].active = false;
    await invoke(setVeto, ctx, { roundId: "round", playerId: "a", veto: false, reason: "Herstel" });
    expect(row.winnerIds).toEqual(["c"]);
  });

  it("exposes only own ballots; never counts, e-mails, full names, minutes, identities or audit to members", async () => {
    const { ctx, tables, round } = fixture();
    round({ status: "published", winnerIds: ["b"], originalWinnerIds: ["b"], publishedAt: now, expiresAt: now + 1000, ranking: [{ playerId: "b", count: 4 }] });
    tables.cardBallots.push({ _id: "mine", roundId: "round", membershipId: "seat", playerIds: ["b"] }, { _id: "other", roundId: "round", membershipId: "private-seat", playerIds: ["c"] });
    const portal = await invoke<{ players: Row[]; rounds: Row[] }>(getPortal, ctx, { teamSlug: "jo13-2" });
    const serialized = JSON.stringify(portal);
    for (const value of ["Achternaam", "minutes", "clerk|", "ranking", "vetoedIds", "@example.test", "private-seat"]) expect(serialized).not.toContain(value);
    expect(portal.rounds[0].myBallots).toEqual([{ membershipId: "seat", playerIds: ["b"] }]);
    tables.playerConsents.find((entry) => entry._id === "b-public_display")!.status = "revoked";
    const redacted = await invoke<{ players: Row[]; rounds: Row[] }>(getPortal, ctx, { teamSlug: "jo13-2" });
    expect(redacted.rounds[0].winnerIds).toEqual([]);
    expect(redacted.rounds[0].candidateIds).toEqual(["a", "c"]);
    expect(redacted.rounds[0].myBallots).toEqual([{ membershipId: "seat", playerIds: [] }]);
    expect(redacted.players.find((player) => player.playerId === "b")).toMatchObject({ fcRatings: null, photoUrl: null, recognitions: [] });
  });

  it("staff receives aggregates without individual ballots; non-staff cannot read rankings or audit", async () => {
    const { ctx, round } = fixture(); round();
    await invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["b"] });
    const staff = await invoke<{ rounds: Row[] }>(getStaffTeam, ctx, { teamId: "team" });
    expect(staff.rounds[0].ranking).toContainEqual({ playerId: "b", count: 1 });
    expect(JSON.stringify(staff)).not.toContain("myBallots");
    vi.mocked(getCurrentUserAccess).mockResolvedValue(null);
    await expect(invoke(getStaffTeam, ctx, { teamId: "team" })).rejects.toThrow("Geen toegang");
    await expect(invoke(getRoundAudit, ctx, { roundId: "round" })).rejects.toThrow("Geen toegang");
  });

  it("live staff aggregates use the same current eligibility as final publication", async () => {
    const { ctx, round, tables } = fixture(); round();
    await invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["b"] });
    tables.playerConsents.find((entry) => entry._id === "c-gamification")!.status = "revoked";
    tables.players[0].active = false;
    const staff = await invoke<{ rounds: Row[] }>(getStaffTeam, ctx, { teamId: "team" });
    expect(staff.rounds[0].ranking).toEqual([{ playerId: "b", count: 0 }]);
    vi.setSystemTime(now + 60_000);
    await invoke(closeRound, ctx, { roundId: "round", expectedClosesAt: now + 60_000 });
    expect(tables.cardRounds[0].ranking).toEqual(staff.rounds[0].ranking);
  });

  it("lets own-team staff preview the safe portal without creating voter seats or exposing ballots", async () => {
    const { ctx, state, round } = fixture(); round();
    state.identity = { tokenIdentifier: "clerk|coach", email: "coach@example.test", emailVerified: true };
    vi.mocked(getCurrentUserAccess).mockResolvedValue({ email: "coach@example.test", active: true, roles: ["coach"] });
    vi.mocked(requireCoachForTeam).mockResolvedValue({ access: { email: "coach@example.test", active: true, roles: ["coach"] }, coach: { _id: "coach" } } as Awaited<ReturnType<typeof requireCoachForTeam>>);
    const portal = await invoke<{ seats: unknown[]; rounds: Row[] }>(getPortal, ctx, { teamSlug: "jo13-2" });
    expect(portal.seats).toEqual([]);
    expect(portal.rounds[0].myBallots).toEqual([]);
    expect(JSON.stringify(portal)).not.toContain("ranking");
    await expect(invoke(castBallot, ctx, { roundId: "round", membershipId: "seat", playerIds: ["b"] })).rejects.toThrow("stemrecht");
    vi.mocked(requireCoachForTeam).mockRejectedValue(new Error("Ander team"));
    expect(await invoke(getPortal, ctx, { teamSlug: "jo13-2" })).toBeNull();
  });
});
