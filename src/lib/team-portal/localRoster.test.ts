import { describe, expect, it } from "vitest";
import { createRosterDemoState, parseLocalDemoRoster, type LocalDemoRoster, type LocalRosterMatch, type LocalRosterStandings } from "./localRoster";
import { getPlayerBadges, getPublishedFeedback } from "./selectors";
import { isDemoState, parseSavedDemo } from "./storage";

function exampleRoster(): LocalDemoRoster {
  return {
    version: 1,
    teamSlug: "jo13-2",
    importedAt: "2026-09-26T12:00:00.000Z",
    players: [
      { id: "local-example-a", name: "Voorbeeld A", number: 7, position: "Middenvelder" },
      { id: "local-example-b", name: "Voorbeeld B", number: null, position: "Nog niet ingevuld" },
    ],
  };
}

describe("local demo roster parsing", () => {
  it("retains only the supported roster fields without retaining private extras", () => {
    const input = exampleRoster();
    const parsed = parseLocalDemoRoster({
      ...input,
      contact: "Ignored private field",
      players: input.players.map((player) => ({ ...player, email: "ignored@example.test", assessment: "Ignored assessment" })),
    });
    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
    expect(parsed?.players[0]).not.toBe(input.players[0]);
  });

  it("trims text and preserves unknown shirt numbers", () => {
    const input = exampleRoster();
    input.players[0] = { id: " local-example-a ", name: " Voorbeeld A ", number: null, position: " Middenvelder " };
    expect(parseLocalDemoRoster(input)?.players[0]).toEqual({ id: "local-example-a", name: "Voorbeeld A", number: null, position: "Middenvelder" });
  });

  it("allows two people to share a display name or shirt number", () => {
    const input = exampleRoster();
    input.players[1].name = input.players[0].name;
    input.players[1].number = input.players[0].number;
    expect(parseLocalDemoRoster(input)).toEqual(input);
  });

  it.each([null, [], "roster", {}, { version: 2 }, { ...exampleRoster(), teamSlug: "jo13-1" }])("rejects an invalid envelope %#", (input) => {
    expect(parseLocalDemoRoster(input)).toBeNull();
  });

  it.each([undefined, null, "", "yesterday", "2026-09-26", "2026-13-26T12:00:00Z"])("rejects an invalid import timestamp %#", (importedAt) => {
    expect(parseLocalDemoRoster({ ...exampleRoster(), importedAt })).toBeNull();
  });

  it.each([undefined, null, {}, [], [null], [{ id: "local-example" }]])("rejects missing or malformed players %#", (players) => {
    expect(parseLocalDemoRoster({ ...exampleRoster(), players })).toBeNull();
  });

  it.each([
    { id: "" }, { id: "bad id" }, { id: "../private" },
    { name: " " }, { name: "bad\nname" }, { name: "x".repeat(101) },
    { position: undefined }, { position: "x".repeat(81) },
    { number: undefined }, { number: "7" }, { number: 0 }, { number: -1 },
    { number: 100 }, { number: 1.5 }, { number: Number.NaN }, { number: Number.POSITIVE_INFINITY },
  ])("rejects malformed player fields %#", (change) => {
    expect(parseLocalDemoRoster({ ...exampleRoster(), players: [{ ...exampleRoster().players[0], ...change }] })).toBeNull();
  });

  it("rejects duplicate normalized IDs instead of attaching data to the wrong player", () => {
    const input = exampleRoster();
    input.players[1].id = ` ${input.players[0].id} `;
    expect(parseLocalDemoRoster(input)).toBeNull();
  });

  it("bounds the local roster size", () => {
    const input = exampleRoster();
    input.players = Array.from({ length: 61 }, (_, index) => ({ ...input.players[0], id: `local-example-${index}` }));
    expect(parseLocalDemoRoster(input)).toBeNull();
  });

  it("accepts an unrecorded position without inventing one", () => {
    const input = exampleRoster();
    input.players[0].position = " ";
    expect(parseLocalDemoRoster(input)?.players[0].position).toBe("");
  });
});

