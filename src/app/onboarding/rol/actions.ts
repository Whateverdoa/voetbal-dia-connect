"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  bootstrapKnownRolesByEmail,
  getLinkedRoleForRole,
} from "@/lib/server/clerkLinkedPinActions";

type AssignableRole = "admin" | "coach" | "referee";

interface RoleActionResult {
  ok: boolean;
  error?: string;
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

/** If user has no roles and their email is in CLERK_BOOTSTRAP_ADMIN_EMAILS, set roles to admin+coach+referee so they can "just login" without picking a role. */
export async function bootstrapFullAccessIfEligible(): Promise<{
  applied: boolean;
  error?: string;
}> {
  const { userId } = await auth();
  if (!userId) return { applied: false };

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const existingRoles = parseRolesFromMetadata(user.publicMetadata);
  if (existingRoles.length > 0) return { applied: false };

  const primaryEmail = getPrimaryEmail(user);
  const bootstrapEmails = getBootstrapAdminEmails();
  if (!primaryEmail || !bootstrapEmails.has(primaryEmail)) return { applied: false };

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      role: "admin",
      roles: ["admin", "coach", "referee"],
    },
  });
  return { applied: true };
}

function parseRolesFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const src = metadata as { role?: unknown; roles?: unknown };
  const fromArray = Array.isArray(src.roles)
    ? src.roles.filter((r): r is string => typeof r === "string")
    : [];
  if (fromArray.length > 0) return fromArray;
  const single = src.role;
  return typeof single === "string" ? [single] : [];
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

/** After choosing Coach, try automatic e-mail based role linking. */
export async function tryBootstrapCoach(): Promise<{ linked: boolean }> {
  const result = await getLinkedRoleForRole("coach");
  return { linked: result.ok };
}

/** Auto-assign coach/referee by known e-mail links (no manual role pick). */
export async function bootstrapRoleLinksFromEmail(): Promise<{
  applied: boolean;
  assignedRoles: Array<"admin" | "coach" | "referee">;
}> {
  const { userId } = await auth();
  if (!userId) return { applied: false, assignedRoles: [] };

  const result = await bootstrapKnownRolesByEmail();
  return { applied: result.ok, assignedRoles: result.assignedRoles };
}
