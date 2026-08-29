import { describe, expect, it } from "vitest";
import {
  formatHomeVenueLabel,
  homeVenueFieldForMatch,
  parseDiaHomeField,
} from "./diaFields";

describe("diaFields", () => {
  it("parses Sportlink-style veld strings", () => {
    expect(parseDiaHomeField("veld 3")?.id).toBe("3");
    expect(parseDiaHomeField("Veld 1")?.surface).toBe("kunstgras");
    expect(parseDiaHomeField("VELD 4")?.surface).toBe("gras");
    expect(parseDiaHomeField("onbekend")).toBeNull();
  });

  it("formats known and unknown labels", () => {
    expect(formatHomeVenueLabel("veld 2")).toBe("Veld 2 (kunstgras)");
    expect(formatHomeVenueLabel("Sportpark X")).toBe("Sportpark X");
  });

  it("only returns venue for home matches", () => {
    expect(homeVenueFieldForMatch(true, "veld 3")).toBe("Veld 3 (kunstgras)");
    expect(homeVenueFieldForMatch(false, "veld 3")).toBeUndefined();
  });
});
