/**
 * Admin authentication helper
 * Centralized admin PIN verification for all admin operations.
 *
 * The PIN lives ONLY on the server (Convex environment variable).
 * It is NEVER sent to the client bundle.
 * For Convex, set via: npx convex env set ADMIN_PIN your-secure-pin
 */
import { query } from "./_generated/server";
import { v } from "convex/values";

const ADMIN_PIN = process.env.ADMIN_PIN || "9999";

/**
 * Verify admin PIN (throws on invalid — use in mutations)
 */
export function verifyAdminPin(pin: string): void {
  if (pin !== ADMIN_PIN) {
    throw new Error("Ongeldige admin PIN");
  }
}

/**
 * Check if admin PIN is valid (non-throwing — use in mutations)
 */
export function isValidAdminPin(pin: string): boolean {
  return pin === ADMIN_PIN;
}

/**
 * Convex query for client-side login verification.
 * Returns { valid: true } or throws — PIN never leaves the server.
 */
export const verifyAdminPinQuery = query({
  args: { pin: v.string() },
  handler: async (_ctx, args) => {
    if (args.pin !== ADMIN_PIN) {
      throw new Error("Ongeldige admin PIN");
    }
    return { valid: true };
  },
});
