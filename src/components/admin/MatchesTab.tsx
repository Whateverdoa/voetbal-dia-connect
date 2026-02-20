"use client";

import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getAdminPin } from "@/lib/adminSession";
import { MatchRow, type AdminMatch } from "./MatchRow";
import { MatchEditPanel } from "./MatchEditPanel";
import { MatchForm } from "./MatchForm";

type StatusFilter = "alle" | "scheduled" | "live" | "finished";

interface MatchesTabProps {
  teams: { _id: Id<"teams">; name: string }[] | undefined;
}

export function MatchesTab({ teams }: MatchesTabProps) {
  const adminPin = getAdminPin();
  const matches = useQuery(api.admin.listAllMatches, { adminPin });
  const coaches = useQuery(api.admin.listCoaches);
  const referees = useQuery(api.matches.listActiveReferees);
  const updateMatch = useMutation(api.admin.updateMatch);
  const addPlayerToMatch = useMutation(api.admin.addPlayerToMatch);
  const createPlayerAndAddToMatch = useMutation(api.admin.createPlayerAndAddToMatch);

  const [teamFilter, setTeamFilter] = useState<string>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [statusMessage, setStatusMessage] = useState("");
  const [editingId, setEditingId] = useState<Id<"matches"> | null>(null);
  const [editRefereeId, setEditRefereeId] = useState<string>("");
  const [editOpponent, setEditOpponent] = useState("");
  const [editIsHome, setEditIsHome] = useState(true);
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [addPlayerId, setAddPlayerId] = useState<string>("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");

  // Apply filters
  let filtered = matches ?? [];
  if (teamFilter !== "alle") {
    filtered = filtered.filter((m) => m.teamId === teamFilter);
  }
  if (statusFilter !== "alle") {
    const statusSet: Record<StatusFilter, string[]> = {
      alle: [],
      scheduled: ["scheduled"],
      live: ["live", "halftime", "lineup"],
      finished: ["finished"],
    };
    const allowed = statusSet[statusFilter];
    if (allowed.length > 0) {
      filtered = filtered.filter((m) => allowed.includes(m.status));
    }
  }

  const handleCreated = (publicCode: string) => {
    setStatusMessage(`Wedstrijd aangemaakt! Code: ${publicCode}`);
  };

  const handleSaveEdit = async (matchId: Id<"matches">) => {
    try {
      await updateMatch({
        matchId,
        adminPin,
        opponent: editOpponent.trim() || undefined,
        isHome: editIsHome,
        scheduledAt: editScheduledAt ? new Date(editScheduledAt).getTime() : undefined,
        refereeId: editRefereeId
          ? (editRefereeId as Id<"referees">)
          : null,
      });
      setEditingId(null);
      setStatusMessage("Wedstrijd bijgewerkt");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setStatusMessage(`Fout: ${msg}`);
    }
  };

  const handleAddPlayer = async (matchId: Id<"matches">) => {
    if (!addPlayerId) return;
    try {
      await addPlayerToMatch({
        matchId,
        playerId: addPlayerId as Id<"players">,
        adminPin,
      });
      setAddPlayerId("");
      setStatusMessage("Speler toegevoegd");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setStatusMessage(`Fout: ${msg}`);
    }
  };

  const handleCreateAndAddPlayer = async (matchId: Id<"matches">) => {
    if (!newPlayerName.trim()) return;
    try {
      await createPlayerAndAddToMatch({
        matchId,
        name: newPlayerName.trim(),
        number: newPlayerNumber ? parseInt(newPlayerNumber, 10) : undefined,
        adminPin,
      });
      setNewPlayerName("");
      setNewPlayerNumber("");
      setStatusMessage("Speler aangemaakt en toegevoegd");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setStatusMessage(`Fout: ${msg}`);
    }
  };

  const startEdit = (matchId: Id<"matches">) => {
    const match = matches?.find((m) => m._id === matchId);
    setEditRefereeId(match?.refereeId ?? "");
    setEditOpponent(match?.opponent ?? "");
    setEditIsHome(match?.isHome ?? true);
    setEditScheduledAt(
      match?.scheduledAt
        ? new Date(match.scheduledAt).toISOString().slice(0, 16)
        : ""
    );
    setAddPlayerId("");
    setNewPlayerName("");
    setNewPlayerNumber("");
    setEditingId(matchId);
  };

  return (
    <div className="space-y-4">
      {/* Create form */}
      <MatchForm
        teams={teams}
        coaches={coaches}
        referees={referees}
        onCreated={handleCreated}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="px-3 py-1.5 border rounded-lg bg-white text-sm"
        >
          <option value="alle">Alle teams</option>
          {teams?.map((t) => (
            <option key={t._id} value={t._id}>{t.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-1.5 border rounded-lg bg-white text-sm"
        >
          <option value="alle">Alle statussen</option>
          <option value="scheduled">Gepland</option>
          <option value="live">Live</option>
          <option value="finished">Afgelopen</option>
        </select>
        {matches && (
          <span className="text-sm text-gray-400 self-center ml-auto">
            {filtered.length} / {matches.length} wedstrijden
          </span>
        )}
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="flex items-center justify-between text-sm p-2 bg-gray-100 rounded-lg">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage("")}
            className="text-gray-400 hover:text-gray-600 text-xs"
            aria-label="Melding sluiten"
          >
            ✕
          </button>
        </div>
      )}

      {/* Match list */}
      {matches === undefined ? (
        <p className="text-gray-500">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">Geen wedstrijden gevonden.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((match) => (
            <div key={match._id}>
              <MatchRow
                match={match as AdminMatch}
                onEdit={startEdit}
                onStatusMessage={setStatusMessage}
              />
              {/* Inline edit panel for referee assignment */}
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
