import { beforeEach, describe, expect, it, vi } from "vitest";
import { save, workspace, previewRemaining, saveRemaining } from "./coachAssistant";
import type { Doc } from "./_generated/dataModel";
import type { AccessRole, RuntimeUserAccess } from "./lib/userAccess";
import { assistantSourceFixture, reviewedFixturePlan } from "../src/test/fixtures/coachAssistant";
import { workspaceRevision } from "./lib/coachAssistantWorkspace";

type Row = Record<string, unknown>;
function context(missingMatch = false, roles: AccessRole[] = ["coach"]) {
  const source = assistantSourceFixture();
  const coach = { _id: "test-coach", teamIds: [source.match.teamId], email: "coach@example.invalid", name: "Coach" };
  const access: RuntimeUserAccess = { email: coach.email, roles, active: true,
    coachId: roles.includes("coach") ? coach._id as Doc<"coaches">["_id"] : undefined };
  const rows: Row[] = [];
  const dedupes: Row[] = [];
  const documents: Row[] = [coach, source.match, ...source.players.flatMap(({ entry, player }) => [entry, player])];
  const db = {
    get: vi.fn(async (id: string) => documents.find((doc) => doc._id === id) ?? null),
    query: vi.fn((table: string) => ({ withIndex: vi.fn(() => ({
      first: vi.fn(async () => table === "userAccess" ? access : table === "coaches" && roles.includes("coach") ? coach : null),
      take: vi.fn(async () => table === "matchPlayers" ? source.players.map(({ entry }) => entry) : rows),
      unique: vi.fn(async () => table === "matches" ? missingMatch ? null : source.match : dedupes[0] ?? null),
    })) })),
    patch: vi.fn(async (id: string, patch: Row) => Object.assign(documents.find((doc) => doc._id === id)!, patch)),
    delete: vi.fn(async (id: string) => { const index = rows.findIndex((row) => row._id === id); if (index >= 0) rows.splice(index, 1); }),
    insert: vi.fn(async (table: string, row: Row) => { const id = `${table}-${rows.length + dedupes.length}`; (table === "substitutionPlans" ? rows : dedupes).push({ ...row, _id: id }); return id; }),
  };
  return { source, rows, dedupes, coach, access, ctx: { db, auth: { getUserIdentity: vi.fn(async (): Promise<{ email: string } | null> => ({ email: coach.email })) } } };
}
const invoke = (fn: unknown, ctx: unknown, args: unknown): Promise<unknown> =>
  (fn as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> })._handler(ctx, args);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authenticated match bridge", () => {
  it("rejects anonymous and other-team requests before writing anything", async () => {
    const { source, ctx, coach } = context();
    const args = { matchId: source.match._id, expectedRevision: workspaceRevision(source), reviewed: true, requestId: "request-unique-1234", plan: reviewedFixturePlan(source) };
    ctx.auth.getUserIdentity.mockResolvedValue(null);
    await expect(invoke(save, ctx, args)).rejects.toThrow("Niet ingelogd");
    ctx.auth.getUserIdentity.mockResolvedValue({ email: coach.email });
    coach.teamIds = [];
    await expect(invoke(save, ctx, args)).rejects.toThrow("Geen coachtoegang");
    expect(ctx.db.patch).not.toHaveBeenCalled(); expect(ctx.db.insert).not.toHaveBeenCalled();
  });
  it("keeps an admin who is also a coach within their own teams for code loading and saving", async () => {
    const { source, ctx, coach } = context(false, ["admin", "coach"]);
    const args = { matchId: source.match._id, expectedRevision: workspaceRevision(source), reviewed: true, requestId: "request-unique-1234", plan: reviewedFixturePlan(source) };
    await expect(invoke(workspace, ctx, { code: "UYXS3M" })).resolves.toMatchObject({ matchId: source.match._id });
    coach.teamIds = [];
    ctx.db.query.mockClear();
    await expect(invoke(workspace, ctx, { code: "UYXS3M" })).rejects.toThrow("Geen coachtoegang");
    await expect(invoke(save, ctx, args)).rejects.toThrow("Geen coachtoegang");
    expect(ctx.db.query).not.toHaveBeenCalledWith("matchPlayers");
    expect(ctx.db.query).not.toHaveBeenCalledWith("substitutionPlans");
    expect(ctx.db.patch).not.toHaveBeenCalled(); expect(ctx.db.insert).not.toHaveBeenCalled(); expect(ctx.db.delete).not.toHaveBeenCalled();
  });
  it("does not give an admin without coach access a coach workspace", async () => {
    const { ctx } = context(false, ["admin"]);
    await expect(invoke(workspace, ctx, { code: "UYXS3M" })).rejects.toThrow("Geen coach-toegang");
    expect(ctx.db.query).not.toHaveBeenCalledWith("matchPlayers");
  });
  it("blocks disabled accounts even when they still have a linked coach record", async () => {
    const { ctx, access } = context(); access.active = false;
    await expect(invoke(workspace, ctx, { code: "UYXS3M" })).rejects.toThrow("Geen toegang");
    expect(ctx.db.query).not.toHaveBeenCalledWith("matchPlayers");
  });
  it("loads a real source and never returns the demo roster as a fallback", async () => {
    const { source, ctx } = context();
    await expect(invoke(workspace, ctx, { code: "uyxs3m" })).resolves.toMatchObject({ code: "UYXS3M", matchId: source.match._id, canSave: true });
    await expect(invoke(workspace, context(true).ctx, { code: "ABCDEF" })).resolves.toBeNull();
  });
  it("writes one complete reviewed lineup and preserves absolute match minutes at quarter boundaries", async () => {
    const { source, ctx, rows } = context();
    const plan = reviewedFixturePlan(source);
    const result = await invoke(save, ctx, { matchId: source.match._id, expectedRevision: workspaceRevision(source), reviewed: true, requestId: "request-unique-1234", plan });
    expect(result).toMatchObject({ savedItems: plan.steps.reduce((sum, step) => sum + step.actions.length, 0), alreadySaved: false });
    const latest = await invoke(workspace, ctx, { code: "UYXS3M" }) as { revision: string };
    expect(result).toMatchObject({ revision: latest.revision });
    expect(ctx.db.patch).toHaveBeenCalledTimes(source.players.length + 1);
    expect(rows.every((row) => row.matchId === source.match._id && row.status === "pending")).toBe(true);
    expect(rows.filter((row) => row.targetMinute === 30).every((row) => row.targetQuarter === 2)).toBe(true);
    const keeper = source.players.find(({ entry }) => entry.isKeeper)!;
    expect(keeper.entry.onField).toBe(true); expect(keeper.entry.fieldSlotIndex).toBe(0);
    expect(source.players.filter(({ entry }) => entry.isKeeper)).toHaveLength(1);
  });
  it("leaves all rows untouched on stale saves and prevents duplicate rows on retry", async () => {
    const { source, ctx, rows } = context();
    const args = { matchId: source.match._id, expectedRevision: workspaceRevision(source), reviewed: true, requestId: "request-unique-1234", plan: reviewedFixturePlan(source) };
    await expect(invoke(save, ctx, { ...args, expectedRevision: "stale" })).rejects.toThrow("intussen gewijzigd");
    expect(ctx.db.patch).not.toHaveBeenCalled(); expect(ctx.db.delete).not.toHaveBeenCalled();
    await invoke(save, ctx, args); const count = rows.length; ctx.db.patch.mockClear(); ctx.db.insert.mockClear();
    const retry = await invoke(save, ctx, args);
    expect(retry).toMatchObject({ alreadySaved: true });
    expect(retry).not.toHaveProperty("revision");
    expect(rows).toHaveLength(count); expect(ctx.db.patch).not.toHaveBeenCalled(); expect(ctx.db.insert).not.toHaveBeenCalled();
  });
});


