/**
 * FieldLines — SVG overlay that draws all official FIFA/KNVB field markings.
 * Renders as an absolute-positioned SVG inside a relatively-positioned container.
 * Line color and stroke are FC26 cyan style.
 */
import { type FieldConfig, penaltyArcPath } from "@/lib/fieldConfig";

const LINE_COLOR = "rgba(255,255,255,0.55)";
const GOAL_COLOR = "rgba(255,255,255,0.75)";
const LINE_WIDTH = 2;
const GOAL_WIDTH = 4;

interface FieldLinesProps {
  cfg: FieldConfig;
}

export function FieldLines({ cfg }: FieldLinesProps) {
  const { w, h, pa_w, pa_h, ga_w, ga_h, goal_w, pen_dist, circle_r, corner_r } = cfg;
  const cx = w / 2;
  const cy = h / 2;
  const pa_x = (w - pa_w) / 2;
  const ga_x = (w - ga_w) / 2;
  const goal_x = (w - goal_w) / 2;

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      stroke={LINE_COLOR}
      strokeWidth={LINE_WIDTH}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Touchlines and goal lines */}
      <rect x="0" y="0" width={w} height={h} />

      {/* Halfway line */}
      <line x1="0" y1={cy} x2={w} y2={cy} />

      {/* Center circle and spot */}
      <circle cx={cx} cy={cy} r={circle_r} />
      <circle cx={cx} cy={cy} r={3} fill={LINE_COLOR} stroke="none" />

      {/* Top goal: penalty area, goal area, penalty spot, arc, goal highlight */}
      <line x1={pa_x} y1={0} x2={pa_x} y2={pa_h} />
      <line x1={pa_x + pa_w} y1={0} x2={pa_x + pa_w} y2={pa_h} />
      <line x1={pa_x} y1={pa_h} x2={pa_x + pa_w} y2={pa_h} />
      <line x1={ga_x} y1={0} x2={ga_x} y2={ga_h} />
      <line x1={ga_x + ga_w} y1={0} x2={ga_x + ga_w} y2={ga_h} />
      <line x1={ga_x} y1={ga_h} x2={ga_x + ga_w} y2={ga_h} />
      <circle cx={cx} cy={pen_dist} r={2.5} fill={LINE_COLOR} stroke="none" />
      <path d={penaltyArcPath(cfg, false)} />
      <line x1={goal_x} y1={0} x2={goal_x + goal_w} y2={0} strokeWidth={GOAL_WIDTH} stroke={GOAL_COLOR} />

      {/* Bottom goal: penalty area, goal area, penalty spot, arc, goal highlight */}
      <line x1={pa_x} y1={h} x2={pa_x} y2={h - pa_h} />
      <line x1={pa_x + pa_w} y1={h} x2={pa_x + pa_w} y2={h - pa_h} />
      <line x1={pa_x} y1={h - pa_h} x2={pa_x + pa_w} y2={h - pa_h} />
      <line x1={ga_x} y1={h} x2={ga_x} y2={h - ga_h} />
      <line x1={ga_x + ga_w} y1={h} x2={ga_x + ga_w} y2={h - ga_h} />
      <line x1={ga_x} y1={h - ga_h} x2={ga_x + ga_w} y2={h - ga_h} />
      <circle cx={cx} cy={h - pen_dist} r={2.5} fill={LINE_COLOR} stroke="none" />
      <path d={penaltyArcPath(cfg, true)} />
      <line x1={goal_x} y1={h} x2={goal_x + goal_w} y2={h} strokeWidth={GOAL_WIDTH} stroke={GOAL_COLOR} />

      {/* Corner arcs */}
      <path d={`M ${corner_r} 0 A ${corner_r} ${corner_r} 0 0 1 0 ${corner_r}`} />
      <path d={`M ${w - corner_r} 0 A ${corner_r} ${corner_r} 0 0 0 ${w} ${corner_r}`} />
      <path d={`M 0 ${h - corner_r} A ${corner_r} ${corner_r} 0 0 1 ${corner_r} ${h}`} />
      <path d={`M ${w} ${h - corner_r} A ${corner_r} ${corner_r} 0 0 0 ${w - corner_r} ${h}`} />
    </svg>
  );
}
