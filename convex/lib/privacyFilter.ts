/**
 * Privacy redaction for public / presentation queries (AVG / JO13 consent).
 */

export type ConsentType = "photo" | "gamification" | "public_display";
export type ConsentStatus = "pending" | "granted" | "revoked";

export type ConsentRow = {
  consentType: ConsentType;
  status: ConsentStatus;
};

export type CardProfile = {
  xp: number;
  level: number;
  rarity: "common" | "rare" | "epic";
  seasonStats: {
    matches: number;
    minutes: number;
    goals: number;
    assists: number;
    cleanSheets: number;
  };
  badges?: string[];
};

export type PlayerPrivacyInput = {
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
};

function hasGranted(consents: ConsentRow[], type: ConsentType): boolean {
  return consents.some((c) => c.consentType === type && c.status === "granted");
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

/**
 * Redact a player for public/TV presentation based on consent rows.
 * Without public_display: only number + position (no name/photo/XP).
 * Without photo: no photoUrl.
 * Without gamification: no cardProfile.
 */
export function redactPlayerForPublic(
  player: PlayerPrivacyInput,
  consents: ConsentRow[]
): RedactedPlayer {
  const publicOk = hasGranted(consents, "public_display");
  const photoOk = publicOk && hasGranted(consents, "photo");
  const gameOk = publicOk && hasGranted(consents, "gamification");

  return {
    playerId: player._id,
    displayName: publicOk ? player.name : initialsFromName(player.name),
    number: player.number ?? null,
    positionPrimary: player.positionPrimary ?? null,
    positionSecondary: player.positionSecondary ?? null,
    photoUrl: photoOk ? player.photoUrl ?? null : null,
    cardProfile: gameOk ? player.cardProfile ?? null : null,
    showFullIdentity: publicOk,
  };
}

export function assertConsentGranted(
  consents: ConsentRow[],
  type: ConsentType
): boolean {
  return hasGranted(consents, type);
}
