"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

type LinkedRole = "coach" | "referee" | "admin";

interface LinkedPinResult {
  ok: boolean;
  pin?: string;
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
  const linkedRole = user.publicMetadata?.role;
  if (linkedRole !== role) {
    return { ok: false };
  }

  const linkedPin = user.privateMetadata?.linkedPin;
  if (typeof linkedPin !== "string" || linkedPin.length < 4) {
    return { ok: false };
  }

  return { ok: true, pin: linkedPin };
}
