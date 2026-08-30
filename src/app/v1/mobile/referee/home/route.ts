import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import {
  resolveRefereeClubId,
  withMobileRequest,
} from "@/lib/mobile/mobileApi";
import {
  refereeAssignmentDto,
  refereeOfferDto,
} from "@/lib/mobile/refereeDtos";

export async function GET(request: NextRequest) {
  return await withMobileRequest(request, async ({ convex }) => {
    const clubId = await resolveRefereeClubId(request, convex);
    const [offers, assignments] = await Promise.all([
      convex.query(api.refereeAssignmentQueries.listMyOffers, {
        clubId,
        status: "pending",
      }),
      convex.query(api.refereeAssignmentQueries.listMyAssignments, {
        clubId,
        status: "confirmed",
      }),
    ]);
    const nextAssignment = assignments
      .filter(
        (assignment) =>
          assignment.match.scheduledAt === null ||
          assignment.match.scheduledAt >= Date.now()
      )
      .sort(
        (left, right) =>
          (left.match.scheduledAt ?? Number.MAX_SAFE_INTEGER) -
          (right.match.scheduledAt ?? Number.MAX_SAFE_INTEGER)
      )[0];
    return {
      pendingOfferCount: offers.length,
      pendingOffers: offers.map(refereeOfferDto),
      nextAssignment: nextAssignment
        ? refereeAssignmentDto(nextAssignment)
        : null,
      availabilityGaps: [],
      recentChanges: [],
    };
  });
}
