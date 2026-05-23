import { describe, expect, it } from "vitest";
import { buildSubstitutionPlanOrderAfterInsert } from "./substitutionPlanRows";

function row(
  id: string,
  sequence: number,
  status: "pending" | "skipped" | "executed" = "pending",
  targetQuarter?: number
) {
  return {
    _id: id,
    sequence,
    status,
    targetQuarter,
  };
}

describe("buildSubstitutionPlanOrderAfterInsert", () => {
  it("inserts into an existing quarter block", () => {
    const ordered = buildSubstitutionPlanOrderAfterInsert(
      [
        row("q1-a", 0, "pending", 1),
        row("q2-a", 1, "pending", 2),
        row("q2-b", 2, "pending", 2),
        row("later", 3, "pending", 4),
      ],
      row("new", 99, "pending", 2),
      { insertAtQuarterBoundary: true }
    );

    expect(ordered).toEqual(["q1-a", "q2-a", "q2-b", "new", "later"]);
  });

  it("inserts into an empty quarter after earlier quarters and before later ones", () => {
    const ordered = buildSubstitutionPlanOrderAfterInsert(
      [
        row("q1-a", 0, "pending", 1),
        row("q3-a", 1, "pending", 3),
        row("quarterless", 2),
      ],
      row("new", 99, "pending", 2),
      { insertAtQuarterBoundary: true }
    );

    expect(ordered).toEqual(["q1-a", "new", "q3-a", "quarterless"]);
  });

  it("keeps quarterless pending rows after quarter-assigned rows", () => {
    const ordered = buildSubstitutionPlanOrderAfterInsert(
      [row("quarterless-a", 0), row("quarterless-b", 1)],
      row("q1", 99, "pending", 1),
      { insertAtQuarterBoundary: true }
    );

    expect(ordered).toEqual(["q1", "quarterless-a", "quarterless-b"]);
  });

  it("appends normally when quarter placement is not requested", () => {
    const ordered = buildSubstitutionPlanOrderAfterInsert(
      [row("existing", 0)],
      row("new", 1, "pending", 1)
    );

    expect(ordered).toEqual(["existing", "new"]);
  });

  it("preserves non-pending rows while inserting among pending rows", () => {
    const ordered = buildSubstitutionPlanOrderAfterInsert(
      [
        row("done", 0, "executed", 1),
        row("q1", 1, "pending", 1),
        row("quarterless", 2),
      ],
      row("new", 99, "pending", 1),
      { insertAtQuarterBoundary: true }
    );

    expect(ordered).toEqual(["done", "q1", "new", "quarterless"]);
  });
});
