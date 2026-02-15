/**
 * PitchBench — bench + unassigned players strip for PitchView.
 * Shown below the field; handles click-to-select for substitution flow.
 */
import { Id } from "@/convex/_generated/dataModel";
import type { MatchPlayer } from "./types";

interface PitchBenchProps {
  onBench: MatchPlayer[];
  onFieldUnassigned: MatchPlayer[];
  selectedPlayerId: Id<"players"> | null;
  onPlayerClick: (playerId: Id<"players">) => void;
  onDeselect: () => void;
  nameLabel: (p: MatchPlayer) => string;
}

function benchTileStyle(
  playerId: Id<"players">,
  selectedPlayerId: Id<"players"> | null
): React.CSSProperties {
  if (selectedPlayerId === playerId) {
    return {
      boxShadow: "0 0 20px rgba(250,204,21,0.5), 0 0 0 2px #facc15",
      transform: "scale(1.15)",
      opacity: 1,
    };
  }
  return {
    opacity: selectedPlayerId ? 0.5 : 0.7,
    filter: selectedPlayerId ? "grayscale(0.4)" : "none",
  };
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

      {/* Bench (FC26 dark style) */}
      {onBench.length > 0 && (
        <div
          className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4"
        >
          <h3 className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-3">
            Wisselspelers ({onBench.length})
          </h3>
          <div className="flex gap-4 justify-center flex-wrap">
            {onBench.map((p) => (
              <div
                key={p.playerId}
                onClick={() => onPlayerClick(p.playerId)}
                className="flex flex-col items-center gap-2 cursor-pointer transition-all"
                style={benchTileStyle(p.playerId, selectedPlayerId)}
              >
                <div
                  className="flex items-center justify-center font-bold text-sm rounded-xl border border-white/10 text-white"
                  style={{
                    width: 54,
                    height: 54,
                    background: "rgba(30,41,59,0.7)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
                  }}
                >
                  {p.number ?? "?"}
                </div>
                <span className="text-xs font-medium text-white/70">
                  {nameLabel(p)}
                </span>
              </div>
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
