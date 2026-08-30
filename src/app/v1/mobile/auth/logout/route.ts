import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { withMobileRequest } from "@/lib/mobile/mobileApi";

export async function POST(request: NextRequest) {
  return await withMobileRequest(request, async ({ convex }) => {
    await convex.query(api.clubIdentity.getMyMobileSession, {});
    return { success: true, revokeAtProvider: true };
  });
}
