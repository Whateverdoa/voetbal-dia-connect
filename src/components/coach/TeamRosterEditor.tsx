"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PositionSelect } from "@/components/admin/PositionSelect";

export type RosterPlayer = {
  _id: Id<"players">;
  name: string;
  number?: number;
  active: boolean;
  positionPrimary?: string;
  positionSecondary?: string;
};

type RowDraft = {
  number: string;
  positionPrimary: string;
  positionSecondary: string;
};

function draftFromPlayer(p: RosterPlayer): RowDraft {
  return {
    number: p.number != null ? String(p.number) : "",
    positionPrimary: p.positionPrimary ?? "",
    positionSecondary: p.positionSecondary ?? "",
  };
}

export function TeamRosterEditor({ players }: { players: RosterPlayer[] }) {
  const update = useMutation(api.coachPlayers.updatePlayerRosterFields);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() =>
    Object.fromEntries(players.map((p) => [p._id, draftFromPlayer(p)]))
  );
  const [savingId, setSavingId] = useState<Id<"players"> | null>(null);
  const [status, setStatus] = useState("");

  const activePlayers = [...players]
    .filter((p) => p.active !== false)
    .sort((a, b) => (a.number ?? 99) - (b.number ?? 99) || a.name.localeCompare(b.name));

  function setDraft(id: Id<"players">, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? draftFromPlayer(players.find((p) => p._id === id)!)), ...patch },
    }));
  }

  async function handleSave(player: RosterPlayer) {
    const draft = drafts[player._id] ?? draftFromPlayer(player);
    const trimmedNum = draft.number.trim();
    let number: number | undefined;
    let clearNumber = false;

    if (trimmedNum === "") {
      clearNumber = player.number != null;
    } else {
      number = Number.parseInt(trimmedNum, 10);
      if (!Number.isInteger(number) || number < 1 || number > 99) {
        setStatus("Rugnummer moet 1–99 zijn");
        return;
      }
    }

    setSavingId(player._id);
    setStatus("");
    try {
      await update({
        playerId: player._id,
        ...(number !== undefined ? { number } : {}),
        ...(clearNumber ? { clearNumber: true } : {}),
        positionPrimary: draft.positionPrimary,
        positionSecondary: draft.positionSecondary,
      });
      setStatus(`Opgeslagen: ${player.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Opslaan mislukt");
    } finally {
      setSavingId(null);
    }
  }

  if (activePlayers.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        Geen actieve spelers in dit team.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {status ? (
        <p className="text-sm text-center text-gray-700 bg-white/80 rounded-lg px-3 py-2">
          {status}
        </p>
      ) : null}

      {activePlayers.map((player) => {
        const draft = drafts[player._id] ?? draftFromPlayer(player);
        const busy = savingId === player._id;
        return (
          <div
            key={player._id}
            className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm space-y-2"
          >
            <p className="font-semibold text-gray-900">{player.name}</p>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-xs text-gray-500">
                Rugnr.
                <input
                  type="number"
                  min={1}
                  max={99}
                  inputMode="numeric"
                  value={draft.number}
                  onChange={(e) => setDraft(player._id, { number: e.target.value })}
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-gray-200 px-2 text-base"
                  aria-label={`Rugnummer ${player.name}`}
                />
              </label>
              <label className="block text-xs text-gray-500 col-span-2">
                Positie
                <PositionSelect
                  value={draft.positionPrimary}
                  onChange={(v) => setDraft(player._id, { positionPrimary: v })}
                  placeholder="—"
                  title="Primaire positie"
                  className="mt-1 w-full min-h-[44px] rounded-lg border border-gray-200 px-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-xs text-gray-500">
              2e positie
              <PositionSelect
                value={draft.positionSecondary}
                onChange={(v) => setDraft(player._id, { positionSecondary: v })}
                placeholder="—"
                title="Secundaire positie"
                className="mt-1 w-full min-h-[44px] rounded-lg border border-gray-200 px-2 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSave(player)}
              className="w-full min-h-[44px] rounded-xl bg-dia-green text-black font-semibold disabled:opacity-60"
            >
              {busy ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
