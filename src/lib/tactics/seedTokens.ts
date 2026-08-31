export type SeedPlayer = {
  playerId: string;
  onField: boolean;
  absent: boolean;
  fieldSlotIndex: number | null;
};

export type SeedSlot = { id: number; x: number; y: number };

export type SeedToken = {
  playerId: string;
  x: number;
  y: number;
  onBoard: boolean;
};

/** Place squad on a tactic board from lineup slots, or a fallback grid. */
export function seedTacticTokens(
  players: SeedPlayer[],
  slots: SeedSlot[]
): SeedToken[] {
  const slotById = new Map(slots.map((slot) => [slot.id, slot]));
  let fieldIndex = 0;
  let benchIndex = 0;
  const tokens: SeedToken[] = [];

  for (const player of players) {
    if (player.absent) continue;
    if (player.onField) {
      const slot =
        player.fieldSlotIndex != null
          ? slotById.get(player.fieldSlotIndex)
          : undefined;
      tokens.push({
        playerId: player.playerId,
        x: slot?.x ?? 15 + (fieldIndex % 4) * 23,
        y: slot?.y ?? 20 + Math.floor(fieldIndex / 4) * 22,
        onBoard: true,
      });
      fieldIndex += 1;
    } else {
      tokens.push({
        playerId: player.playerId,
        x: 8 + (benchIndex % 8) * 12,
        y: 0,
        onBoard: false,
      });
      benchIndex += 1;
    }
  }

  return tokens;
}

export function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 50;
  return Math.min(98, Math.max(2, value));
}
