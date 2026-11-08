"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ConsentRoundPanelProps {
  teamId: Id<"teams">;
  onStatus: (message: string) => void;
}

export function ConsentRoundPanel({
  teamId,
  onStatus,
}: ConsentRoundPanelProps) {
  const team = useQuery(api.admin.getTeam, { teamId });
  const consents = useQuery(api.playerConsents.listForTeam, { teamId });
  const setFlag = useMutation(api.playerConsents.setTeamSelectionFlag);
  const startRound = useMutation(api.playerConsents.startConsentRound);
  const [busy, setBusy] = useState(false);
  const players = useQuery(api.admin.listPlayersByTeam, { teamId });
  const linkIdentity = useMutation(
    api.import.sportlinkRosterMutations.linkPlayerIdentity,
  );
  const refreshPrivacy = useAction(
    api.import.sportlinkRosterSync.refreshPrivacyNow,
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [personId, setPersonId] = useState("");
  const selectedPlayer = players?.find(
    (player) => player._id === selectedPlayerId,
  );

  async function saveIdentity(unlink = false) {
    if (!selectedPlayer || (!unlink && !personId.trim())) return;
    setBusy(true);
    try {
      await linkIdentity({
        playerId: selectedPlayer._id,
        personId: unlink ? null : personId.trim(),
      });
      onStatus(
        unlink
          ? "Sportlink-koppeling verwijderd; speler openbaar afgeschermd"
          : "Koppeling opgeslagen. Controleer nu de bron; koppelen geeft nog geen publicatierecht.",
      );
      setPersonId("");
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Koppelen mislukt");
    } finally {
      setBusy(false);
    }
  }

  if (team === undefined || team === null) return null;

  return (
    <div className="rounded-lg border border-dia-yellow-deep/40 bg-dia-green-light p-3 space-y-2 text-sm">
      <section aria-label="Sportlink privacy" className="space-y-2">
        <h3 className="font-semibold">Openbare spelersgegevens</h3>
        <p>
          Een speler wordt pas openbaar zichtbaar na een bevestigde
          Sportlink-koppeling, actuele broncontrole en publicatietoestemming.
          Een ontbrekende of afgeschermde bron blijft afgeschermd.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            Speler
            <select
              className="min-h-[44px] rounded border border-slate-500 bg-white px-2"
              value={selectedPlayer ? selectedPlayerId : ""}
              onChange={(event) => {
                setSelectedPlayerId(event.target.value);
                setPersonId("");
              }}
              disabled={busy}
            >
              <option value="">Selecteer speler</option>
              {players?.map((player) => (
                <option key={player._id} value={player._id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Sportlink-lidcode
            <input
              className="min-h-[44px] rounded border border-slate-500 bg-white px-2"
              value={personId}
              onChange={(event) => setPersonId(event.target.value)}
              disabled={busy || !selectedPlayer}
              autoComplete="off"
              maxLength={64}
            />
          </label>
          <button
            type="button"
            disabled={busy || !selectedPlayer || !personId.trim()}
            onClick={() => saveIdentity()}
            className="min-h-[44px] rounded bg-dia-green px-3 font-semibold text-white disabled:opacity-50"
          >
            Koppeling opslaan
          </button>
          <button
            type="button"
            disabled={busy || !selectedPlayer?.sportlinkPersonId}
            onClick={() => saveIdentity(true)}
            className="min-h-[44px] rounded border border-slate-500 px-3 disabled:opacity-50"
          >
            Ontkoppelen
          </button>
          <button
            type="button"
            disabled={busy}
            className="min-h-[44px] rounded border border-slate-500 px-3 disabled:opacity-50"
            onClick={async () => {
              setBusy(true);
              try {
                const result = await refreshPrivacy({});
                onStatus(
                  result.skipped
                    ? "Sportlink-broncontrole is nog niet ingeschakeld voor deze omgeving"
                    : `Broncontrole: ${result.refreshed} teams bijgewerkt, ${result.failed} teams afgeschermd door een fout`,
                );
              } catch (error) {
                onStatus(
                  error instanceof Error
                    ? error.message
                    : "Broncontrole mislukt",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Sportlink-bron controleren
          </button>
        </div>
        {selectedPlayer && (
          <p>
            Huidige lidcode:{" "}
            {selectedPlayer.sportlinkPersonId ?? "niet gekoppeld"}. Controleer
            de identiteit in Sportlink voordat je koppelt.
          </p>
        )}
      </section>
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
                    : "Selectieteam uitgezet",
                );
              } catch (error) {
                onStatus(
                  error instanceof Error
                    ? error.message
                    : "Kon vlag niet zetten",
                );
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          />
          Selectieteam voor gamificatie
        </label>
        {
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await startRound({ teamId });
                onStatus(
                  `Toestemmingsronde: ${result.created} nieuw, ${result.skipped} bestaand`,
                );
              } catch (error) {
                onStatus(
                  error instanceof Error ? error.message : "Ronde mislukt",
                );
              } finally {
                setBusy(false);
              }
            }}
            className="px-3 py-2 rounded-lg bg-dia-green text-white font-semibold min-h-[44px]"
          >
            Start toestemmingsronde
          </button>
        }
      </div>
      {consents && consents.length > 0 ? (
        <ul className="max-h-40 overflow-auto space-y-1 text-xs text-slate-700">
          {consents.map((row) => {
            const token = row.consents[0]?.token;
            const granted = row.consents.filter(
              (c) => c.status === "granted",
            ).length;
            return (
              <li
                key={String(row.playerId)}
                className="flex gap-2 justify-between"
              >
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
