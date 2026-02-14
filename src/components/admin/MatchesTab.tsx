"use client";

import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ADMIN_PIN } from "@/lib/constants";
import { MatchRow, type AdminMatch } from "./MatchRow";
import { MatchForm } from "./MatchForm";

type StatusFilter = "alle" | "scheduled" | "live" | "finished";

interface MatchesTabProps {
  teams: { _id: Id<"teams">; name: string }[] | undefined;
}

export function MatchesTab({ teams }: MatchesTabProps) {
  const matches = useQuery(api.admin.listAllMatches, { adminPin: ADMIN_PIN });
  const coaches = useQuery(api.admin.listCoaches);
  const referees = useQuery(api.matches.listActiveReferees);
  const updateMatch = useMutation(api.admin.updateMatch);

  const [teamFilter, setTeamFilter] = useState<string>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [statusMessage, setStatusMessage] = useState("");
  const [editingId, setEditingId] = useState<Id<"matches"> | null>(null);
  const [editRefereeId, setEditRefereeId] = useState<string>("");

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
        adminPin: ADMIN_PIN,
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

  const startEdit = (matchId: Id<"matches">) => {
    const match = matches?.find((m) => m._id === matchId);
    setEditRefereeId(match?.refereeId ?? "");
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
                <div className="ml-4 mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Scheidsrechter toewijzen
                  </label>
                  <select
                    value={editRefereeId}
                    onChange={(e) => setEditRefereeId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                  >
                    <option value="">Geen scheidsrechter</option>
                    {referees?.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleSaveEdit(match._id)}
                      className="px-4 py-1.5 bg-dia-green text-white rounded-lg text-sm font-medium"
                    >
                      Opslaan
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
