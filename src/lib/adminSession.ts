/**
 * Admin session management.
 *
 * After server-side PIN verification, the PIN is stored in sessionStorage
 * so admin components can include it in Convex mutation calls.
 * The PIN is NEVER hardcoded or bundled into the client JS.
 * sessionStorage is cleared when the browser tab closes.
 */

const STORAGE_KEY = "admin_pin";

/** Store verified admin PIN in session */
export function setAdminPin(pin: string): void {
  sessionStorage.setItem(STORAGE_KEY, pin);
}

/** Retrieve admin PIN from session (empty string if not set) */
export function getAdminPin(): string {
  return sessionStorage.getItem(STORAGE_KEY) ?? "";
}

/** Clear admin session (logout) */
export function clearAdminSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Check if admin is authenticated (PIN stored in session) */
export function isAdminAuthenticated(): boolean {
  return !!sessionStorage.getItem(STORAGE_KEY);
}
