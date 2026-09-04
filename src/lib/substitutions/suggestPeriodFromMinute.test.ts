import { describe, expect, it } from "vitest";
import {
  periodChipLabel,
  suggestPeriodFromMinute,
} from "./suggestPeriodFromMinute";

describe("suggestPeriodFromMinute", () => {
  it("maps 60' / 2 halves", () => {
    expect(suggestPeriodFromMinute(0, 2, 60)).toBe(1);
    expect(suggestPeriodFromMinute(29, 2, 60)).toBe(1);
    expect(suggestPeriodFromMinute(30, 2, 60)).toBe(2);
    expect(suggestPeriodFromMinute(45, 2, 60)).toBe(2);
    expect(suggestPeriodFromMinute(90, 2, 60)).toBe(2);
  });

  it("maps 60' / 4 quarters", () => {
    expect(suggestPeriodFromMinute(0, 4, 60)).toBe(1);
    expect(suggestPeriodFromMinute(14, 4, 60)).toBe(1);
    expect(suggestPeriodFromMinute(15, 4, 60)).toBe(2);
    expect(suggestPeriodFromMinute(30, 4, 60)).toBe(3);
    expect(suggestPeriodFromMinute(45, 4, 60)).toBe(4);
  });

  it("falls back safely on junk input", () => {
    expect(suggestPeriodFromMinute(-1, 2, 60)).toBe(1);
    expect(suggestPeriodFromMinute(10, 0, 60)).toBe(1);
    expect(suggestPeriodFromMinute(10, 2, 0)).toBe(1);
  });
});

describe("periodChipLabel", () => {
  it("uses H for halves and K for quarters", () => {
    expect(periodChipLabel(1, 2)).toBe("H1");
    expect(periodChipLabel(2, 2)).toBe("H2");
    expect(periodChipLabel(3, 4)).toBe("K3");
  });
});
