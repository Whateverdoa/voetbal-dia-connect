"use client";

interface PlayerOption {
  playerId: string;
  playerName: string;
}

export function HistoryGoalEditor({
  playerOptions,
  goalScorerId,
  goalAssistId,
  savingGoal,
  onScorerChange,
  onAssistChange,
  onCancel,
  onSave,
}: {
  playerOptions: PlayerOption[];
  goalScorerId: string;
  goalAssistId: string;
  savingGoal: boolean;
  onScorerChange: (value: string) => void;
  onAssistChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <section className="space-y-2 rounded-lg border border-dia-green/20 bg-dia-green/5 p-3">
      <h3 className="text-sm font-semibold text-gray-800">
        Goal achteraf toewijzen
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={goalScorerId}
          onChange={(event) => onScorerChange(event.target.value)}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        >
          <option value="">Scorer (optioneel)</option>
          {playerOptions.map((option) => (
            <option key={option.playerId} value={option.playerId}>
              {option.playerName}
            </option>
          ))}
        </select>
        <select
          value={goalAssistId}
          onChange={(event) => onAssistChange(event.target.value)}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        >
          <option value="">Assist (optioneel)</option>
          {playerOptions.map((option) => (
            <option key={option.playerId} value={option.playerId}>
              {option.playerName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          className="text-xs px-2 py-1 rounded-lg border border-gray-300"
        >
          Annuleren
        </button>
        <button
          onClick={onSave}
          disabled={savingGoal}
          className="text-xs px-2 py-1 rounded-lg bg-dia-green text-white disabled:opacity-50"
        >
          {savingGoal ? "Bezig..." : "Goal opslaan"}
        </button>
      </div>
    </section>
  );
}
