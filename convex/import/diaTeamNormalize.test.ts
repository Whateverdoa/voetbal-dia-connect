import { describe, expect, it } from "vitest";
import { extractDiaMatch, normalizeDiaSlug } from "./diaTeamNormalize";

describe("normalizeDiaSlug", () => {
  it("maps Sportlink spaced JO labels", () => {
    expect(normalizeDiaSlug("JO 12-4")).toBe("jo12-4");
    expect(normalizeDiaSlug("JO 11-2")).toBe("jo11-2");
  });

  it("maps O-youth to jo*", () => {
    expect(normalizeDiaSlug("O10-1")).toBe("jo10-1");
    expect(normalizeDiaSlug("O13-2JM")).toBe("jo13-2");
    expect(normalizeDiaSlug("JO13-2JM")).toBe("jo13-2");
  });

  it("maps bare senior numbers to zo*", () => {
    expect(normalizeDiaSlug("1")).toBe("zo1");
    expect(normalizeDiaSlug("10")).toBe("zo10");
  });

  it("keeps existing VA mappings", () => {
    expect(normalizeDiaSlug("1 (zon)")).toBe("zo1");
    expect(normalizeDiaSlug("35+3")).toBe("35-3");
    expect(normalizeDiaSlug("JO15-1")).toBe("jo15-1");
    expect(normalizeDiaSlug("MO15-1")).toBe("mo15-1");
  });
});

describe("extractDiaMatch", () => {
  it("detects home DIA team", () => {
    const result = extractDiaMatch("DIA JO15-1", "TSC JO15-1");
    expect(result).toEqual({
      teamSlug: "jo15-1",
      opponent: "TSC JO15-1",
      isHome: true,
      opponentLogoUrl: undefined,
    });
  });

  it("detects away DIA with spaced name", () => {
    const result = extractDiaMatch("TSC O12-1", "DIA JO 12-4");
    expect(result?.teamSlug).toBe("jo12-4");
    expect(result?.isHome).toBe(false);
  });
});
