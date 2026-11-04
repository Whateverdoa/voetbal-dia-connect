// @vitest-environment node
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { parsePublicRoster } from "./lib/sportlinkPublicRoster";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
]);
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_800_000_000_000);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("Synthetic source failure")),
  );
  vi.stubEnv("SPORTLINK_PRIVACY_SYNC_ENABLED", "true");
  vi.stubEnv("SPORTLINK_CLIENT_ID", "synthetic-client");
  vi.stubEnv("SPORTLINK_BASE_URL", "https://data.sportlink.com");
  vi.stubEnv("CONVEX_CLOUD_URL", "https://synthetic.convex.cloud");
  vi.stubEnv("DISABLE_EXTERNAL_IMPORTS", "false");
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function fixture(selection = false) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const clubId = await ctx.db.insert("clubs", {
      name: "Synthetic DIA",
      slug: "dia",
      createdAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      clubId,
      name: "JO13-1",
      slug: "jo13-1",
      isSelectionTeam: selection,
      sportlinkTeamCode: "local:171",
      createdAt: now,
    });
    const playerId = await ctx.db.insert("players", {
      teamId,
      name: "LOCAL PRIVATE NAME",
      sportlinkPersonId: "LID1",
      number: 7,
      active: true,
      photoUrl: "https://example.com/private-upload.jpg",
      createdAt: now,
    });
    const otherId = await ctx.db.insert("players", {
      teamId,
      name: "HIDDEN PRIVATE NAME",
      sportlinkPersonId: "LID2",
      number: 8,
      active: true,
      createdAt: now,
    });
    const coachId = await ctx.db.insert("coaches", {
      name: "Coach",
      email: "coach@example.test",
      teamIds: [teamId],
      createdAt: now,
    });
    await ctx.db.insert("userAccess", {
      email: "admin@example.test",
      roles: ["admin"],
      active: true,
      source: "admin_manual",
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const matchId = await ctx.db.insert("matches", {
      teamId,
      coachId,
      publicCode: "PRIV01",
      opponent: "Synthetic",
      isHome: true,
      status: "finished",
      currentQuarter: 2,
      quarterCount: 2,
      homeScore: 1,
      awayScore: 0,
      showLineup: true,
      createdAt: now,
    });
    for (const id of [playerId, otherId]) {
      await ctx.db.insert("matchPlayers", {
        matchId,
        playerId: id,
        onField: true,
        isKeeper: false,
        minutesPlayed: 15,
        createdAt: now,
      });
      for (const consentType of [
        "public_display",
        "photo",
        "gamification",
      ] as const)
        await ctx.db.insert("playerConsents", {
          teamId,
          playerId: id,
          consentType,
          status: "granted",
          documentVersion: "synthetic",
          token: `synthetic-${id}`,
          createdAt: now,
          updatedAt: now,
        });
    }
    const eventId = await ctx.db.insert("matchEvents", {
      matchId,
      type: "goal",
      playerId: otherId,
      relatedPlayerId: otherId,
      quarter: 1,
      timestamp: now,
      createdAt: now,
      note: "HIDDEN PRIVATE NAME",
      correlationId: `private-${playerId}`,
    });
    await ctx.db.insert("matchEvents", {
      matchId,
      type: "goal_enrichment",
      targetEventId: eventId,
      playerId,
      relatedPlayerId: otherId,
      quarter: 1,
      timestamp: now + 1,
      createdAt: now + 1,
    });
    return { teamId, playerId, otherId, matchId, eventId };
  });
  async function snapshot(rows: Parameters<typeof parsePublicRoster>[0]) {
    const generation = await t.mutation(
      internal.import.sportlinkRosterMutations.beginPrivacyRefresh,
      { teamId: ids.teamId },
    );
    await t.mutation(
      internal.import.sportlinkRosterMutations.applyPrivacySnapshot,
      {
        teamId: ids.teamId,
        teamCode: "local:171",
        generation,
        rows: parsePublicRoster(rows),
      },
    );
    return generation;
  }
  const publicMatch = () =>
    t.query(api.matches.getByPublicCode, { code: "PRIV01" });
  return { t, ...ids, snapshot, publicMatch };
}
const visible = {
  lidcode: "LID1",
  naam: "Visible, Synthetic",
  rol: "Teamspeler",
};

