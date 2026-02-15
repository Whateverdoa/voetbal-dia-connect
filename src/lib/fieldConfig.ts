/**
 * Field dimensions for 8-tal (KNVB JO12) and 11-tal (FIFA) fields.
 * SVG viewBox: 1 unit = 0.1m — gives dimensional accuracy.
 * All markings follow official FIFA/KNVB Laws of the Game.
 */

export interface FieldConfig {
  label: string;
  sub: string;
  w: number;
  h: number;
  pa_w: number;
  pa_h: number;
  ga_w: number;
  ga_h: number;
  goal_w: number;
  pen_dist: number;
  circle_r: number;
  corner_r: number;
  arc_r: number;
}

export type FieldMode = "8tal" | "11tal";

export const FIELDS: Record<FieldMode, FieldConfig> = {
  "8tal": {
    label: "8-tal · JO12",
    sub: "64×42,5m · KNVB",
    w: 425,
    h: 640,
    pa_w: 210,
    pa_h: 120,
    ga_w: 110,
    ga_h: 40,
    goal_w: 50,
    pen_dist: 80,
    circle_r: 70,
    corner_r: 10,
    arc_r: 70,
  },
  "11tal": {
    label: "11-tal",
    sub: "105×68m · FIFA",
    w: 680,
    h: 1050,
    pa_w: 403,
    pa_h: 165,
    ga_w: 183,
    ga_h: 55,
    goal_w: 73,
    pen_dist: 110,
    circle_r: 92,
    corner_r: 10,
    arc_r: 92,
  },
};

/** Calculate SVG arc path for the penalty arc that curves OUTSIDE the penalty area. */
export function penaltyArcPath(cfg: FieldConfig, isBottom: boolean): string {
  const { w, pa_h, pen_dist, arc_r } = cfg;
  const cx = w / 2;
  const penY = isBottom ? cfg.h - pen_dist : pen_dist;
  const paEdge = isBottom ? cfg.h - pa_h : pa_h;
  const dy = Math.abs(paEdge - penY);
  if (dy >= arc_r) return "";
  const dx = Math.sqrt(arc_r * arc_r - dy * dy);
  const x1 = cx - dx;
  const x2 = cx + dx;
  const sweep = isBottom ? 0 : 1;
  return `M ${x1} ${paEdge} A ${arc_r} ${arc_r} 0 0 ${sweep} ${x2} ${paEdge}`;
}

/** Derive field mode from formationId prefix (e.g. "8v8_3-3-1" → "8tal"). */
export function fieldModeFromFormation(formationId: string | undefined): FieldMode {
  if (formationId?.startsWith("11v11")) return "11tal";
  return "8tal";
}
