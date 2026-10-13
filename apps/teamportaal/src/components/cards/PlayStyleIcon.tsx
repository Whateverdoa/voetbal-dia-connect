import Image from "next/image";
import {
  getPlayStyle,
  normalizePlayStyles,
  playStyleAsset,
  type IconLanguage,
  type PlayStyleId,
} from "@/lib/cards/playStyles";

export function PlayStyleIcon({
  id,
  assigned = false,
  decorative = false,
  language = "bold",
  className = "h-14 w-14",
}: {
  id: PlayStyleId;
  assigned?: boolean;
  decorative?: boolean;
  language?: IconLanguage;
  className?: string;
}) {
  return (
    <Image
      src={playStyleAsset(id, assigned ? "dia" : "neutral", language)}
      alt={decorative ? "" : getPlayStyle(id).name}
      width={64}
      height={64}
      className={className}
      unoptimized
      draggable={false}
    />
  );
}

/** Only render this strip on cards large enough to distinguish the pictograms. */
export function PlayStyleStrip({
  ids,
  language,
}: {
  ids: readonly PlayStyleId[];
  language?: IconLanguage;
}) {
  const styles = normalizePlayStyles(ids);
  if (!styles.length) return null;
  return (
    <ul
      aria-label="Toegewezen speelstijlen"
      className="flex items-center justify-center gap-[1.5cqw]"
    >
      {styles.map((id) => (
        <li key={id} title={getPlayStyle(id).name}>
          <PlayStyleIcon
            id={id}
            assigned
            language={language}
            className="h-[9cqw] w-[9cqw]"
          />
        </li>
      ))}
    </ul>
  );
}
