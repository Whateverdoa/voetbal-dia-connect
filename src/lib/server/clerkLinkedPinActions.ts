"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { parseRolesFromMetadata } from "@/lib/auth/roles";

type LinkedRole = "coach" | "referee" | "admin";

interface LinkedPinResult {
  ok: boolean;
  pin?: string;
}

interface ClerkUserForLink {
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
}

/** Parse CLERK_COACH_EMAIL_PIN (e.g. "email@example.com:2468,a@b.com:1234") → Map<email, pin> */
function getCoachEmailPinMap(): Map<string, string> {
  const raw = process.env.CLERK_COACH_EMAIL_PIN ?? "";
  const map = new Map<string, string>();
  for (const entry of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [email, pin] = entry.split(":").map((s) => s.trim());
    if (email && pin && /^\d{4,6}$/.test(pin)) {
      map.set(email.toLowerCase(), pin);
    }
  }
  return map;
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

function getLinkedPinFromMetadata(
  user: ClerkUserForLink,
  role: LinkedRole
): string | undefined {
  const privateMetadata = user.privateMetadata ?? {};
  const linkedPinsCandidate = privateMetadata.linkedPins;
  if (linkedPinsCandidate && typeof linkedPinsCandidate === "object") {
    const linkedPins = linkedPinsCandidate as Record<string, unknown>;
    const perRole = linkedPins[role];
    if (typeof perRole === "string" && perRole.length >= 4) return perRole;
  }
  const legacyLinkedPin = privateMetadata.linkedPin;
  if (typeof legacyLinkedPin === "string" && legacyLinkedPin.length >= 4) {
    return legacyLinkedPin;
  }
  return undefined;
}

function mergeRoles(existing: unknown, roleToAdd: LinkedRole): LinkedRole[] {
  const roles = parseRolesFromMetadata({ roles: existing });
  if (!roles.includes(roleToAdd)) roles.push(roleToAdd);
  return roles;
}

export async function getLinkedPinForRole(
  role: LinkedRole
): Promise<LinkedPinResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (!userHasRole(user, role)) {
    return { ok: false };
  }

  const linkedPin = getLinkedPinFromMetadata(user, role);
  if (linkedPin) {
    return { ok: true, pin: linkedPin };
  }

  // Bootstrap coach by email: 1) DB (coach.email), 2) env CLERK_COACH_EMAIL_PIN
  if (role === "coach") {
    const primaryEmail = getPrimaryEmail(user);
    if (!primaryEmail) return { ok: false };

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return { ok: false };
    const convex = new ConvexHttpClient(convexUrl);

    let pin: string | undefined;
    let linkedCoach:
      | { coachId: string; coachName: string; teamIds: string[]; pin: string }
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
          pin: linkData.pin,
        };
        pin = linkData.pin;
      }
    }
    if (!pin) pin = getCoachEmailPinMap().get(primaryEmail);
    if (!pin) return { ok: false };

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
      privateMetadata: {
        ...user.privateMetadata,
        linkedPins: {
          ...((user.privateMetadata?.linkedPins as Record<string, unknown>) ?? {}),
          coach: pin,
        },
        linkedPin: pin,
      },
    });
    return { ok: true, pin };
  }

  return { ok: false };
}

/** Result of linking the current user as coach (after successful PIN on /coach). */
export interface LinkCoachResult {
  ok: boolean;
  error?: string;
}

/**
 * Link the signed-in user to a coach record (role + metadata).
 * Call this after successful verifyCoachPin on /coach so the user becomes "coach" and next time gets auto-filled PIN.
 * Only sets role to "coach" if the user has no role yet (does not overwrite admin).
 */
export async function linkCoachToAccount(
  coachId: string,
  coachName: string,
  teamIds: string[],
  pin: string
): Promise<LinkCoachResult> {
  const trimmedPin = pin.trim();
  if (!/^\d{4,6}$/.test(trimmedPin)) {
    return { ok: false, error: "Ongeldige PIN." };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Niet ingelogd." };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const nextRoles = mergeRoles(user.publicMetadata?.roles, "coach");

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      role: "coach",
      roles: nextRoles,
      linkedCoachId: coachId,
      linkedCoachName: coachName,
      linkedTeamIds: teamIds,
    },
    privateMetadata: {
      ...user.privateMetadata,
      linkedPins: {
        ...((user.privateMetadata?.linkedPins as Record<string, unknown>) ?? {}),
        coach: trimmedPin,
      },
      linkedPin: trimmedPin,
    },
  });

  return { ok: true };
}
