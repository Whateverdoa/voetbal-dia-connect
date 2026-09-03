/**
 * FieldPlayerCard — EA FC-style card for the field view.
 * Supports photo or silhouette, phone/tablet/presentation sizes.
 */
import { getRoleColor, getRoleLabel } from "@/lib/roleColors";
import { useCardSize, type CardSizeMode } from "@/hooks/useCardSize";
import {
  formatFieldLabel,
  type CardNameMode,
} from "@/lib/cards/formatCardName";

interface FieldPlayerCardProps {
  name: string;
  number: number | null | undefined;
  position: string;
  x: number;
  y: number;
  isSelected: boolean;
  isDimmed: boolean;
  isEmpty: boolean;
  onClick: () => void;
  photoUrl?: string | null;
  sizeMode?: CardSizeMode;
  nameDisplay?: CardNameMode;
  /** Season total minutes (coach card toggle). */
  seasonMinutes?: number;
  /** Appended after the centering translate/scale (e.g. counter-rotation). */
  extraTransform?: string;
}

function PlayerIcon({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} opacity={0.9}>
      <circle cx="12" cy="7" r="4" />
      <path d="M12 13c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
    </svg>
  );
}

export function FieldPlayerCard({
  name,
  number,
  position,
  x,
  y,
  isSelected,
  isDimmed,
  isEmpty,
  onClick,
  photoUrl,
  sizeMode = "auto",
  nameDisplay = "first",
  seasonMinutes,
  extraTransform,
}: FieldPlayerCardProps) {
  const sz = useCardSize(sizeMode);
  const rc = getRoleColor(position);
  const posLabel = getRoleLabel(position);
  const scale = isSelected ? 1.08 : 1;
  const emptyTransform = extraTransform
    ? `translate(-50%, -50%) ${extraTransform}`
    : "translate(-50%, -50%)";
  const cardTransform = extraTransform
    ? `translate(-50%, -50%) scale(${scale}) ${extraTransform}`
    : `translate(-50%, -50%) scale(${scale})`;
  const preserve3d = extraTransform
    ? ({ transformStyle: "preserve-3d" } as const)
    : undefined;

  if (isEmpty) {
    return (
      <div
        onClick={onClick}
        className="absolute flex items-center justify-center cursor-pointer rounded-xl border"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: sz.card,
          height: sz.card,
          transform: emptyTransform,
          ...preserve3d,
          background: "rgba(255,255,255,0.06)",
          borderColor: "rgba(255,255,255,0.12)",
          transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: isDimmed ? 0.3 : 0.6,
          zIndex: 5,
        }}
      >
        <span className="text-white/30 text-lg font-light">+</span>
      </div>
    );
  }

  const fieldLabel = formatFieldLabel(name, number);
  const displayNumber = number != null ? String(number) : "?";
  const isPresentation = sizeMode === "presentation";

  return (
    <div
      onClick={onClick}
      className="absolute flex flex-col items-center cursor-pointer"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: cardTransform,
        ...preserve3d,
        zIndex: isSelected ? 100 : Math.round(y),
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: isDimmed ? 0.4 : 1,
        filter: isDimmed ? "grayscale(0.5)" : "none",
      }}
    >
      <div
        className="relative flex flex-col items-center rounded-xl overflow-hidden"
        style={{
          width: sz.card,
          background: isSelected
            ? "linear-gradient(135deg, rgba(250,204,21,0.3), rgba(250,204,21,0.1))"
            : "linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))",
          border: isSelected
            ? "2px solid rgba(250,204,21,0.8)"
            : "1px solid rgba(255,255,255,0.1)",
          boxShadow: isSelected
            ? "0 0 24px rgba(250,204,21,0.4), 0 8px 32px rgba(0,0,0,0.5)"
            : "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="absolute top-1 left-1" style={{ lineHeight: 1 }}>
          <span
            className="font-bold uppercase"
            style={{ color: rc.bg, fontSize: sz.posFont, letterSpacing: "0.05em" }}
          >
            {posLabel}
          </span>
        </div>

        <div className="absolute top-1 right-1">
          <span className="font-mono font-bold text-white" style={{ fontSize: sz.numFont }}>
            {displayNumber}
          </span>
        </div>

        <div className="relative mt-3 mb-0.5">
          <div
            className="relative rounded-full flex items-center justify-center overflow-hidden"
            style={{
              width: sz.avatar,
              height: sz.avatar,
              background: `linear-gradient(135deg, ${rc.bg}40, ${rc.bg}15)`,
              border: isPresentation
                ? "2px solid #FFE713"
                : `1.5px solid ${rc.bg}50`,
              boxShadow: isPresentation ? "0 0 10px rgba(255,231,19,0.35)" : undefined,
            }}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <PlayerIcon size={sz.icon} color={rc.bg} />
            )}
          </div>
          {isPresentation ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/logos/dia.png"
              alt=""
              className="pointer-events-none absolute -bottom-1 -right-1 rounded-full bg-dia-black/80 p-0.5"
              style={{ width: sz.avatar * 0.38, height: sz.avatar * 0.38, objectFit: "contain" }}
            />
          ) : null}
        </div>

        <div className="w-full py-1 px-0.5 text-center" style={{ background: rc.bg }}>
          <span
            className="font-bold leading-tight block"
            style={{
              color: rc.text,
              fontSize: nameDisplay === "full" ? Math.max(9, sz.nameFont - 2) : sz.nameFont,
              letterSpacing: nameDisplay === "full" ? "0.02em" : "0.08em",
              textTransform: nameDisplay === "full" ? "none" : "uppercase",
            }}
          >
            {fieldLabel}
          </span>
          {seasonMinutes !== undefined ? (
            <span
              className="block tabular-nums opacity-90"
              style={{
                color: rc.text,
                fontSize: Math.max(8, sz.nameFont - 1),
              }}
            >
              {seasonMinutes}&prime;
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
