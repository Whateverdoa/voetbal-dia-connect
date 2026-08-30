import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";

const convex = vi.hoisted(() => ({
  constructorUrl: "",
  authToken: "",
  query: vi.fn(),
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    constructor(url: string) {
      convex.constructorUrl = url;
    }

    setAuth(token: string) {
      convex.authToken = token;
    }

    query = convex.query;
  },
}));

import { GET } from "./route";

const originalConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

describe("GET /v1/mobile/referee/offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    convex.authToken = "";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://mobile-test.convex.cloud";
  });

  afterEach(() => {
    if (originalConvexUrl === undefined) {
      delete process.env.NEXT_PUBLIC_CONVEX_URL;
    } else {
      process.env.NEXT_PUBLIC_CONVEX_URL = originalConvexUrl;
    }
  });

  it("forwards Clerk auth, resolves club scope, and returns stable DTOs", async () => {
    convex.query.mockImplementation(async (query) => {
      if (query === api.clubIdentity.getMyClubMemberships) {
        return [
          {
            membershipId: "membership-1",
            clubId: "club-1",
            clubName: "DIA",
            roles: ["referee"],
            status: "active",
            version: 1,
          },
        ];
      }
      if (query === api.refereeAssignmentQueries.listMyOffers) {
        return [
          {
            offerId: "offer-1",
            status: "pending",
            version: 1,
            sentAt: Date.UTC(2026, 8, 1, 8, 0),
            expiresAt: Date.UTC(2026, 8, 2, 8, 0),
            respondedAt: null,
            responseNote: null,
            needId: "need-1",
            needStatus: "awaiting_response",
            needVersion: 2,
            arrivalAt: null,
            venue: null,
            match: {
              matchId: "match-1",
              teamName: "JO12-1",
              opponent: "Test United",
              scheduledAt: Date.UTC(2026, 8, 5, 9, 0),
              isHome: true,
            },
          },
        ];
      }
      throw new Error(`Unexpected query ${String(query)}`);
    });

    const response = await GET(
      new NextRequest("https://example.test/v1/mobile/referee/offers", {
        headers: { authorization: "Bearer clerk-token" },
      })
    );

    expect(response.status).toBe(200);
    expect(convex.constructorUrl).toBe("https://mobile-test.convex.cloud");
    expect(convex.authToken).toBe("clerk-token");
    expect(convex.query).toHaveBeenCalledWith(
      api.refereeAssignmentQueries.listMyOffers,
      { clubId: "club-1" }
    );
    await expect(response.json()).resolves.toMatchObject({
      items: [
        {
          id: "offer-1",
          status: "pending",
          need: { id: "need-1" },
          match: { id: "match-1" },
        },
      ],
      nextCursor: null,
    });
  });

  it("denies a requested club outside the referee memberships", async () => {
    convex.query.mockResolvedValue([
      {
        membershipId: "membership-1",
        clubId: "club-1",
        clubName: "DIA",
        roles: ["referee"],
        status: "active",
        version: 1,
      },
    ]);

    const response = await GET(
      new NextRequest(
        "https://example.test/v1/mobile/referee/offers?clubId=club-other",
        { headers: { authorization: "Bearer clerk-token" } }
      )
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });
});
