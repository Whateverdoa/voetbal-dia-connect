/**
 * Admin authentication helper
 * Centralized admin PIN verification for all admin operations
 */

// Admin PIN - in production, use environment variable
// For Convex, use: npx convex env set ADMIN_PIN your-secure-pin
const ADMIN_PIN = process.env.ADMIN_PIN || "9999";

/**
 * Verify admin PIN
 * @throws Error if PIN is invalid
 */
export function verifyAdminPin(pin: string): void {
  if (pin !== ADMIN_PIN) {
    throw new Error("Ongeldige admin PIN");
  }
}

/**
 * Check if admin PIN is valid (non-throwing version)
 */
export function isValidAdminPin(pin: string): boolean {
  return pin === ADMIN_PIN;
}
