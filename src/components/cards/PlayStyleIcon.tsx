import type { ReactNode, SVGProps } from "react";
import { PLAY_STYLES } from "@/lib/cards/fc27";

interface PlayStyleIconProps extends Omit<SVGProps<SVGSVGElement>, "id"> {
  styleId: string;
  size?: number;
  decorative?: boolean;
}

const BALL = <><circle cx="26" cy="27" r="6" /><path d="m26 23 3 2-1 4h-4l-1-4z" /></>;

/** Presentation guard only; persistence validates IDs and the maximum server-side. */
export function PlayStyleStrip({ ids }: { ids: readonly string[] }) {
  const styles = PLAY_STYLES.filter((style) => ids.includes(style.id)).slice(0, 3);
  return <div className="flex justify-center gap-[1.5cqw]">
    {styles.map((style) => <span key={style.id} title={`${style.name}: ${style.description}`}>
      <PlayStyleIcon styleId={style.id} className="h-[9cqw] w-[9cqw]" />
    </span>)}
  </div>;
}

/** Original DIA football pictograms, sharing the familiar diamond silhouette. */
export function PlayStyleIcon({
  styleId,
  size = 28,
  decorative = false,
  className = "",
  ...props
}: PlayStyleIconProps) {
  let glyph: ReactNode;
  switch (styleId) {
    case "placed_ball":
      glyph = <>{BALL}<path d="M12 32c-1-14 13-22 23-14m-5-4 6 4-5 5" /></>;
      break;
    case "power_shot":
      glyph = <>{BALL}<path d="m12 20 6 1m-8 5 7 1m-5 5 6-1m12-14 5-4-1 7m-5-5 6-2" /></>;
      break;
    case "through_pass":
      glyph = <><circle cx="14" cy="31" r="4" /><path d="m19 28 15-14m-8 1 9-2-1 9m-11 8 4 4m-7-16 4 4" /></>;
      break;
    case "accurate_cross":
      glyph = <><circle cx="14" cy="31" r="4" /><path d="M12 23c2-13 20-13 23 1m-5-3 5 4 3-6M30 32h8m-4-4v8" /></>;
      break;
    case "interceptor":
      glyph = <><path d="m24 12 11 4v9c0 6-6 10-11 13-5-3-11-7-11-13v-9zM17 25h14m-5-5 5 5-5 5" /></>;
      break;
    case "strong_tackle":
      glyph = <><path d="m15 14 6 9 10 3 5 5H22l-7-6m1-5-4 9" /><circle cx="32" cy="16" r="4" /></>;
      break;
    case "ball_control":
      glyph = <>{BALL}<path d="m15 12 1 11 5 3m-8 8h8m14-13 3-4m-2 18 3 3" /></>;
      break;
    case "dribbler":
      glyph = <><circle cx="15" cy="17" r="3" /><circle cx="34" cy="31" r="3" /><path d="M24 12c14 7-14 13 0 23m-4-2 4 3 4-3M12 29h5" /></>;
      break;
    case "quick_start":
      glyph = <><circle cx="29" cy="13" r="3" /><path d="m26 19-6 7 7 3-5 9m0-16 9 3 5-5m-16 6-8 6m-1-13h7m-9 5h6" /></>;
      break;
    case "tireless":
      glyph = <><path d="M13 25a11 11 0 0 1 19-9m-1-5 2 6-6 1m8 6a11 11 0 0 1-19 9m1 5-2-6 6-1m4-13-5 8h7l-4 7" /></>;
      break;
    case "reflex_keeper":
      glyph = <><path d="m14 32-3-10 3-2 4 5-2-11 3-1 4 10V11h3l1 13 3-8 3 1-1 12-7 8h-7z" /><path d="m34 10 3 3m-1 9 3 1" /></>;
      break;
    case "high_ball":
      glyph = <><circle cx="24" cy="12" r="4" /><path d="m12 29 4-8 4 4 4 11 4-11 4-4 4 8m-16-5 4 4 4-4" /></>;
      break;
    default:
      glyph = BALL;
  }
  const name = PLAY_STYLES.find((style) => style.id === styleId)?.name ?? "Voetbal";
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : name}
      {...props}
    >
      <path d="m24 2 22 22-22 22L2 24z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5" />
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{glyph}</g>
    </svg>
  );
}