describe("server-side Sportlink public identity", () => {
  for (const selection of [false, true])
    it(`denies legacy/unknown data even with consent, selection=${selection}`, async () => {
      const f = await fixture(selection);
      const match = await f.publicMatch();
      expect(match?.lineup).toEqual([]);
      const encoded = JSON.stringify(match);
      for (const secret of [
        f.playerId,
        f.otherId,
        "PRIVATE NAME",
        "private-upload",
        "note",
        "correlationId",
      ])
        expect(encoded).not.toContain(secret);
      expect(match?.homeScore).toBe(1);
    });
  it("enforces name-only projection and redacts enrichment, assists, notes and private IDs", async () => {
    const f = await fixture();
    await f.snapshot([visible]);
    const match = await f.publicMatch();
    expect(match?.lineup).toEqual([
      expect.objectContaining({ id: f.playerId, name: "Synthetic", number: 7 }),
    ]);
    expect(match?.lineup?.[0]?.photoUrl).toBeUndefined();
    expect(match?.events[0]).toMatchObject({
      playerId: f.playerId,
      playerName: "Synthetic",
    });
    const encoded = JSON.stringify(match);
    for (const secret of [
      "LOCAL PRIVATE",
      "HIDDEN PRIVATE",
      f.otherId,
      "relatedPlayerId",
      "note",
      "correlationId",
      "private-upload",
    ])
      expect(encoded).not.toContain(secret);
    await f.t.run((ctx) => ctx.db.patch(f.matchId, { showLineup: false }));
    expect((await f.publicMatch())?.lineup).toBeNull();
    expect((await f.publicMatch())?.events[0]?.playerName).toBe("Synthetic");
  });
  it("enforces source photo restrictions even with local uploads and photo consent", async () => {
    const f = await fixture(true);
    await f.snapshot([
      { ...visible, foto: "https://example.com/source-photo.jpg" },
    ]);
    expect(
      await f.t.query(api.playerPhotos.getPlayerPhotoUrl, {
        playerId: f.playerId,
      }),
    ).toBe("https://example.com/source-photo.jpg");
    await f.snapshot([visible]);
    expect(
      await f.t.query(api.playerPhotos.getPlayerPhotoUrl, {
        playerId: f.playerId,
      }),
    ).toBeNull();
  });
  it("removes identity across every public entry point after shielding or omission", async () => {
    const f = await fixture(true);
    await f.snapshot([visible]);
    expect(
      JSON.stringify(
        await f.t.query(api.presentationQueries.getTeamDeckPublic, {
          teamSlug: "jo13-1",
        }),
      ),
    ).toContain("Synthetic");
    for (const rows of [
      [
        {
          ...visible,
          naam: "Afgeschermd",
          voornaam: "DO NOT RECONSTRUCT",
          achternaam: "PRIVATE",
        },
      ],
      [],
    ]) {
      await f.snapshot(rows);
      const results = await Promise.all([
        f.publicMatch(),
        f.t.query(api.presentationQueries.getMatchPresentation, {
          publicCode: "PRIV01",
        }),
        f.t.query(api.presentationQueries.getTeamDeckPublic, {
          teamSlug: "jo13-1",
        }),
        f.t.query(api.gamification.getTeamDeck, { teamId: f.teamId }),
        f.t.query(api.teams.getMatchHistory, { teamId: f.teamId }),
        f.t.query(api.teams.getSeasonStats, { teamId: f.teamId }),
        f.t.query(api.stats.getMatchHistory, { teamId: f.teamId }),
        f.t.query(api.stats.getSeasonStats, { teamId: f.teamId }),
        f.t.query(api.stats.getPlayerStats, { playerId: f.playerId }),
        f.t.query(api.playerPhotos.getPlayerPhotoUrl, { playerId: f.playerId }),
      ]);
      const encoded = JSON.stringify(results);
      for (const secret of [
        "PRIVATE",
        "Synthetic Visible",
        "DO NOT RECONSTRUCT",
        f.playerId,
        f.otherId,
      ])
        expect(encoded).not.toContain(secret);
    }
  });
  it("keeps coach information available behind existing team authorization", async () => {
    const f = await fixture();
    const coach = f.t.withIdentity({
      subject: "coach",
      email: "coach@example.test",
    });
    const result = await coach.query(api.matches.getForCoach, {
      matchId: f.matchId,
    });
    expect(result?.players.map((p) => p?.name)).toContain(
      "HIDDEN PRIVATE NAME",
    );
    expect(
      await f.t.query(api.matches.getForCoach, { matchId: f.matchId }),
    ).toBeNull();
    await expect(
      f.t.query(api.adminPlayers.listPlayersByTeam, { teamId: f.teamId }),
    ).rejects.toThrow();
  });
  it("expires via scheduled database invalidation, and an old job cannot hide a new snapshot", async () => {
    const f = await fixture();
    const old = await f.snapshot([visible]);
    const fresh = await f.snapshot([visible]);
    await f.t.mutation(internal.import.sportlinkRosterMutations.expirePrivacy, {
      teamId: f.teamId,
      generation: old,
    });
    expect((await f.publicMatch())?.lineup).toHaveLength(1);
    await f.t.mutation(internal.import.sportlinkRosterMutations.expirePrivacy, {
      teamId: f.teamId,
      generation: fresh,
    });
    expect((await f.publicMatch())?.lineup).toEqual([]);
    await f.snapshot([visible]);
    await vi.advanceTimersByTimeAsync(30 * 60_000 + 1);
    await f.t.finishInProgressScheduledFunctions();
    expect((await f.publicMatch())?.lineup).toEqual([]);
    expect(
      await f.t.run(
        async (ctx) => (await ctx.db.get(f.teamId))?.sportlinkPrivacyValidUntil,
      ),
    ).toBe(0);
  });
  it("rejects stale overlapping snapshots and invalidates immediately on source failure", async () => {
    const f = await fixture();
    const old = await f.snapshot([visible]);
    await f.t.mutation(
      internal.import.sportlinkRosterMutations.beginPrivacyRefresh,
      { teamId: f.teamId },
    );
    expect(
      await f.t.mutation(
        internal.import.sportlinkRosterMutations.applyPrivacySnapshot,
        {
          teamId: f.teamId,
          teamCode: "local:171",
          generation: old,
          rows: [{ personId: "LID1", name: "STALE" }],
        },
      ),
    ).toBe(false);
    expect((await f.publicMatch())?.lineup).toEqual([]);
    await f.snapshot([visible]);
    const result = await f.t.action(
      internal.import.sportlinkRosterSync.refreshPrivacy,
      {},
    );
    expect(result).toEqual({ refreshed: 0, failed: 1, skipped: false });
    expect((await f.publicMatch())?.lineup).toEqual([]);
  });
  it("requires local public and photo consent in addition to current source allowance", async () => {
    const f = await fixture(true);
    await f.snapshot([{ ...visible, foto: "https://example.com/source.jpg" }]);
    await f.t.run(async (ctx) => {
      const rows = await ctx.db
        .query("playerConsents")
        .withIndex("by_player", (q) => q.eq("playerId", f.playerId))
        .collect();
      for (const row of rows)
        if (row.consentType === "public_display")
          await ctx.db.patch(row._id, { status: "revoked" });
    });
    expect((await f.publicMatch())?.lineup).toEqual([]);
    expect(
      await f.t.query(api.playerPhotos.getPlayerPhotoUrl, {
        playerId: f.playerId,
      }),
    ).toBeNull();
  });
  it("requires an explicit admin binding; name matching cannot grant source permission", async () => {
    const f = await fixture();
    await f.t.run((ctx) =>
      ctx.db.patch(f.playerId, { sportlinkPersonId: undefined }),
    );
    await f.snapshot([visible]);
    expect((await f.publicMatch())?.lineup).toEqual([]);
    await expect(
      f.t.mutation(api.import.sportlinkRosterMutations.linkPlayerIdentity, {
        playerId: f.playerId,
        personId: "LID1",
      }),
    ).rejects.toThrow();
    const admin = f.t.withIdentity({
      subject: "admin",
      email: "admin@example.test",
    });
    await admin.mutation(
      api.import.sportlinkRosterMutations.linkPlayerIdentity,
      { playerId: f.playerId, personId: "LID1" },
    );
    expect((await f.publicMatch())?.lineup).toEqual([]);
    await f.snapshot([visible]);
    expect((await f.publicMatch())?.lineup).toHaveLength(1);
    await expect(
      admin.mutation(api.import.sportlinkRosterMutations.linkPlayerIdentity, {
        playerId: f.otherId,
        personId: "LID1",
      }),
    ).rejects.toThrow("al gekoppeld");
  });
  it("fetches the public filtered feed with photos requested and excludes privileged origins", async () => {
    const f = await fixture();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([visible]), { status: 200 }),
    );
    expect(
      await f.t.action(internal.import.sportlinkRosterSync.refreshPrivacy, {}),
    ).toEqual({ refreshed: 1, failed: 0, skipped: false });
    const url = new URL(String(vi.mocked(fetch).mock.calls[0]?.[0]));
    expect(url.origin).toBe("https://data.sportlink.com");
    expect(url.pathname).toBe("/entity/team-indeling");
    expect(url.searchParams.get("toonlidfoto")).toBe("JA");
    expect((await f.publicMatch())?.lineup).toHaveLength(1);
    vi.stubEnv("SPORTLINK_BASE_URL", "https://other.example.test");
    await expect(
      f.t.action(internal.import.sportlinkRosterSync.refreshPrivacy, {}),
    ).rejects.toThrow("publieke Sportlink");
  });
  it("does not expose manual identities, free text or health flags in public presentations", async () => {
    const f = await fixture(true);
    await f.snapshot([visible]);
    await f.t.run(async (ctx) => {
      await ctx.db.insert("matchEvents", {
        matchId: f.matchId,
        type: "yellow_card",
        reportedName: "MANUAL PRIVATE",
        reportedNumber: 99,
        isOpponentCard: true,
        quarter: 1,
        timestamp: Date.now(),
        createdAt: Date.now(),
        note: "PRIVATE NOTE",
      });
      const mp = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match_player", (q) =>
          q.eq("matchId", f.matchId).eq("playerId", f.playerId),
        )
        .unique();
      await ctx.db.patch(mp!._id, { absent: true, injured: true });
    });
    const match = await f.publicMatch();
    expect(JSON.stringify(match)).not.toMatch(
      /MANUAL PRIVATE|PRIVATE NOTE|reportedName|reportedNumber/,
    );
    expect(
      match?.events.find((e) => e.type === "yellow_card")?.isOpponentCard,
    ).toBe(true);
    const presentation = await f.t.query(
      api.presentationQueries.getMatchPresentation,
      { publicCode: "PRIV01" },
    );
    expect(presentation?.players[0]?.displayName).toBe("Synthetic");
    expect(JSON.stringify(presentation?.players)).not.toMatch(/absent|injured/);
  });
  it("does not expose staff plans to anonymous visitors or a coach from another team", async () => {
    const f = await fixture();
    await f.t.run(async (ctx) => {
      await ctx.db.insert("coaches", {
        name: "Other coach",
        email: "other@example.test",
        teamIds: [],
        createdAt: Date.now(),
      });
      await ctx.db.insert("substitutionPlans", {
        matchId: f.matchId,
        sequence: 1,
        playerOutId: f.playerId,
        playerInId: f.otherId,
        status: "pending",
        note: "STAFF PRIVATE",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const query = { publicCode: "PRIV01" };
    expect(
      (await f.t.query(api.presentationQueries.getMatchPresentation, query))
        ?.substitutionPlans,
    ).toEqual([]);
    const other = f.t.withIdentity({
      subject: "other",
      email: "other@example.test",
    });
    expect(
      (await other.query(api.presentationQueries.getMatchPresentation, query))
        ?.substitutionPlans,
    ).toEqual([]);
    const coach = f.t.withIdentity({
      subject: "coach",
      email: "coach@example.test",
    });
    expect(
      (await coach.query(api.presentationQueries.getMatchPresentation, query))
        ?.substitutionPlans[0]?.note,
    ).toBe("STAFF PRIVATE");
  });
  it("rejects source evidence carried to a different team even with the same source code", async () => {
    const f = await fixture();
    await f.snapshot([visible]);
    await f.t.run(async (ctx) => {
      const team = await ctx.db.get(f.teamId);
      const otherTeam = await ctx.db.insert("teams", {
        clubId: team!.clubId,
        name: "Other",
        slug: "other",
        sportlinkTeamCode: "local:171",
        sportlinkPrivacyGeneration: team!.sportlinkPrivacyGeneration,
        sportlinkPrivacyValidUntil: team!.sportlinkPrivacyValidUntil,
        createdAt: Date.now(),
      });
      await ctx.db.patch(f.playerId, { teamId: otherTeam });
    });
    expect(
      await f.t.query(api.playerPhotos.getPlayerPhotoUrl, {
        playerId: f.playerId,
      }),
    ).toBeNull();
    expect(
      await f.t.query(api.stats.getPlayerStats, { playerId: f.playerId }),
    ).toBeNull();
    expect((await f.publicMatch())?.lineup).toEqual([]);
  });
  it("keeps malformed, absent or duplicate source identities shielded", async () => {
    const f = await fixture();
    await f.snapshot([visible, visible]);
    expect((await f.publicMatch())?.lineup).toEqual([]);
    await f.snapshot([visible]);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "not a roster" }), { status: 200 }),
    );
    expect(
      (await f.t.action(internal.import.sportlinkRosterSync.refreshPrivacy, {}))
        .failed,
    ).toBe(1);
    expect((await f.publicMatch())?.lineup).toEqual([]);
  });
  it("never polls on isolated development or without explicit opt in", async () => {
    const f = await fixture();
    vi.stubEnv("SPORTLINK_PRIVACY_SYNC_ENABLED", "false");
    expect(
      (await f.t.action(internal.import.sportlinkRosterSync.refreshPrivacy, {}))
        .skipped,
    ).toBe(true);
    vi.stubEnv("SPORTLINK_PRIVACY_SYNC_ENABLED", "true");
    vi.stubEnv("DISABLE_EXTERNAL_IMPORTS", "true");
    expect(
      (await f.t.action(internal.import.sportlinkRosterSync.refreshPrivacy, {}))
        .skipped,
    ).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("public Sportlink row parsing", () => {
  it("does not infer consent from names, IDs, arbitrary URLs or ambiguous duplicates", () => {
    expect(parsePublicRoster([{ ...visible, lidcode: undefined }])).toEqual([]);
    expect(
      parsePublicRoster([{ ...visible, foto: "javascript:alert(1)" }]),
    ).toEqual([{ personId: "LID1", name: "Synthetic Visible" }]);
    expect(parsePublicRoster([visible, visible])).toEqual([
      { personId: "LID1" },
    ]);
    expect(
      parsePublicRoster([
        {
          ...visible,
          naam: "Afgeschermd",
          voornaam: "Secret",
          achternaam: "Name",
        },
      ]),
    ).toEqual([{ personId: "LID1" }]);
  });
});
