import { describe, expect, it } from "vitest";
import {
  filterRefereeAssignmentsByRange,
  sortRefereeAssignmentsForList,
  sortRefereeOffersByUrgency,
} from "./refereeOrdering";

describe("referee mobile list ordering", () => {
  it("puts pending offers first by nearest response deadline", () => {
    const offers = [
      { id: "declined", status: "declined", expiresAt: 50, sentAt: 40 },
      { id: "later", status: "pending", expiresAt: 30, sentAt: 20 },
      { id: "accepted", status: "accepted", expiresAt: 20, sentAt: 30 },
      { id: "urgent", status: "pending", expiresAt: 10, sentAt: 10 },
    ];

    expect(sortRefereeOffersByUrgency(offers).map((offer) => offer.id)).toEqual([
      "urgent",
      "later",
      "accepted",
      "declined",
    ]);
  });

  it("puts upcoming confirmed assignments before inactive history", () => {
    const assignments = [
      assignment("cancelled", "cancelled", 400, 50),
      assignment("past", "confirmed", 50, 20),
      assignment("later", "confirmed", 300, 30),
      assignment("next", "confirmed", 200, 40),
      assignment("unknown", "confirmed", null, 60),
    ];

    expect(
      sortRefereeAssignmentsForList(assignments, 100).map(
        (assignment) => assignment.id
      )
    ).toEqual(["next", "later", "unknown", "past", "cancelled"]);
  });

  it("filters assignments using inclusive ISO-derived boundaries", () => {
    const assignments = [
      assignment("before", "confirmed", 99, 10),
      assignment("from", "confirmed", 100, 20),
      assignment("to", "cancelled", 200, 30),
      assignment("after", "confirmed", 201, 40),
      assignment("unknown", "confirmed", null, 50),
    ];

    expect(
      filterRefereeAssignmentsByRange(assignments, { from: 100, to: 200 }).map(
        (assignment) => assignment.id
      )
    ).toEqual(["from", "to"]);
  });
});

function assignment(
  id: string,
  status: string,
  scheduledAt: number | null,
  confirmedAt: number
) {
  return { id, status, confirmedAt, match: { scheduledAt } };
}
