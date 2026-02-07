"use client";

import { Delete } from "lucide-react";

interface NumericKeypadProps {
  onKeyPress: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  disabled: boolean;
}

export function NumericKeypad({
  onKeyPress,
  onBackspace,
  onClear,
  onSubmit,
  canSubmit,
  disabled,
}: NumericKeypadProps) {
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["clear", "0", "back"],
  ];

  return (
    <div className="space-y-3">
      {keys.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-3">
          {row.map((key) => {
            if (key === "clear") {
              return (
                <button
                  key={key}
                  onClick={onClear}
                  disabled={disabled}
                  className="w-20 h-14 rounded-xl bg-gray-200 text-gray-600 text-sm font-medium
                    active:scale-95 active:bg-gray-300 transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Wissen"
                >
                  Wis
                </button>
              );
            }
            if (key === "back") {
              return (
                <button
                  key={key}
                  onClick={onBackspace}
                  disabled={disabled}
                  className="w-20 h-14 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center
                    active:scale-95 active:bg-gray-300 transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Backspace"
                >
                  <Delete className="w-6 h-6" />
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => onKeyPress(key)}
                disabled={disabled}
                className="w-20 h-14 rounded-xl bg-white border-2 border-gray-200 text-2xl font-semibold text-gray-800
                  active:scale-95 active:bg-dia-green active:text-white active:border-dia-green transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-sm hover:shadow-md"
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}

      {/* Submit button */}
      <div className="pt-2">
        <button
          onClick={onSubmit}
          disabled={!canSubmit || disabled}
          className="w-full py-4 rounded-xl bg-dia-green text-white text-lg font-semibold
            active:scale-[0.98] transition-all
            disabled:bg-gray-300 disabled:cursor-not-allowed
            shadow-md hover:shadow-lg"
        >
          {disabled ? "Bezig..." : "Inloggen"}
        </button>
      </div>
    </div>
  );
}
