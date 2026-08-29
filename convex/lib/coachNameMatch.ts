/**
 * Name matching helpers for coach email backfill from last-season seed data.
 */

export function normalizeCoachName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Candidate keys for "First Last" and "Last, First" style names. */
export function coachNameKeys(name: string): string[] {
  const normalized = normalizeCoachName(name);
  const parts = normalized.split(" ").filter(Boolean);
  const keys = new Set<string>([normalized]);

  if (name.includes(",")) {
    const [last, ...rest] = name.split(",");
    keys.add(normalizeCoachName(`${rest.join(" ")} ${last}`));
  }

  if (parts.length >= 2) {
    keys.add([parts[parts.length - 1], ...parts.slice(0, -1)].join(" "));
    keys.add([...parts.slice(1), parts[0]].join(" "));
  }

  return [...keys];
}

export type SeedCoachEmail = { name: string; email: string };

/** Map normalized name keys → seed coach (first wins; collisions skipped). */
export function buildCoachEmailIndex(
  seedCoaches: SeedCoachEmail[]
): Map<string, SeedCoachEmail> {
  const index = new Map<string, SeedCoachEmail>();
  for (const coach of seedCoaches) {
    const email = coach.email.trim().toLowerCase();
    if (!email) continue;
    const entry = { name: coach.name, email };
    for (const key of coachNameKeys(coach.name)) {
      const existing = index.get(key);
      if (existing && existing.email !== email) continue;
      index.set(key, entry);
    }
  }
  return index;
}

export function findSeedEmailForCoach(
  index: Map<string, SeedCoachEmail>,
  coachName: string
): SeedCoachEmail | null {
  for (const key of coachNameKeys(coachName)) {
    const hit = index.get(key);
    if (hit) return hit;
  }
  return null;
}
