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
  links: [number, number][];
}

/** Formations keyed by formationId (e.g. "8v8_3-3-1"). */
export const FORMATIONS: Record<string, Formation> = {
  "8v8_3-3-1": {
    name: "3-3-1 (8-tallen)",
    slots: [
      { id: 0, x: 50, y: 88, role: "K" },
      { id: 1, x: 20, y: 68, role: "V" },
      { id: 2, x: 50, y: 68, role: "V" },
      { id: 3, x: 80, y: 68, role: "V" },
      { id: 4, x: 25, y: 44, role: "M" },
      { id: 5, x: 50, y: 44, role: "M" },
      { id: 6, x: 75, y: 44, role: "M" },
      { id: 7, x: 50, y: 18, role: "A" },
    ],
    links: [
      [0, 1], [0, 2], [0, 3],
      [1, 4], [2, 5], [3, 6], [2, 4], [2, 6],
      [4, 7], [5, 7], [6, 7],
    ],
  },
  "8v8_1-4-2-1": {
    name: "1-4-2-1 (8-tallen)",
    slots: [
      { id: 0, x: 50, y: 88, role: "K" },
      { id: 1, x: 15, y: 66, role: "V" },
      { id: 2, x: 38, y: 66, role: "V" },
      { id: 3, x: 62, y: 66, role: "V" },
      { id: 4, x: 85, y: 66, role: "V" },
      { id: 5, x: 35, y: 42, role: "M" },
      { id: 6, x: 65, y: 42, role: "M" },
      { id: 7, x: 50, y: 16, role: "A" },
    ],
    links: [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 5], [2, 5], [3, 6], [4, 6],
      [5, 7], [6, 7],
    ],
  },
  "8v8_1-3-2-2": {
    name: "1-3-2-2 (8-tallen)",
    slots: [
      { id: 0, x: 50, y: 88, role: "K" },
      { id: 1, x: 20, y: 66, role: "V" },
      { id: 2, x: 50, y: 66, role: "V" },
      { id: 3, x: 80, y: 66, role: "V" },
      { id: 4, x: 35, y: 42, role: "M" },
      { id: 5, x: 65, y: 42, role: "M" },
      { id: 6, x: 38, y: 18, role: "A" },
      { id: 7, x: 62, y: 18, role: "A" },
    ],
    links: [
      [0, 1], [0, 2], [0, 3],
      [1, 4], [2, 4], [2, 5], [3, 5],
      [4, 6], [5, 7], [4, 7], [5, 6],
    ],
  },
  "11v11_4-3-3": {
    name: "4-3-3 (11-tallen)",
    slots: [
      { id: 0, x: 50, y: 90, role: "K" },
      { id: 1, x: 15, y: 70, role: "V" },
      { id: 2, x: 38, y: 70, role: "V" },
      { id: 3, x: 62, y: 70, role: "V" },
      { id: 4, x: 85, y: 70, role: "V" },
      { id: 5, x: 30, y: 44, role: "M" },
      { id: 6, x: 50, y: 44, role: "M" },
      { id: 7, x: 70, y: 44, role: "M" },
      { id: 8, x: 25, y: 16, role: "A" },
      { id: 9, x: 50, y: 16, role: "A" },
      { id: 10, x: 75, y: 16, role: "A" },
    ],
    links: [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 5], [2, 5], [2, 6], [3, 6], [3, 7], [4, 7],
      [5, 8], [6, 8], [6, 9], [6, 10], [7, 10],
      [8, 9], [9, 10],
    ],
  },
};

export function getFormation(id: string | undefined): Formation | undefined {
  return id ? FORMATIONS[id] : undefined;
}

export function getFormationIds(): string[] {
  return Object.keys(FORMATIONS);
}
