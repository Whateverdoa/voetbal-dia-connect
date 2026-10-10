import { formatFieldLabel } from "@/lib/cards/formatCardName";

export type TacticTokenModel = {
  playerId: string;
  x: number;
  y: number;
  onBoard: boolean;
  name: string;
  number: number | null;
  photoUrl: string | null;
};

interface TacticTokenProps {
  token: TacticTokenModel;
  dragging: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
}

export function TacticToken({ token, dragging, onPointerDown }: TacticTokenProps) {
  const label = formatFieldLabel(token.name, token.number);

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      className="absolute flex flex-col items-center touch-none select-none"
      style={{
        left: `${token.x}%`,
        top: `${token.y}%`,
        transform: "translate3d(-50%, -50%, 0)",
        willChange: dragging ? "left, top" : undefined,
        zIndex: dragging ? 40 : 10,
        cursor: dragging ? "grabbing" : "grab",
      }}
    >
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
    </button>
  );
}
