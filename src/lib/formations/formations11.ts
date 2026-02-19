/**
 * 11-tal formations (10 veldspelers + keeper).
 * FIFA standaard — veld 105×68m — doel 7,32×2,44m
 * Coordinates from FORMATIONS.md (0-100 normalized space).
 */

import type { Formation } from "./types";

/** 1-4-3-3 — Nederlands klassiek (Ajax, Oranje, Barcelona/Cruyff) */
export const F11_1433: Formation = {
  name: "1-4-3-3 (Nederlands klassiek)",
  slots: [
    { id: 0, x: 50, y: 93, position: "GK" },
    { id: 1, x: 85, y: 76, position: "RB" },
    { id: 2, x: 62, y: 80, position: "CB" },
    { id: 3, x: 38, y: 80, position: "CB" },
    { id: 4, x: 15, y: 76, position: "LB" },
    { id: 5, x: 50, y: 60, position: "CDM" },
    { id: 6, x: 72, y: 52, position: "CM" },
    { id: 7, x: 28, y: 52, position: "CM" },
    { id: 8, x: 90, y: 28, position: "RW" },
    { id: 9, x: 50, y: 22, position: "ST" },
    { id: 10, x: 10, y: 28, position: "LW" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 5], [2, 5], [2, 6], [3, 5], [3, 7], [4, 5],
    [5, 8], [6, 8], [6, 9], [7, 9], [7, 10],
    [8, 9], [9, 10],
  ],
};

/** 1-4-4-2 — Klassiek (Atletico Madrid, Engelse clubs) */
export const F11_1442: Formation = {
  name: "1-4-4-2 (Klassiek)",
  slots: [
    { id: 0, x: 50, y: 93, position: "GK" },
    { id: 1, x: 85, y: 76, position: "RB" },
    { id: 2, x: 62, y: 80, position: "CB" },
    { id: 3, x: 38, y: 80, position: "CB" },
    { id: 4, x: 15, y: 76, position: "LB" },
    { id: 5, x: 85, y: 52, position: "RM" },
    { id: 6, x: 62, y: 55, position: "CM" },
    { id: 7, x: 38, y: 55, position: "CM" },
    { id: 8, x: 15, y: 52, position: "LM" },
    { id: 9, x: 60, y: 24, position: "ST" },
    { id: 10, x: 40, y: 24, position: "ST" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 5], [2, 6], [3, 7], [4, 8],
    [5, 6], [6, 7], [7, 8],
    [5, 9], [6, 9], [7, 10], [8, 10],
    [9, 10],
  ],
};

/** 1-4-2-3-1 — Modern (Duitsland WK 2014, Real Madrid) */
export const F11_14231: Formation = {
  name: "1-4-2-3-1 (Modern)",
  slots: [
    { id: 0, x: 50, y: 93, position: "GK" },
    { id: 1, x: 85, y: 76, position: "RB" },
    { id: 2, x: 62, y: 80, position: "CB" },
    { id: 3, x: 38, y: 80, position: "CB" },
    { id: 4, x: 15, y: 76, position: "LB" },
    { id: 5, x: 60, y: 58, position: "CDM" },
    { id: 6, x: 40, y: 58, position: "CDM" },
    { id: 7, x: 85, y: 38, position: "RW" },
    { id: 8, x: 50, y: 40, position: "CAM" },
    { id: 9, x: 15, y: 38, position: "LW" },
    { id: 10, x: 50, y: 22, position: "ST" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 5], [2, 5], [3, 6], [4, 6],
    [5, 7], [5, 8], [6, 8], [6, 9],
    [7, 10], [8, 10], [9, 10],
  ],
};

/** 1-4-2-4 — Aanvallend (vier voorin) */
export const F11_1424: Formation = {
  name: "1-4-2-4 (Aanvallend)",
  slots: [
    { id: 0, x: 50, y: 93, position: "GK" },
    { id: 1, x: 85, y: 76, position: "RB" },
    { id: 2, x: 62, y: 80, position: "CB" },
    { id: 3, x: 38, y: 80, position: "CB" },
    { id: 4, x: 15, y: 76, position: "LB" },
    { id: 5, x: 62, y: 55, position: "CM" },
    { id: 6, x: 38, y: 55, position: "CM" },
    { id: 7, x: 93, y: 30, position: "RW" },
    { id: 8, x: 62, y: 24, position: "CF" },
    { id: 9, x: 38, y: 24, position: "CF" },
    { id: 10, x: 7, y: 30, position: "LW" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 5], [2, 5], [3, 6], [4, 6],
    [5, 7], [5, 8], [6, 9], [6, 10],
    [7, 8], [8, 9], [9, 10],
  ],
};

