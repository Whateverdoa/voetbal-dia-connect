import type { DemoPlan } from "../substitutions/demoPlan";

type Field = DemoPlan["startingLineup"]["field"];

/** First substitute into outgoing slots, then swap positions to reach the exact target. */
export function buildTransition(previous: Field, target: Field, minute: number): DemoPlan["steps"][number] {
  const field = previous.map((entry) => ({ ...entry }));
  const actions: DemoPlan["steps"][number]["actions"] = [];
  const incoming = target.filter((entry) => !previous.some((old) => old.playerKey === entry.playerKey));
  const outgoing = field.filter((entry) => !target.some((next) => next.playerKey === entry.playerKey));
  const actionId = () => `assistant-${minute}-${actions.length}`;
  outgoing.forEach((entry, index) => {
    const next = incoming[index];
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