function exampleMatch(): LocalRosterMatch {
  return {
    id: "match-example-home", opponent: "Voorbeeldclub JO13-1", scheduledAt: Date.parse("2026-09-26T10:00:00Z"),
    isHome: true, status: "finished", homeScore: 3, awayScore: 1, participantIds: ["local-example-a", "local-example-b"],
  };
}

function exampleStandings(): LocalRosterStandings {
  return {
    competitionName: "Voorbeeldcompetitie", klassepoule: "example-poule", sportlinkTeamName: "Voorbeeldteam JO13-2", fetchedAt: Date.parse("2026-09-26T12:00:00Z"),
    rows: [{ position: 1, teamName: "Voorbeeldteam JO13-2", played: 2, won: 1, drawn: 0, lost: 1, goalsFor: 3, goalsAgainst: 4, goalDifference: -1, points: 3 }],
  };
}

describe("local match and standings snapshot parsing", () => {
  it("accepts optional source data and strips unsupported fields throughout", () => {
    const match = exampleMatch();
    const standings = exampleStandings();
    const parsed = parseLocalDemoRoster({
      ...exampleRoster(),
      matches: [{ ...match, privateNote: "Ignored private source field" }],
      standings: { ...standings, secret: "ignored", rows: standings.rows.map((row) => ({ ...row, privateNote: "ignored" })) },
    });
    expect(parsed).toEqual({ ...exampleRoster(), matches: [match], standings });
    expect(parsed?.matches?.[0].participantIds).not.toBe(match.participantIds);
    expect(parsed?.standings?.rows[0]).not.toBe(standings.rows[0]);
  });

  it("accepts explicitly unavailable standings and an empty schedule", () => {
    expect(parseLocalDemoRoster({ ...exampleRoster(), matches: [], standings: null })).toEqual({ ...exampleRoster(), matches: [], standings: null });
  });

  it.each([
    null, {}, [null],
    [{ ...exampleMatch(), id: "" }],
    [{ ...exampleMatch(), opponent: " " }],
    [{ ...exampleMatch(), scheduledAt: Number.NaN }],
    [{ ...exampleMatch(), scheduledAt: Number.MAX_SAFE_INTEGER }],
    [{ ...exampleMatch(), isHome: "true" }],
    [{ ...exampleMatch(), status: "cancelled" }],
    [{ ...exampleMatch(), homeScore: -1 }],
    [{ ...exampleMatch(), awayScore: 1.2 }],
    [{ ...exampleMatch(), participantIds: [null] }],
    [{ ...exampleMatch(), participantIds: ["local-example-a", "local-example-a"] }],
    [exampleMatch(), exampleMatch()],
  ])("rejects malformed match snapshots %#", (matches) => {
    expect(parseLocalDemoRoster({ ...exampleRoster(), matches })).toBeNull();
  });

  it.each([
    {}, [], { ...exampleStandings(), competitionName: "" }, { ...exampleStandings(), fetchedAt: -1 },
    { ...exampleStandings(), rows: null }, { ...exampleStandings(), rows: [null] },
    { ...exampleStandings(), rows: [{ ...exampleStandings().rows[0], position: 0 }] },
    { ...exampleStandings(), rows: [{ ...exampleStandings().rows[0], teamName: "" }] },
    { ...exampleStandings(), rows: [{ ...exampleStandings().rows[0], played: -1 }] },
    { ...exampleStandings(), rows: [{ ...exampleStandings().rows[0], points: "3" }] },
    { ...exampleStandings(), rows: [{ ...exampleStandings().rows[0], goalDifference: 1.5 }] },
  ])("rejects malformed standings snapshots %#", (standings) => {
    expect(parseLocalDemoRoster({ ...exampleRoster(), standings })).toBeNull();
  });
});

