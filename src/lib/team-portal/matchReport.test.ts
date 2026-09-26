import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { buildMatchReport, type MatchReportEvent, type MatchReportSource } from "./matchReport";

const NOW = Date.UTC(2026, 8, 26, 10);
const playerId = (value: string) => value as Id<"players">;
const eventId = (value: string) => value as Id<"matchEvents">;

function event(id: string, type: MatchReportEvent["type"], overrides: Partial<MatchReportEvent> = {}): MatchReportEvent {
  return { _id: eventId(id), type, quarter: 1, timestamp: NOW, createdAt: NOW, displayMinute: 10, ...overrides };
}

function source(overrides: Partial<MatchReportSource> = {}): MatchReportSource {
  return {
    _id: "match-1" as Id<"matches">, teamName: "DIA JO13-02", opponent: "Voorbeeld JO13", isHome: true,
    scheduledAt: NOW, status: "finished", homeScore: 0, awayScore: 0, quarterCount: 2,
    players: [
      { playerId: playerId("p3"), name: "Zoë", number: 10, minutesPlayed: 28.5 },
      { playerId: playerId("p1"), name: "Amir", number: 8, minutesPlayed: 45.2 },
      { playerId: playerId("p2"), name: "Bram", number: 4, minutesPlayed: 0 },
    ],
    events: [], ...overrides,
  };
}

describe("finished-match report facts", () => {
  it.each(["scheduled", "lineup", "live", "halftime"] as const)("does not produce a final report for %s matches", (status) => {
    expect(buildMatchReport(source({ status }))).toBeNull();
  });

  it("keeps the stored final score even when the goal log is incomplete", () => {
    const report = buildMatchReport(source({ homeScore: 3, awayScore: 2, events: [event("goal", "goal", { playerId: playerId("p1") })] }))!;
    expect(report.score).toEqual({ home: 3, away: 2, team: 3, opponent: 2, label: "3 – 2" });
    expect(report.summary).toBe("DIA JO13-02 – Voorbeeld JO13 eindigde in 3 – 2. Hieronder staan de vastgelegde momenten en de geregistreerde speeltijd.");
    expect(report.recorded.teamGoals).toBe(1);
    expect(report.recorded.opponentGoals).toBe(0);
    expect(report.completenessNotes).toContainEqual(expect.stringContaining("aantallen sluiten niet aan op de eindstand"));
    expect(report.completenessNotes).toContainEqual(expect.stringContaining("Niet geregistreerd betekent niet"));
  });

  it("keeps home-away display and team-relative goal attribution correct for away matches", () => {
    const report = buildMatchReport(source({ isHome: false, homeScore: 1, awayScore: 2, events: [
      event("our-goal", "goal", { playerId: playerId("p1") }),
      event("their-own-goal", "goal", { isOwnGoal: true, isOpponentGoal: false, playerName: "Nr. 5" }),
      event("their-goal", "goal", { isOpponentGoal: true, playerName: "Nr. 9" }),
    ] }))!;
    expect(report.homeTeam).toBe("Voorbeeld JO13");
    expect(report.awayTeam).toBe("DIA JO13-02");
    expect(report.score).toEqual({ home: 1, away: 2, team: 2, opponent: 1, label: "1 – 2" });
    expect(report.recorded).toMatchObject({ teamGoals: 2, opponentGoals: 1 });
    expect(report.completenessNotes.some((note) => note.includes("sluiten niet aan"))).toBe(false);
  });

  it("does not turn an empty log into a tactical judgement or invented incidents", () => {
    const report = buildMatchReport(source({ scheduledAt: undefined }))!;
    expect(report.timeline).toEqual([]);
    expect(report.scheduledAt).toBeNull();
    expect(report.recorded).toEqual({ teamGoals: 0, opponentGoals: 0, assists: 0, substitutions: 0, yellowCards: 0, redCards: 0 });
    expect(report.completenessNotes.some((note) => note.includes("sluiten niet aan"))).toBe(false);
    expect(report.completenessNotes).toContainEqual(expect.stringContaining("geen beoordeling"));
  });

  it("uses persisted minutes, excludes missing player documents and keeps the table alphabetical", () => {
    const input = source();
    input.players.push(null, { playerId: playerId("p4"), name: "Carlo", number: undefined, minutesPlayed: Number.NaN });
    input.events.push(event("zoe-goal", "goal", { playerId: playerId("p3") }));
    const report = buildMatchReport(input)!;
    expect(report.players.map((player) => player.name)).toEqual(["Amir", "Bram", "Carlo", "Zoë"]);
    expect(report.players.map((player) => player.minutesPlayed)).toEqual([45.2, 0, null, 28.5]);
    expect(report.completenessNotes).toContainEqual(expect.stringContaining("Bij 0 minuten kan ook de speeltijdregistratie ontbreken"));
    expect(report.players.at(-1)?.goals).toBe(1);
    expect(report.completenessNotes).toContainEqual(expect.stringContaining("spelergegevens ontbreken"));
    expect(report.completenessNotes).toContainEqual(expect.stringContaining("bruikbare speeltijd"));
    expect(report.completenessNotes).toContainEqual(expect.stringContaining("geen ranglijst"));
  });
});

