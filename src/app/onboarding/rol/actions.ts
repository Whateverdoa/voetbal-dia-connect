"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

type AssignableRole = "admin" | "coach" | "referee";

interface RoleActionResult {
  ok: boolean;
  error?: string;
}

interface LinkActionResult {
  ok: boolean;
  error?: string;
}

function getConvexClient(): ConvexHttpClient | null {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return null;
  }
  return new ConvexHttpClient(convexUrl);
}

function getBootstrapAdminEmails(): Set<string> {
  const raw = process.env.CLERK_BOOTSTRAP_ADMIN_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return new Set(emails);
}

function getPrimaryEmail(user: {
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
}): string | null {
  if (!user.emailAddresses || user.emailAddresses.length === 0) {
    return null;
  }
  const primary =
    user.emailAddresses.find(
      (entry) => entry.id === user.primaryEmailAddressId
    ) ?? user.emailAddresses[0];
  return primary?.emailAddress?.toLowerCase() ?? null;
}

export async function setUserRole(role: AssignableRole): Promise<RoleActionResult> {
  if (!["admin", "coach", "referee"].includes(role)) {
    return { ok: false, error: "Onbekende rol." };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Je bent niet ingelogd." };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const currentRole = user.publicMetadata?.role;
  if (typeof currentRole === "string" && currentRole.length > 0) {
    return { ok: false, error: "Je rol is al ingesteld." };
  }

  if (role === "admin") {
    const bootstrapAdminEmails = getBootstrapAdminEmails();
    const primaryEmail = getPrimaryEmail(user);
    const isBootstrapAdmin =
      primaryEmail !== null && bootstrapAdminEmails.has(primaryEmail);
    if (!isBootstrapAdmin) {
      return { ok: false, error: "Admin-rol is niet beschikbaar voor dit account." };
    }
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: { ...user.publicMetadata, role },
  });

  return { ok: true };
}

export async function linkUserRoleWithPin(pin: string): Promise<LinkActionResult> {
  const trimmedPin = pin.trim();
  if (!/^\d{4,6}$/.test(trimmedPin)) {
    return { ok: false, error: "Voer een geldige PIN in (4-6 cijfers)." };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Je bent niet ingelogd." };
  }

  const convex = getConvexClient();
  if (!convex) {
    return { ok: false, error: "Convex is niet geconfigureerd." };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = user.publicMetadata?.role;
  if (role !== "admin" && role !== "coach" && role !== "referee") {
    return { ok: false, error: "Kies eerst een rol." };
  }

  try {
    if (role === "coach") {
      const coachData = await convex.query(api.matches.verifyCoachPin, {
        pin: trimmedPin,
      });
      if (!coachData) {
        return { ok: false, error: "Coach PIN ongeldig." };
      }

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          linkedCoachId: coachData.coach.id,
          linkedCoachName: coachData.coach.name,
          linkedTeamIds: coachData.teams.map((team) => team.id),
        },
      });
      return { ok: true };
    }

    if (role === "referee") {
      const refereeData = await convex.query(api.matches.getMatchesForReferee, {
        pin: trimmedPin,
      });
      if (!refereeData) {
        return { ok: false, error: "Scheidsrechter PIN ongeldig." };
      }

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          linkedRefereeId: refereeData.referee.id,
          linkedRefereeName: refereeData.referee.name,
        },
      });
      return { ok: true };
    }

    await convex.query(api.admin.verifyAdminPinQuery, {
      pin: trimmedPin,
    });

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        linkedAdmin: true,
      },
    });
    return { ok: true };
  } catch {
    if (role === "admin") {
      return { ok: false, error: "Admin PIN ongeldig." };
    }
    return { ok: false, error: "Koppelen is mislukt. Probeer opnieuw." };
  }
}
