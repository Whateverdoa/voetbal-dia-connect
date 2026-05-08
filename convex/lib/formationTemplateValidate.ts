import type { Doc } from "../_generated/dataModel";

const SLOT_MIN = 0;
const SLOT_MAX = 100;

export type FormationSlotInput = {
  id: number;
  x: number;
  y: number;
  position: string;
};

export function validateFormationSlots(
  kind: "8v8" | "11v11",
  slots: FormationSlotInput[]
): void {
  const expected = kind === "8v8" ? 8 : 11;
  if (slots.length !== expected) {
    throw new Error(
      `Formatie moet ${expected} posities hebben (incl. keeper), nu ${slots.length}.`
    );
  }
  const ids = slots.map((s) => s.id).sort((a, b) => a - b);
  for (let i = 0; i < expected; i += 1) {
    if (ids[i] !== i) {
      throw new Error("Positie-id's moeten 0 t/m N doorlopend zijn.");
    }
  }
  const gk = slots.find((s) => s.id === 0);
  if (!gk || gk.position.toUpperCase() !== "GK") {
    throw new Error("Positie 0 moet keeper (GK) zijn.");
  }
  for (const s of slots) {
    if (s.x < SLOT_MIN || s.x > SLOT_MAX || s.y < SLOT_MIN || s.y > SLOT_MAX) {
      throw new Error("Posities moeten tussen 0 en 100 liggen.");
    }
    if (!s.position.trim()) {
      throw new Error("Elke positie moet een afkorting hebben.");
    }
  }
}

export function templateDocToFormation(doc: Doc<"formationTemplates">): {
  name: string;
  slots: FormationSlotInput[];
  links: [number, number][];
} {
  const links: [number, number][] =
    doc.links?.map((l) => [l.from, l.to]) ?? [];
  return {
    name: doc.name,
    slots: doc.slots,
    links,
  };
}
