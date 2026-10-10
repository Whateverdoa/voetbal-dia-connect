import { describe, expect, it } from "vitest";
import {
  cardNoteFor,
  deriveActiveTimePenalties,
  disciplineBadgeByPlayerId,
  formatPenaltyCountdown,
  matchPenaltyClockNow,
  opponentCardNote,
  penaltyDurationMs,
  YELLOW_PENALTY_MS,
  DIRECT_RED_REPLACE_MS,
  SECOND_YELLOW_REPLACE_MS,
} from "./cardRules";

describe("cardNoteFor", () => {
  it("marks first yellow as 5-minute time penalty", () => {
    expect(cardNoteFor("yellow_card", 0)).toEqual({
      eventType: "yellow_card",
      note: "gele kaart · tijdstraf 5 min",
    });
  });

  it("turns second yellow into red with replace-after-5 note", () => {
    expect(cardNoteFor("yellow_card", 1)).toEqual({
      eventType: "red_card",
      alsoYellow: true,
      note: "2x geel · uitsluiting · vervangen na 5 min",
    });
  });

  it("marks direct red with replace-after-10 note", () => {
    expect(cardNoteFor("red_card", 0)).toEqual({
      eventType: "red_card",
      note: "direct rood · uitsluiting · vervangen na 10 min",
    });
  });
});

describe("opponentCardNote", () => {
  it("logs admin-only notes without time-penalty wording", () => {
    expect(opponentCardNote("yellow_card")).toEqual({
      eventType: "yellow_card",
      note: "tegenstander · geel",
    });
    expect(opponentCardNote("red_card")).toEqual({
      eventType: "red_card",
      note: "tegenstander · rood",
    });
  });
});

describe("penaltyDurationMs", () => {
  it("uses 5 min for yellow and second-yellow red, 10 for direct red", () => {
    expect(penaltyDurationMs("yellow_card", "gele kaart · tijdstraf 5 min")).toBe(
      YELLOW_PENALTY_MS
    );
    expect(penaltyDurationMs("yellow_card", "tweede gele kaart")).toBeNull();
    expect(
      penaltyDurationMs("red_card", "2x geel · uitsluiting · vervangen na 5 min")
    ).toBe(SECOND_YELLOW_REPLACE_MS);
    expect(
      penaltyDurationMs("red_card", "direct rood · uitsluiting · vervangen na 10 min")
    ).toBe(DIRECT_RED_REPLACE_MS);
  });
});

describe("deriveActiveTimePenalties", () => {
  const t0 = 1_000_000;

  it("counts down a yellow sit-out", () => {
    const penalties = deriveActiveTimePenalties(
      [
        {
          type: "yellow_card",
          playerId: "p1",
          playerName: "Jan",
          note: "gele kaart · tijdstraf 5 min",
          timestamp: t0,
        },
      ],
      t0 + 60_000,
      false
    );
    expect(penalties).toHaveLength(1);
    expect(penalties[0]?.kind).toBe("sit_out");
    expect(penalties[0]?.remainingMs).toBe(YELLOW_PENALTY_MS - 60_000);
  });

  it("skips companion second-yellow event and uses red replace wait", () => {
    const penalties = deriveActiveTimePenalties(
      [
        {
          type: "yellow_card",
          playerId: "p1",
          playerName: "Jan",
          note: "tweede gele kaart",
          timestamp: t0,
        },
        {
          type: "red_card",
          playerId: "p1",
          playerName: "Jan",
          note: "2x geel · uitsluiting · vervangen na 5 min",
          timestamp: t0,
        },
      ],
      t0 + 30_000,
      false
    );
    expect(penalties).toHaveLength(1);
    expect(penalties[0]?.kind).toBe("replace_wait");
    expect(penalties[0]?.durationMs).toBe(SECOND_YELLOW_REPLACE_MS);
  });

  it("shows ready state shortly after expiry", () => {
    const penalties = deriveActiveTimePenalties(
      [
        {
          type: "red_card",
          playerId: "p2",
          playerName: "Piet",
          note: "direct rood · uitsluiting · vervangen na 10 min",
          timestamp: t0,
        },
      ],
      t0 + DIRECT_RED_REPLACE_MS + 5_000,
      false
    );
    expect(penalties).toHaveLength(1);
    expect(penalties[0]?.ready).toBe(true);
    expect(penalties[0]?.remainingMs).toBe(0);
  });

  it("ignores opponent cards", () => {
    const penalties = deriveActiveTimePenalties(
      [
        {
          type: "yellow_card",
          isOpponentCard: true,
          note: "tegenstander · geel",
          timestamp: t0,
        },
      ],
      t0 + 2_000,
      false
    );
    expect(penalties).toEqual([]);
  });
});

describe("matchPenaltyClockNow", () => {
  it("freezes during pause and half-time", () => {
    expect(
      matchPenaltyClockNow(2_000, {
        status: "live",
        pausedAt: 1_500,
      })
    ).toEqual({ clockNow: 1_500, frozen: true });

    expect(
      matchPenaltyClockNow(9_000, {
        status: "halftime",
        halftimeStartedAt: 8_000,
      })
    ).toEqual({ clockNow: 8_000, frozen: true });
  });
});

describe("formatPenaltyCountdown", () => {
  it("formats as m:ss", () => {
    expect(formatPenaltyCountdown(5 * 60 * 1000)).toBe("5:00");
    expect(formatPenaltyCountdown(65_000)).toBe("1:05");
    expect(formatPenaltyCountdown(500)).toBe("0:01");
  });
});

describe("disciplineBadgeByPlayerId", () => {
  it("shows yellow, upgrades to red, ignores opponent", () => {
    const map = disciplineBadgeByPlayerId([
      { type: "yellow_card", playerId: "p1" },
      { type: "yellow_card", playerId: "p2" },
      { type: "red_card", playerId: "p2" },
      { type: "yellow_card", isOpponentCard: true },
    ]);
    expect(map.get("p1")).toBe("yellow");
    expect(map.get("p2")).toBe("red");
    expect(map.size).toBe(2);
  });
});