describe("goal and assist accounting", () => {
  it("uses the projected goal and counts a changed assistant once despite stale assist and enrichment rows", () => {
    const report = buildMatchReport(source({ homeScore: 1, events: [
      event("goal", "goal", { playerId: playerId("p1"), relatedPlayerId: playerId("p3"), relatedPlayerName: "Zoë", correlationId: "goal-command" }),
      event("original-assist", "assist", { playerId: playerId("p2"), relatedPlayerId: playerId("p1"), correlationId: "goal-command" }),
      event("later-enrichment", "goal_enrichment", { targetEventId: eventId("goal"), relatedPlayerId: playerId("p3"), displayMinute: 55, timestamp: NOW + 900000 }),
    ] }))!;
    expect(report.timeline).toHaveLength(1);
    expect(report.timeline[0]).toMatchObject({ type: "goal", text: "Doelpunt Amir (DIA JO13-02)", detail: "Assist: Zoë", timeLabel: "10'" });
    expect(report.recorded).toMatchObject({ teamGoals: 1, assists: 1 });
    expect(report.players.find((player) => player.playerId === "p1")?.goals).toBe(1);
    expect(report.players.find((player) => player.playerId === "p2")?.assists).toBe(0);
    expect(report.players.find((player) => player.playerId === "p3")?.assists).toBe(1);
  });

  it("recognizes legacy goal/assist pairs without correlation IDs", () => {
    const report = buildMatchReport(source({ homeScore: 1, events: [
      event("goal", "goal", { playerId: playerId("p1"), relatedPlayerId: playerId("p2") }),
      event("assist", "assist", { playerId: playerId("p2"), relatedPlayerId: playerId("p1") }),
    ] }))!;
    expect(report.timeline).toHaveLength(1);
    expect(report.timeline[0].detail).toBe("Assist: Bram");
    expect(report.recorded.assists).toBe(1);
    expect(report.players.find((player) => player.playerId === "p2")?.assists).toBe(1);
  });

  it("keeps a separately linked assist with its goal, even when its timestamp differs", () => {
    const report = buildMatchReport(source({ homeScore: 1, events: [
      event("goal", "goal", { playerId: playerId("p1"), note: "Later vastgelegd." }),
      event("linked-assist", "assist", { targetEventId: eventId("goal"), playerId: playerId("p2"), timestamp: NOW + 9000, note: "Voorzet van links." }),
    ] }))!;
    expect(report.timeline).toHaveLength(1);
    expect(report.timeline[0].detail).toBe("Assist: Bram");
    expect(report.timeline[0].note).toBe("Later vastgelegd. · Voorzet van links.");
    expect(report.recorded.assists).toBe(1);
  });

  it("keeps genuinely standalone assists and goal-only assistant data without double counting", () => {
    const report = buildMatchReport(source({ homeScore: 1, events: [
      event("goal-only", "goal", { playerId: playerId("p1"), relatedPlayerId: playerId("p2"), timestamp: NOW + 1000 }),
      event("standalone", "assist", { playerId: playerId("p3"), timestamp: NOW + 9000, displayMinute: 25, note: "Later genoteerd." }),
    ] }))!;
    expect(report.timeline.map((row) => row.type)).toEqual(["goal", "assist"]);
    expect(report.timeline[1]).toMatchObject({ text: "Assist: Zoë", note: "Later genoteerd." });
    expect(report.recorded.assists).toBe(2);
    expect(report.players.find((player) => player.playerId === "p2")?.assists).toBe(1);
    expect(report.players.find((player) => player.playerId === "p3")?.assists).toBe(1);
  });

  it("counts own goals for the credited team and never as a player's scored goal or assist", () => {
    const report = buildMatchReport(source({ homeScore: 1, awayScore: 1, events: [
      event("our-own-goal", "goal", { isOwnGoal: true, isOpponentGoal: true, playerId: playerId("p1"), relatedPlayerId: playerId("p2") }),
      event("their-own-goal", "goal", { isOwnGoal: true, isOpponentGoal: false, playerId: playerId("p3"), relatedPlayerId: playerId("p2"), timestamp: NOW + 1000 }),
    ] }))!;
    expect(report.recorded).toMatchObject({ teamGoals: 1, opponentGoals: 1, assists: 0 });
    expect(report.players.every((player) => player.goals === 0 && player.assists === 0)).toBe(true);
    expect(report.timeline.map((row) => row.text)).toEqual([
      "Eigen doelpunt DIA JO13-02 Amir · telt voor Voorbeeld JO13",
      "Eigen doelpunt Voorbeeld JO13 Zoë · telt voor DIA JO13-02",
    ]);
    expect(report.timeline.every((row) => row.detail === null)).toBe(true);
  });

  it("preserves set-piece labels and avoids inventing an assistant for an unassisted penalty", () => {
    const report = buildMatchReport(source({ homeScore: 2, events: [
      event("corner-goal", "goal", { playerId: playerId("p1"), relatedPlayerId: playerId("p2"), assistKind: "corner" }),
      event("penalty", "goal", { playerId: playerId("p3"), assistKind: "penalty", timestamp: NOW + 1000 }),
    ] }))!;
    expect(report.timeline[0]).toMatchObject({ text: "Doelpunt Amir (DIA JO13-02) · Hoekschop", detail: "Hoekschop: Bram" });
    expect(report.timeline[1]).toMatchObject({ text: "Doelpunt Zoë (DIA JO13-02) · Penalty", detail: "Penalty" });
    expect(report.recorded.assists).toBe(1);
  });

  it("keeps recorded shirt-number identity and meaningful notes without repeating a shirt-only note", () => {
    const report = buildMatchReport(source({ awayScore: 2, events: [
      event("shirt-goal", "goal", { isOpponentGoal: true, note: "Rugnummer: 9" }),
      event("named-goal", "goal", { isOpponentGoal: true, playerName: "Nr. 11", note: "Vrije trap na overtreding.", timestamp: NOW + 1000, assistKind: "free_kick" }),
    ] }))!;
    expect(report.timeline[0]).toMatchObject({ text: "Doelpunt #9 (Voorbeeld JO13)", note: null });
    expect(report.timeline[1]).toMatchObject({ text: "Doelpunt Nr. 11 (Voorbeeld JO13) · Vrije trap", note: "Vrije trap na overtreding." });
    expect(report.players.every((player) => player.goals === 0)).toBe(true);
  });
});

