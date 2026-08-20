"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ConsentRoundPanelProps {
  teamId: Id<"teams">;
  onStatus: (message: string) => void;
}

export function ConsentRoundPanel({ teamId, onStatus }: ConsentRoundPanelProps) {
  const team = useQuery(api.admin.getTeam, { teamId });
  const consents = useQuery(
    api.playerConsents.listForTeam,
    team?.isSelectionTeam ? { teamId } : "skip"
  );
  const setFlag = useMutation(api.playerConsents.setTeamSelectionFlag);
  const startRound = useMutation(api.playerConsents.startConsentRound);
  const [busy, setBusy] = useState(false);

  if (team === undefined || team === null) return null;

  return (
    <div className="rounded-lg border border-dia-yellow-deep/40 bg-dia-green-light p-3 space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <label className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={team.isSelectionTeam === true}
            onChange={async (e) => {
              setBusy(true);
              try {
                await setFlag({
                  teamId,
                  isSelectionTeam: e.target.checked,
                });
                onStatus(
                  e.target.checked
                    ? "Selectieteam aangezet"
                    : "Selectieteam uitgezet"
                );
              } catch (error) {
                onStatus(
                  error instanceof Error ? error.message : "Kon vlag niet zetten"
                );
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          />
          Selectieteam (JO13-pilot: foto + gamificatie + toestemming)
        </label>
        {team.isSelectionTeam ? (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await startRound({ teamId });
                onStatus(
                  `Toestemmingsronde: ${result.created} nieuw, ${result.skipped} bestaand`
                );
              } catch (error) {
                onStatus(
                  error instanceof Error ? error.message : "Ronde mislukt"
                );
              } finally {
                setBusy(false);
              }
            }}
            className="px-3 py-2 rounded-lg bg-dia-green text-black font-semibold min-h-[44px]"
          >
            Start toestemmingsronde
          </button>
        ) : null}
      </div>
      {team.isSelectionTeam && consents && consents.length > 0 ? (
        <ul className="max-h-40 overflow-auto space-y-1 text-xs text-slate-700">
          {consents.map((row) => {
            const token = row.consents[0]?.token;
            const granted = row.consents.filter((c) => c.status === "granted").length;
            return (
              <li key={String(row.playerId)} className="flex gap-2 justify-between">
                <span>
                  {row.playerName} · {granted}/{row.consents.length} akkoord
                </span>
                {token ? (
                  <a
                    className="text-dia-black underline shrink-0"
                    href={`/consent/${token}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Link
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
