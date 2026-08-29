"use client";

import clsx from "clsx";
import type { Id } from "@/convex/_generated/dataModel";
import type { AssistKind } from "@/lib/assistKind";
import type { MatchPlayer } from "./types";

const KIND_BUTTONS: { kind: AssistKind; label: string }[] = [
  { kind: "pass", label: "Assist" },
  { kind: "corner", label: "Hoekschop" },
  { kind: "free_kick", label: "Vrije trap" },
];

interface AssistPickerProps {
  scorerId: Id<"players">;
  playersOnField: MatchPlayer[];
  assistId: Id<"players"> | null;
  assistKind: AssistKind | null;
  onAssistIdChange: (playerId: Id<"players"> | null) => void;
  onAssistKindChange: (kind: AssistKind | null) => void;
}

export function AssistPicker({
  scorerId,
  playersOnField,
  assistId,
  assistKind,
  onAssistIdChange,
  onAssistKindChange,
}: AssistPickerProps) {
  const candidates = playersOnField.filter((p) => p.playerId !== scorerId);

  return (
    <>
      <h3 className="text-lg font-semibold mb-3 text-gray-700">
        Assist (optioneel)
      </h3>
      <div
        data-testid="assist-kind-row"
        className="grid grid-cols-3 gap-2 mb-3"
      >
        {KIND_BUTTONS.map(({ kind, label }) => {
          const selected = assistKind === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() =>
                onAssistKindChange(selected ? null : kind)
              }
              className={clsx(
                "p-3 rounded-xl border-2 min-h-[48px] font-medium text-sm transition-all",
                selected
                  ? "border-dia-green bg-dia-green-light"
                  : "border-gray-200"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div data-testid="assist-player-row" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onAssistIdChange(null);
            onAssistKindChange(null);
          }}
          className={clsx(
            "p-3 rounded-xl border-2 min-h-[48px] transition-all",
            assistId === null && assistKind === null
              ? "border-dia-green bg-dia-green-light"
              : "border-gray-200"
          )}
        >
          Geen assist
        </button>
        {candidates.map((p) => (
          <button
            key={p.playerId}
            type="button"
            onClick={() => onAssistIdChange(p.playerId)}
            className={clsx(
              "p-3 rounded-xl border-2 text-left min-h-[48px] transition-all",
              assistId === p.playerId
                ? "border-dia-green bg-dia-green-light"
                : "border-gray-200"
            )}
          >
            <div className="flex items-center gap-2">
              {p.number && (
                <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center font-bold text-xs">
                  {p.number}
                </span>
              )}
              <span className="font-medium text-sm truncate">{p.name}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
