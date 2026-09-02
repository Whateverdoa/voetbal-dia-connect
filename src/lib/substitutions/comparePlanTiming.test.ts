import { describe, expect, it } from "vitest";
import { comparePlanTiming } from "./comparePlanTiming";

describe("comparePlanTiming", () => {
  it("orders by quarter then minute then sequence", () => {
    const rows = [
      { _id: "late", sequence: 0, targetQuarter: 1, targetMinute: 20 },
      { _id: "early", sequence: 1, targetQuarter: 1, targetMinute: 10 },
      { _id: "boundary", sequence: 2, targetQuarter: 1 },
      { _id: "q2", sequence: 3, targetQuarter: 2, targetMinute: 5 },
    ];
    expect([...rows].sort(comparePlanTiming).map((r) => r._id)).toEqual([
      "boundary",
      "early",
      "late",
      "q2",
    ]);
  });
});
