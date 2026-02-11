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
