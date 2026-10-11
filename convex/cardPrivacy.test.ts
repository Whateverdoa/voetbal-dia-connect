import { describe, expect, it, vi } from "vitest";
import { getMatchPresentation, getTeamDeckPublic } from "./presentationQueries";
import { getTeamDeck } from "./gamification";
import type { RedactedPlayer } from "./lib/privacyFilter";

vi.mock("./lib/userAccess", async (importOriginal) => ({
  ...await importOriginal<typeof import("./lib/userAccess")>(),
  getCurrentUserAccess: vi.fn(async () => null),
  requireCoachForTeam: vi.fn(async () => { throw new Error("Geen teamtoegang"); }),
}));

type Row = Record<string, unknown>;
function fixture() {
  const tables: Record<string, Row[]> = {
    teams: [{ _id: "t1", name: "DIA JO13-1", slug: "jo13-1", isSelectionTeam: true }],
    players: [{ _id: "p1", teamId: "t1", active: true, name: "Sam Voorbeeld", number: 7, photoUrl: "portrait.jpg",
      email: "private@example.test", fcRatings: { snl: 80, sch: 80, pas: 80, dri: 80, vrd: 80, fys: 80 }, playStyleIds: ["dribbler"],
      cardProfile: { xp: 120, level: 3, rarity: "common", seasonStats: { matches: 2, minutes: 129, goals: 1, assists: 2, cleanSheets: 0 } } }],
    playerConsents: ["photo", "gamification", "public_display"].map((consentType) => ({ playerId: "p1", consentType, status: "granted" })),
    cardRounds: [{ _id: "r1", teamId: "t1", status: "published", winnerIds: ["p1"], kind: "week", periodKey: "2026-10-05",
      publishedAt: 1, expiresAt: 2, voters: [{ email: "hidden@example.test" }], ranking: [{ playerId: "p1", count: 9 }] }],
    matches: [{ _id: "m1", teamId: "t1", publicCode: "ABCD", opponent: "Voorbeeld", isHome: true, status: "live", homeScore: 1,
      awayScore: 0, currentQuarter: 1, quarterCount: 2, showLineup: true }],
    matchPlayers: [{ matchId: "m1", playerId: "p1", onField: true, isKeeper: false, minutesPlayed: 27 }],
  };
  const db = {
    get: async (id: string) => Object.values(tables).flat().find((row) => row._id === id) ?? null,
    query: (table: string) => {
      let rows = tables[table] ?? [];
      const filters: { field: string; value: unknown }[] = [];
      const index = { eq(field: string, value: unknown) { filters.push({ field, value }); return index; } };
      const chain = {
        withIndex: (_name: string, apply: (builder: typeof index) => unknown) => {
          apply(index); rows = rows.filter((row) => filters.every(({ field, value }) => row[field] === value)); return chain;
        },
        order: () => chain,
        first: async () => rows[0] ?? null,
        unique: async () => rows[0] ?? null,
        collect: async () => rows,
        take: async (limit: number) => rows.slice(0, limit),
      };
      return chain;
    },
  };
  return { tables, ctx: { db, auth: { getUserIdentity: async () => null } } };
}
function invoke<T>(fn: unknown, ctx: unknown, args: unknown): Promise<T> {
  return (fn as { _handler: (context: unknown, arguments_: unknown) => Promise<T> })._handler(ctx, args);
}

describe("card query privacy", () => {
  it("projects deck and presentation payloads without private fields, and reflects revocation immediately", async () => {
    const { tables, ctx } = fixture();
    const deck = await invoke<RedactedPlayer[]>(getTeamDeckPublic, ctx, { teamSlug: "jo13-1" });
    const presentation = await invoke<{ players: RedactedPlayer[] }>(getMatchPresentation, ctx, { publicCode: "ABCD" });
    for (const player of [deck[0], presentation.players[0]]) {
      expect(player.displayName).toBe("Sam");
      expect(player.fcRatings?.snl).toBe(80);
      expect(player.recognitions).toEqual([{ roundId: "r1", kind: "week", periodKey: "2026-10-05", publishedAt: 1, expiresAt: 2 }]);
      const serialized = JSON.stringify(player);
      for (const forbidden of ["minutes", "email", "voters", "ranking", "count", "invite", "ballot"]) expect(serialized).not.toContain(forbidden);
    }
    tables.playerConsents.find((row) => row.consentType === "public_display")!.status = "revoked";
    const revoked = await invoke<RedactedPlayer[]>(getTeamDeckPublic, ctx, { teamSlug: "jo13-1" });
    expect(revoked[0]).toMatchObject({ displayName: "SV", photoUrl: null, cardProfile: null, fcRatings: null, playStyleIds: [], recognitions: [] });
  });

  it("never returns the collection for a nonselection team", async () => {
    const { tables, ctx } = fixture();
    tables.teams[0].isSelectionTeam = false;
    expect(await invoke(getTeamDeckPublic, ctx, { teamSlug: "jo13-1" })).toEqual([]);
  });

  it("removes a revoked photo URL while retaining consented team card scores", async () => {
    const { tables, ctx } = fixture();
    const allowed = await invoke<RedactedPlayer[]>(getTeamDeckPublic, ctx, { teamSlug: "jo13-1" });
    expect(allowed[0].photoUrl).toBe("portrait.jpg");
    tables.playerConsents.find((row) => row.consentType === "photo")!.status = "revoked";
    const revoked = await invoke<RedactedPlayer[]>(getTeamDeckPublic, ctx, { teamSlug: "jo13-1" });
    expect(revoked[0]).toMatchObject({ displayName: "Sam", photoUrl: null, fcRatings: { snl: 80 } });
    expect(JSON.stringify(revoked)).not.toContain("portrait.jpg");
  });

  it("denies the formerly unprotected deck query to nonstaff", async () => {
    const { ctx } = fixture();
    await expect(invoke(getTeamDeck, ctx, { teamId: "t1" })).rejects.toThrow("Geen teamtoegang");
  });
});
