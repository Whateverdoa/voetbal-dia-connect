import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import {
  MobileApiError,
  optionalDateRange,
  resolveRefereeClubId,
  withMobileRequest,
} from "@/lib/mobile/mobileApi";
import { refereeAssignmentDto } from "@/lib/mobile/refereeDtos";
import {
  filterRefereeAssignmentsByRange,
  sortRefereeAssignmentsForList,
} from "@/lib/mobile/refereeOrdering";

const ASSIGNMENT_STATUSES = [
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export async function GET(request: NextRequest) {
  return await withMobileRequest(request, async ({ convex }) => {
    const range = optionalDateRange(request);
    const clubId = await resolveRefereeClubId(request, convex);
    const rawStatus = request.nextUrl.searchParams.get("status");
    const status = rawStatus
      ? ASSIGNMENT_STATUSES.find((candidate) => candidate === rawStatus)
      : undefined;
    if (rawStatus && !status) throw new MobileApiError("VALIDATION_ERROR");
    const assignments = await convex.query(
      api.refereeAssignmentQueries.listMyAssignments,
      status ? { clubId, status } : { clubId }
    );
    const visibleAssignments = filterRefereeAssignmentsByRange(
      assignments,
      range
    );
    return {
      items: sortRefereeAssignmentsForList(visibleAssignments).map(
        refereeAssignmentDto
      ),
      nextCursor: null,
    };
  });
}
