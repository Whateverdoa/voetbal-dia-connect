import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { executeEventCommand, readEventState } from "./mobileMatchEvents";
import { verifyClockPin, verifyCoachTeamMembership } from "./pinHelpers";
import { applyGoalEnrichments } from "./lib/matchEventProjection";
import { eventTotals } from "./lib/mobileEventModel";
import { executeCommand } from "./mobileMatchActions";

vi.mock("./pinHelpers", () => ({
  verifyClockPin: vi.fn(),
  verifyCoachTeamMembership: vi.fn(),
}));

const matchId = "match" as Id<"matches">;
const scorerId = "scorer" as Id<"players">;
const assistantId = "assistant" as Id<"players">;
const teamId = "team" as Id<"teams">;
const now = 1_800_000_000_000;
type TestRow = Record<string, unknown> & { _id: string; _creationTime: number };
type EventCommand = Parameters<typeof executeEventCommand>[1];

/** Indexed, in-memory storage with transaction rollback, including real dedupe rows. */
function fixture(options: { isHome?: boolean; status?: Doc<"matches">["status"] } = {}) {
  const tables = new Map<string, Map<string, TestRow>>();
  let nextId = 0;
  const table = (name: string) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  };
  const seed = (name: string, value: Record<string, unknown> & { _id: string }) => {
    const row = { _creationTime: now, ...value };
    table(name).set(row._id, row);
    return row;
  };
  seed("matches", {
    _id: matchId,
    teamId,
    publicCode: "MOBILE",
    opponent: "Test opponent",
    isHome: options.isHome ?? true,
    status: options.status ?? "live",
    currentQuarter: 1,
    quarterCount: 2,
    regulationDurationMinutes: 60,
    homeScore: 0,
    awayScore: 0,
    showLineup: true,
    startedAt: now - 600_000,
    quarterStartedAt: now - 600_000,
    createdAt: now - 3_600_000,
  });
  for (const [index, id] of [scorerId, assistantId].entries()) {
    seed("players", { _id: id, teamId, name: id, number: index + 9, active: true, createdAt: now });
    seed("matchPlayers", {
      _id: `mp-${id}`, matchId, playerId: id, onField: true, isKeeper: false,
      fieldSlotIndex: index + 8, minutesPlayed: 0, lastSubbedInAt: now - 600_000, createdAt: now,
    });
  }
  const find = (id: string) => {
    for (const rows of tables.values()) {
      const row = rows.get(id);
      if (row) return row;
    }
    return null;
  };
  const patch = vi.fn(async (id: string, updates: Record<string, unknown>) => {
    const row = find(id);
    if (!row) throw new Error(`Missing row ${id}`);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) delete row[key];
      else row[key] = value;
    }
  });
  const insert = vi.fn(async (name: string, fields: Record<string, unknown>) => {
    const id = `${name}-${++nextId}`;
    seed(name, { _id: id, ...fields });
    return id;
  });
  const remove = vi.fn(async (id: string) => {
    for (const rows of tables.values()) rows.delete(id);
  });
  const query = vi.fn((name: string) => {
    const constraints: Array<[string, unknown]> = [];
    let descending = false;
    const eq = (field: string, value: unknown) => {
      constraints.push([field, value]);
      return { eq };
    };
    const values = () => {
      const rows = [...table(name).values()].filter((row) =>
        constraints.every(([field, value]) => row[field] === value),
      );
      return descending ? rows.reverse() : rows;
    };
    const result = {
      withIndex: (_index: string, configure?: (q: { eq: typeof eq }) => unknown) => {
        configure?.({ eq });
        return result;
      },
      order: (direction: string) => { descending = direction === "desc"; return result; },
      take: async (limit: number) => values().slice(0, limit),
      collect: async () => values(),
      first: async () => values()[0] ?? null,
      unique: async () => {
        const rows = values();
        if (rows.length > 1) throw new Error("Expected unique indexed row");
        return rows[0] ?? null;
      },
    };
    return result;
  });
  const ctx = { db: { get: vi.fn(async (id: string) => find(id)), patch, insert, delete: remove, query } } as unknown as MutationCtx;
  const execute = async (args: EventCommand) => {
    const backup = new Map([...tables].map(([name, rows]) => [name,
      new Map([...rows].map(([id, row]) => [id, JSON.parse(JSON.stringify(row)) as TestRow])),
    ]));
    try { return await executeEventCommand(ctx, args); }
    catch (error) {
      tables.clear();
      for (const [name, rows] of backup) tables.set(name, rows);
      throw error;
    }
  };
  const state = async () => {
    const result = await readEventState(ctx, matchId);
    if (!result) throw new Error("Fixture unexpectedly inaccessible");
    return result;
  };
  const command = async (args: Omit<EventCommand, "matchId" | "revision">) => {
    const current = await state();
    return execute({ matchId, revision: current.revision, ...args });
  };
  return { ctx, patch, insert, remove, query, seed, find, execute, command, state,
    rows: (name: string) => [...table(name).values()],
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("TextEncoder", TextEncoder);
  vi.spyOn(Date, "now").mockReturnValue(now);
  vi.mocked(verifyClockPin).mockResolvedValue(true);
  vi.mocked(verifyCoachTeamMembership).mockResolvedValue({ _id: "coach" } as Doc<"coaches">);
});

