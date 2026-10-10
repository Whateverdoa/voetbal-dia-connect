/**
 * Sportlink Club.Dataservice roster helpers (pure; Convex + tests).
 */

export type SportlinkTeamRow = {
  teamcode: number;
  lokaleteamcode: number;
  teamnaam: string;
  teamsoort?: string;
  leeftijdscategorie?: string;
};

export type SportlinkIndelingRow = {
  naam: string;
  voornaam?: string | null;
  achternaam?: string | null;
  tussenvoegsel?: string | null;
  rol: string;
  functie?: string | null;
  email?: string | null;
};

export type ParsedRosterPerson = {
  displayName: string;
  email: string | null;
  kind: "player" | "coach";
  functie: string | null;
};

const SHIELDED = "afgeschermd";

export function isShieldedName(name: string | null | undefined): boolean {
  return !name || name.trim().toLowerCase() === SHIELDED;
}

export function sportlinkTeamKey(teamcode: number, lokaleteamcode: number): string {
  if (teamcode > 0) return `bond:${teamcode}`;
  return `local:${lokaleteamcode}`;
}

export function parseSportlinkTeamKey(key: string): {
  teamcode: number;
  lokaleteamcode: number;
} | null {
  const bond = /^bond:(-?\d+)$/.exec(key);
  if (bond) return { teamcode: Number(bond[1]), lokaleteamcode: -1 };
  const local = /^local:(-?\d+)$/.exec(key);
  if (local) return { teamcode: -1, lokaleteamcode: Number(local[1]) };
  return null;
}

/** Map Sportlink teamnaam → DIA slug (JO13-1 → jo13-1, O13-2JM → jo13-2). */
export function slugFromSportlinkTeamName(teamnaam: string): string | null {
  const m = /^(?:DIA\s+)?(JO|MO|O)(\d+)-(\d+[A-Za-z]*)$/i.exec(teamnaam.trim());
  if (!m) return null;
  const prefix = m[1]!.toLowerCase() === "o" ? "jo" : m[1]!.toLowerCase();
  const teamNum = m[3]!.toLowerCase().replace(/jm$/, "");
  return `${prefix}${m[2]}-${teamNum}`;
}

export function displayNameFromIndeling(row: SportlinkIndelingRow): string | null {
  if (isShieldedName(row.naam) && isShieldedName(row.voornaam)) return null;

  const voornaam = row.voornaam?.trim();
  const achternaam = row.achternaam?.trim();
  const tussen = row.tussenvoegsel?.trim();
  if (
    voornaam &&
    achternaam &&
    !isShieldedName(voornaam) &&
    !isShieldedName(achternaam)
  ) {
    const mid = tussen && !isShieldedName(tussen) ? ` ${tussen}` : "";
    return `${voornaam}${mid} ${achternaam}`.replace(/\s+/g, " ").trim();
  }

  if (isShieldedName(row.naam)) return null;
  const comma = /^(.+),\s*(.+)$/.exec(row.naam.trim());
  if (comma) return `${comma[2]} ${comma[1]}`.replace(/\s+/g, " ").trim();
  return row.naam.trim();
}

export function parseIndelingRows(rows: SportlinkIndelingRow[]): ParsedRosterPerson[] {
  const out: ParsedRosterPerson[] = [];
  for (const row of rows) {
    const displayName = displayNameFromIndeling(row);
    if (!displayName) continue;
    const rol = (row.rol ?? "").toLowerCase();
    const kind: "player" | "coach" =
      rol.includes("staf") || rol.includes("coach") || rol.includes("trainer")
        ? "coach"
        : "player";
    out.push({
      displayName,
      email: row.email?.trim().toLowerCase() || null,
      kind,
      functie: row.functie?.trim() || null,
    });
  }
  return out;
}

export async function fetchSportlinkJson<T>(
  baseUrl: string,
  path: string,
  clientId: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("client_id", clientId);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Sportlink ${path} failed: ${response.status}`);
  }
  return (await response.json()) as T;
}
