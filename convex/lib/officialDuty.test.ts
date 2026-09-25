import { describe, expect, it } from "vitest";
import {
  assignedRefereeOwnsOfficialDuty,
  coachLeadMayPerformOfficialDuty,
} from "./officialDuty";

describe("official duty", () => {
  it("gives official duty to an assigned referee", () => {
    expect(assignedRefereeOwnsOfficialDuty({ refereeId: "ref1" })).toBe(true);
    expect(coachLeadMayPerformOfficialDuty({ refereeId: "ref1" })).toBe(false);
  });

  it("lets the match lead fill in when no referee is assigned", () => {
    expect(assignedRefereeOwnsOfficialDuty({})).toBe(false);
    expect(assignedRefereeOwnsOfficialDuty({ refereeId: null })).toBe(false);
    expect(coachLeadMayPerformOfficialDuty({})).toBe(true);
  });
});