describe("mobile event lifecycle", () => {
  it.each([true, false])("keeps score and assist statistics consistent through goal corrections (home=%s)", async (isHome) => {
    const h = fixture({ isHome });
    const expectedScore = isHome ? { homeScore: 1, awayScore: 0 } : { homeScore: 0, awayScore: 1 };
    await h.command({ correlationId: "goal", operation: "add", kind: "goal", side: "dia", playerId: scorerId, assistStatus: "unknown" });
    const goalId = h.rows("matchEvents").find(row => row.type === "goal")!._id as Id<"matchEvents">;
    const originalMinute = h.find(goalId)?.displayMinute;
    expect(h.find(matchId)).toMatchObject(expectedScore);
    await h.command({ correlationId: "assist", operation: "update", eventId: goalId, kind: "goal", side: "dia", playerId: scorerId,
      assistStatus: "player", assistPlayerId: assistantId, assistKind: "corner" });
    expect(h.find(matchId)).toMatchObject(expectedScore);
    expect(h.find(goalId)?.displayMinute).toBe(originalMinute);
    const projected = applyGoalEnrichments((await h.state()).events);
    expect(eventTotals(projected).dia).toMatchObject({ goals: 1, assists: 1, corners: 0, freeKicks: 0 });
    expect(projected.find(event => event._id === goalId)).toMatchObject({ playerId: scorerId, relatedPlayerId: assistantId, assistKind: "corner" });
    expect(h.rows("matchEvents").filter(row => row.type === "assist")).toHaveLength(1);
    await h.command({ correlationId: "remove-goal", operation: "remove", eventId: goalId });
    expect(h.find(matchId)).toMatchObject({ homeScore: 0, awayScore: 0 });
    expect(h.rows("matchEvents")).toHaveLength(0);
    expect(eventTotals(applyGoalEnrichments((await h.state()).events)).dia).toMatchObject({ goals: 0, assists: 0 });
  });
  it("clears an existing assist without an old enrichment restoring it", async () => {
    const h = fixture();
    await h.command({ correlationId: "goal-with-assist", operation: "add", kind: "goal", side: "dia", playerId: scorerId,
      assistStatus: "player", assistPlayerId: assistantId, assistKind: "free_kick" });
    const goalId = h.rows("matchEvents").find(row => row.type === "goal")!._id as Id<"matchEvents">;
    await h.command({ correlationId: "change-origin", operation: "update", eventId: goalId, kind: "goal", side: "dia", playerId: scorerId,
      assistStatus: "player", assistPlayerId: assistantId, assistKind: "pass" });
    await h.command({ correlationId: "clear-assist", operation: "update", eventId: goalId, kind: "goal", side: "dia", playerId: scorerId,
      assistStatus: "none" });
    const projected = applyGoalEnrichments((await h.state()).events);
    const goal = projected.find(event => event._id === goalId)!;
    expect(goal.relatedPlayerId).toBeUndefined();
    expect(goal.assistKind).toBeUndefined();
    expect(goal.assistStatus).toBe("none");
    expect(h.rows("matchEvents").filter(row => row.type === "assist")).toHaveLength(0);
    expect(h.rows("matchEvents").filter(row => row.type === "goal_enrichment")).toHaveLength(1);
    expect(eventTotals(projected).dia).toMatchObject({ goals: 1, assists: 0, corners: 0, freeKicks: 0 });
    expect(h.find(matchId)).toMatchObject({ homeScore: 1, awayScore: 0 });
  });
  it("corrects a set piece to the other team and removes it without affecting score", async () => {
    const h = fixture();
    await h.command({ correlationId: "dia-corner", operation: "add", kind: "corner", side: "dia", playerId: scorerId });
    const cornerId = h.rows("matchEvents")[0]._id as Id<"matchEvents">;
    await h.command({ correlationId: "opponent-free-kick", operation: "add", kind: "free_kick", side: "opponent", opponentNumber: 9 });
    let totals = eventTotals((await h.state()).events);
    expect(totals.dia).toMatchObject({ corners: 1, freeKicks: 0 });
    expect(totals.opponent).toMatchObject({ corners: 0, freeKicks: 1 });
    await h.command({ correlationId: "correct-team", operation: "update", eventId: cornerId, kind: "corner", side: "opponent", opponentNumber: 7 });
    expect(h.find(cornerId)?.playerId).toBeUndefined();
    totals = eventTotals((await h.state()).events);
    expect(totals.dia.corners).toBe(0);
    expect(totals.opponent.corners).toBe(1);
    await h.command({ correlationId: "delete-corner", operation: "remove", eventId: cornerId });
    totals = eventTotals((await h.state()).events);
    expect(totals.opponent).toMatchObject({ corners: 0, freeKicks: 1 });
    expect(h.find(matchId)).toMatchObject({ homeScore: 0, awayScore: 0 });
  });
  it("records an explicit second yellow as one further yellow plus red without changing the lineup", async () => {
    const h = fixture();
    const initialLineup = JSON.stringify(h.rows("matchPlayers"));
    await h.command({ correlationId: "yellow-one", operation: "add", kind: "yellow_card", side: "dia", playerId: scorerId });
    await h.command({ correlationId: "yellow-two", operation: "add", kind: "second_yellow", side: "dia", playerId: scorerId });
    const second = h.rows("matchEvents").find(row => row.cardReason === "second_yellow")!;
    expect(second.type).toBe("red_card");
    expect(eventTotals((await h.state()).events).dia).toMatchObject({ yellowCards: 2, redCards: 1 });
    expect(JSON.stringify(h.rows("matchPlayers"))).toBe(initialLineup);
    expect(h.patch).not.toHaveBeenCalled();
    await h.command({ correlationId: "remove-second", operation: "remove", eventId: second._id as Id<"matchEvents"> });
    expect(eventTotals((await h.state()).events).dia).toMatchObject({ yellowCards: 1, redCards: 0 });
    expect(JSON.stringify(h.rows("matchPlayers"))).toBe(initialLineup);
  });
  it("keeps ordinary yellow registration distinct from an explicitly reported second yellow", async () => {
    const h = fixture();
    for (const correlationId of ["first-yellow", "another-yellow"]) {
      await h.command({ correlationId, operation: "add", kind: "yellow_card", side: "opponent", opponentNumber: 10 });
    }
    expect(eventTotals((await h.state()).events).opponent).toMatchObject({ yellowCards: 2, redCards: 0 });
    expect(h.rows("matchEvents").every(row => row.type === "yellow_card")).toBe(true);
  });
});