describe("real identity demo seed", () => {
  it("starts with valid local state and no invented feedback, statistics or awards", () => {
    const roster = exampleRoster();
    const state = createRosterDemoState(roster);
    expect(isDemoState(state)).toBe(true);
    expect(parseSavedDemo(JSON.stringify(state))).toEqual(state);
    expect(state.players).toEqual(roster.players.map((player) => ({ ...player, qualities: [], motto: "" })));
    expect(state.feedback).toEqual([]);
    expect(state.playerReviews).toEqual([]);
    expect(state.highlights).toEqual([]);
    expect(state.votes).toEqual([]);
    expect(state.observations).toEqual([]);
    expect(state.observationsEnabled).toBe(false);
    expect(state.matches).toEqual([{
      id: "m1", opponent: "Demo-tegenstander", dateLabel: "Testwedstrijd · geen echte uitslag", score: "—", phase: "preparing",
      participantIds: roster.players.map((player) => player.id),
    }]);
    for (const player of state.players) {
      expect(getPlayerBadges(state, player.id, Date.now())).toEqual([]);
      expect(getPublishedFeedback(state, { role: "player", playerId: player.id }, player.id)).toEqual([]);
    }
  });

  it("makes separate explicitly simulated parents with a single linked player each", () => {
    const state = createRosterDemoState(exampleRoster());
    expect(state.guardians).toEqual(state.players.map((player) => ({ id: `parent-${player.id}`, name: `Oudersimulatie · ${player.name}`, childrenIds: [player.id] })));
  });

  it.each([
    ["GK", "Keeper"], ["CB", "Centrale verdediger"], ["RB", "Rechter verdediger"],
    ["CM", "Centrale middenvelder"], ["RM", "Rechter middenvelder"], ["LM", "Linker middenvelder"],
    ["LW", "Linker aanvaller"], ["RW", "Rechter aanvaller"], ["ST", "Spits"], ["", "Positie nog niet ingevuld"],
  ])("shows recorded position %s in Dutch", (position, label) => {
    const roster = exampleRoster();
    roster.players[0].position = position;
    expect(createRosterDemoState(roster).players[0].position).toBe(label);
  });

  it("uses finished source matches in date order with DIA-first scores and clean voting", () => {
    const roster = exampleRoster();
    roster.matches = [
      exampleMatch(),
      { ...exampleMatch(), id: "future-example", status: "scheduled", scheduledAt: Date.parse("2026-10-03T10:00:00Z") },
      { ...exampleMatch(), id: "current-example", status: "live", scheduledAt: Date.parse("2026-09-27T10:00:00Z") },
      { ...exampleMatch(), id: "away-example", isHome: false, scheduledAt: Date.parse("2026-09-26T23:30:00Z"), participantIds: ["local-example-a", "excluded-player"] },
    ];
    const sourceCopy = structuredClone(roster);
    const state = createRosterDemoState(roster);
    expect(state.matches).toEqual([
      { id: "away-example", opponent: "Voorbeeldclub JO13-1", dateLabel: "27 september 2026 · Uit", score: "1 – 3", phase: "preparing", participantIds: ["local-example-a"] },
      { id: "match-example-home", opponent: "Voorbeeldclub JO13-1", dateLabel: "26 september 2026 · Thuis", score: "3 – 1", phase: "preparing", participantIds: ["local-example-a", "local-example-b"] },
    ]);
    expect(state.highlights).toEqual([]);
    expect(state.votes).toEqual([]);
    expect(isDemoState(state)).toBe(true);
    expect(roster).toEqual(sourceCopy);
  });

  it("does not invent participants when all recorded participants are outside the current roster", () => {
    const roster = exampleRoster();
    roster.matches = [{ ...exampleMatch(), participantIds: ["excluded-player"] }];
    const state = createRosterDemoState(roster);
    expect(state.matches[0].participantIds).toEqual([]);
    expect(isDemoState(state)).toBe(true);
  });

  it("keeps the explicitly fictitious fallback when no finished match is present", () => {
    const roster = exampleRoster();
    roster.matches = [{ ...exampleMatch(), status: "scheduled" }];
    expect(createRosterDemoState(roster).matches).toEqual(createRosterDemoState(exampleRoster()).matches);
  });

  it("creates independent mutable data on reset without changing the roster source", () => {
    const roster = exampleRoster();
    const first = createRosterDemoState(roster);
    const next = createRosterDemoState(roster);
    first.players[0].name = "Aangepast voorbeeld";
    first.players[0].qualities.push("Lokale proeftekst");
    first.matches[0].participantIds.pop();
    first.guardians[0].childrenIds.pop();
    expect(roster).toEqual(exampleRoster());
    expect(next).toEqual(createRosterDemoState(roster));
  });
});
