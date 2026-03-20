"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MatchEditPanel } from "./MatchEditPanel";
import { MatchForm } from "./MatchForm";
import { MatchRow, type AdminMatch } from "./MatchRow";

type StatusFilter = "alle" | "scheduled" | "live" | "finished";

interface MatchesTabProps {
  teams: { _id: Id<"teams">; name: string }[] | undefined;
}

export function MatchesTab({ teams }: MatchesTabProps) {
  const matches = useQuery(api.admin.listAllMatches, {});
  const coaches = useQuery(api.admin.listCoaches);
  const referees = useQuery(api.matches.listActiveReferees);
  const updateMatch = useMutation(api.admin.updateMatch);
  const addPlayerToMatch = useMutation(api.admin.addPlayerToMatch);
  const createPlayerAndAddToMatch = useMutation(api.admin.createPlayerAndAddToMatch);

  const [teamFilter, setTeamFilter] = useState<string>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [statusMessage, setStatusMessage] = useState("");
  const [editingId, setEditingId] = useState<Id<"matches"> | null>(null);
  const [editRefereeId, setEditRefereeId] = useState("");
  const [editOpponent, setEditOpponent] = useState("");
  const [editIsHome, setEditIsHome] = useState(true);
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [addPlayerId, setAddPlayerId] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");

  let filtered = matches ?? [];
  if (teamFilter !== "alle") {
    filtered = filtered.filter((match) => match.teamId === teamFilter);
  }
  if (statusFilter !== "alle") {
    const statusSet: Record<StatusFilter, string[]> = {
      alle: [],
      scheduled: ["scheduled"],
      live: ["live", "halftime", "lineup"],
      finished: ["finished"],
    };
    const allowed = statusSet[statusFilter];
    filtered = filtered.filter((match) => allowed.includes(match.status));
  }

  function handleCreated(publicCode: string) {
    setStatusMessage(`Wedstrijd aangemaakt. Code: ${publicCode}`);
  }

  async function handleSaveEdit(matchId: Id<"matches">) {
    try {
      await updateMatch({
        matchId,
        opponent: editOpponent.trim() || undefined,
        isHome: editIsHome,
        scheduledAt: editScheduledAt ? new Date(editScheduledAt).getTime() : undefined,
        refereeId: editRefereeId ? (editRefereeId as Id<"referees">) : null,
      });
      setEditingId(null);
      setStatusMessage("Wedstrijd bijgewerkt");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatusMessage(`Fout: ${message}`);
    }
  }

  async function handleAddPlayer(matchId: Id<"matches">) {
    if (!addPlayerId) return;
    try {
      await addPlayerToMatch({ matchId, playerId: addPlayerId as Id<"players"> });
      setAddPlayerId("");
      setStatusMessage("Speler toegevoegd");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatusMessage(`Fout: ${message}`);
    }
  }

  async function handleCreateAndAddPlayer(matchId: Id<"matches">) {
    if (!newPlayerName.trim()) return;
    try {
      await createPlayerAndAddToMatch({
        matchId,
        name: newPlayerName.trim(),
        number: newPlayerNumber ? Number.parseInt(newPlayerNumber, 10) : undefined,
      });
      setNewPlayerName("");
      setNewPlayerNumber("");
      setStatusMessage("Speler aangemaakt en toegevoegd");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatusMessage(`Fout: ${message}`);
    }
  }

  function startEdit(matchId: Id<"matches">) {
    const match = matches?.find((entry) => entry._id === matchId);
    setEditRefereeId(match?.refereeId ?? "");
    setEditOpponent(match?.opponent ?? "");
    setEditIsHome(match?.isHome ?? true);
    setEditScheduledAt(match?.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "");
    setAddPlayerId("");
    setNewPlayerName("");
    setNewPlayerNumber("");
    setEditingId(matchId);
  }

  return (
    <div className="space-y-4">
      <MatchForm teams={teams} coaches={coaches} referees={referees} onCreated={handleCreated} />

      <div className="flex flex-wrap gap-2">
        <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="px-3 py-1.5 border rounded-lg bg-white text-sm">
          <option value="alle">Alle teams</option>
          {teams?.map((team) => (
            <option key={team._id} value={team._id}>{team.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="px-3 py-1.5 border rounded-lg bg-white text-sm">
          <option value="alle">Alle statussen</option>
          <option value="scheduled">Gepland</option>
          <option value="live">Live</option>
          <option value="finished">Afgelopen</option>
        </select>
        {matches && (
          <span className="text-sm text-gray-400 self-center ml-auto">{filtered.length} / {matches.length} wedstrijden</span>
        )}
      </div>

      {statusMessage && (
        <div className="flex items-center justify-between text-sm p-2 bg-gray-100 rounded-lg">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage("")} className="text-gray-400 hover:text-gray-600 text-xs" aria-label="Melding sluiten">
            ✕
          </button>
        </div>
      )}

      {matches === undefined ? (
        <p className="text-gray-500">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">Geen wedstrijden gevonden.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((match) => (
            <div key={match._id}>
              <MatchRow match={match as AdminMatch} onEdit={startEdit} onStatusMessage={setStatusMessage} />
              {editingId === match._id && (
                <MatchEditPanel
                  match={match}
                  editOpponent={editOpponent}
                  setEditOpponent={setEditOpponent}
                  editIsHome={editIsHome}
                  setEditIsHome={setEditIsHome}
                  editScheduledAt={editScheduledAt}
                  setEditScheduledAt={setEditScheduledAt}
                  editRefereeId={editRefereeId}
                  setEditRefereeId={setEditRefereeId}
                  addPlayerId={addPlayerId}
                  setAddPlayerId={setAddPlayerId}
                  newPlayerName={newPlayerName}
                  setNewPlayerName={setNewPlayerName}
                  newPlayerNumber={newPlayerNumber}
                  setNewPlayerNumber={setNewPlayerNumber}
                  referees={referees}
                  onSave={() => handleSaveEdit(match._id)}
                  onAddPlayer={() => handleAddPlayer(match._id)}
                  onCreatePlayer={() => handleCreateAndAddPlayer(match._id)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
