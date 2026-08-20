/**
 * Map DIA team labels from VoetbalAssist / Sportlink onto local team slugs.
 */
function cleanTeamName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Examples:
 *   "35+1"         -> "35-1"
 *   "JO 12-4"      -> "jo12-4"
 *   "O10-1"        -> "jo10-1"
 *   "1 (zon)"      -> "zo1"
 *   "1"            -> "zo1"   (Sportlink senior Sunday)
 *   "o13-2jm"      -> "jo13-2"  (Sportlink JM label == local JO13-2)
 */
export function normalizeDiaSlug(raw: string): string {
  let s = raw.toLowerCase().trim().replace(/\s+/g, " ");

  if (s === "g team") return "g-team";

  const vrZon = s.match(/^vr(\d+)\s*\(zon\)$/);
  if (vrZon) return `vr${vrZon[1]}`;

  const zon = s.match(/^(\d+)\s*\(zon\)$/);
  if (zon) return `zo${zon[1]}`;

  const vr30Plus = s.match(/^vr30\+(\d+)$/);
  if (vr30Plus) return `30-${vr30Plus[1]}`;

  const m35Plus = s.match(/^35\+(\d+)$/);
  if (m35Plus) return `35-${m35Plus[1]}`;

  // "JO 12-4" / "DIA JO 11-2" fragment → collapse spaces
  s = s.replace(/\s+/g, "");

  // O13-2JM → jo13-2 (JM suffix stripped); O10-1 → jo10-1
  const oYouth = s.match(/^o(\d{1,2})-(\d+)(jm)?$/);
  if (oYouth) {
    return `jo${oYouth[1]}-${oYouth[2]}`;
  }

  const o23 = s.match(/^o23-(\d+)$/);
  if (o23) return `jo23-${o23[1]}`;

  const jm = s.match(/^(jo\d+-\d+)jm$/);
  if (jm) return jm[1];

  // Sportlink seniors: "DIA 1" → "1" → "zo1"
  if (/^\d{1,2}$/.test(s)) return `zo${s}`;

  return s;
}

export type SyncExtraction = {
  teamSlug: string;
  opponent: string;
  isHome: boolean;
  opponentLogoUrl?: string;
};

export function extractDiaMatch(
  thuisteam: string,
  uitteam: string,
  thuisteamLogo?: string,
  uitteamLogo?: string,
  resolveOpponentLogo?: (opponent: string) => string | undefined,
): SyncExtraction | null {
  const home = cleanTeamName(thuisteam);
  const away = cleanTeamName(uitteam);
  const prefix = "DIA ";

  if (home.toUpperCase().startsWith(prefix)) {
    const diaTeam = home.slice(prefix.length).trim();
    const opponent = away;
    const local = resolveOpponentLogo?.(opponent);
    return {
      teamSlug: normalizeDiaSlug(diaTeam),
      opponent,
      isHome: true,
      opponentLogoUrl: local ?? uitteamLogo ?? undefined,
    };
  }

  if (away.toUpperCase().startsWith(prefix)) {
    const diaTeam = away.slice(prefix.length).trim();
    const opponent = home;
    const local = resolveOpponentLogo?.(opponent);
    return {
      teamSlug: normalizeDiaSlug(diaTeam),
      opponent,
      isHome: false,
      opponentLogoUrl: local ?? thuisteamLogo ?? undefined,
    };
  }

  return null;
}
