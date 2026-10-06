import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { finalize, listForMatch, saveDraft } from "./playerMatchReviews";
import { emptyPlayerReview, type PlayerReview } from "../src/lib/team-portal/playerReview";

type Row = Record<string, unknown> & { _id: string };
type Identity = { tokenIdentifier: string; subject: string; issuer: string; email: string };
type ReviewDto = {
  _id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  draft: PlayerReview;
  finalized: PlayerReview | null;
  finalizedAt: number | null;
  updatedAt: number;
  revision: number;
};

// Exercise registered handlers and their real authorization helpers against a local DB boundary.
function invoke<T = unknown>(fn: unknown, ctx: unknown, args: Record<string, unknown>): Promise<T> {
  return (fn as { _handler: (context: unknown, args: Record<string, unknown>) => Promise<T> })._handler(ctx, args);
}

const now = Date.parse("2026-09-26T14:00:00Z");
const identity = (suffix = "1"): Identity => ({
  tokenIdentifier: `https://test.clerk.example|user-${suffix}`,
  subject: `user-${suffix}`,
  issuer: "https://test.clerk.example",
  email: `coach${suffix}@example.test`,
});

function readyAnswers(): PlayerReview {
  return {
    ...emptyPlayerReview(),
    positiveMoment: { text: "Je vond de vrije speler met een rustige pass.", notObserved: false },
    teamwork: { text: "Je gaf aan waar de ruimte lag.", notObserved: false },
    nextStep: { text: "Kijk voor je aanname over je schouder.", notObserved: false },
  };
}

function setup() {
  const authState: { identity: Identity | null } = { identity: identity() };
  const tables: Record<string, Row[]> = {
    matches: [{ _id: "match1", teamId: "team1", status: "finished", opponent: "Voorbeeldclub", homeScore: 2, awayScore: 1 }],
    players: [{ _id: "player1", teamId: "team1", name: "Speler Een", active: true }],
    matchPlayers: [{ _id: "match-player1", matchId: "match1", playerId: "player1", absent: false, injured: false, minutesPlayed: 35 }],
    coaches: [{ _id: "coach1", email: identity().email, teamIds: ["team1"], name: "Coach" }],
    userAccess: [{ _id: "access1", email: identity().email, roles: ["coach"], coachId: "coach1", active: true }],
    referees: [],
    playerMatchReviews: [],
  };
  const indexes: { table: string; name: string; terms: [string, unknown][] }[] = [];
  function getRow(id: string) {
    return Object.values(tables).flat().find((row) => row._id === id) ?? null;
  }
  const db = {
    get: vi.fn(async (id: string) => structuredClone(getRow(id))),
    query: vi.fn((table: string) => ({
      withIndex: vi.fn((name: string, constrain?: (builder: { eq: (field: string, value: unknown) => unknown }) => unknown) => {
        const terms: [string, unknown][] = [];
        const builder = { eq: (field: string, value: unknown) => { terms.push([field, value]); return builder; } };
        constrain?.(builder);
        indexes.push({ table, name, terms });
        const selected = () => structuredClone((tables[table] ?? []).filter((row) => terms.every(([field, value]) => row[field] === value)));
        return {
          first: async () => selected()[0] ?? null,
          unique: async () => {
            const rows = selected();
            if (rows.length > 1) throw new Error("Duplicate unique result");
            return rows[0] ?? null;
          },
          take: async (limit: number) => selected().slice(0, limit),
        };
      }),
    })),
    insert: vi.fn(async (table: string, value: Record<string, unknown>) => {
      const rows = tables[table] ?? (tables[table] = []);
      const id = `${table}-${rows.length + 1}`;
      rows.push({ ...structuredClone(value), _id: id, _creationTime: now });
      return id;
    }),
    patch: vi.fn(async (id: string, changes: Record<string, unknown>) => {
      const row = getRow(id);
      if (!row) throw new Error("Missing row");
      Object.assign(row, structuredClone(changes));
    }),
  };
  const ctx = { db, auth: { getUserIdentity: vi.fn(async () => structuredClone(authState.identity)) } };
  return { ctx, tables, authState, indexes };
}

