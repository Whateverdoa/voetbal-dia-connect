import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  MobileApiError,
  optionalString,
  readJsonObject,
  requiredCorrelationId,
  requiredVersion,
  withMobileRequest,
} from "@/lib/mobile/mobileApi";
import { refereeOfferDto } from "@/lib/mobile/refereeDtos";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ offerId: string }> }
) {
  return await withMobileRequest(request, async ({ convex }) => {
    const { offerId } = await context.params;
    const body = await readJsonObject(request);
    const result = await convex.mutation(
      api.refereeAssignmentCommands.acceptOffer,
      {
        offerId: offerId as Id<"refereeOffers">,
        offerVersion: requiredVersion(body),
        responseNote: optionalString(body, "note"),
        correlationId: requiredCorrelationId(body),
      }
    );
    const offer = await convex.query(api.refereeAssignmentQueries.getMyOffer, {
      offerId: result.offerId,
    });
    if (!offer) throw new MobileApiError("NOT_FOUND");
    return {
      offer: refereeOfferDto(offer),
      need: {
        id: String(offer.needId),
        status: result.needStatus,
        version: result.needVersion,
      },
    };
  });
}
