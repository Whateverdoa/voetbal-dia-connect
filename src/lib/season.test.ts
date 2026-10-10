import { describe, expect, it } from "vitest";
import {
  activeSeasonKey,
  isActiveSeasonMatch,
  seasonKeyFromMs,
} from "./season";

describe("season helpers", () => {
  it("uses July as season boundary", () => {
    // March 2026 → 2025-2026
    expect(seasonKeyFromMs(Date.UTC(2026, 2, 15))).toBe("2025-2026");
    // August 2026 → 2026-2027
    expect(seasonKeyFromMs(Date.UTC(2026, 7, 1))).toBe("2026-2027");
  });

  it("infers season from kickoff when seasonKey is missing", () => {
    expect(
      isActiveSeasonMatch(
        { scheduledAt: Date.UTC(2026, 2, 15) },
        "2025-2026"
      )
    ).toBe(true);
    expect(
      isActiveSeasonMatch(
        { scheduledAt: Date.UTC(2026, 2, 15) },
        "2026-2027"
      )
    ).toBe(false);
    expect(isActiveSeasonMatch({}, "2026-2027")).toBe(false);
  });

  it("filters other seasons", () => {
    expect(
      isActiveSeasonMatch({ seasonKey: "2024-2025" }, "2025-2026")
    ).toBe(false);
    expect(
      isActiveSeasonMatch({ seasonKey: "2025-2026" }, "2025-2026")
    ).toBe(true);
  });

  it("activeSeasonKey matches seasonKeyFromMs(now)", () => {
    const now = Date.UTC(2026, 7, 30);
    expect(activeSeasonKey(now)).toBe(seasonKeyFromMs(now));
  });
});
