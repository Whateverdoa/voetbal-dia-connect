import type { CardProfile, FcCardData } from "../../src/lib/cards/fc27";
export type { CardProfile } from "../../src/lib/cards/fc27";

/**
 * Privacy redaction for public / presentation queries (AVG / JO13 consent).
 */

export type ConsentType = "photo" | "gamification" | "public_display";
export type ConsentStatus = "pending" | "granted" | "revoked";

export type ConsentRow = {
  consentType: ConsentType;
  status: ConsentStatus;
};

export type PlayerPrivacyInput = FcCardData & {
  _id: string;
  name: string;
  number?: number;
  positionPrimary?: string;
  positionSecondary?: string;
  photoUrl?: string;
  cardProfile?: CardProfile;
};

export type RedactedPlayer = {
  playerId: string;
  displayName: string;
  number: number | null;
  positionPrimary: string | null;
  positionSecondary: string | null;
  photoUrl: string | null;
  cardProfile: CardProfile | null;
  showFullIdentity: boolean;
  fcRatings: NonNullable<FcCardData["fcRatings"]> | null;
  playStyleIds: string[];
  recognitions: NonNullable<FcCardData["recognitions"]>;
};

function hasGranted(consents: ConsentRow[], type: ConsentType): boolean {
  return !isRevoked(consents, type) && consents.some((c) => c.consentType === type && c.status === "granted");
}

function isRevoked(consents: ConsentRow[], type: ConsentType): boolean {
  return consents.some((c) => c.consentType === type && c.status === "revoked");
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function firstNameFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts[0]!;
}

/**
 * Redact a player for public/TV presentation based on consent rows.
 * Public screens show first names only (no last names) unless public_display
 * was revoked — then initials. Photos and gamification require public-display
 * permission as well as their individual grants. Minutes stay staff-only.
 */
export function redactPlayerForPublic(
  player: PlayerPrivacyInput,
  consents: ConsentRow[]
): RedactedPlayer {
  const publicOk = hasGranted(consents, "public_display");
  const photoOk = publicOk && hasGranted(consents, "photo");
  const gameOk = publicOk && hasGranted(consents, "gamification");
  const hideName = isRevoked(consents, "public_display");

  return {
    playerId: player._id,
    displayName: hideName
      ? initialsFromName(player.name)
      : firstNameFromName(player.name),
    number: player.number ?? null,
    positionPrimary: player.positionPrimary ?? null,
    positionSecondary: player.positionSecondary ?? null,
    photoUrl: photoOk ? player.photoUrl ?? null : null,
    cardProfile: gameOk && player.cardProfile ? {
      xp: player.cardProfile.xp,
      level: player.cardProfile.level,
      rarity: player.cardProfile.rarity,
      seasonStats: {
        matches: player.cardProfile.seasonStats.matches,
        goals: player.cardProfile.seasonStats.goals,
        assists: player.cardProfile.seasonStats.assists,
        cleanSheets: player.cardProfile.seasonStats.cleanSheets,
      },
      ...(player.cardProfile.badges ? { badges: player.cardProfile.badges } : {}),
    } : null,
    showFullIdentity: false,
    fcRatings: gameOk ? player.fcRatings ?? null : null,
    playStyleIds: gameOk ? player.playStyleIds ?? [] : [],
    recognitions: gameOk ? player.recognitions ?? [] : [],
  };
}

export function assertConsentGranted(
  consents: ConsentRow[],
  type: ConsentType
): boolean {
  return hasGranted(consents, type);
}
