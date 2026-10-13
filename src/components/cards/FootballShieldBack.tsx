import Image from "next/image";
import { PLAY_STYLES } from "@/lib/cards/fc27";
import { PlayStyleIcon } from "./PlayStyleIcon";

/** Only receives the same permission-filtered data as the front of the card. */
export function FootballShieldBack({ name, number, position, playStyleIds }: {
  name: string;
  number?: number | null;
  position?: string | null;
  playStyleIds: readonly string[];
}) {
  const styles = PLAY_STYLES.filter((style) => playStyleIds.includes(style.id)).slice(0, 3);
  return <div className="flex h-full flex-col items-center rounded-[3cqw] bg-black/65 px-[3cqw] py-[2cqw] text-center">
    <p className="text-[4cqw] font-semibold uppercase tracking-wider">Spelersinfo</p>
    <p className="mt-[2cqw] line-clamp-2 w-full break-words text-[6cqw] font-bold leading-tight">{name}</p>
    <dl className="mt-[3cqw] grid w-full grid-cols-2 gap-[2cqw]">
      <div><dt className="text-[4cqw]">Rugnummer</dt><dd className="text-[14cqw] font-black leading-tight tabular-nums">{number ?? "—"}</dd></div>
      <div><dt className="text-[4cqw]">Positie</dt><dd className="pt-[2cqw] text-[8cqw] font-bold leading-tight">{position || "—"}</dd></div>
    </dl>
    <div className="mt-[3cqw] w-full text-left">
      <p className="mb-[1.5cqw] text-[4cqw] font-bold">Speelstijlen</p>
      {styles.length ? <ul className="space-y-[1cqw]">{styles.map((style) => <li key={style.id} className="flex items-center gap-[2cqw] text-[4.3cqw] leading-tight">
        <PlayStyleIcon styleId={style.id} decorative className="h-[6cqw] w-[6cqw]" /><span>{style.name}</span>
      </li>)}</ul> : <p className="text-[4cqw] leading-tight">Nog niet toegekend</p>}
    </div>
    <Image src="/logos/dia.png" alt="DIA" width={180} height={200} className="mt-auto h-[10cqw] w-auto object-contain pt-[1cqw]" />
  </div>;
}
