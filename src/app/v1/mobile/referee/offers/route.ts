import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import {
  MobileApiError,
  resolveRefereeClubId,
  withMobileRequest,
} from "@/lib/mobile/mobileApi";
import { refereeOfferDto } from "@/lib/mobile/refereeDtos";

const OFFER_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
  "withdrawn",
] as const;

export async function GET(request: NextRequest) {
  return await withMobileRequest(request, async ({ convex }) => {
    const clubId = await resolveRefereeClubId(request, convex);
    const rawStatus = request.nextUrl.searchParams.get("status");
    const status = rawStatus
      ? OFFER_STATUSES.find((candidate) => candidate === rawStatus)
      : undefined;
    if (rawStatus && !status) throw new MobileApiError("VALIDATION_ERROR");
    const offers = await convex.query(
      api.refereeAssignmentQueries.listMyOffers,
      status ? { clubId, status } : { clubId }
    );
    return { items: offers.map(refereeOfferDto), nextCursor: null };
  });
}
