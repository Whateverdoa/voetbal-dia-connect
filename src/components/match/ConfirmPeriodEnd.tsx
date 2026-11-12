"use client";

import { useEffect, useRef, useState } from "react";

export function ConfirmPeriodEnd({
  isFinalSegment,
  periodLabel,
  currentQuarter,
  isLoading,
  onCancel,
  onConfirm,
}: {
  isFinalSegment: boolean;
  periodLabel: "helft" | "kwart";
  currentQuarter: number;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [canConfirm, setCanConfirm] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
    // Ignore a rapid second tap while the end button changes into confirmation.
    const timer = setTimeout(() => setCanConfirm(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-2">
      <p role="alert" className="px-1 text-center text-sm font-medium text-gray-800">
        {isFinalSegment
          ? "Is de wedstrijd echt afgelopen?"
          : `Wil je ${periodLabel} ${currentQuarter} beëindigen?`}
      </p>
      {!isFinalSegment && (
        <p className="px-1 text-center text-sm text-gray-600">
          Na bevestigen begint de rust. Tot die tijd loopt de klok door.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          ref={cancelButtonRef}
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="min-h-[48px] rounded-xl border-2 border-gray-300 py-2.5 font-semibold text-gray-700 transition-transform hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] sm:min-h-[56px] sm:py-4"
        >
          Annuleren
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading || !canConfirm}
          className="min-h-[48px] rounded-xl bg-red-600 py-2.5 font-semibold text-white transition-transform hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] sm:min-h-[56px] sm:py-4"
        >
          {isLoading ? "Bezig..." : "Ja, beëindigen"}
        </button>
      </div>
    </div>
  );
}