describe("mobile event command boundary", () => {
  it("rejects an unlinked caller before consuming the command id", async () => {
    const h = fixture();
    vi.mocked(verifyClockPin).mockResolvedValue(false);
    await expect(h.execute({ matchId, correlationId: "unauthorized", revision: "stale", operation: "add", kind: "corner", side: "dia" })).rejects.toThrow();
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.patch).not.toHaveBeenCalled();
    expect(h.remove).not.toHaveBeenCalled();
  });
  it("rejects a stale snapshot without adding events or consuming its retry id", async () => {
    const h = fixture();
    const revision = (await h.state()).revision;
    await h.command({ correlationId: "first", operation: "add", kind: "corner", side: "dia" });
    await expect(h.execute({ matchId, correlationId: "stale", revision, operation: "add", kind: "free_kick", side: "opponent" })).rejects.toThrow();
    expect(h.rows("matchEvents")).toHaveLength(1);
    expect(h.rows("matchCommandDedupes")).toHaveLength(1);
    await expect(h.command({ correlationId: "stale", operation: "add", kind: "free_kick", side: "opponent" })).resolves.toBeDefined();
    expect(h.rows("matchEvents")).toHaveLength(2);
  });
  it("rejects new registrations in finished matches", async () => {
    const h = fixture({ status: "finished" });
    await expect(h.command({ correlationId: "finished", operation: "add", kind: "corner", side: "dia" })).rejects.toThrow();
    expect(h.rows("matchEvents")).toHaveLength(0);
    expect(h.rows("matchCommandDedupes")).toHaveLength(0);
  });
  it("deduplicates accepted add and remove commands even when their snapshot and target no longer exist", async () => {
    const h = fixture();
    const add: EventCommand = { matchId, revision: (await h.state()).revision,
      correlationId: "retry-add", operation: "add", kind: "corner", side: "dia" };
    await h.execute(add);
    await expect(h.execute(add)).resolves.toMatchObject({ deduped: true });
    expect(h.rows("matchEvents")).toHaveLength(1);
    const eventId = h.rows("matchEvents")[0]._id as Id<"matchEvents">;
    const remove: EventCommand = { matchId, revision: (await h.state()).revision,
      correlationId: "retry-remove", operation: "remove", eventId };
    await h.execute(remove);
    await expect(h.execute(remove)).resolves.toMatchObject({ deduped: true });
    expect(h.rows("matchEvents")).toHaveLength(0);
    expect(h.rows("matchCommandDedupes")).toHaveLength(2);
    vi.mocked(verifyClockPin).mockResolvedValue(false);
    await expect(h.execute(remove)).rejects.toThrow();
  });
  it.each([0, -1, 100, 1.5, Infinity, NaN])("rejects invalid opponent shirt number %s", async (opponentNumber) => {
    const h = fixture();
    await expect(h.command({ correlationId: "bad-number", operation: "add", kind: "yellow_card", side: "opponent", opponentNumber })).rejects.toThrow();
    expect(h.rows("matchEvents")).toHaveLength(0);
    expect(h.rows("matchCommandDedupes")).toHaveLength(0);
  });
  it("rejects a player who is not in this match", async () => {
    const h = fixture();
    const outsiderId = "outsider" as Id<"players">;
    h.seed("players", { _id: outsiderId, teamId, name: "Not selected", active: true });
    await expect(h.command({ correlationId: "outsider", operation: "add", kind: "goal", side: "dia", playerId: outsiderId })).rejects.toThrow();
    expect(h.rows("matchEvents")).toHaveLength(0);
    expect(h.find(matchId)).toMatchObject({ homeScore: 0, awayScore: 0 });
  });
  it("rejects scorer and assist giver being the same player", async () => {
    const h = fixture();
    await expect(h.command({ correlationId: "self-assist", operation: "add", kind: "goal", side: "dia", playerId: scorerId,
      assistStatus: "player", assistPlayerId: scorerId, assistKind: "pass" })).rejects.toThrow();
    expect(h.rows("matchEvents")).toHaveLength(0);
    expect(h.find(matchId)).toMatchObject({ homeScore: 0, awayScore: 0 });
  });
  it("rejects own player ids on an opponent event", async () => {
    const h = fixture();
    await expect(h.command({ correlationId: "mixed-side", operation: "add", kind: "yellow_card", side: "opponent", playerId: scorerId })).rejects.toThrow();
    expect(h.rows("matchEvents")).toHaveLength(0);
  });
  it("allows a card with unknown own player and later identifies them without adding a second card", async () => {
    const h = fixture();
    await h.command({ correlationId: "anonymous-card", operation: "add", kind: "yellow_card", side: "dia" });
    const eventId = h.rows("matchEvents")[0]._id as Id<"matchEvents">;
    await h.command({ correlationId: "identify-card", operation: "update", eventId, kind: "yellow_card", side: "dia", playerId: scorerId });
    expect(h.rows("matchEvents")).toHaveLength(1);
    expect(h.find(eventId)).toMatchObject({ playerId: scorerId });
    expect(eventTotals((await h.state()).events).dia.yellowCards).toBe(1);
  });
  it("does not expose match events to an unlinked reader", async () => {
    const h = fixture();
    vi.mocked(verifyClockPin).mockResolvedValue(false);
    vi.mocked(verifyCoachTeamMembership).mockResolvedValue(null);
    await expect(readEventState(h.ctx, matchId)).resolves.toBeNull();
    expect(h.query).not.toHaveBeenCalled();
  });
  it("lets a team coach read events without granting write access", async () => {
    const h = fixture();
    vi.mocked(verifyClockPin).mockResolvedValue(false);
    expect((await h.state()).canWrite).toBe(false);
    await expect(h.command({ correlationId: "read-only-coach", operation: "add", kind: "corner", side: "dia" })).rejects.toThrow();
    expect(h.rows("matchEvents")).toHaveLength(0);
  });
  it("rejects editing a partial history when the bounded event limit is exceeded", async () => {
    const h = fixture();
    for (let index = 0; index < 501; index++) {
      h.seed("matchEvents", { _id: `history-${index}`, matchId, type: "corner", side: "dia", quarter: 1, timestamp: now, createdAt: now });
    }
    await expect(h.state()).rejects.toThrow("te veel registraties");
    expect(h.insert).not.toHaveBeenCalled();
  });
});

