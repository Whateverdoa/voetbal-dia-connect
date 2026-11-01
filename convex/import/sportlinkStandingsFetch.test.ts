// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
import type { RawPoulestandRow, RawSportlinkTeam } from "./sportlinkStandingsMapper";

const modules = {
  "../_generated/server.ts": () => import("../_generated/server"),
  "../import/standingsWrite.ts": () => import("./standingsWrite"),
  "../import/sportlinkStandingsFetch.ts": () => import("./sportlinkStandingsFetch"),
};

const sunday = new Date("2026-11-01T10:00:00Z");
const fetchMock = vi.fn<typeof fetch>();
type TestContext = ReturnType<typeof convexTest<typeof schema.tables>>;

function team(slug: string, poulecode: string): RawSportlinkTeam {
  return {
    teamnaam: `DIA ${slug.toUpperCase()}`,
    poulecode,
    competitiesoort: "regulier",
    competitienaam: "Jeugd competitie",
    klassepoule: "2e klasse 01",
  };
}

function row(teamName: string, played = 1): RawPoulestandRow {
  return {
    teamnaam: teamName,
    positie: 1,
    gespeeldewedstrijden: played,
    gewonnen: played,
    gelijk: 0,
    verloren: 0,
    doelpuntenvoor: 2 * played,
    doelpuntentegen: 0,
    doelsaldo: 2 * played,
    punten: 3 * played,
    eigenteam: true,
    clublogo: "https://example.test/logo?expires=1&sig=a",
  };
}

async function seed(t: TestContext, teams: Array<{ slug: string; poulecode: string }>) {
  await t.run(async (ctx) => {
    const clubId = await ctx.db.insert("clubs", { name: "DIA", slug: "dia", createdAt: 1 });
    for (const { slug, poulecode } of teams) {
      await ctx.db.insert("teams", { clubId, slug, name: slug.toUpperCase(), createdAt: 1 });
      await ctx.db.insert("standings", {
        teamSlug: slug,
        poulecode,
        competitionName: "Jeugd competitie",
        klassepoule: "2e klasse 01",
        sportlinkTeamName: `DIA ${slug.toUpperCase()}`,
        rows: [{
          teamName: `DIA ${slug.toUpperCase()}`, position: 1, played: 1,
          won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0,
          goalDifference: 2, points: 3, isOwnClub: true,
        }],
        fetchedAt: 1,
      });
    }
  });
}

function mockArticles(teams: RawSportlinkTeam[], poules: Record<string, unknown>) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input));
    if (url.pathname === "/teams") return Response.json(teams);
    const payload = poules[url.searchParams.get("poulecode") ?? ""];
    if (payload instanceof Response) return payload;
    if (payload === undefined) throw new Error("Unexpected request");
    return Response.json(payload);
  });
}

async function storedStanding(t: TestContext, slug = "jo13-2") {
  return t.run((ctx) => ctx.db.query("standings")
    .withIndex("by_team_slug", (q) => q.eq("teamSlug", slug)).unique());
}

