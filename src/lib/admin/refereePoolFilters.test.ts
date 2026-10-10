import { describe, expect, it } from "vitest";
import {
  filterRefereePool,
  isInClaimPool,
  summarizeRefereePool,
} from "./refereePoolFilters";

const sample = [
  {
    name: "Anna",
    email: "anna@dia.nl",
    active: true,
    inClaimPool: true,
    qualificationTags: ["JO12", "8v8"],
  },
  {
    name: "Bram Coach",
    email: "bram@dia.nl",
    active: true,
    qualificationTags: [],
  },
  {
    name: "Carla",
    email: "carla@dia.nl",
    active: false,
    inClaimPool: true,
    qualificationTags: ["JO16"],
  },
];

describe("refereePoolFilters", () => {
  it("treats only explicit inClaimPool as poule members", () => {
    expect(isInClaimPool({ inClaimPool: true })).toBe(true);
    expect(isInClaimPool({})).toBe(false);
    expect(isInClaimPool({ inClaimPool: false })).toBe(false);
  });

  it("filters by membership and tags", () => {
    const result = filterRefereePool(sample, {
      search: "",
      activeFilter: "actief",
      membershipFilter: "in-poule",
      tagsFilter: "alle",
      requiredTags: ["JO12"],
    });
    expect(result.map((r) => r.name)).toEqual(["Anna"]);
  });

  it("searches name and email", () => {
    const result = filterRefereePool(sample, {
      search: "coach",
      activeFilter: "alle",
      membershipFilter: "alle",
      tagsFilter: "alle",
      requiredTags: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Bram Coach");
  });

  it("summarizes pool", () => {
    expect(summarizeRefereePool(sample)).toEqual({
      total: 3,
      inPoule: 2,
      active: 2,
      withoutTags: 1,
    });
  });
});
