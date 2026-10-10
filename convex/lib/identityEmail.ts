import type { UserIdentity } from "convex/server";
import { normalizeEmail } from "../../src/lib/auth/adminAccess";

/** Clerk JWT templates differ; email may live on `email` or another claim. */
export function emailFromIdentity(identity: UserIdentity | null) {
  if (!identity) return null;
  const direct = normalizeEmail(identity.email);
  if (direct) return direct;

  const bag = identity as unknown as Record<string, unknown>;
  for (const value of Object.values(bag)) {
    if (typeof value !== "string" || !value.includes("@")) continue;
    if (value.startsWith("http")) continue;
    const email = normalizeEmail(value);
    if (email) return email;
  }
  return null;
}
