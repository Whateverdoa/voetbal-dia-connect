import {
  F11_1352,
  F11_14231,
  F11_1442,
  F11_1532,
  type Formation,
  type FormationSlot,
} from "../formations";
import { DEMO_PLAN, type DemoPlan } from "./demoPlan";

export interface DemoFormation {
  readonly id: string;
  readonly name: string;
  readonly slots: readonly Readonly<FormationSlot>[];
}

export const DEFAULT_DEMO_FORMATION_ID = "photo-433";

const ROW_X: Record<number, readonly number[]> = {
  1: [50],
  2: [35, 65],
  3: [20, 50, 80],
  4: [14, 38, 62, 86],
  5: [12, 31, 50, 69, 88],
};

/** Keep app position roles, but fit each line into the demo's half pitch. */
function fromAppFormation(
  id: string,
  name: string,
  formation: Formation,
  lineSizes: readonly number[],
): DemoFormation {
  const rowY = lineSizes.length === 4 ? [69, 50, 31, 12] : [68, 43, 18];
  const fieldSlots = lineSizes.flatMap((size, lineIndex) => {
    const offset = 1 + lineSizes.slice(0, lineIndex).reduce((sum, count) => sum + count, 0);
    // The app numbers each line right-to-left; the source plan uses left-to-right.
    const sourceLine = formation.slots.slice(offset, offset + size).sort((a, b) => a.x - b.x);
    return sourceLine.map((slot, columnIndex) => ({
      id: offset + columnIndex,
      position: slot.position,
      x: ROW_X[size][columnIndex],
      y: rowY[lineIndex],
    }));
  });

  return {
    id,
    name,
    slots: [{ id: 0, position: "GK", x: 50, y: lineSizes.length === 4 ? 88 : 87 }, ...fieldSlots],
  };
}

export const DEMO_FORMATIONS: readonly DemoFormation[] = [
  {
    id: DEFAULT_DEMO_FORMATION_ID,
    name: "4-3-3 (uit foto)",
    slots: DEMO_PLAN.formation.slots.map((slot) => ({ ...slot })),
  },
  fromAppFormation("4-4-2", "4-4-2", F11_1442, [4, 4, 2]),
  fromAppFormation("4-2-3-1", "4-2-3-1", F11_14231, [4, 2, 3, 1]),
  fromAppFormation("3-5-2", "3-5-2", F11_1352, [3, 5, 2]),
  // The demo uses a midfield diamond; the app's flat 3-4-3 preset stays unchanged.
  {
    id: "3-4-3",
    name: "3-4-3 (ruit)",
    slots: [
      { id: 0, position: "GK", x: 50, y: 91 },
      { id: 1, position: "CB", x: 20, y: 76 },
      { id: 2, position: "CB", x: 50, y: 76 },
      { id: 3, position: "CB", x: 80, y: 76 },
      { id: 4, position: "CDM", x: 50, y: 60 },
      { id: 5, position: "LM", x: 22, y: 44 },
      { id: 6, position: "RM", x: 78, y: 44 },
      { id: 7, position: "CAM", x: 50, y: 28 },
      { id: 8, position: "LW", x: 20, y: 12 },
      { id: 9, position: "ST", x: 50, y: 12 },
      { id: 10, position: "RW", x: 80, y: 12 },
    ],
  },
  fromAppFormation("5-3-2", "5-3-2", F11_1532, [5, 3, 2]),
];

export function getDemoFormation(id: string | undefined): DemoFormation {
  return DEMO_FORMATIONS.find((formation) => formation.id === id) ?? DEMO_FORMATIONS[0];
}

/** Changing roles requires another review; player identities and substitutions stay intact. */
export function withDemoFormation(plan: DemoPlan, id: string): DemoPlan {
  const formation = getDemoFormation(id);
  return {
    ...plan,
    formation: {
      id: formation.id,
      name: formation.name,
      slots: formation.slots.map((slot) => ({ ...slot })),
    },
    review: { ...plan.review, sourceConfirmed: false },
  };
}
