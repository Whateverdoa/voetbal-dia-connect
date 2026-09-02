import { describe, expect, it } from "vitest";
import {
  availabilityFlagsForStatus,
  availabilityStatus,
  isUnavailable,
  throwIfUnavailable,
} from "./matchPlayerAvailability";

describe("matchPlayerAvailability", () => {
  it("treats injured and absent as unavailable", () => {
    expect(isUnavailable({ injured: true })).toBe(true);
    expect(isUnavailable({ absent: true })).toBe(true);
    expect(isUnavailable({})).toBe(false);
  });

  it("prefers injured over absent when both flags are set", () => {
    expect(availabilityStatus({ injured: true, absent: true })).toBe("injured");
  });

  it("maps statuses to mutually exclusive flags", () => {
    expect(availabilityFlagsForStatus("available")).toEqual({
      absent: false,
      injured: false,
    });
    expect(availabilityFlagsForStatus("absent")).toEqual({
      absent: true,
      injured: false,
    });
    expect(availabilityFlagsForStatus("injured")).toEqual({
      absent: false,
      injured: true,
    });
  });

  it("throws Dutch errors for field, sub, and plan", () => {
    expect(() => throwIfUnavailable({}, "field")).not.toThrow();
    expect(() => throwIfUnavailable({ absent: true }, "field")).toThrow(
      "Afwezige speler kan niet op het veld worden geplaatst"
    );
    expect(() => throwIfUnavailable({ injured: true }, "field")).toThrow(
      "Geblesseerde speler kan niet op het veld worden geplaatst"
    );
    expect(() => throwIfUnavailable({ injured: true }, "sub")).toThrow(
      "Geblesseerde speler kan niet worden ingewisseld"
    );
    expect(() => throwIfUnavailable({ absent: true }, "plan")).toThrow(
      "Afwezige speler kan niet in het wisselplan"
    );
  });
});
