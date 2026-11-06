import type { DemoPlan } from "../substitutions/demoPlan";

type Field = DemoPlan["startingLineup"]["field"];

/** First substitute into outgoing slots, then swap positions to reach the exact target. */
export function buildTransition(previous: Field, target: Field, minute: number): DemoPlan["steps"][number] {
  const field = previous.map((entry) => ({ ...entry }));
  const actions: DemoPlan["steps"][number]["actions"] = [];
  const incoming = target.filter((entry) => !previous.some((old) => old.playerKey === entry.playerKey));
  const outgoing = field.filter((entry) => !target.some((next) => next.playerKey === entry.playerKey));
  const actionId = () => `assistant-${minute}-${actions.length}`;
  // Follow each vacant slot through retained players to its incoming player.
  // Pairing by array order would join independent chains and create needless swaps.
  outgoing.forEach((entry) => {
    let slotId = entry.slotId;
    let next = target.find((candidate) => candidate.slotId === slotId)!;
    while (!incoming.some((candidate) => candidate.playerKey === next.playerKey)) {
      const previousSlot = previous.find((candidate) => candidate.playerKey === next.playerKey);
      if (!previousSlot) throw new Error("De doelopstelling bevat een onbekende speler.");
      slotId = previousSlot.slotId;
      next = target.find((candidate) => candidate.slotId === slotId)!;
    }
    actions.push({ id: actionId(), kind: "substitution", playerOutKey: entry.playerKey, playerInKey: next.playerKey });
    entry.playerKey = next.playerKey;
  });
  for (const next of target) {
    const occupant = field.find((entry) => entry.slotId === next.slotId);
    const desired = field.find((entry) => entry.playerKey === next.playerKey);
    if (!occupant || !desired || occupant === desired) continue;
    actions.push({ id: actionId(), kind: "positionSwap", playerOutKey: occupant.playerKey, playerInKey: desired.playerKey });
    const previousKey = occupant.playerKey;
    occupant.playerKey = desired.playerKey;
    desired.playerKey = previousKey;
  }
  return { id: `assistant-${minute}`, matchMinute: minute, actions };
}
