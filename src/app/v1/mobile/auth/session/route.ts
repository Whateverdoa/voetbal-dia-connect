import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import { withMobileRequest } from "@/lib/mobile/mobileApi";

export async function POST(request: NextRequest) {
  return await withMobileRequest(request, async ({ convex }) => {
    await convex.mutation(api.clubIdentity.syncCurrentAccount, {});
    const session = await convex.query(api.clubIdentity.getMyMobileSession, {});
    const activeMemberships = session.memberships.filter(
      (membership) => membership.status === "active"
    );
    return {
      profile: {
        id: String(session.profile.id),
        displayName: session.profile.displayName,
        email: session.profile.email,
      },
      memberships: session.memberships.map((membership) => ({
        id: String(membership.membershipId),
        clubId: String(membership.clubId),
        clubName: membership.clubName,
        roles: membership.roles,
        status: membership.status,
        version: membership.version,
      })),
      activeWorkspace: activeMemberships[0]
        ? {
            clubId: String(activeMemberships[0].clubId),
            clubName: activeMemberships[0].clubName,
          }
        : null,
      token: {
        provider: "clerk",
        transport: "bearer",
      },
    };
  });
}
