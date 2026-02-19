/**
 * 8-tal formations (7 veldspelers + keeper).
 * KNVB JO11/JO12 — veld 64×42,5m — doel 5×2m
 * Coordinates from FORMATIONS.md (0-100 normalized space).
 */

import type { Formation } from "./types";

/** 1-3-3-1 — Gebalanceerd (KNVB aanbevolen basisformatie) */
export const F8_1331: Formation = {
  name: "1-3-3-1 (Gebalanceerd)",
  slots: [
    { id: 0, x: 50, y: 90, position: "GK" },
    { id: 1, x: 80, y: 70, position: "RB" },
    { id: 2, x: 50, y: 75, position: "CB" },
    { id: 3, x: 20, y: 70, position: "LB" },
    { id: 4, x: 85, y: 45, position: "RM" },
    { id: 5, x: 50, y: 50, position: "CM" },
    { id: 6, x: 15, y: 45, position: "LM" },
    { id: 7, x: 50, y: 20, position: "ST" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3],
    [1, 4], [2, 5], [3, 6], [2, 4], [2, 6],
    [4, 7], [5, 7], [6, 7],
  ],
};

/** 1-3-2-2 — Aanvallend (twee spitsen) */
export const F8_1322: Formation = {
  name: "1-3-2-2 (Aanvallend)",
  slots: [
    { id: 0, x: 50, y: 90, position: "GK" },
    { id: 1, x: 80, y: 70, position: "RB" },
    { id: 2, x: 50, y: 75, position: "CB" },
    { id: 3, x: 20, y: 70, position: "LB" },
    { id: 4, x: 62, y: 48, position: "CM" },
    { id: 5, x: 38, y: 48, position: "CM" },
    { id: 6, x: 35, y: 22, position: "CF" },
    { id: 7, x: 65, y: 22, position: "ST" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3],
    [1, 4], [2, 4], [2, 5], [3, 5],
    [4, 7], [5, 6], [4, 6], [5, 7],
  ],
};

/** 1-2-3-2 — Middenveld dominant */
export const F8_1232: Formation = {
  name: "1-2-3-2 (Middenveld dominant)",
  slots: [
    { id: 0, x: 50, y: 90, position: "GK" },
    { id: 1, x: 65, y: 75, position: "CB" },
    { id: 2, x: 35, y: 75, position: "CB" },
    { id: 3, x: 85, y: 50, position: "RM" },
    { id: 4, x: 50, y: 52, position: "CM" },
    { id: 5, x: 15, y: 50, position: "LM" },
    { id: 6, x: 62, y: 22, position: "ST" },
    { id: 7, x: 38, y: 22, position: "CF" },
  ],
  links: [
    [0, 1], [0, 2],
    [1, 3], [1, 4], [2, 4], [2, 5],
    [3, 6], [4, 6], [4, 7], [5, 7],
  ],
};

/** 1-3-1-3 — Ruit / offensief (één spelmaker) */
export const F8_1313: Formation = {
  name: "1-3-1-3 (Ruit / Offensief)",
  slots: [
    { id: 0, x: 50, y: 90, position: "GK" },
    { id: 1, x: 80, y: 70, position: "RB" },
    { id: 2, x: 50, y: 75, position: "CB" },
    { id: 3, x: 20, y: 70, position: "LB" },
    { id: 4, x: 50, y: 42, position: "CAM" },
    { id: 5, x: 85, y: 22, position: "RW" },
    { id: 6, x: 50, y: 18, position: "ST" },
    { id: 7, x: 15, y: 22, position: "LW" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3],
    [1, 4], [2, 4], [3, 4],
    [4, 5], [4, 6], [4, 7],
  ],
};

/** 1-4-2-1 — Defensief (vier achterin) */
export const F8_1421: Formation = {
  name: "1-4-2-1 (Defensief)",
  slots: [
    { id: 0, x: 50, y: 90, position: "GK" },
    { id: 1, x: 85, y: 72, position: "RB" },
    { id: 2, x: 62, y: 76, position: "CB" },
    { id: 3, x: 38, y: 76, position: "CB" },
    { id: 4, x: 15, y: 72, position: "LB" },
    { id: 5, x: 62, y: 48, position: "CM" },
    { id: 6, x: 38, y: 48, position: "CM" },
    { id: 7, x: 50, y: 20, position: "ST" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 5], [2, 5], [3, 6], [4, 6],
    [5, 7], [6, 7],
  ],
};

/** 1-1-3-3 — Ultra-aanvallend (één verdediger) */
export const F8_1133: Formation = {
  name: "1-1-3-3 (Ultra-aanvallend)",
  slots: [
    { id: 0, x: 50, y: 90, position: "GK" },
    { id: 1, x: 50, y: 72, position: "CB" },
    { id: 2, x: 15, y: 48, position: "LM" },
    { id: 3, x: 50, y: 50, position: "CM" },
    { id: 4, x: 85, y: 48, position: "RM" },
    { id: 5, x: 15, y: 24, position: "LW" },
    { id: 6, x: 50, y: 18, position: "ST" },
    { id: 7, x: 85, y: 24, position: "RW" },
  ],
  links: [
    [0, 1],
    [1, 2], [1, 3], [1, 4],
    [2, 5], [3, 5], [3, 6], [3, 7], [4, 7],
  ],
};
