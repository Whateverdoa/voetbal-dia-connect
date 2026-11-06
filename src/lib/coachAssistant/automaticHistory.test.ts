import { describe, expect, it } from "vitest";
import { assistantSourceFixture } from "../../test/fixtures/coachAssistant";
import { automaticHistoryMatch, type HistoricalCoachMatch } from "./automaticHistory";
import { workspacePlan } from "../../../convex/lib/coachAssistantWorkspace";
import { collectEvidence } from "./history";
import { proposeCoachPlan } from "./proposePlan";
import type { AssistantInput } from "./types";

function finished() {
  const source = assistantSourceFixture();
  const match = { ...source.match, status: "finished", scheduledAt: Date.parse("2026-10-03T10:00:00+02:00"), frozenClockMs: 3600000,
    teamName: "JO13-2", customFormationTemplate: null, events: [], substitutionPlans: [],
    players: source.players.map(({ entry, player }) => ({ ...entry, matchPlayerId: entry._id, name: player.name, number: player.number,
      positionPrimary: player.positionPrimary, positionSecondary: player.positionSecondary,
      minutesPlayed: entry.absent || entry.injured ? 0 : 30, absent: entry.absent ?? false, injured: entry.injured ?? false })) } as HistoricalCoachMatch;
  return { source, match };
}

describe("automatic DIA Live history", () => {
  it("retains recorded minutes and final positions without inventing kickoff or keeper splits", () => {
    const { match } = finished();
    const result = automaticHistoryMatch(match).match!;
    expect(result.source).toBe("dia_live"); expect(result.startingLineupConfirmed).toBe(false);
    expect(result.players.every((player) => player.startingPosition === null && player.keeperMinutes === null)).toBe(true);
    const fieldPlayer = match.players.find((player) => player?.onField && !player.isKeeper)!;
    expect(result.players.find((player) => player.playerKey === fieldPlayer.playerId)).toMatchObject({ minutes: 30, attendance: "present" });
    expect(result.players.some((player) => player.recordedPosition && player.recordedPosition !== "BENCH")).toBe(true);
  });

  it("does not turn default zero minutes into verified attendance and excludes impossible totals", () => {
    const { match } = finished(); const player = match.players[0]!;
    player.minutesPlayed = 0; player.absent = false; player.injured = false;
    expect(automaticHistoryMatch(match).match!.players[0]).toMatchObject({ minutes: null, attendance: "unknown" });
    player.minutesPlayed = 69.1;
    const converted = automaticHistoryMatch(match);
    expect(converted.match!.players[0].minutes).toBeNull();
    expect(converted.warnings.join(" ")).toMatch(/buiten de geregistreerde wedstrijdduur/);
    match.status = "live";
    expect(automaticHistoryMatch(match).match).toBeNull();
  });

  it("uses known total playing time while retaining unknown keeper and kickoff data", () => {
    const { source, match } = finished();
    const plan = workspacePlan(source).plan;
    const input: AssistantInput = { plan, targetDate: "2026-10-17", teamKey: String(source.match.teamId), keeperKey: plan.startingLineup.keeperKey,
      players: plan.players.map((player) => ({ key: player.key, availability: player.absent ? "injured" : "present", primaryPosition: null, secondaryPosition: null })),
      history: [automaticHistoryMatch(match).match!], intervalMinutes: 10, includeSubstitutions: true };
    const facts = collectEvidence(input).evidence.find((row) => row.playerKey === input.keeperKey)!;
    expect(facts).toMatchObject({ fieldMinutes: null, recordedMinutes: 30, recordedEligibleMinutes: 60, starts: null });
    const result = proposeCoachPlan(input);
    expect(result).toMatchObject({ ok: true, proposal: { usesHistoricalMinutes: true, usesHistoricalStarts: false, historicalMinuteBasis: "recorded" } });
  });
});
