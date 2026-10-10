/**
 * DIA home fields — keep in sync with `src/lib/diaFields.ts`.
 * Duplicated so Convex sync does not import from `src/`.
 */

export type DiaFieldId = "1" | "2" | "3" | "4" | "5";

export type DiaField = {
  id: DiaFieldId;
  name: string;
  surface: "kunstgras" | "gras";
};

export const DIA_HOME_FIELDS: readonly DiaField[] = [
  { id: "1", name: "Veld 1", surface: "kunstgras" },
  { id: "2", name: "Veld 2", surface: "kunstgras" },
  { id: "3", name: "Veld 3", surface: "kunstgras" },
  { id: "4", name: "Veld 4", surface: "gras" },
  { id: "5", name: "Veld 5", surface: "gras" },
] as const;

const BY_ID = new Map(DIA_HOME_FIELDS.map((f) => [f.id, f]));

export function parseDiaHomeField(veld: string | null | undefined): DiaField | null {
  if (!veld) return null;
  const m = /(?:^|\b)veld\s*([1-5])\b/i.exec(veld.trim());
  if (!m?.[1]) return null;
  return BY_ID.get(m[1] as DiaFieldId) ?? null;
}

export function formatHomeVenueLabel(veld: string | null | undefined): string | null {
  const trimmed = veld?.trim();
  if (!trimmed) return null;
  const known = parseDiaHomeField(trimmed);
  if (known) return `${known.name} (${known.surface})`;
  return trimmed;
}

export function homeVenueFieldForMatch(
  isHome: boolean,
  veld: string | null | undefined,
): string | undefined {
  if (!isHome) return undefined;
  return formatHomeVenueLabel(veld) ?? undefined;
}
