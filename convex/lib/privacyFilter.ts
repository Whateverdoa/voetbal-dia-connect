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
  sourceName?: string;
  sourcePhotoUrl?: string;
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
  const rows = consents.filter((c) => c.consentType === type);
  return rows.length > 0 && rows.every((c) => c.status === "granted");
}

/** Public identity requires current source permission and local consent. */
export function redactPlayerForPublic(
  player: PlayerPrivacyInput,
  consents: ConsentRow[],
): RedactedPlayer {
  const publicOk =
    Boolean(player.sourceName) && hasGranted(consents, "public_display");
  const photoOk = publicOk && hasGranted(consents, "photo");
  const gameOk = publicOk && hasGranted(consents, "gamification");

  return {
    playerId: player._id,
    displayName: publicOk
      ? player.sourceName!.trim().split(/\s+/)[0]!
      : "Afgeschermd",
    number: publicOk ? (player.number ?? null) : null,
    positionPrimary: publicOk ? (player.positionPrimary ?? null) : null,
    positionSecondary: publicOk ? (player.positionSecondary ?? null) : null,
    photoUrl: photoOk ? (player.sourcePhotoUrl ?? null) : null,
    cardProfile: gameOk ? (player.cardProfile ?? null) : null,
    showFullIdentity: publicOk,
  };
}

export function assertConsentGranted(
  consents: ConsentRow[],
  type: ConsentType,
): boolean {
  return hasGranted(consents, type);
}
