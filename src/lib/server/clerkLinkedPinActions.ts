"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { parseRolesFromMetadata } from "@/lib/auth/roles";

type LinkedRole = "coach" | "referee" | "admin";

interface LinkedRoleResult {
  ok: boolean;
}

interface ClerkUserForLink {
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
}

function getPrimaryEmail(user: {
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
}): string | null {
  if (!user.emailAddresses?.length) return null;
  const primary =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ??
    user.emailAddresses[0];
  return primary?.emailAddress?.toLowerCase() ?? null;
}

function userHasRole(user: ClerkUserForLink, role: LinkedRole): boolean {
  return parseRolesFromMetadata(user.publicMetadata).includes(role);
}

function mergeRoles(existing: unknown, roleToAdd: LinkedRole): LinkedRole[] {
  const roles = parseRolesFromMetadata({ roles: existing });
  if (!roles.includes(roleToAdd)) roles.push(roleToAdd);
  return roles;
}

export async function getLinkedRoleForRole(
  role: LinkedRole
): Promise<LinkedRoleResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (!userHasRole(user, role)) {
    return { ok: false };
  }

  // Bootstrap coach by email from database link only.
  if (role === "coach") {
    const primaryEmail = getPrimaryEmail(user);
    if (!primaryEmail) return { ok: false };

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return { ok: false };
    const convex = new ConvexHttpClient(convexUrl);

    let linkedCoach:
      | { coachId: string; coachName: string; teamIds: string[] }
      | null = null;
    const linkSecret = process.env.CONVEX_LINK_SECRET;
    if (linkSecret) {
      const linkData = await convex.query(api.clerkLink.getCoachByEmailForLink, {
        email: primaryEmail,
        linkSecret,
      });
      if (linkData) {
        linkedCoach = {
          coachId: linkData.coachId,
          coachName: linkData.coachName,
          teamIds: linkData.teamIds,
        };
      }
    }
    if (!linkedCoach) return { ok: false };

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        roles: mergeRoles(user.publicMetadata?.roles, "coach"),
        role: "coach",
        ...(linkedCoach
          ? {
              linkedCoachId: linkedCoach.coachId,
              linkedCoachName: linkedCoach.coachName,
              linkedTeamIds: linkedCoach.teamIds,
            }
          : {}),
      },
    });
    return { ok: true };
  }

  return { ok: false };
}
