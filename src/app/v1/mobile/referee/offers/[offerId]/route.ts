import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MobileApiError, withMobileRequest } from "@/lib/mobile/mobileApi";
import { refereeOfferDto } from "@/lib/mobile/refereeDtos";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ offerId: string }> }
) {
  return await withMobileRequest(request, async ({ convex }) => {
    const { offerId } = await context.params;
    const offer = await convex.query(api.refereeAssignmentQueries.getMyOffer, {
      offerId: offerId as Id<"refereeOffers">,
    });
    if (!offer) throw new MobileApiError("NOT_FOUND");
    return refereeOfferDto(offer);
  });
}
