import { describe, expect, it } from "vitest";
import { aggregateSeasonPlayingTime } from "./seasonPlayingTime";

describe("aggregateSeasonPlayingTime", () => {
  const players = [
    { playerId: "a", name: "Jan", number: 10, active: true },
    { playerId: "b", name: "Piet", number: 7, active: true },
    { playerId: "c", name: "Inactive", number: 1, active: false },
  ];

  it("sums minutes and match appearances per active player", () => {
    const totals = aggregateSeasonPlayingTime(players, [
      { playerId: "a", minutesPlayed: 40 },
      { playerId: "a", minutesPlayed: 35.4 },
      { playerId: "b", minutesPlayed: 20 },
      { playerId: "c", minutesPlayed: 60 },
    ]);

    expect(totals).toEqual([
      {
        playerId: "b",
        name: "Piet",
        number: 7,
        matchesPlayed: 1,
        totalMinutes: 20,
      },
      {
        playerId: "a",
        name: "Jan",
        number: 10,
        matchesPlayed: 2,
        totalMinutes: 75,
      },
    ]);
  });

  it("includes active players with zero minutes", () => {
    const totals = aggregateSeasonPlayingTime(players, []);
    expect(totals).toHaveLength(2);
    expect(totals.every((row) => row.totalMinutes === 0)).toBe(true);
  });
});
