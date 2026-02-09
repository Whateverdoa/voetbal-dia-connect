"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface RefereePinManagerProps {
  matchId: Id<"matches">;
  pin: string; // Coach PIN
  currentRefereePin?: string;
}

/**
 * Allows the coach to assign or remove a referee PIN for the match.
 * The referee can then use this PIN + the match public code to access
 * the clock controls on /scheidsrechter.
 */
export function RefereePinManager({ matchId, pin, currentRefereePin }: RefereePinManagerProps) {
  const setRefereePinMut = useMutation(api.matchActions.setRefereePin);

  const [isOpen, setIsOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasReferee = currentRefereePin != null;

  const handleAssign = async () => {
    if (newPin.length < 4) {
      setError("PIN moet minimaal 4 tekens zijn");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await setRefereePinMut({ matchId, pin, refereePin: newPin });
      setSuccess("Scheidsrechter PIN ingesteld");
      setNewPin("");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await setRefereePinMut({ matchId, pin, refereePin: undefined });
      setSuccess("Scheidsrechter verwijderd");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left
                   hover:bg-gray-50 transition-colors min-h-[48px]"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🏁</span>
          <span className="font-semibold text-gray-700">Scheidsrechter</span>
          {hasReferee && (
            <span className="text-xs bg-dia-green/10 text-dia-green px-2 py-0.5 rounded-full font-medium">
              Actief
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-500">
            Stel een PIN in zodat de scheidsrechter de wedstrijdklok kan bedienen
            via <span className="font-mono text-xs">/scheidsrechter</span>.
          </p>

          {/* Status messages */}
          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
          {success && (
            <p className="text-sm text-dia-green font-medium">{success}</p>
          )}

          {hasReferee ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Scheidsrechter PIN is ingesteld:{" "}
                <span className="font-mono font-bold">{"•".repeat(currentRefereePin.length)}</span>
              </p>
              <button
                onClick={handleRemove}
                disabled={isLoading}
                className="w-full py-2 border-2 border-red-200 text-red-600 font-medium
                           rounded-xl min-h-[44px] active:scale-[0.98] transition-transform
                           hover:bg-red-50 disabled:opacity-50 text-sm"
              >
                {isLoading ? "Bezig..." : "Scheidsrechter verwijderen"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="PIN voor scheidsrechter (4-6 tekens)"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-center
                           tracking-widest focus:border-dia-green focus:outline-none"
                maxLength={6}
              />
              <button
                onClick={handleAssign}
                disabled={isLoading || newPin.length < 4}
                className="w-full py-2 bg-dia-green text-white font-medium
                           rounded-xl min-h-[44px] active:scale-[0.98] transition-transform
                           hover:bg-dia-green-light disabled:opacity-50 text-sm"
              >
                {isLoading ? "Bezig..." : "PIN instellen"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