type Setup = ReturnType<typeof setup>;
const draftArgs = (answers = readyAnswers(), expectedRevision: number | null = null) => ({ matchId: "match1", playerId: "player1", answers, expectedRevision });
const writeDraft = (test: Setup, answers = readyAnswers(), expectedRevision: number | null = null) => invoke<ReviewDto>(saveDraft, test.ctx, draftArgs(answers, expectedRevision));
const finalizeDraft = (test: Setup, revision = 1) => invoke<ReviewDto>(finalize, test.ctx, { matchId: "match1", playerId: "player1", expectedRevision: revision });
const list = (test: Setup) => invoke<ReviewDto[]>(listForMatch, test.ctx, { matchId: "match1" });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("CLERK_BOOTSTRAP_ADMIN_EMAILS", "");
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("real player review authorization", () => {
  it.each(["anonymous", "parent", "referee", "inactive", "other-team"] as const)("denies %s access before any review writes", async (role) => {
    const test = setup();
    if (role === "anonymous") test.authState.identity = null;
    if (role === "parent" || role === "referee") {
      test.tables.coaches = [];
      test.tables.userAccess[0].roles = role === "referee" ? ["referee"] : [];
      delete test.tables.userAccess[0].coachId;
    }
    if (role === "inactive") test.tables.userAccess[0].active = false;
    if (role === "other-team") test.tables.coaches[0].teamIds = ["team2"];
    await expect(list(test)).rejects.toThrow();
    await expect(writeDraft(test)).rejects.toThrow();
    await expect(finalizeDraft(test)).rejects.toThrow();
    expect(test.ctx.db.insert).not.toHaveBeenCalled();
    expect(test.ctx.db.patch).not.toHaveBeenCalled();
  });

  it("allows an admin without a coach record while binding records to the admin identity", async () => {
    const test = setup();
    test.tables.coaches = [];
    test.tables.userAccess[0].roles = ["admin"];
    delete test.tables.userAccess[0].coachId;
    await writeDraft(test);
    expect(test.tables.playerMatchReviews[0].authorTokenIdentifier).toBe(identity().tokenIdentifier);
    expect(await list(test)).toHaveLength(1);
  });

  it.each(["scheduled", "lineup", "live", "halftime"])("denies reviews for a %s match", async (status) => {
    const test = setup();
    test.tables.matches[0].status = status;
    await expect(list(test)).rejects.toThrow();
    await expect(writeDraft(test)).rejects.toThrow();
    await expect(finalizeDraft(test)).rejects.toThrow();
    expect(test.ctx.db.insert).not.toHaveBeenCalled();
  });

  it.each([0, now])("denies cancelled matches even with a finished status (cancelledAt %s)", async (cancelledAt) => {
    const test = setup();
    test.tables.matches[0].cancelledAt = cancelledAt;
    await expect(list(test)).rejects.toThrow();
    await expect(writeDraft(test)).rejects.toThrow();
    await expect(finalizeDraft(test)).rejects.toThrow();
  });

  it.each(["absent", "not-in-match", "missing-player", "other-team-player"] as const)("denies writing for %s", async (scenario) => {
    const test = setup();
    await writeDraft(test);
    if (scenario === "absent") test.tables.matchPlayers[0].absent = true;
    if (scenario === "not-in-match") test.tables.matchPlayers = [];
    if (scenario === "missing-player") test.tables.players = [];
    if (scenario === "other-team-player") test.tables.players[0].teamId = "team2";
    test.ctx.db.insert.mockClear();
    test.ctx.db.patch.mockClear();
    await expect(writeDraft(test, readyAnswers(), 1)).rejects.toThrow();
    await expect(finalizeDraft(test)).rejects.toThrow();
    expect(test.ctx.db.insert).not.toHaveBeenCalled();
    expect(test.ctx.db.patch).not.toHaveBeenCalled();
  });

  it("allows an injured participant who was in the match", async () => {
    const test = setup();
    test.tables.matchPlayers[0].injured = true;
    expect((await writeDraft(test)).revision).toBe(1);
  });
});

