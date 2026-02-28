"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { StagedSubstitution } from "./types";

interface StagedSubstitutionsPanelProps {
  matchId: Id<"matches">;
  pin: string;
  stagedSubstitutions: StagedSubstitution[];
}

export function StagedSubstitutionsPanel({
  matchId,
  pin,
  stagedSubstitutions,
}: StagedSubstitutionsPanelProps) {
  const confirm = useMutation(api.matchActions.confirmSubstitution);
  const cancel = useMutation(api.matchActions.cancelStagedSubstitution);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (stagedSubstitutions.length === 0) {
    return null;
  }

  const onConfirm = async (stagedEventId: Id<"matchEvents">) => {
    setBusyId(String(stagedEventId));
    setError(null);
    try {
      await confirm({
        matchId,
        pin,
        stagedEventId,
        correlationId: `confirm-sub-${String(stagedEventId)}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setBusyId(null);
    }
  };

  const onCancel = async (stagedEventId: Id<"matchEvents">) => {
    setBusyId(String(stagedEventId));
    setError(null);
    try {
      await cancel({
        matchId,
        pin,
        stagedEventId,
        correlationId: `cancel-sub-${String(stagedEventId)}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-3">
      <h2 className="font-bold text-lg">Klaargezette wissels</h2>
      <p className="text-sm text-gray-600">
        Hier bevestig je wissels pas wanneer spelers echt gewisseld zijn op het veld.
      </p>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}
      <div className="space-y-2">
        {stagedSubstitutions
          .slice()
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((sub) => {
            const isBusy = busyId === String(sub.stagedEventId);
            return (
              <div
                key={String(sub.stagedEventId)}
                className="border border-gray-200 rounded-xl p-3"
              >
                <p className="font-medium text-sm">
                  {sub.outName ?? "Speler eruit"} → {sub.inName ?? "Speler erin"}
                </p>
                <p className="text-xs text-gray-600 mt-1">Kwart {sub.quarter}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onCancel(sub.stagedEventId)}
                    disabled={isBusy}
                    className="flex-1 py-3 min-h-[48px] border border-gray-300 rounded-lg text-base font-medium disabled:opacity-50"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={() => onConfirm(sub.stagedEventId)}
                    disabled={isBusy}
                    className="flex-1 py-3 min-h-[48px] bg-dia-green text-white rounded-lg text-base font-medium disabled:opacity-50"
                  >
                    {isBusy ? "Bezig..." : "Wissel bevestigen"}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
