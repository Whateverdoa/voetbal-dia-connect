/** Snapshot only lineup state; never accept a reset over another coach's edit. */
export function startingLineupRevision(players: ReadonlyArray<{ playerId: string; onField: boolean; isKeeper: boolean; fieldSlotIndex?: number; absent?: boolean; injured?: boolean }>): string {
  return JSON.stringify([...players].sort((a, b) => String(a.playerId).localeCompare(String(b.playerId))).map((player) => [String(player.playerId), player.onField, player.isKeeper, player.fieldSlotIndex ?? null, player.absent ?? false, player.injured ?? false]));
}