describe("real review drafts and explicit finalization", () => {
  it("saves an incomplete draft without inventing a final report", async () => {
    const test = setup();
    const result = await writeDraft(test, emptyPlayerReview());
    expect(result).toMatchObject({ matchId: "match1", teamId: "team1", playerId: "player1", revision: 1, finalized: null, finalizedAt: null });
    expect(result.draft).toEqual(emptyPlayerReview());
    expect(result).not.toHaveProperty("authorTokenIdentifier");
    expect(result).not.toHaveProperty("createdAt");
    expect(test.tables.playerMatchReviews).toHaveLength(1);
    await expect(finalizeDraft(test)).rejects.toThrow();
    expect(test.tables.playerMatchReviews[0].finalized).toBeUndefined();
  });

  it("upserts one author's player/match draft and rejects stale edits and duplicate creates", async () => {
    const test = setup();
    const initial = await writeDraft(test);
    const update = readyAnswers();
    update.teamwork.text = "Je coachte je teamgenoot bij het vrijlopen.";
    const saved = await writeDraft(test, update, initial.revision);
    expect(saved.revision).toBe(2);
    expect(saved._id).toBe(initial._id);
    expect(test.tables.playerMatchReviews).toHaveLength(1);
    await expect(writeDraft(test, readyAnswers(), null)).rejects.toThrow();
    await expect(writeDraft(test, readyAnswers(), initial.revision)).rejects.toThrow();
    await expect(finalizeDraft(test, initial.revision)).rejects.toThrow();
    expect((await list(test))[0].draft.teamwork.text).toBe(update.teamwork.text);
    expect(test.tables.playerMatchReviews[0].revision).toBe(2);
  });

  it("lets only one stale create request win for the same identity, match and player", async () => {
    const test = setup();
    const fromTabOne = draftArgs();
    const fromTabTwo = draftArgs();
    await invoke(saveDraft, test.ctx, fromTabOne);
    await expect(invoke(saveDraft, test.ctx, fromTabTwo)).rejects.toThrow();
    expect(test.tables.playerMatchReviews).toHaveLength(1);
    expect(test.ctx.db.insert).toHaveBeenCalledTimes(1);
  });

  it("finalizes a separate snapshot with no withheld text and preserves it on draft edits", async () => {
    const test = setup();
    const answers = readyAnswers();
    answers.positiveMoment.text = "  Je speelde rustig naar de vrije speler.  ";
    answers.teamwork = { text: "Uncertain private memory", notObserved: true };
    await writeDraft(test, answers);
    vi.setSystemTime(now + 1000);
    const finalized = await finalizeDraft(test);
    expect(finalized.revision).toBe(2);
    expect(finalized.finalizedAt).toBe(now + 1000);
    expect(finalized.finalized?.teamwork).toEqual({ text: "", notObserved: true });
    expect(finalized.finalized?.positiveMoment.text).toBe("Je speelde rustig naar de vrije speler.");
    expect(finalized.draft.teamwork.text).toBe("Uncertain private memory");
    expect(JSON.stringify(finalized.finalized)).not.toContain("Uncertain private memory");
    const edited = readyAnswers();
    edited.positiveMoment.text = "Een nieuw moment dat nog niet is vastgelegd.";
    vi.setSystemTime(now + 2000);
    const draft = await writeDraft(test, edited, finalized.revision);
    expect(draft.revision).toBe(3);
    expect(draft.finalized).toEqual(finalized.finalized);
    expect(draft.finalizedAt).toBe(finalized.finalizedAt);
    expect(draft.draft.positiveMoment.text).toBe(edited.positiveMoment.text);
  });

  it("does not finalize unobserved-only answers and accepts explicit limited observation", async () => {
    const test = setup();
    const answers = emptyPlayerReview();
    answers.positiveMoment.notObserved = true;
    answers.teamwork.notObserved = true;
    answers.nextStep.notObserved = true;
    await writeDraft(test, answers);
    await expect(finalizeDraft(test)).rejects.toThrow();
    answers.onBall.text = "Je ving de hoge bal rustig met twee handen.";
    await writeDraft(test, answers, 1);
    const result = await finalizeDraft(test, 2);
    expect(result.finalized?.onBall.text).toBe(answers.onBall.text);
  });

  it.each([-1, 0, 1.5, NaN, Infinity])("rejects an invalid expected revision %s", async (expectedRevision) => {
    const test = setup();
    await expect(writeDraft(test, readyAnswers(), expectedRevision)).rejects.toThrow();
    expect(test.ctx.db.insert).not.toHaveBeenCalled();
  });

  it("rejects malformed and excessive answers without storing data", async () => {
    const test = setup();
    const answers = readyAnswers();
    answers.onBall.text = "x".repeat(801);
    await expect(writeDraft(test, answers)).rejects.toThrow();
    await expect(writeDraft(test, {} as PlayerReview)).rejects.toThrow();
    expect(test.ctx.db.insert).not.toHaveBeenCalled();
  });
});

describe("real review identity isolation", () => {
  it("lists only caller-owned records via a bounded author index and omits identity metadata", async () => {
    const test = setup();
    await writeDraft(test);
    const own = test.tables.playerMatchReviews[0];
    test.tables.playerMatchReviews.push({ ...structuredClone(own), _id: "other-author", authorTokenIdentifier: identity("2").tokenIdentifier, draft: { ...readyAnswers(), positiveMoment: { text: "Other coach private draft", notObserved: false } } });
    test.tables.playerMatchReviews.push({ ...structuredClone(own), _id: "other-match", matchId: "match2" });
    const result = await list(test);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe(own._id);
    expect(JSON.stringify(result)).not.toContain("Other coach private draft");
    expect(JSON.stringify(result)).not.toContain("authorTokenIdentifier");
    expect(test.indexes).toContainEqual(expect.objectContaining({ table: "playerMatchReviews", name: "by_match_and_author_and_player", terms: [["matchId", "match1"], ["authorTokenIdentifier", identity().tokenIdentifier]] }));
  });

  it("uses authenticated identity rather than client-controlled authorship and separates co-coach drafts", async () => {
    const test = setup();
    await invoke(saveDraft, test.ctx, { ...draftArgs(), authorTokenIdentifier: identity("2").tokenIdentifier });
    expect(test.tables.playerMatchReviews[0].authorTokenIdentifier).toBe(identity().tokenIdentifier);
    test.authState.identity = identity("2");
    test.tables.coaches.push({ _id: "coach2", email: identity("2").email, teamIds: ["team1"], name: "Coach Twee" });
    expect(await list(test)).toEqual([]);
    await expect(finalizeDraft(test)).rejects.toThrow();
    await writeDraft(test);
    expect(test.tables.playerMatchReviews).toHaveLength(2);
    expect((await list(test))[0]._id).toBe(test.tables.playerMatchReviews[1]._id);
    expect(test.tables.playerMatchReviews[0].revision).toBe(1);
  });
});
