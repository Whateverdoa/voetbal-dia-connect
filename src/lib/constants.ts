/**
 * Shared constants for DIA Live frontend.
 *
 * NOTE: NEXT_PUBLIC_ADMIN_PIN is exposed in the client bundle.
 * The real security gate is server-side (Convex adminAuth.ts).
 * This client-side value is only used for UX gating of the admin UI.
 * See HANDOFF.md follow-up items for planned server-side migration.
 */
export const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "9999";
