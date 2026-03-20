/**
 * Maps VoetbalAssist API response items to Convex wedstrijden doc shape.
 * Source: POST .../PostWedstrijden → dia_all.json
 */
import { parseAmsterdamTimestamp } from "../lib/timezone";

export type RawWedstrijd = {
  id?: number;
  datum?: string;
  uitslag?: string;
  statusAfgelast?: boolean;
  typeBeker?: boolean;
  typeVriendschappelijk?: boolean;
  thuisClubEnTeamNaamFriendly?: string | null;
  uitClubEnTeamNaamFriendly?: string | null;
  categorie?: string;
  leeftijd?: number;
  team?: string | null;
  verkrijgVeldtekst?: string | null;
  scheidsrechter?: string | null;
  thuisteamLogo?: string | null;
  uitteamLogo?: string | null;
};

export type WedstrijdDoc = {
  voetbalassist_id: number;
  datum: string;
  tijd: string;
  datum_ms: number;
  thuisteam: string;
  uitteam: string;
  thuis_goals?: number;
  uit_goals?: number;
  status: string;
  type: string;
  categorie: string;
  leeftijd: number;
  dia_team: string;
  veld: string;
  scheidsrechter: string;
  thuisteamLogo?: string;
  uitteamLogo?: string;
};

function stripHtml(uitslag: string): string {
  return uitslag
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseUitslag(uitslag: string | undefined): { thuis_goals?: number; uit_goals?: number } {
  if (!uitslag || uitslag === "-") return {};
  const clean = stripHtml(uitslag);
  const match = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(clean);
  if (!match) return {};
  const thuis_goals = parseInt(match[1], 10);
  const uit_goals = parseInt(match[2], 10);
  if (Number.isNaN(thuis_goals) || Number.isNaN(uit_goals)) return {};
  return { thuis_goals, uit_goals };
}

function deriveStatus(raw: RawWedstrijd): "gespeeld" | "gepland" | "afgelast" {
  if (raw.statusAfgelast === true) return "afgelast";
  const u = raw.uitslag?.trim();
  if (u && u !== "-" && stripHtml(u).match(/^\s*\d+\s*-\s*\d+\s*$/)) return "gespeeld";
  return "gepland";
}

function deriveType(raw: RawWedstrijd): "competitie" | "beker" | "vriendschappelijk" {
  if (raw.typeBeker === true) return "beker";
  if (raw.typeVriendschappelijk === true) return "vriendschappelijk";
  return "competitie";
}

function str(val: unknown): string {
  if (val == null) return "";
  return String(val).trim();
}

function num(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Map one VoetbalAssist API item to a Convex wedstrijden document.
 * Returns null if id is missing or invalid.
 */
export function mapRawToWedstrijd(raw: RawWedstrijd): WedstrijdDoc | null {
  const id = raw.id ?? num(raw.id);
  if (typeof id !== "number" || Number.isNaN(id)) return null;

  const datumRaw = str(raw.datum);
  const datum = datumRaw.slice(0, 10);
  const tIndex = datumRaw.indexOf("T");
  const tijd = tIndex >= 0 ? datumRaw.slice(tIndex + 1, tIndex + 6) : "";
  const datum_ms = datumRaw ? parseAmsterdamTimestamp(datumRaw) : 0;
  if (Number.isNaN(datum_ms)) return null;

  const { thuis_goals, uit_goals } = parseUitslag(raw.uitslag);

  return {
    voetbalassist_id: id,
    datum: datum || "1970-01-01",
    tijd: tijd || "00:00",
    datum_ms,
    thuisteam: str(raw.thuisClubEnTeamNaamFriendly),
    uitteam: str(raw.uitClubEnTeamNaamFriendly),
    ...(thuis_goals !== undefined && { thuis_goals }),
    ...(uit_goals !== undefined && { uit_goals }),
    status: deriveStatus(raw),
    type: deriveType(raw),
    categorie: str(raw.categorie),
    leeftijd: raw.leeftijd != null ? num(raw.leeftijd) : 0,
    dia_team: str(raw.team),
    veld: str(raw.verkrijgVeldtekst),
    scheidsrechter: str(raw.scheidsrechter),
    ...(str(raw.thuisteamLogo) && { thuisteamLogo: str(raw.thuisteamLogo) }),
    ...(str(raw.uitteamLogo) && { uitteamLogo: str(raw.uitteamLogo) }),
  };
}
