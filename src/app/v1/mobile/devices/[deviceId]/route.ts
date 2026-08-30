import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { withMobileRequest } from "@/lib/mobile/mobileApi";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ deviceId: string }> }
) {
  return await withMobileRequest(request, async ({ convex }) => {
    const { deviceId } = await context.params;
    return await convex.mutation(api.mobileDevices.unregisterMyDevice, {
      deviceId: deviceId as Id<"mobileDevices">,
    });
  });
}
