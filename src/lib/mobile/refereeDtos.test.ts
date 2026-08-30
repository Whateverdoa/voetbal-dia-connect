import { describe, expect, it } from "vitest";
import { refereeAssignmentDto, refereeOfferDto } from "./refereeDtos";

describe("referee mobile DTOs", () => {
  it("maps opaque ids and ISO timestamps without Convex metadata", () => {
    const dto = refereeOfferDto({
      offerId: "offer-1",
      status: "pending",
      version: 2,
      sentAt: Date.UTC(2026, 8, 1, 8, 0),
      expiresAt: Date.UTC(2026, 8, 2, 8, 0),
      respondedAt: null,
      responseNote: null,
      needId: "need-1",
      needStatus: "awaiting_response",
      needVersion: 4,
      arrivalAt: Date.UTC(2026, 8, 5, 8, 30),
      venue: "Sportpark DIA",
      match: {
        matchId: "match-1",
        teamName: "JO12-1",
        opponent: "Test United",
        scheduledAt: Date.UTC(2026, 8, 5, 9, 0),
        isHome: true,
      },
    } as never);

    expect(dto).toMatchObject({
      id: "offer-1",
      sentAt: "2026-09-01T08:00:00.000Z",
      expiresAt: "2026-09-02T08:00:00.000Z",
      need: { id: "need-1", version: 4 },
      match: { id: "match-1" },
    });
    expect(dto).not.toHaveProperty("_id");
    expect(dto).not.toHaveProperty("_creationTime");
  });

  it("maps confirmed assignments to the stable preparation shape", () => {
    const dto = refereeAssignmentDto({
      assignmentId: "assignment-1",
      status: "confirmed",
      version: 1,
      confirmedAt: Date.UTC(2026, 8, 1, 10, 0),
      needId: "need-1",
      arrivalAt: null,
      venue: null,
      match: {
        matchId: "match-1",
        teamName: "JO12-1",
        opponent: "Test United",
        scheduledAt: null,
        isHome: false,
      },
    } as never);

    expect(dto).toEqual({
      id: "assignment-1",
      status: "confirmed",
      version: 1,
      confirmedAt: "2026-09-01T10:00:00.000Z",
      need: { id: "need-1", arrivalAt: null, venue: null },
      match: {
        id: "match-1",
        teamName: "JO12-1",
        opponent: "Test United",
        scheduledAt: null,
        isHome: false,
      },
    });
  });
});
