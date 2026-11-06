import type { PortablePlanSnapshot, PortableSubstitutionPlan } from "./validatePortableSubstitutionPlan";

/** Coach-facing destinations; execution keeps the original ordered actions. */
export function momentInstructions(plan: PortableSubstitutionPlan, snapshots: PortablePlanSnapshot[], stepId: string): string[] {
  const index = snapshots.findIndex((snapshot) => snapshot.stepId === stepId);
  const step = plan.steps.find((candidate) => candidate.id === stepId);
  if (index < 1 || !step) return ["Dit wisselmoment kan nog niet volledig worden doorgerekend."];
  const before = snapshots[index - 1].field;
  const after = snapshots[index].field;
  const name = (key: string) => {
    const player = plan.players.find((candidate) => candidate.key === key);
    return player ? `${player.name} ${player.number ?? "?"}` : "Onbekende speler";
  };
  const position = (slotId: number) => {
    const slot = plan.formation.slots.find((candidate) => candidate.id === slotId);
    const duplicates = plan.formation.slots.filter((candidate) => candidate.position === slot?.position);
    const ordered = [...duplicates].sort((a, b) => {
      const xA = "x" in a && typeof a.x === "number" ? a.x : a.id;
      const xB = "x" in b && typeof b.x === "number" ? b.x : b.id;
      return xA - xB;
    });
    const side = ordered.findIndex((candidate) => candidate.id === slotId);
    const qualifier = side === 0 ? "links" : side === ordered.length - 1 ? "rechts" : "midden";
    return `${slot?.position ?? "onbekende positie"}${duplicates.length > 1 ? ` ${qualifier}` : ""}`;
  };
  const substitutions = step.actions.filter((action) => action.kind === "substitution").map((action) => {
    const destination = after.find((entry) => entry.playerKey === action.playerInKey);
    return `Wissel: ${name(action.playerOutKey)} eruit → ${name(action.playerInKey)} erin${destination ? ` op ${position(destination.slotId)}` : ""}`;
  });
  const moves = after.flatMap((entry) => {
    const previous = before.find((candidate) => candidate.playerKey === entry.playerKey);
    return previous && previous.slotId !== entry.slotId
      ? [`Positie: ${name(entry.playerKey)} van ${position(previous.slotId)} naar ${position(entry.slotId)}`] : [];
  });
  return [...substitutions, ...moves];
}