describe("substitutions, cards and recorded game time", () => {
  it("reduces staged/executed/sub-out/sub-in rows to one factual substitution and keeps its note", () => {
    const pair = { playerId: playerId("p1"), relatedPlayerId: playerId("p2"), stagedEventId: eventId("staged"), correlationId: "confirm" };
    const report = buildMatchReport(source({ events: [
      event("staged", "substitution_staged", { playerId: playerId("p1"), relatedPlayerId: playerId("p2"), timestamp: NOW - 1000 }),
      event("executed", "substitution_executed", pair),
      event("z-out", "sub_out", { ...pair, note: "Wissel volgens het plan." }),
      event("a-in", "sub_in", { ...pair, playerId: playerId("p2"), relatedPlayerId: playerId("p1") }),
      event("unused-stage", "substitution_staged", { playerId: playerId("p1"), relatedPlayerId: playerId("p3") }),
      event("cancel", "substitution_cancelled", { stagedEventId: eventId("unused-stage") }),
    ] }))!;
    expect(report.timeline).toHaveLength(1);
    expect(report.timeline[0]).toMatchObject({ type: "substitution", text: "Wissel: Amir eruit, Bram erin", note: "Wissel volgens het plan.", playerIds: ["p1", "p2"] });
    expect(report.recorded.substitutions).toBe(1);
  });

  it("deduplicates a legacy reversed sub pair and preserves later substitutions of the same players", () => {
    const report = buildMatchReport(source({ events: [
      event("out-1", "sub_out", { playerId: playerId("p1"), relatedPlayerId: playerId("p2") }),
      event("in-1", "sub_in", { playerId: playerId("p2"), relatedPlayerId: playerId("p1") }),
      event("out-2", "sub_out", { playerId: playerId("p1"), relatedPlayerId: playerId("p2"), timestamp: NOW + 600000, displayMinute: 20 }),
      event("in-2", "sub_in", { playerId: playerId("p2"), relatedPlayerId: playerId("p1"), timestamp: NOW + 600000, displayMinute: 20 }),
    ] }))!;
    expect(report.timeline).toHaveLength(2);
    expect(report.recorded.substitutions).toBe(2);
    expect(report.timeline.map((row) => row.timeLabel)).toEqual(["10'", "20'"]);
  });

  it("does not count a generic executed marker in addition to its recorded participant pair", () => {
    const report = buildMatchReport(source({ events: [
      event("marker", "substitution_executed", { correlationId: "legacy-command" }),
      event("out", "sub_out", { correlationId: "legacy-command", playerId: playerId("p1"), relatedPlayerId: playerId("p2") }),
      event("in", "sub_in", { correlationId: "legacy-command", playerId: playerId("p2"), relatedPlayerId: playerId("p1") }),
    ] }))!;
    expect(report.recorded.substitutions).toBe(1);
    expect(report.timeline).toHaveLength(1);
    expect(report.timeline[0].text).toBe("Wissel: Amir eruit, Bram erin");
  });

  it("retains standalone player entries/exits and execution records without inventing a replacement", () => {
    const report = buildMatchReport(source({ events: [
      event("in", "sub_in", { playerId: playerId("p1"), note: "Kwam later aan." }),
      event("out", "sub_out", { playerId: playerId("p2"), timestamp: NOW + 1000 }),
      event("execution", "substitution_executed", { playerId: playerId("p3"), relatedPlayerId: playerId("p2"), timestamp: NOW + 2000 }),
    ] }))!;
    expect(report.timeline.map((row) => row.text)).toEqual(["Amir erin", "Bram eruit", "Wissel: Zoë eruit, Bram erin"]);
    expect(report.timeline[0].note).toBe("Kwam later aan.");
    expect(report.recorded.substitutions).toBe(3);
  });

  it("separates opponent cards from the team's recorded player counts", () => {
    const report = buildMatchReport(source({ events: [
      event("yellow", "yellow_card", { playerId: playerId("p1"), note: "Tijdstraf genoteerd." }),
      event("red", "red_card", { playerId: playerId("p2"), timestamp: NOW + 1000 }),
      event("opponent-red", "red_card", { isOpponentCard: true, playerId: playerId("p1"), playerName: "Nr. 6", timestamp: NOW + 2000 }),
    ] }))!;
    expect(report.timeline[0]).toMatchObject({ type: "card", text: "Gele kaart DIA JO13-02 · Amir", note: "Tijdstraf genoteerd." });
    expect(report.timeline[2].text).toBe("Rode kaart Voorbeeld JO13 · Nr. 6");
    expect(report.recorded).toMatchObject({ yellowCards: 1, redCards: 1 });
    expect(report.players.find((player) => player.playerId === "p1")).toMatchObject({ yellowCards: 1, redCards: 0 });
    expect(report.players.find((player) => player.playerId === "p2")?.redCards).toBe(1);
  });

  it("sorts chronologically by period and added time, rather than entry order or wall clock", () => {
    const report = buildMatchReport(source({ events: [
      event("second-half", "yellow_card", { quarter: 2, displayMinute: 31, timestamp: NOW }),
      event("first-half-late", "goal", { quarter: 1, displayMinute: 30, displayExtraMinute: 2, timestamp: NOW + 900000 }),
      event("first-half-earlier", "goal", { quarter: 1, displayMinute: 30, displayExtraMinute: 1, timestamp: NOW + 990000 }),
      event("kickoff", "quarter_start", { quarter: 1, displayMinute: 0, timestamp: NOW + 999000 }),
    ] }))!;
    expect(report.timeline.map((row) => row.id)).toEqual(["kickoff", "first-half-earlier", "first-half-late", "second-half"]);
    expect(report.timeline.map((row) => row.timeLabel)).toEqual(["0'", "30+1'", "30+2'", "31'"]);
    expect(report.timeline[0].text).toBe("Helft 1 gestart");
    expect(report.timeline[3].periodLabel).toBe("Helft 2");
  });

  it("uses display minute first, then game seconds, match milliseconds, and finally only the period", () => {
    const report = buildMatchReport(source({ quarterCount: 4, events: [
      event("display", "goal", { displayMinute: 10, displayExtraMinute: 2, gameSecond: 5 }),
      event("seconds", "yellow_card", { displayMinute: undefined, gameSecond: 125, matchMs: 900000 }),
      event("milliseconds", "red_card", { displayMinute: undefined, matchMs: 181000 }),
      event("unknown", "quarter_end", { quarter: 2, displayMinute: undefined, timestamp: NOW + 3600000 }),
    ] }))!;
    const byId = Object.fromEntries(report.timeline.map((row) => [row.id, row]));
    expect(byId.display.timeLabel).toBe("10+2'");
    expect(byId.seconds.timeLabel).toBe("2'");
    expect(byId.milliseconds.timeLabel).toBe("3'");
    expect(byId.unknown).toMatchObject({ timeLabel: "Kwart 2", periodLabel: "Kwart 2", text: "Kwart 2 afgelopen" });
    expect(report.completenessNotes).toContainEqual(expect.stringContaining("kloktijd wordt niet als speelminuut gebruikt"));
  });

  it("does not mutate source query arrays or the projected event data", () => {
    const input = source({ events: [
      event("late", "goal", { displayMinute: 50 }),
      event("early", "goal", { displayMinute: 5 }),
    ] });
    const before = structuredClone(input);
    buildMatchReport(input);
    expect(input).toEqual(before);
  });
});
