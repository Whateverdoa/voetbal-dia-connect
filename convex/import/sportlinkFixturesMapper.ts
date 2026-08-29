/**
 * Map Sportlink Club.Dataservice `programma` / `uitslagen` rows → wedstrijden docs.
 */
import type { WedstrijdDoc } from "./wedstrijdenMapper";
import { normalizeDiaSlug } from "./diaTeamNormalize";

/** Synthetic VA id: negative wedstrijdcode avoids collision with positive VoetbalAssist ids. */
export function sportlinkSyntheticVaId(wedstrijdcode: number): number {
  return -Math.abs(wedstrijdcode);
}

export type RawSportlinkFixture = {
  wedstrijdcode?: number | string;
  wedstrijddatum?: string;
  aanvangstijd?: string;
  thuisteam?: string;
  uitteam?: string;
  teamnaam?: string;
  thuisteamlogo?: string;
  uitteamlogo?: string;
  status?: string;
  competitiesoort?: string;
  competitie?: string;
  competitienaam?: string;
  veld?: string;
  scheidsrechter?: string;
  uitslag?: string | null;
  "uitslag-regulier"?: string | null;
};

export type SportlinkWedstrijdDoc = WedstrijdDoc & {
  sportlink_wedstrijdcode: string;
};

const SKIP_COMPETITIESOORT = new Set(["training", "trainingswedstrijd"]);

function str(val: unknown): string {
  if (val == null) return "";
  return String(val).trim();
}

function parseWedstrijdcode(raw: RawSportlinkFixture): number | null {
  const n =
    typeof raw.wedstrijdcode === "number"
      ? raw.wedstrijdcode
      : parseInt(String(raw.wedstrijdcode ?? ""), 10);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

function parseScore(
  uitslag: string | null | undefined,
): { thuis_goals?: number; uit_goals?: number } {
  if (!uitslag) return {};
  const match = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(uitslag.trim());
  if (!match) return {};
  return {
    thuis_goals: parseInt(match[1], 10),
    uit_goals: parseInt(match[2], 10),
  };
}

function deriveStatus(raw: RawSportlinkFixture): "gespeeld" | "gepland" | "afgelast" {
  const status = str(raw.status).toLowerCase();
  if (
    status.includes("afgelast") ||
    status.includes("geannuleerd") ||
    status.includes("ingetrokken")
  ) {
    return "afgelast";
  }
  if (
    status.includes("uitgespeeld") ||
    status.includes("gespeeld") ||
    status.includes("gesloten")
  ) {
    return "gespeeld";
  }
  const score = parseScore(raw.uitslag ?? raw["uitslag-regulier"]);
  if (score.thuis_goals !== undefined) return "gespeeld";
  return "gepland";
}

function deriveType(competitiesoort: string): string {
  const c = competitiesoort.toLowerCase();
  if (c.includes("beker")) return "beker";
  if (c.includes("vriend")) return "vriendschappelijk";
  return "competitie";
}

function shouldSkip(raw: RawSportlinkFixture): boolean {
  const soort = str(raw.competitiesoort).toLowerCase();
  return SKIP_COMPETITIESOORT.has(soort);
}

function diaTeamLabel(raw: RawSportlinkFixture): string {
  const teamnaam = str(raw.teamnaam);
  if (teamnaam.toUpperCase().startsWith("DIA ")) {
    return teamnaam.slice(4).trim();
  }
  const home = str(raw.thuisteam);
  if (home.toUpperCase().startsWith("DIA ")) return home.slice(4).trim();
  const away = str(raw.uitteam);
  if (away.toUpperCase().startsWith("DIA ")) return away.slice(4).trim();
  return teamnaam || home || away;
}

/**
 * Map one Sportlink programma/uitslagen row. Returns null for trainings / invalid rows.
 */
export function mapSportlinkFixture(
  raw: RawSportlinkFixture,
): SportlinkWedstrijdDoc | null {
  if (shouldSkip(raw)) return null;

  const code = parseWedstrijdcode(raw);
  if (code === null) return null;

  const wedstrijddatum = str(raw.wedstrijddatum);
  if (!wedstrijddatum) return null;

  const datum_ms = Date.parse(wedstrijddatum);
  if (!Number.isFinite(datum_ms)) return null;

  const datum = wedstrijddatum.slice(0, 10);
  const tijd =
    str(raw.aanvangstijd) ||
    (wedstrijddatum.includes("T")
      ? wedstrijddatum.slice(wedstrijddatum.indexOf("T") + 1, wedstrijddatum.indexOf("T") + 6)
      : "00:00");

  const scoreSource = raw.uitslag ?? raw["uitslag-regulier"];
  const { thuis_goals, uit_goals } = parseScore(scoreSource ?? undefined);

  const diaLabel = diaTeamLabel(raw);
  const competitiesoort = str(raw.competitiesoort);
  const competitie = str(raw.competitie) || str(raw.competitienaam);

  return {
    voetbalassist_id: sportlinkSyntheticVaId(code),
    datum: datum || "1970-01-01",
    tijd: tijd || "00:00",
    datum_ms,
    thuisteam: str(raw.thuisteam),
    uitteam: str(raw.uitteam),
    ...(thuis_goals !== undefined && { thuis_goals }),
    ...(uit_goals !== undefined && { uit_goals }),
    status: deriveStatus(raw),
    type: deriveType(competitiesoort),
    categorie: competitie,
    leeftijd: 0,
    dia_team: normalizeDiaSlug(diaLabel),
    veld: str(raw.veld),
    scheidsrechter: str(raw.scheidsrechter),
    ...(str(raw.thuisteamlogo) && { thuisteamLogo: str(raw.thuisteamlogo) }),
    ...(str(raw.uitteamlogo) && { uitteamLogo: str(raw.uitteamlogo) }),
    sportlink_wedstrijdcode: String(code),
  };
}

/** Prefer uitslagen (with scores) over programma when merging by wedstrijdcode. */
export function mergeSportlinkFixtures(
  rows: RawSportlinkFixture[],
): Map<string, SportlinkWedstrijdDoc> {
  const byCode = new Map<string, SportlinkWedstrijdDoc>();
  for (const raw of rows) {
    const mapped = mapSportlinkFixture(raw);
    if (!mapped) continue;
    const prev = byCode.get(mapped.sportlink_wedstrijdcode);
    if (!prev) {
      byCode.set(mapped.sportlink_wedstrijdcode, mapped);
      continue;
    }
    // Keep gespeeld / scores from newer row when present
    const preferNew =
      mapped.status === "gespeeld" ||
      (mapped.thuis_goals !== undefined && prev.thuis_goals === undefined);
    byCode.set(
      mapped.sportlink_wedstrijdcode,
      preferNew ? { ...prev, ...mapped } : { ...mapped, ...prev },
    );
  }
  return byCode;
}