/** 1-4-1-4-1 — Compact (Chelsea/Conte 2016-17) */
export const F11_14141: Formation = {
  name: "1-4-1-4-1 (Compact)",
  slots: [
    { id: 0, x: 50, y: 93, position: "GK" },
    { id: 1, x: 85, y: 76, position: "RB" },
    { id: 2, x: 62, y: 80, position: "CB" },
    { id: 3, x: 38, y: 80, position: "CB" },
    { id: 4, x: 15, y: 76, position: "LB" },
    { id: 5, x: 50, y: 62, position: "CDM" },
    { id: 6, x: 88, y: 45, position: "RM" },
    { id: 7, x: 62, y: 48, position: "CM" },
    { id: 8, x: 38, y: 48, position: "CM" },
    { id: 9, x: 12, y: 45, position: "LM" },
    { id: 10, x: 50, y: 22, position: "ST" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 5], [2, 5], [3, 5], [4, 5],
    [5, 6], [5, 7], [5, 8], [5, 9],
    [6, 10], [7, 10], [8, 10], [9, 10],
  ],
};

/** 1-3-5-2 — Wing-backs (Conte/Inter, Juventus) */
export const F11_1352: Formation = {
  name: "1-3-5-2 (Wing-backs)",
  slots: [
    { id: 0, x: 50, y: 93, position: "GK" },
    { id: 1, x: 75, y: 80, position: "CB" },
    { id: 2, x: 50, y: 82, position: "CB" },
    { id: 3, x: 25, y: 80, position: "CB" },
    { id: 4, x: 92, y: 55, position: "RWB" },
    { id: 5, x: 65, y: 55, position: "CM" },
    { id: 6, x: 50, y: 48, position: "CAM" },
    { id: 7, x: 35, y: 55, position: "CM" },
    { id: 8, x: 8, y: 55, position: "LWB" },
    { id: 9, x: 60, y: 24, position: "ST" },
    { id: 10, x: 40, y: 24, position: "ST" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3],
    [1, 4], [1, 5], [2, 5], [2, 6], [2, 7], [3, 7], [3, 8],
    [4, 9], [5, 9], [6, 9], [6, 10], [7, 10], [8, 10],
    [9, 10],
  ],
};

/** 1-4-3-2-1 — Kerstboom (Ancelotti/AC Milan CL 2007) */
export const F11_14321: Formation = {
  name: "1-4-3-2-1 (Kerstboom)",
  slots: [
    { id: 0, x: 50, y: 93, position: "GK" },
    { id: 1, x: 85, y: 76, position: "RB" },
    { id: 2, x: 62, y: 80, position: "CB" },
    { id: 3, x: 38, y: 80, position: "CB" },
    { id: 4, x: 15, y: 76, position: "LB" },
    { id: 5, x: 78, y: 55, position: "RM" },
    { id: 6, x: 50, y: 58, position: "CM" },
    { id: 7, x: 22, y: 55, position: "LM" },
    { id: 8, x: 65, y: 36, position: "CF" },
    { id: 9, x: 35, y: 36, position: "CF" },
    { id: 10, x: 50, y: 22, position: "ST" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 5], [2, 6], [3, 6], [4, 7],
    [5, 8], [6, 8], [6, 9], [7, 9],
    [8, 10], [9, 10],
  ],
};

/** 1-3-4-3 — Cruyff / Van Gaal (Ajax CL 1995, Barcelona/Cruyff) */
export const F11_1343: Formation = {
  name: "1-3-4-3 (Cruyff / Van Gaal)",
  slots: [
    { id: 0, x: 50, y: 93, position: "GK" },
    { id: 1, x: 75, y: 80, position: "CB" },
    { id: 2, x: 50, y: 82, position: "CB" },
    { id: 3, x: 25, y: 80, position: "CB" },
    { id: 4, x: 90, y: 52, position: "RM" },
    { id: 5, x: 62, y: 55, position: "CM" },
    { id: 6, x: 38, y: 55, position: "CM" },
    { id: 7, x: 10, y: 52, position: "LM" },
    { id: 8, x: 88, y: 26, position: "RW" },
    { id: 9, x: 50, y: 22, position: "ST" },
    { id: 10, x: 12, y: 26, position: "LW" },
  ],
  links: [
    [0, 1], [0, 2], [0, 3],
    [1, 4], [1, 5], [2, 5], [2, 6], [3, 6], [3, 7],
    [4, 8], [5, 8], [5, 9], [6, 9], [6, 10], [7, 10],
    [8, 9], [9, 10],
  ],
};