describe("live remaining plan bridge", () => {
  function liveContext() {
    const data = context();
    data.source.rows = data.rows as unknown as Doc<"substitutionPlans">[];
    Object.assign(data.source.match, { status: "live", leadCoachId: data.coach._id,
      startedAt: Date.now() - 20 * 60_000, quarterStartedAt: Date.now() - 20 * 60_000 });
    for (const { entry } of data.source.players) if (entry.onField) entry.lastSubbedInAt = data.source.match.startedAt;
    return data;
  }
  async function preview(data: ReturnType<typeof liveContext>) {
    return await invoke(previewRemaining, data.ctx, { matchId: data.source.match._id, intervalMinutes: 10 }) as {
      revision: string; calculatedAt: number; fromSecond: number;
    };
  }
  it("previews without writes and replaces only pending rows, preserving clock, lineup, minutes and executed rows", async () => {
    const data = liveContext();
    const { source, rows, ctx } = data;
    const ids = source.players.map(({ entry }) => entry.playerId);
    rows.push({ _id: "executed", matchId: source.match._id, sequence: 0, status: "executed", playerOutId: ids[0], playerInId: ids[1] },
      { _id: "pending", matchId: source.match._id, sequence: 1, status: "pending", playerOutId: ids[0], playerInId: ids[1], targetMinute: 25 });
    const result = await preview(data);
    expect(result.fromSecond).toBe(1200);
    expect(ctx.db.insert).not.toHaveBeenCalled();
    const before = structuredClone({ match: source.match, players: source.players });
    const args = { matchId: source.match._id, expectedRevision: result.revision, calculatedAt: result.calculatedAt, intervalMinutes: 10, reviewed: true, requestId: "live-request-unique-1234" };
    await invoke(saveRemaining, ctx, args);
    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect({ match: source.match, players: source.players }).toEqual(before);
    expect(rows.find((r) => r._id === "executed")).toBeDefined();
    expect(rows.find((r) => r._id === "pending")).toBeUndefined();
    expect(rows.filter((r) => r.status === "pending").length).toBeGreaterThan(0);
    expect(rows.filter((r) => r.status === "pending").every((r) => Number(r.targetMinute) >= 30)).toBe(true);
    const count = rows.length;
    await expect(invoke(saveRemaining, ctx, args)).resolves.toMatchObject({ alreadySaved: true });
    expect(rows).toHaveLength(count);
  });
  it("rejects changed field, elapsed previews and non-lead coaches without writes", async () => {
    const data = liveContext();
    const result = await preview(data);
    const args = { matchId: data.source.match._id, expectedRevision: result.revision, calculatedAt: result.calculatedAt, intervalMinutes: 10, reviewed: true, requestId: "live-request-unique-1234" };
    await expect(invoke(saveRemaining, data.ctx, { ...args, calculatedAt: Date.now() - 130_000 })).rejects.toThrow("ouder dan twee minuten");
    data.source.players[0].entry.minutesPlayed = 15;
    await expect(invoke(saveRemaining, data.ctx, args)).rejects.toThrow("gewijzigd");
    data.source.match.leadCoachId = "other-coach" as Doc<"coaches">["_id"];
    await expect(invoke(saveRemaining, data.ctx, args)).rejects.toThrow("wedstrijdleider");
    expect(data.ctx.db.delete).not.toHaveBeenCalled();
    expect(data.ctx.db.insert).not.toHaveBeenCalled();
  });
  it("rejects unavailable field players and does not add break time to minutes", async () => {
    const data = liveContext();
    data.source.match.status = "halftime";
    data.source.match.currentQuarter = 2;
    for (const { entry } of data.source.players) if (entry.onField) entry.minutesPlayed = 30;
    const result = await invoke(previewRemaining, data.ctx, { matchId: data.source.match._id, intervalMinutes: 10 }) as { fromSecond: number; totals: { played: number }[] };
    expect(result.fromSecond).toBe(1800);
    expect(Math.max(...result.totals.map((r) => r.played))).toBe(30);
    data.source.players.find(({ entry }) => entry.onField)!.entry.injured = true;
    await expect(preview(data)).rejects.toThrow("veldopstelling");
  });
  it("rejects anonymous, other-team and finished match previews", async () => {
    const data = liveContext();
    data.source.match.status = "finished";
    await expect(preview(data)).rejects.toThrow("tijdens de wedstrijd");
    data.ctx.auth.getUserIdentity.mockResolvedValue(null);
    await expect(preview(data)).rejects.toThrow("Niet ingelogd");
    data.ctx.auth.getUserIdentity.mockResolvedValue({ email: data.coach.email });
    data.coach.teamIds = [];
    await expect(preview(data)).rejects.toThrow("Geen coachtoegang");
  });
});

it("does not reintroduce a dismissed player or bypass an independently protected referee clock", async () => {
  const { source, ctx } = context();
  Object.assign(source.match, { status: "live", startedAt: Date.now() - 600000, quarterStartedAt: Date.now() - 600000 });
  const bench = source.players.find(({ entry }) => !entry.onField && !entry.absent && !entry.injured)!;
  Object.assign(bench.entry, { dismissed: true });
  const result = await invoke(previewRemaining, ctx, { matchId: source.match._id, intervalMinutes: 10, requestId: "fresh" }) as { totals: { key: string }[] };
  expect(result.totals.some(row => row.key === String(bench.entry.playerId))).toBe(false);
  Object.assign(source.match, { refereePolicy: { version: 1 } });
  await expect(invoke(previewRemaining, ctx, { matchId: source.match._id, intervalMinutes: 10, requestId: "fresh" })).rejects.toThrow("afzonderlijke scheidsrechterklok");
});
