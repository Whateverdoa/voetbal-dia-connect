"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { createCorrelationId } from "@/lib/correlationId";
import type { StagedSubstitution } from "./types";

type StagedSubstitutionItem = StagedSubstitution;

interface StagedSubstitutionsPanelProps {
  matchId: Id<"matches">;
  pin: string;
  stagedSubstitutions?: StagedSubstitutionItem[];
  canManage?: boolean;
}

function toFriendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Onbekende fout";
  if (message.includes("Invalid match or PIN")) {
    return "Sessie verlopen. Herlaad de pagina en log opnieuw in.";
  }
  return message;
}

function substitutionLabel(item: StagedSubstitutionItem): string {
  const playerOut = item.outName ?? `Speler ${String(item.outId)}`;
  const playerIn = item.inName ?? `Speler ${String(item.inId)}`;
  return `${playerOut} -> ${playerIn}`;
}

export function StagedSubstitutionsPanel({
  matchId,
  pin,
  stagedSubstitutions,
  canManage = true,
}: StagedSubstitutionsPanelProps) {
  const confirmSubstitution = useMutation(api.matchActions.confirmSubstitution);
  const cancelStagedSubstitution = useMutation(
    api.matchActions.cancelStagedSubstitution
  );

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isBatchConfirming, setIsBatchConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const stagedList = useMemo(
    () =>
      [...(stagedSubstitutions ?? [])].sort(
        (a, b) => a.createdAt - b.createdAt
      ),
    [stagedSubstitutions]
  );

  const isBusy = busyKey !== null || isBatchConfirming;

  const handleConfirm = async (item: StagedSubstitutionItem) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setBusyKey(`confirm:${String(item.stagedEventId)}`);
    try {
      await confirmSubstitution({
        matchId,
        pin,
        correlationId: createCorrelationId("coach_confirm_substitution"),
        stagedEventId: item.stagedEventId,
      });
      setStatusMessage(`Wissel bevestigd: ${substitutionLabel(item)}.`);
    } catch (error) {
      setErrorMessage(`Bevestigen mislukt: ${toFriendlyError(error)}`);
    } finally {
      setBusyKey(null);
    }
  };

  const handleCancel = async (item: StagedSubstitutionItem) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setBusyKey(`cancel:${String(item.stagedEventId)}`);
    try {
      await cancelStagedSubstitution({
        matchId,
        pin,
        correlationId: createCorrelationId("coach_cancel_staged_substitution"),
        stagedEventId: item.stagedEventId,
      });
      setStatusMessage(`Wissel geannuleerd: ${substitutionLabel(item)}.`);
    } catch (error) {
      setErrorMessage(`Annuleren mislukt: ${toFriendlyError(error)}`);
    } finally {
      setBusyKey(null);
    }
  };

  const handleBatchConfirm = async () => {
    if (!canManage || stagedList.length === 0) return;

    setErrorMessage(null);
    setStatusMessage(null);
    setIsBatchConfirming(true);

    let confirmedCount = 0;

    try {
      for (const item of stagedList) {
        setBusyKey(`confirm:${String(item.stagedEventId)}`);
        try {
          await confirmSubstitution({
            matchId,
            pin,
            correlationId: createCorrelationId("coach_confirm_substitution_batch"),
            stagedEventId: item.stagedEventId,
          });
          confirmedCount += 1;
        } catch (error) {
          setErrorMessage(
            `Batch gestopt bij ${substitutionLabel(item)}: ${toFriendlyError(error)}`
          );
          break;
        }
      }

      if (confirmedCount === stagedList.length) {
        setStatusMessage(`Alle ${confirmedCount} staged wissels bevestigd.`);
      } else if (confirmedCount > 0) {
        setStatusMessage(
          `${confirmedCount} staged wissel(s) bevestigd voordat de batch stopte.`
        );
      }
    } finally {
      setBusyKey(null);
      setIsBatchConfirming(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Staged wissels</h2>
          <p className="text-xs text-gray-600">
            Bevestig of annuleer geplande wissels. Batch confirm stopt bij de
            eerste fout.
          </p>
        </div>
        {stagedList.length > 1 && (
          <button
            onClick={handleBatchConfirm}
            disabled={!canManage || isBusy}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold min-h-[44px] disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isBatchConfirming ? "Bezig..." : "Bevestig alles"}
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm">
          {statusMessage}
        </div>
      )}

      {stagedList.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
          Geen staged wissels.
        </p>
      ) : (
        <ul className="space-y-2">
          {stagedList.map((item) => {
            const busyConfirmKey = `confirm:${String(item.stagedEventId)}`;
            const busyCancelKey = `cancel:${String(item.stagedEventId)}`;
            const rowBusy = isBatchConfirming || busyKey === busyConfirmKey || busyKey === busyCancelKey;

            return (
              <li
                key={String(item.stagedEventId)}
                className="border border-gray-200 rounded-lg p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {substitutionLabel(item)}
                  </p>
                  <span className="text-xs text-gray-500">Kwart {item.quarter}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleConfirm(item)}
                    disabled={!canManage || rowBusy}
                    className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold min-h-[44px] disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {busyKey === busyConfirmKey ? "Bezig..." : "Bevestig"}
                  </button>
                  <button
                    onClick={() => handleCancel(item)}
                    disabled={!canManage || rowBusy}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 min-h-[44px] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {busyKey === busyCancelKey ? "Bezig..." : "Annuleer"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
