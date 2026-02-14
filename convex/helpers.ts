/**
 * Shared helpers for Convex functions
 * Extracted to avoid duplication across modules.
 */

/** Characters for public codes — excludes ambiguous O/0/I/1 */
const PUBLIC_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PUBLIC_CODE_LENGTH = 6;

/** Generate a random 6-char public code (no ambiguous chars) */
export function generatePublicCode(): string {
  let code = "";
  for (let i = 0; i < PUBLIC_CODE_LENGTH; i++) {
    code += PUBLIC_CODE_CHARS[Math.floor(Math.random() * PUBLIC_CODE_CHARS.length)];
  }
  return code;
}

/** Max retries when generating a unique code */
export const MAX_CODE_GENERATION_ATTEMPTS = 20;
