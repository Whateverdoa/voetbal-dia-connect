"use client";

interface UndoGoalButtonProps {
  isConfirming: boolean;
  isLoading: boolean;
  onFirstTap: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Two-step undo button: first tap reveals confirm/cancel, second tap executes. */
export function UndoGoalButton({
  isConfirming,
  isLoading,
  onFirstTap,
  onConfirm,
  onCancel,
}: UndoGoalButtonProps) {
  if (isConfirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2 border-2 border-gray-300 text-gray-600 font-semibold 
                     rounded-xl min-h-[44px] active:scale-[0.98] transition-transform
                     disabled:opacity-50"
        >
          Annuleren
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-2 bg-red-600 text-white font-semibold 
                     rounded-xl min-h-[44px] active:scale-[0.98] transition-transform
                     disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Ja, verwijder"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onFirstTap}
      disabled={isLoading}
      className="w-full py-2 text-red-600 border-2 border-red-200 font-medium 
                 rounded-xl min-h-[44px] active:scale-[0.98] transition-transform
                 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 text-sm"
    >
      Laatste doelpunt ongedaan maken
    </button>
  );
}
