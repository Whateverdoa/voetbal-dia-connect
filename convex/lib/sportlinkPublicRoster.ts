import {
  displayNameFromIndeling,
  sportlinkPersonId,
  type SportlinkIndelingRow,
} from "./sportlinkRoster";

export type PublicRosterRow = {
  personId: string;
  name?: string;
  photoUrl?: string;
};
export function parsePublicRoster(
  rows: SportlinkIndelingRow[],
): PublicRosterRow[] {
  if (!Array.isArray(rows) || rows.length > 500)
    throw new Error("Ongeldige Sportlink teamindeling");
  const result = new Map<string, PublicRosterRow>();
  for (const row of rows) {
    if (!row || typeof row.naam !== "string" || typeof row.rol !== "string")
      throw new Error("Ongeldige Sportlink rij");
    if (/staf|coach|trainer/i.test(row.rol)) continue;
    const personId = sportlinkPersonId(row.lidcode);
    if (!personId) continue;
    // Duplicate source identities are ambiguous: keep them shielded, even if a later row is visible.
    if (result.has(personId)) {
      result.set(personId, { personId });
      continue;
    }
    const name = displayNameFromIndeling({ naam: row.naam, rol: row.rol }) ?? undefined;
    let photoUrl: string | undefined;
    if (name && typeof row.foto === "string") {
      try {
        const url = new URL(row.foto);
        if (url.protocol === "https:" && !url.username && !url.password)
          photoUrl = url.href;
      } catch {
        /* No public photo. */
      }
    }
    result.set(personId, {
      personId,
      ...(name ? { name } : {}),
      ...(photoUrl ? { photoUrl } : {}),
    });
  }
  return [...result.values()];
}
