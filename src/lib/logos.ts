/**
 * Logo resolution helpers for teams and clubs.
 *
 * Resolve order: team logo → club logo → null.
 */

export function resolveLogoUrl(
  teamLogoUrl?: string | null,
  clubLogoUrl?: string | null,
): string | null {
  return teamLogoUrl || clubLogoUrl || null;
}

/**
 * Extract up to two uppercase initials from a team/club name.
 * "JO12-1" → "JO", "DIA" → "DI", "Fc Utrecht" → "FU"
 */
export function getLogoInitials(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) return "??";
  return letters.slice(0, 2).toUpperCase();
}

/**
 * Locally hosted logos in /public/logos/.
 * Keys are lowercase club name prefixes matched via startsWith.
 * Longer keys are listed first to avoid false prefix matches.
 */
export const LOCAL_LOGOS: Record<string, string> = {
  "st altena/almkerk": "/logos/st-altena-almkerk.png",
  "sc 't zand": "/logos/sc-t-zand.png",
  "sv capelle": "/logos/sv-capelle.png",
  "sv reeshof": "/logos/sv-reeshof.png",
  "tsv gudok": "/logos/tsv-gudok.png",
  "tvc breda": "/logos/tvc-breda.png",
  "fc right-oh": "/logos/fc-right-oh.png",
  "the gunners": "/logos/the-gunners.png",
  "madese boys": "/logos/madese-boys.png",
  "moerse boys": "/logos/moerse-boys.png",
  "groen wit": "/logos/groen-wit.png",
  "gloria uc": "/logos/gloria-uc.png",
  "beek vooruit": "/logos/beek-vooruit.png",
  "be ready": "/logos/be-ready.png",
  "olympia'60": "/logos/olympia60.png",
  "irene'58": "/logos/irene58.png",
  "victoria'03": "/logos/victoria03.png",
  "uvv'40": "/logos/uvv40.png",
  "ovc'26": "/logos/ovc26.png",
  "neo'25": "/logos/neo25.png",
  baardwijk: "/logos/baardwijk.png",
  baronie: "/logos/baronie.png",
  bavel: "/logos/bavel.png",
  boeimeer: "/logos/boeimeer.png",
  chaam: "/logos/chaam.png",
  desk: "/logos/desk.png",
  dia: "/logos/dia.png",
  dongen: "/logos/dongen.png",
  dse: "/logos/dse.png",
  gdc: "/logos/gdc.png",
  gilze: "/logos/gilze.png",
  hoeven: "/logos/hoeven.png",
  jeka: "/logos/jeka.png",
  oni: "/logos/oni.png",
  oosterhout: "/logos/oosterhout.png",
  rfc: "/logos/rfc.png",
  rijen: "/logos/rijen.png",
  sarto: "/logos/sarto.png",
  sco: "/logos/sco.png",
  seolto: "/logos/seolto.png",
  terheijden: "/logos/terheijden.png",
  tsc: "/logos/tsc.png",
  vcw: "/logos/vcw.png",
  voab: "/logos/voab.png",
  vvr: "/logos/vvr.png",
};

/**
 * Look up a local logo path by team/opponent name.
 * Matches the first word(s) of the name against known clubs.
 */
export function findLocalLogo(name: string): string | null {
  const lower = name.toLowerCase().trim();
  for (const [key, path] of Object.entries(LOCAL_LOGOS)) {
    if (lower.startsWith(key)) return path;
  }
  return null;
}
