/**
 * DIA home fields (shared catalog with voetbal-dia-training).
 * Sportlink `veld` strings map here for home matches only.
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

/** Parse Sportlink/VA veld text → DIA field, or null if not a known home pitch. */
export function parseDiaHomeField(veld: string | null | undefined): DiaField | null {
  if (!veld) return null;
  const m = /(?:^|\b)veld\s*([1-5])\b/i.exec(veld.trim());
  if (!m?.[1]) return null;
  return BY_ID.get(m[1] as DiaFieldId) ?? null;
}

/** Label for UI / storage, e.g. "Veld 3 (kunstgras)". Falls back to trimmed raw. */
export function formatHomeVenueLabel(veld: string | null | undefined): string | null {
  const trimmed = veld?.trim();
  if (!trimmed) return null;
  const known = parseDiaHomeField(trimmed);
  if (known) return `${known.name} (${known.surface})`;
  return trimmed;
}

/**
 * Only home matches get a venue label. Away venues belong to the opponent.
 */
export function homeVenueFieldForMatch(
  isHome: boolean,
  veld: string | null | undefined,
): string | undefined {
  if (!isHome) return undefined;
  return formatHomeVenueLabel(veld) ?? undefined;
}
