"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface RefereeAssignmentProps {
  matchId: Id<"matches">;
  pin: string; // Coach PIN
  currentRefereeId?: Id<"referees">;
  currentRefereeName?: string | null;
}

/**
 * Allows the coach to assign or remove a referee from the match.
 * Shows a dropdown of active referees from the database.
 */
export function RefereeAssignment({
  matchId,
  pin,
  currentRefereeId,
  currentRefereeName,
}: RefereeAssignmentProps) {
  const referees = useQuery(api.matches.listActiveReferees);
  const assignReferee = useMutation(api.matchActions.assignReferee);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasReferee = currentRefereeId != null;

  const handleAssign = async (refereeId: Id<"referees">) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await assignReferee({ matchId, pin, refereeId });
      setSuccess("Scheidsrechter toegewezen");
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
      await assignReferee({ matchId, pin, refereeId: undefined });
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
              {currentRefereeName ?? "Toegewezen"}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-500">
            Wijs een scheidsrechter toe zodat die de klok en score kan bedienen
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
                Toegewezen:{" "}
                <span className="font-semibold">{currentRefereeName ?? "Onbekend"}</span>
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
              {referees === undefined ? (
                <p className="text-sm text-gray-500">Laden...</p>
              ) : referees.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Geen scheidsrechters beschikbaar. Voeg ze toe via het admin panel.
                </p>
              ) : (
                <div className="space-y-1">
                  {referees.map((ref) => (
                    <button
                      key={ref.id}
                      onClick={() => handleAssign(ref.id)}
                      disabled={isLoading}
                      className="w-full py-2 px-3 text-left bg-gray-50 hover:bg-dia-green/10
                                 rounded-lg transition-colors min-h-[44px] disabled:opacity-50
                                 flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-700">{ref.name}</span>
                      <span className="text-xs text-dia-green font-medium">Toewijzen</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
