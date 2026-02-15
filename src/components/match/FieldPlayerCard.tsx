/**
 * FieldPlayerCard — EA FC-style card for the field view.
 * Renders avatar silhouette, role-colored name bar, number, and role label.
 */
import { getRoleColor, getRoleLabel } from "@/lib/roleColors";

interface FieldPlayerCardProps {
  name: string;
  number: number | null | undefined;
  slotRole: string;
  x: number;
  y: number;
  isSelected: boolean;
  isDimmed: boolean;
  isEmpty: boolean;
  onClick: () => void;
}

const CARD_WIDTH = 90;

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
  slotRole,
  x,
  y,
  isSelected,
  isDimmed,
  isEmpty,
  onClick,
}: FieldPlayerCardProps) {
  const rc = getRoleColor(slotRole);
  const roleLabel = getRoleLabel(slotRole);
  const scale = isSelected ? 1.08 : 1;

  if (isEmpty) {
    return (
      <div
        onClick={onClick}
        className="absolute flex items-center justify-center cursor-pointer rounded-xl border"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: CARD_WIDTH,
          height: CARD_WIDTH,
          transform: "translate(-50%, -50%)",
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

  const firstName = name.trim().split(/\s+/)[0] || name;
  const displayName = firstName.slice(0, 10).toUpperCase();
  const displayNumber = number != null ? String(number) : "?";

  return (
    <div
      onClick={onClick}
      className="absolute flex flex-col items-center cursor-pointer"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        zIndex: isSelected ? 100 : Math.round(y),
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: isDimmed ? 0.4 : 1,
        filter: isDimmed ? "grayscale(0.5)" : "none",
      }}
    >
      <div
        className="relative flex flex-col items-center rounded-xl overflow-hidden"
        style={{
          width: CARD_WIDTH,
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
        {/* Role label (top-left) */}
        <div className="absolute top-1 left-1" style={{ lineHeight: 1 }}>
          <span className="font-bold uppercase" style={{ color: rc.bg, fontSize: 10, letterSpacing: "0.05em" }}>
            {roleLabel}
          </span>
        </div>

        {/* Number badge (top-right) */}
        <div className="absolute top-1 right-1">
          <span className="font-mono font-bold text-white/30" style={{ fontSize: 14 }}>
            {displayNumber}
          </span>
        </div>

        {/* Avatar */}
        <div className="mt-3 mb-0.5">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 45,
              height: 45,
              background: `linear-gradient(135deg, ${rc.bg}40, ${rc.bg}15)`,
              border: `1.5px solid ${rc.bg}50`,
            }}
          >
            <PlayerIcon size={28} color={rc.bg} />
          </div>
        </div>

        {/* Name bar */}
        <div className="w-full py-1 text-center" style={{ background: rc.bg }}>
          <span
            className="font-bold uppercase tracking-wide"
            style={{ color: rc.text, fontSize: 11, letterSpacing: "0.08em" }}
          >
            {displayName}
          </span>
        </div>
      </div>
    </div>
  );
}
