import { POSITIONS } from "../positions";
import { canonicalPosition } from "./history";
import type { AssistantPlayer, PlayerEvidence } from "./types";

type Slot = { id: number; position: string };
type Assignment = { playerKey: string; slotId: number };
interface Candidate { score: number[]; field: Assignment[] }
const zones = new Map(POSITIONS.map((position) => [position.code, position.zone]));

export function positionFit(player: AssistantPlayer, position: string, evidence: PlayerEvidence):
  "primary" | "secondary" | "history" | "zone" | "unknown" | "other" | null {
  const role = canonicalPosition(position);
  if (role === null || role === "GK") return null;
  if (role === player.primaryPosition) return "primary";
  if (role === player.secondaryPosition) return "secondary";
  if (!player.primaryPosition && !player.secondaryPosition) {
    return evidence.previousPositions.includes(role) ? "history" : "unknown";
  }
  const preferences = [player.primaryPosition, player.secondaryPosition].filter((code) => code !== null);
  return preferences.some((code) => zones.get(code) === zones.get(role)) ? "zone" : "other";
}

function better(a: number[], b: number[]): boolean {
  for (let index = 0; index < a.length; index += 1) {
    if (Math.abs(a[index] - b[index]) > 1e-9) return a[index] < b[index];
  }
  return false;
}

/** Global assignment over all slots, so choosing a versatile player cannot strand a specialist. */
export function assignField({ players, slots, evidence, plannedMinutes, duration, useMinutes, useStarts, reference, kickoff, minuteBasis = "field" }: {
  players: AssistantPlayer[]; slots: Slot[]; evidence: Map<string, PlayerEvidence>;
  plannedMinutes: Map<string, number>; duration: number; useMinutes: boolean; useStarts: boolean;
  reference: Assignment[]; kickoff: boolean;
  minuteBasis?: "field" | "recorded";
}): Assignment[] | null {
  const orderedSlots = [...slots].sort((a, b) => a.id - b.id);
  const locks = new Map(players.filter((player) => player.lockedSlotId !== undefined)
    .map((player) => [player.lockedSlotId, player.key]));
  let states = new Map<number, Candidate>([[0, { score: Array<number>(10).fill(0), field: [] }]]);
  for (const player of [...players].sort((a, b) => a.key.localeCompare(b.key))) {
    const next = new Map(states);
    const facts = evidence.get(player.key);
    if (!facts) continue;
    for (const [mask, candidate] of states) {
      for (let index = 0; index < orderedSlots.length; index += 1) {
        if (mask & (1 << index)) continue;
        const slot = orderedSlots[index];
        if (locks.has(slot.id) && locks.get(slot.id) !== player.key) continue;
        if (player.lockedSlotId !== undefined && player.lockedSlotId !== slot.id) continue;
        const fit = positionFit(player, slot.position, facts);
        if (!fit) continue;
        const minutes = plannedMinutes.get(player.key) ?? 0;
        const pastMinutes = minuteBasis === "field" ? facts.fieldMinutes : facts.recordedMinutes;
        const pastEligible = minuteBasis === "field" ? facts.eligibleFieldMinutes : facts.recordedEligibleMinutes;
        const fairness = useMinutes && pastMinutes != null && pastEligible != null
          ? kickoff ? pastMinutes / pastEligible
            : (pastMinutes + minutes) / (pastEligible + duration)
          : minutes / duration;
        const role = canonicalPosition(slot.position);
        const previousPosition = role === null ? -1 : facts.previousPositions.indexOf(role);
        const delta = [
          minutes / duration,
          fairness,
          fit === "other" ? 1 : 0,
          fit === "unknown" ? 1 : 0,
          // After fairness and avoiding unsuitable positions, retain players in place.
          // An incoming player has no previous field position to preserve.
          !kickoff && reference.some((entry) => entry.playerKey === player.key && entry.slotId !== slot.id) ? 1 : 0,
          fit === "zone" ? 1 : 0,
          fit === "secondary" ? 1 : 0,
          kickoff && useStarts ? facts.starts ?? 0 : 0,
          previousPosition < 0 ? 0 : -1 / (previousPosition + 1),
          reference.some((entry) => entry.playerKey === player.key && entry.slotId === slot.id) ? 0 : 1,
        ];
        const score = candidate.score.map((value, part) => value + delta[part]);
        const newMask = mask | (1 << index);
        const best = next.get(newMask);
        if (!best || better(score, best.score)) {
          next.set(newMask, { score, field: [...candidate.field, { playerKey: player.key, slotId: slot.id }] });
        }
      }
    }
    states = next;
  }
  return states.get((1 << orderedSlots.length) - 1)?.field.sort((a, b) => a.slotId - b.slotId) ?? null;
}
