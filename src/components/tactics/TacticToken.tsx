import { formatFieldLabel } from "@/lib/cards/formatCardName";
import type { FcCardData } from "@/lib/cards/fc27";
import { FcPlayerShield } from "@/components/cards/FcPlayerShield";

export type TacticTokenModel = FcCardData & {
  playerId: string;
  x: number;
  y: number;
  onBoard: boolean;
  name: string;
  number: number | null;
  photoUrl: string | null;
  useFcShield?: boolean;
  positionPrimary?: string | null;
};

interface TacticTokenProps {
  token: TacticTokenModel;
  dragging: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export function TacticToken({ token, dragging, onPointerDown }: TacticTokenProps) {
  const label = formatFieldLabel(token.name, token.number);
  const useShield = token.useFcShield || token.fcRatings || token.playStyleIds?.length || token.recognitions?.length;

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      aria-label={label}
      className="absolute flex flex-col items-center touch-none select-none rounded-xl focus-visible:outline-2 focus-visible:outline-dia-yellow"
      style={{
        left: `${token.x}%`,
        top: `${token.y}%`,
        transform: "translate3d(-50%, -50%, 0)",
        willChange: dragging ? "left, top" : undefined,
        zIndex: dragging ? 40 : 10,
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
      {useShield ? <FcPlayerShield name={token.name} number={token.number} position={token.positionPrimary} photoUrl={token.photoUrl}
        fcRatings={token.fcRatings} playStyleIds={token.playStyleIds} recognitions={token.recognitions} compact width={58} /> : <>
      <span className="w-12 h-12 rounded-full overflow-hidden border-2 border-dia-yellow bg-dia-black shadow-lg flex items-center justify-center">
        {token.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={token.photoUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-mono font-bold text-dia-yellow text-sm">
            {token.number ?? "?"}
          </span>
        )}
      </span>
      <span className="mt-1 px-1.5 py-0.5 rounded bg-dia-black/80 text-white text-[11px] font-semibold whitespace-nowrap">
        {label}
      </span>
      </>}
    </button>
  );
}
