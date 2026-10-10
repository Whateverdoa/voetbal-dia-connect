"use client";

import clsx from "clsx";
import {
  ASSIST_KIND_LABELS,
  isSetPieceKind,
  type AssistKind,
} from "@/lib/assistKind";

const SET_PIECES: AssistKind[] = ["penalty", "free_kick", "corner"];

type GoalKindChipsProps = {
  value: AssistKind | null;
  onChange: (kind: AssistKind | null) => void;
  disabled?: boolean;
};

export function GoalKindChips({
  value,
  onChange,
  disabled = false,
}: GoalKindChipsProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-center text-xs text-gray-500">
        Penalty, vrije trap of hoekschop? (mag leeg)
      </p>
      <div className="grid grid-cols-3 gap-2">
        {SET_PIECES.map((kind) => {
          const selected = value === kind;
          return (
            <button
              key={kind}
              type="button"
              disabled={disabled}
              onClick={() => onChange(selected ? null : kind)}
              className={clsx(
                "min-h-[44px] rounded-lg border-2 px-2 text-sm font-semibold",
                selected
                  ? "border-dia-green bg-dia-green-light"
                  : "border-gray-200 bg-white",
              )}
            >
              {isSetPieceKind(kind) ? ASSIST_KIND_LABELS[kind] : kind}
            </button>
          );
        })}
      </div>
    </div>
  );
}
