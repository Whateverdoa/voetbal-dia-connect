"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface MatchLeadBadgeProps {
  matchId: Id<"matches">;
  pin: string;
  hasLead: boolean;
  leadCoachName: string | null;
}

/**
 * Compact collapsible card showing the match lead (wedstrijdleider) status.
 * Any coach can claim the lead; only the current lead can release it.
 * Phase 1: informational only — all match actions remain available regardless.
 */
export function MatchLeadBadge({
  matchId,
  pin,
  hasLead,
  leadCoachName,
}: MatchLeadBadgeProps) {
  const claimLead = useMutation(api.matchActions.claimMatchLead);
  const releaseLead = useMutation(api.matchActions.releaseMatchLead);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleClaim = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await claimLead({ matchId, pin });
      setSuccess("Jij bent nu wedstrijdleider!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelease = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await releaseLead({ matchId, pin });
      setSuccess("Leiding vrijgegeven");
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
          <span className="font-semibold text-gray-700">Wedstrijdleider</span>
          {hasLead && leadCoachName && (
            <span className="text-xs bg-dia-green/10 text-dia-green px-2 py-0.5 rounded-full font-medium">
              {leadCoachName}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-500">
            De wedstrijdleider coördineert de wedstrijd. Fase 1: alle acties
            blijven beschikbaar voor iedere coach.
          </p>

          {/* Status messages */}
          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
          {success && (
            <p className="text-sm text-dia-green font-medium">{success}</p>
          )}

          {hasLead ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                Huidige leider:{" "}
                <span className="font-semibold">{leadCoachName ?? "Onbekend"}</span>
              </p>
              <button
                onClick={handleRelease}
                disabled={isLoading}
                className="w-full py-2 border-2 border-red-200 text-red-600 font-medium
                           rounded-xl min-h-[44px] active:scale-[0.98] transition-transform
                           hover:bg-red-50 disabled:opacity-50 text-sm"
              >
                {isLoading ? "Bezig..." : "Leiding vrijgeven"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Geen wedstrijdleider aangewezen.</p>
              <button
                onClick={handleClaim}
                disabled={isLoading}
                className="w-full py-2 bg-dia-green text-white font-medium
                           rounded-xl min-h-[44px] active:scale-[0.98] transition-transform
                           hover:bg-dia-green/90 disabled:opacity-50 text-sm"
              >
                {isLoading ? "Bezig..." : "Neem de leiding"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
