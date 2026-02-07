import type { LineupPlayer } from "./types";

interface LineupSectionProps {
  lineup: LineupPlayer[];
  teamName: string;
}

export function LineupSection({ lineup, teamName }: LineupSectionProps) {
  const onField = lineup.filter((p) => p.onField);
  const bench = lineup.filter((p) => !p.onField);

  return (
    <section className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <span>👕</span> Opstelling {teamName}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase mb-2">Op veld</p>
          <div className="space-y-1">
            {onField.map((p) => (
              <PlayerRow key={p.id} player={p} variant="field" />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase mb-2">Bank</p>
          <div className="space-y-1">
            {bench.map((p) => (
              <PlayerRow key={p.id} player={p} variant="bench" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface PlayerRowProps {
  player: LineupPlayer;
  variant: "field" | "bench";
}

function PlayerRow({ player, variant }: PlayerRowProps) {
  return (
    <div
      className={`flex items-center gap-2 text-sm p-1.5 rounded ${
        variant === "field"
          ? player.isKeeper
            ? "bg-yellow-50"
            : "bg-green-50"
          : "bg-gray-50"
      }`}
    >
      {player.number && (
        <span className="w-5 h-5 bg-white rounded text-xs flex items-center justify-center">
          {player.number}
        </span>
      )}
      <span className={variant === "bench" ? "text-gray-600" : ""}>
        {player.name}
      </span>
      {player.isKeeper && <span className="text-xs">🧤</span>}
    </div>
  );
}
