/**
 * PitchBench — bench + unassigned players strip for PitchView.
 * Mini EA FC-style cards for bench players, matching the field card design.
 * Responsive: 70px on phone, 90px on tablet/desktop.
 */
import { Id } from "@/convex/_generated/dataModel";
import { getRoleColor } from "@/lib/roleColors";
import { useCardSize } from "@/hooks/useCardSize";
import type { MatchPlayer } from "./types";

interface PitchBenchProps {
  onBench: MatchPlayer[];
  onFieldUnassigned: MatchPlayer[];
  selectedPlayerId: Id<"players"> | null;
  onPlayerClick: (playerId: Id<"players">) => void;
  onDeselect: () => void;
  nameLabel: (p: MatchPlayer) => string;
}

function MiniCard({
  player,
  isSelected,
  isDimmed,
  onClick,
  nameLabel,
}: {
  player: MatchPlayer;
  isSelected: boolean;
  isDimmed: boolean;
  onClick: () => void;
  nameLabel: (p: MatchPlayer) => string;
}) {
  const sz = useCardSize();
  const rc = getRoleColor(player.positionPrimary);
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center cursor-pointer"
      style={{
        transition: "all 0.3s ease",
        opacity: isDimmed ? 0.4 : 1,
        filter: isDimmed ? "grayscale(0.5)" : "none",
        transform: isSelected ? "scale(1.1)" : "scale(1)",
      }}
    >
      <div
        className="rounded-xl flex flex-col items-center overflow-hidden"
        style={{
          width: sz.card,
          background: isSelected
            ? "linear-gradient(135deg, rgba(250,204,21,0.25), rgba(250,204,21,0.08))"
            : "linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))",
          border: isSelected
            ? "2px solid rgba(250,204,21,0.7)"
            : "1px solid rgba(255,255,255,0.08)",
          boxShadow: isSelected
            ? "0 0 16px rgba(250,204,21,0.3)"
            : "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        <div className="py-1.5 flex flex-col items-center">
          <span className="font-mono font-bold text-white/40" style={{ fontSize: sz.numFont }}>
            {player.number ?? "?"}
          </span>
          <div
            className="rounded-full flex items-center justify-center my-0.5"
            style={{
              width: sz.avatar,
              height: sz.avatar,
              background: `${rc.bg}20`,
              border: `1px solid ${rc.bg}40`,
            }}
          >
            <svg width={sz.icon} height={sz.icon} viewBox="0 0 24 24" fill={rc.bg} opacity={0.9}>
              <circle cx="12" cy="7" r="4" />
              <path d="M12 13c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
            </svg>
          </div>
        </div>
        <div className="w-full py-0.5 text-center" style={{ background: rc.bg }}>
          <span
            className="font-bold uppercase"
            style={{ color: rc.text, fontSize: sz.nameFont, letterSpacing: "0.06em" }}
          >
            {nameLabel(player).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PitchBench({
  onBench,
  onFieldUnassigned,
  selectedPlayerId,
  onPlayerClick,
  onDeselect,
  nameLabel,
}: PitchBenchProps) {
  return (
    <>
      {/* On field but no slot assigned */}
      {onFieldUnassigned.length > 0 && (
        <div className="bg-amber-950/40 rounded-lg px-3 py-2 border border-amber-400/20">
          <p className="text-xs font-medium text-amber-300 mb-1.5">
            Op veld, nog geen positie ({onFieldUnassigned.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {onFieldUnassigned.map((p) => (
              <span
                key={p.playerId}
                onClick={() => onPlayerClick(p.playerId)}
                className="inline-flex items-center px-2 py-1 bg-slate-800 rounded text-sm text-white border border-amber-400/20 cursor-pointer hover:bg-slate-700 transition-colors"
              >
                {p.number != null && (
                  <span className="font-bold text-amber-300 mr-1">#{p.number}</span>
                )}
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bench */}
      {onBench.length > 0 && (
        <div
          className="w-full rounded-2xl p-4"
          style={{
            background: "rgba(15,23,42,0.6)",
            border: "1px solid rgba(255,255,255,0.05)",
            backdropFilter: "blur(8px)",
          }}
        >
          <h3 className="text-cyan-400 text-[10px] font-bold tracking-widest uppercase mb-3">
            Wisselspelers ({onBench.length})
          </h3>
          <div className="flex gap-3 justify-center flex-wrap">
            {onBench.map((p) => (
              <MiniCard
                key={p.playerId}
                player={p}
                isSelected={selectedPlayerId === p.playerId}
                isDimmed={selectedPlayerId !== null && selectedPlayerId !== p.playerId}
                onClick={() => onPlayerClick(p.playerId)}
                nameLabel={nameLabel}
              />
            ))}
          </div>
        </div>
      )}

      {/* Deselect hint */}
      {selectedPlayerId && (
        <button
          type="button"
          onClick={onDeselect}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 py-1 transition-colors"
        >
          Tik nogmaals op dezelfde speler om te deselecteren
        </button>
      )}
    </>
  );
}
