/**
 * Formation definitions for field view (SVG).
 * Slot coordinates are in normalized space (e.g. viewBox 0 0 100 150).
 * id matches fieldSlotIndex on matchPlayers; role is K/V/M/A for position hints.
 */

export type SlotRole = "K" | "V" | "M" | "A";

export interface FormationSlot {
  id: number;
  x: number;
  y: number;
  role: SlotRole;
}

export interface Formation {
  name: string;
  slots: FormationSlot[];
}

/** Formations keyed by formationId (e.g. "8v8_3-3-1"). */
export const FORMATIONS: Record<string, Formation> = {
  "8v8_3-3-1": {
    name: "3-3-1 (8-tallen)",
    slots: [
      { id: 0, x: 50, y: 94, role: "K" },
      { id: 1, x: 20, y: 82, role: "V" },
      { id: 2, x: 50, y: 82, role: "V" },
      { id: 3, x: 80, y: 82, role: "V" },
      { id: 4, x: 25, y: 68, role: "M" },
      { id: 5, x: 50, y: 68, role: "M" },
      { id: 6, x: 75, y: 68, role: "M" },
      { id: 7, x: 50, y: 53, role: "A" },
    ],
  },
  "8v8_1-4-2-1": {
    name: "1-4-2-1 (8-tallen)",
    slots: [
      { id: 0, x: 50, y: 94, role: "K" },
      { id: 1, x: 15, y: 84, role: "V" },
      { id: 2, x: 38, y: 84, role: "V" },
      { id: 3, x: 62, y: 84, role: "V" },
      { id: 4, x: 85, y: 84, role: "V" },
      { id: 5, x: 35, y: 68, role: "M" },
      { id: 6, x: 65, y: 68, role: "M" },
      { id: 7, x: 50, y: 53, role: "A" },
    ],
  },
  "8v8_1-3-2-2": {
    name: "1-3-2-2 (8-tallen)",
    slots: [
      { id: 0, x: 50, y: 94, role: "K" },
      { id: 1, x: 20, y: 82, role: "V" },
      { id: 2, x: 50, y: 82, role: "V" },
      { id: 3, x: 80, y: 82, role: "V" },
      { id: 4, x: 35, y: 68, role: "M" },
      { id: 5, x: 65, y: 68, role: "M" },
      { id: 6, x: 38, y: 55, role: "A" },
      { id: 7, x: 62, y: 55, role: "A" },
    ],
  },
  "11v11_4-3-3": {
    name: "4-3-3 (11-tallen)",
    slots: [
      { id: 0, x: 50, y: 95, role: "K" },
      { id: 1, x: 15, y: 85, role: "V" },
      { id: 2, x: 38, y: 85, role: "V" },
      { id: 3, x: 62, y: 85, role: "V" },
      { id: 4, x: 85, y: 85, role: "V" },
      { id: 5, x: 30, y: 71, role: "M" },
      { id: 6, x: 50, y: 71, role: "M" },
      { id: 7, x: 70, y: 71, role: "M" },
      { id: 8, x: 25, y: 54, role: "A" },
      { id: 9, x: 50, y: 53, role: "A" },
      { id: 10, x: 75, y: 54, role: "A" },
    ],
  },
};

export function getFormation(id: string | undefined): Formation | undefined {
  return id ? FORMATIONS[id] : undefined;
}

export function getFormationIds(): string[] {
  return Object.keys(FORMATIONS);
}
