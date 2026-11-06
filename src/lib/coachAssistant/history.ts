import { POSITIONS } from "../positions";
import type { AssistantInput, PlayerEvidence } from "./types";

const aliases: Record<string, string> = { LCB: "CB", RCB: "CB", LCM: "CM", RCM: "CM" };
const positionCodes = new Set(POSITIONS.map((position) => position.code));

export function canonicalPosition(value: string | null): string | null {
  if (!value) return null;
  const code = aliases[value] ?? value;
  return positionCodes.has(code) ? code : null;
}

export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

/** Exclude unknown/unreviewed data. Never convert missing minutes or attendance to zero. */
export function collectEvidence(input: AssistantInput): { evidence: PlayerEvidence[]; warnings: string[] } {
  const warnings = new Set<string>();
  const ids = input.history.map((match) => match.id);
  const duplicateIds = new Set(ids.filter((id, index) => ids.indexOf(id) !== index));
  if (duplicateIds.size) warnings.add("Dubbele bronwedstrijden zijn niet meegeteld.");
  const history = input.history.filter((match) => {
    const usable = !duplicateIds.has(match.id) && match.confirmed && match.teamKey === input.teamKey &&
      validDate(match.date) && match.date < input.targetDate &&
      Number.isFinite(match.playingDuration) && match.playingDuration > 0;
    if (!usable) warnings.add("Onbevestigde, ongeldige of niet-eerdere bronwedstrijden zijn niet meegeteld.");
    return usable;
  }).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));

  const evidence = input.players.map((player): PlayerEvidence => {
    let fieldMinutes = 0;
    let eligibleFieldMinutes = 0;
    let confirmedGames = 0;
    let recordedMinutes = 0;
    let recordedEligibleMinutes = 0;
    let recordedGames = 0;
    let starts = 0;
    let confirmedStarts = 0;
    const sourceIds: string[] = [];
    const previousPositions: string[] = [];
    for (const match of history) {
      const rows = match.players.filter((row) => row.playerKey === player.key);
      if (rows.length !== 1) continue;
      const row = rows[0];
      if (row.attendance !== "present") continue;
      if (match.source === "dia_live" && row.minutes !== null && Number.isFinite(row.minutes) && row.minutes >= 0 && row.minutes <= match.playingDuration) {
        recordedMinutes += row.minutes;
        recordedEligibleMinutes += match.playingDuration;
        recordedGames += 1;
        sourceIds.push(match.id);
      }
      const validMinutes = row.minutes !== null && row.keeperMinutes !== null &&
        Number.isFinite(row.minutes) && Number.isFinite(row.keeperMinutes) &&
        row.minutes >= 0 && row.minutes <= match.playingDuration &&
        row.keeperMinutes >= 0 && row.keeperMinutes <= row.minutes;
      if (validMinutes && row.minutes !== null && row.keeperMinutes !== null) {
        const eligible = match.playingDuration - row.keeperMinutes;
        if (eligible > 0) {
          fieldMinutes += row.minutes - row.keeperMinutes;
          eligibleFieldMinutes += eligible;
          confirmedGames += 1;
          if (!sourceIds.includes(match.id)) sourceIds.push(match.id);
        }
      } else if (match.source !== "dia_live") {
        warnings.add("Ontbrekende of ongeldige minuten (inclusief keeperminuten) zijn niet meegeteld.");
      }
      if (match.startingLineupConfirmed && row.startingPosition) {
        const position = canonicalPosition(row.startingPosition);
        if (position || row.startingPosition === "BENCH") {
          confirmedStarts += 1;
          if (position) {
            starts += 1;
            if (!previousPositions.includes(position)) previousPositions.push(position);
          }
        }
      }
    }
    return {
      playerKey: player.key, fieldMinutes: confirmedGames ? fieldMinutes : null,
      recordedMinutes: recordedGames ? recordedMinutes : null,
      recordedEligibleMinutes: recordedGames ? recordedEligibleMinutes : null,
      eligibleFieldMinutes: confirmedGames ? eligibleFieldMinutes : null,
      confirmedGames, starts: confirmedStarts ? starts : null, sourceIds, previousPositions,
    };
  });
  return { evidence, warnings: [...warnings] };
}
