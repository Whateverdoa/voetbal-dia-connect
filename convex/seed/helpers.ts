/**
 * Shared seed helpers — code generation and player name pool.
 */

/** Dutch first names for realistic player data */
export const DUTCH_NAMES = [
  "Daan", "Sem", "Liam", "Lucas", "Finn", "Luuk", "Milan", "Jesse",
  "Noah", "Bram", "Lars", "Tim", "Thijs", "Max", "Ruben", "Thomas",
  "Jayden", "Stijn", "Julian", "Sven", "Niels", "Joep", "Mees", "Cas",
  "Tijn", "Teun", "Gijs", "Jens", "Bas", "Floris", "Pepijn", "Olivier",
  "Hidde", "Ties", "Vince", "Sam", "Luca", "Rick", "Niek", "Koen",
  "Ravi", "Jasper", "Wouter", "Pieter", "Sander", "Matthijs", "Daniël", "Tobias",
];

/** Generate a unique 6-char public code (no ambiguous chars) */
export function generatePublicCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No O/0/I/1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Pick `count` unique names from the pool, excluding already-used names */
export function pickUniqueNames(count: number, usedNames: Set<string>): string[] {
  const available = DUTCH_NAMES.filter((n) => !usedNames.has(n));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);
  picked.forEach((n) => usedNames.add(n));
  return picked;
}

/**
 * Convert seed date string to UTC timestamp (ms).
 * - If string ends with "Z", parses as UTC.
 * - Otherwise treats the string as Dutch local time (Europe/Amsterdam) so the
 *   same time shows correctly in the app (toLocaleTimeString("nl-NL")).
 * Prevents server timezone from changing the stored value.
 */
export function seedDateToUtcTimestamp(dateStr: string): number {
  const trimmed = dateStr.trim();
  if (trimmed.endsWith("Z")) {
    return new Date(trimmed).getTime();
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    return new Date(trimmed).getTime();
  }
  const [, y, mo, d, h, min] = match.map(Number);
  const month = mo - 1;
  // Europe/Amsterdam: winter CET = UTC+1, summer CEST = UTC+2 (last Sun Mar 02:00 – last Sun Oct 03:00)
  const utcDate = new Date(Date.UTC(y, month, d, h, min || 0, 0, 0));
  const isSummer = isCEST(utcDate);
  const offsetMs = (isSummer ? 2 : 1) * 60 * 60 * 1000;
  return utcDate.getTime() - offsetMs;
}

function isCEST(d: Date): boolean {
  const y = d.getUTCFullYear();
  const marchLast = lastSundayOfMonth(y, 2);
  const octLast = lastSundayOfMonth(y, 9);
  const start = new Date(Date.UTC(y, 2, marchLast, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, 9, octLast, 1, 0, 0, 0));
  return d >= start && d < end;
}

function lastSundayOfMonth(year: number, month: number): number {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const day = last.getUTCDay();
  return last.getUTCDate() - day;
}
