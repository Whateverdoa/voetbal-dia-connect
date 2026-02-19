/**
 * Barrel export for all formations.
 * 14 formations: 6× 8-tal + 8× 11-tal.
 */

export type { FormationSlot, Formation } from "./types";
export {
  F8_1331, F8_1322, F8_1232, F8_1313, F8_1421, F8_1133,
} from "./formations8";
export {
  F11_1433, F11_1442, F11_14231, F11_1424, F11_14141,
  F11_1352, F11_14321, F11_1343,
} from "./formations11";

import {
  F8_1331, F8_1322, F8_1232, F8_1313, F8_1421, F8_1133,
} from "./formations8";
import {
  F11_1433, F11_1442, F11_14231, F11_1424, F11_14141,
  F11_1352, F11_14321, F11_1343,
} from "./formations11";
import type { Formation } from "./types";

/** All formations keyed by formationId. */
export const FORMATIONS: Record<string, Formation> = {
  // 8-tal (6)
  "8v8_1-3-3-1": F8_1331,
  "8v8_1-3-2-2": F8_1322,
  "8v8_1-2-3-2": F8_1232,
  "8v8_1-3-1-3": F8_1313,
  "8v8_1-4-2-1": F8_1421,
  "8v8_1-1-3-3": F8_1133,
  // 11-tal (8)
  "11v11_1-4-3-3": F11_1433,
  "11v11_1-4-4-2": F11_1442,
  "11v11_1-4-2-3-1": F11_14231,
  "11v11_1-4-2-4": F11_1424,
  "11v11_1-4-1-4-1": F11_14141,
  "11v11_1-3-5-2": F11_1352,
  "11v11_1-4-3-2-1": F11_14321,
  "11v11_1-3-4-3": F11_1343,
};

export function getFormation(id: string | undefined): Formation | undefined {
  return id ? FORMATIONS[id] : undefined;
}

export function getFormationIds(): string[] {
  return Object.keys(FORMATIONS);
}

/** Formation IDs grouped for dropdown display. */
export const FORMATION_GROUPS = [
  {
    label: "8-tal",
    formations: [
      { id: "8v8_1-3-3-1", name: F8_1331.name },
      { id: "8v8_1-3-2-2", name: F8_1322.name },
      { id: "8v8_1-2-3-2", name: F8_1232.name },
      { id: "8v8_1-3-1-3", name: F8_1313.name },
      { id: "8v8_1-4-2-1", name: F8_1421.name },
      { id: "8v8_1-1-3-3", name: F8_1133.name },
    ],
  },
  {
    label: "11-tal",
    formations: [
      { id: "11v11_1-4-3-3", name: F11_1433.name },
      { id: "11v11_1-4-4-2", name: F11_1442.name },
      { id: "11v11_1-4-2-3-1", name: F11_14231.name },
      { id: "11v11_1-4-2-4", name: F11_1424.name },
      { id: "11v11_1-4-1-4-1", name: F11_14141.name },
      { id: "11v11_1-3-5-2", name: F11_1352.name },
      { id: "11v11_1-4-3-2-1", name: F11_14321.name },
      { id: "11v11_1-3-4-3", name: F11_1343.name },
    ],
  },
];
