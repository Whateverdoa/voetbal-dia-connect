"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

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