describe("record-only card discipline", () => {
  it.each(["yellow_card", "red_card", "second_yellow"] as const)("records %s without removing players, changing their time or inferring a substitution", async (kind) => {
    const h = fixture();
    const lineupBefore = JSON.stringify(h.rows("matchPlayers"));
    await h.command({ correlationId: `record-${kind}`, operation: "add", kind, side: "dia", playerId: scorerId });
    expect(h.rows("matchEvents")).toHaveLength(1);
    expect(JSON.stringify(h.rows("matchPlayers"))).toBe(lineupBefore);
    expect(h.patch).not.toHaveBeenCalled();
    expect(h.find(matchId)).toMatchObject({ homeScore: 0, awayScore: 0 });
  });
});

describe("event limit and legacy goal compatibility", () => {
  it("rejects a goal with an assist at 499 events before score or event writes would exceed the readable limit", async () => {
    const h = fixture();
    for (let index = 0; index < 499; index++) {
      h.seed("matchEvents", { _id: `history-${index}`, matchId, type: "corner", side: "dia", quarter: 1, timestamp: now, createdAt: now });
    }
    const revision = (await h.state()).revision;
    await expect(h.command({ correlationId: "over-capacity-goal", operation: "add", kind: "goal", side: "dia", playerId: scorerId,
      assistPlayerId: assistantId, assistStatus: "player", assistKind: "pass" })).rejects.toThrow("limiet");
    expect(h.rows("matchEvents")).toHaveLength(499);
    expect(h.find(matchId)).toMatchObject({ homeScore: 0, awayScore: 0 });
    expect((await h.state()).revision).toBe(revision);
    expect(h.rows("matchCommandDedupes")).toHaveLength(0);
    expect(h.patch).not.toHaveBeenCalled();
    expect(h.insert.mock.calls.every(([tableName]) => tableName !== "matchEvents")).toBe(true);
  });
  it("allows clearing linked goal details at 500 events because the replacement history fits", async () => {
    const h = fixture();
    await h.command({ correlationId: "capacity-goal", operation: "add", kind: "goal", side: "dia", playerId: scorerId,
      assistPlayerId: assistantId, assistStatus: "player", assistKind: "pass" });
    const goalId = h.rows("matchEvents").find(row => row.type === "goal")!._id as Id<"matchEvents">;
    await h.command({ correlationId: "capacity-enrichment", operation: "update", eventId: goalId, kind: "goal", side: "dia", playerId: scorerId,
      assistPlayerId: assistantId, assistStatus: "player", assistKind: "corner" });
    for (let index = h.rows("matchEvents").length; index < 500; index++) {
      h.seed("matchEvents", { _id: `history-${index}`, matchId, type: "corner", side: "dia", quarter: 1, timestamp: now, createdAt: now });
    }
    expect((await h.state()).events).toHaveLength(500);
    await h.command({ correlationId: "capacity-clear", operation: "update", eventId: goalId, kind: "goal", side: "dia", playerId: scorerId, assistStatus: "none" });
    const state = await h.state();
    expect(state.events).toHaveLength(499);
    expect(state.events.filter(event => event.type === "assist")).toHaveLength(0);
    expect(state.events.filter(event => event.type === "goal_enrichment")).toHaveLength(1);
    expect(eventTotals(applyGoalEnrichments(state.events)).dia).toMatchObject({ goals: 1, assists: 0 });
    expect(h.find(matchId)).toMatchObject({ homeScore: 1, awayScore: 0 });
  });
  it("recognizes an assist supplied by a legacy enrichment even when the original goal said no assist", async () => {
    const h = fixture();
    await h.command({ correlationId: "no-assist-goal", operation: "add", kind: "goal", side: "dia", playerId: scorerId, assistStatus: "none" });
    const goalId = h.rows("matchEvents").find(row => row.type === "goal")!._id as Id<"matchEvents">;
    h.seed("matchEvents", {
      _id: "legacy-enrichment", matchId, type: "goal_enrichment", targetEventId: goalId,
      relatedPlayerId: assistantId, assistKind: "pass", quarter: 1, timestamp: now, createdAt: now + 1,
    });
    const projected = applyGoalEnrichments((await h.state()).events);
    expect(projected.find(event => event._id === goalId)).toMatchObject({ relatedPlayerId: assistantId, assistStatus: "player" });
    expect(eventTotals(projected).dia.assists).toBe(1);
  });
  it.each(["ADJUST_SCORE", "MOBILE_EVENT"])("undo_goal removes %s goal relations, preserves older goals and dedupes retry", async (commandType) => {
    const h = fixture();
    await h.command({ correlationId: "earlier-goal", operation: "add", kind: "goal", side: "dia", playerId: assistantId,
      assistPlayerId: scorerId, assistStatus: "player", assistKind: "pass" });
    const earlierGoalId = h.rows("matchEvents").find(row => row.type === "goal")!._id;
    await h.command({ correlationId: "latest-goal", operation: "add", kind: "goal", side: "opponent" });
    const goalId = h.rows("matchEvents").find(row => row.type === "goal" && row._id !== earlierGoalId)!._id as Id<"matchEvents">;
    await h.command({ correlationId: "latest-enrichment", operation: "update", eventId: goalId, kind: "goal", side: "opponent", opponentNumber: 9 });
    await h.ctx.db.patch(goalId, { commandType });
    // Older clients linked assist rows only by the original command identifier.
    h.seed("matchEvents", { _id: "legacy-linked-assist", matchId, type: "assist", correlationId: "latest-goal",
      playerId: assistantId, quarter: 1, timestamp: now, createdAt: now });
    const args = { matchId, correlationId: `undo-${commandType}`, command: "undo_goal" as const,
      expectedStatus: "live" as const, expectedQuarter: 1, goalId };
    await expect(executeCommand(h.ctx, args)).resolves.toEqual({ deduped: false });
    await expect(executeCommand(h.ctx, args)).resolves.toEqual({ deduped: true });
    expect(h.find(matchId)).toMatchObject({ homeScore: 1, awayScore: 0 });
    expect(h.rows("matchEvents")).toHaveLength(2);
    expect(h.find(goalId)).toBeNull();
    expect(h.find("legacy-linked-assist")).toBeNull();
    expect(eventTotals(applyGoalEnrichments((await h.state()).events)).dia).toMatchObject({ goals: 1, assists: 1 });
  });
});