async function storedPoll(t: TestContext) {
  return t.run((ctx) => ctx.db.query("standingsPollState")
    .withIndex("by_key", (q) => q.eq("key", "weekend")).unique());
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(sunday);
  vi.stubEnv("SPORTLINK_CLIENT_ID", "test-client-id");
  vi.stubEnv("SPORTLINK_BASE_URL", "https://sportlink.test");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("scheduled Sportlink standings refresh", () => {
  it("keeps polling after an earlier update without requiring any DIA matches", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [{ slug: "jo13-2", poulecode: "100" }]);
    await t.run((ctx) => ctx.db.insert("standingsPollState", {
      key: "weekend", amsterdamDate: "2026-11-01", baselineFingerprint: "[]",
      sawUpdate: true, updatedAt: sunday.getTime() - 1,
    }));
    const poules = { "100": [row("DIA JO13-2", 2)] };
    mockArticles([team("jo13-2", "100")], poules);

    const first = await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {});
    expect(first).toMatchObject({ skipped: null, outcome: "changed", attempt: 1 });
    expect((await storedStanding(t))?.rows[0]?.played).toBe(2);
    expect(await t.run((ctx) => ctx.db.query("matches").take(1))).toEqual([]);

    vi.setSystemTime(new Date("2026-11-01T10:15:00Z"));
    poules["100"] = [row("DIA JO13-2", 3)];
    const second = await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {});
    expect(second).toMatchObject({ skipped: null, outcome: "changed", attempt: 2 });
    expect((await storedStanding(t))?.rows[0]?.played).toBe(3);
  });

  it("fetches a shared poule once and writes its table for both teams", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [{ slug: "jo13-2", poulecode: "100" }, { slug: "jo13-3", poulecode: "100" }]);
    mockArticles([team("jo13-2", "100"), team("jo13-3", "100")], {
      "100": [row("DIA JO13-2", 2), { ...row("DIA JO13-3", 2), positie: 2 }],
    });
    const result = await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {});
    expect(result).toMatchObject({ sync: { teamsWritten: 2, poulesFetched: 1, failedPoules: [], prunedTeams: 0 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await storedStanding(t, "jo13-3"))?.rows).toHaveLength(2);
  });

  it.each(["http", "empty", "malformed"] as const)("retains the previous table for a %s poule while updating another", async (failure) => {
    const t = convexTest(schema, modules);
    await seed(t, [{ slug: "jo13-2", poulecode: "100" }, { slug: "jo15-1", poulecode: "200" }]);
    const before = await storedStanding(t);
    const failedPayload = failure === "http" ? new Response(null, { status: 503 })
      : failure === "empty" ? [] : [{ teamnaam: "DIA JO13-2", punten: "broken" }];
    mockArticles([team("jo13-2", "100"), team("jo15-1", "200")], {
      "100": failedPayload,
      "200": [row("DIA JO15-1", 2)],
    });
    const result = await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {});
    expect(result).toMatchObject({ outcome: "partial", sync: { teamsWritten: 1, failedPoules: ["100"], prunedTeams: 0 } });
    expect(await storedStanding(t)).toEqual(before);
    expect((await storedStanding(t, "jo15-1"))?.rows[0]?.played).toBe(2);
    expect(await storedPoll(t)).toMatchObject({ lastOutcome: "partial", failedPouleCount: 1 });
  });

  it.each([{ error: "upstream" }, [], [null]])("counts invalid teams responses as failed attempts without changing cached standings", async (payload) => {
    const t = convexTest(schema, modules);
    await seed(t, [{ slug: "jo13-2", poulecode: "100" }]);
    const before = await storedStanding(t);
    fetchMock.mockResolvedValue(Response.json(payload));
    await expect(t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {}))
      .rejects.toThrow("bestaande standen blijven bewaard");
    expect(await storedStanding(t)).toEqual(before);
    expect(await storedPoll(t)).toMatchObject({ lastOutcome: "error", attempts: 1 });
    const retry = await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {});
    expect(retry).toMatchObject({ skipped: "already_attempted" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not prune a cached team missing from the latest team list", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [{ slug: "jo13-2", poulecode: "100" }, { slug: "jo15-1", poulecode: "200" }]);
    const before = await storedStanding(t, "jo15-1");
    mockArticles([team("jo13-2", "100")], { "100": [row("DIA JO13-2", 2)] });
    await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {});
    expect(await storedStanding(t, "jo15-1")).toEqual(before);
  });

  it("suppresses a repeated slot and stops after 44 daily attempts", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [{ slug: "jo13-2", poulecode: "100" }]);
    mockArticles([team("jo13-2", "100")], { "100": [row("DIA JO13-2")] });
    await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {});
    const repeated = await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {});
    expect(repeated).toMatchObject({ skipped: "already_attempted" });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await t.run(async (ctx) => {
      const poll = await ctx.db.query("standingsPollState").withIndex("by_key", (q) => q.eq("key", "weekend")).unique();
      if (!poll) throw new Error("Missing poll");
      await ctx.db.patch(poll._id, { attempts: 44 });
    });
    vi.setSystemTime(new Date("2026-11-01T10:15:00Z"));
    expect(await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {}))
      .toMatchObject({ skipped: "daily_limit" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("runs the Monday catch-up once and rejects times outside the automatic windows", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [{ slug: "jo13-2", poulecode: "100" }]);
    mockArticles([team("jo13-2", "100")], { "100": [row("DIA JO13-2", 2)] });
    vi.setSystemTime(new Date("2026-11-02T10:00:00Z"));
    expect(await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {}))
      .toMatchObject({ skipped: null, attempt: 1 });
    vi.setSystemTime(new Date("2026-11-02T10:15:00Z"));
    expect(await t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {}))
      .toMatchObject({ skipped: "outside_window" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the manual operator action available outside the scheduled windows", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [{ slug: "jo13-2", poulecode: "100" }]);
    mockArticles([team("jo13-2", "100")], { "100": [row("DIA JO13-2", 2)] });
    vi.setSystemTime(new Date("2026-11-03T15:00:00Z"));
    expect(await t.action(internal.import.sportlinkStandingsFetch.syncStandings, {}))
      .toMatchObject({ teamsWritten: 1, contentChanged: true });
    expect(await storedPoll(t)).toBeNull();
  });

  it("aborts a hanging source request and charges one failed attempt", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [{ slug: "jo13-2", poulecode: "100" }]);
    const before = await storedStanding(t);
    fetchMock.mockImplementation((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("secret source URL")), { once: true });
    }));
    const action = t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {});
    const rejected = expect(action).rejects.toThrow("bestaande standen blijven bewaard");
    await vi.advanceTimersByTimeAsync(8_001);
    await rejected;
    expect(await storedStanding(t)).toEqual(before);
    expect(await storedPoll(t)).toMatchObject({ attempts: 1, lastOutcome: "error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not report successful completion after the reservation expires", async () => {
    const t = convexTest(schema, modules);
    await seed(t, [{ slug: "jo13-2", poulecode: "100" }]);
    const before = await storedStanding(t);
    fetchMock.mockImplementation(async () => {
      vi.setSystemTime(sunday.getTime() + 11 * 60_000);
      return Response.json([team("jo13-2", "100")]);
    });
    await expect(t.action(internal.import.sportlinkStandingsFetch.syncStandingsWeekendPoll, {}))
      .rejects.toThrow("reservering verlopen");
    expect(await storedStanding(t)).toEqual(before);
    expect(await storedPoll(t)).toMatchObject({ attempts: 1, lastOutcome: "running" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
