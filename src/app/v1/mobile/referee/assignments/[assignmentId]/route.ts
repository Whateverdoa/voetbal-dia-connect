import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MobileApiError, withMobileRequest } from "@/lib/mobile/mobileApi";
import { refereeAssignmentDto } from "@/lib/mobile/refereeDtos";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
) {
  return await withMobileRequest(request, async ({ convex }) => {
    const { assignmentId } = await context.params;
    const assignment = await convex.query(
      api.refereeAssignmentQueries.getMyAssignment,
      { assignmentId: assignmentId as Id<"refereeAssignments"> }
    );
    if (!assignment) throw new MobileApiError("NOT_FOUND");
    return refereeAssignmentDto(assignment);
  });
}
