"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { ADMIN_PIN } from "@/lib/constants";
import { PlayerSelector } from "./PlayerSelector";

interface MatchFormProps {
  teams: { _id: Id<"teams">; name: string }[] | undefined;
  coaches: { _id: Id<"coaches">; name: string; pin: string }[] | undefined;
  referees: { id: Id<"referees">; name: string }[] | undefined;
  onCreated: (publicCode: string) => void;
}

export function MatchForm({ teams, coaches, referees, onCreated }: MatchFormProps) {
  const [open, setOpen] = useState(false);

  // Form state
  const [teamId, setTeamId] = useState<Id<"teams"> | "">("");
  const [opponent, setOpponent] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [coachId, setCoachId] = useState<Id<"coaches"> | "">("");
  const [quarterCount, setQuarterCount] = useState<4 | 2>(4);
  const [scheduledAt, setScheduledAt] = useState("");
  const [refereeId, setRefereeId] = useState<Id<"referees"> | "">("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<Id<"players">>>(new Set());
  const [playersInitKey, setPlayersInitKey] = useState(0);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createMatch = useMutation(api.admin.createMatch);

  // Load players when team is selected
  const players = useQuery(
    api.admin.listPlayersByTeam,
    teamId ? { teamId: teamId as Id<"teams"> } : "skip"
  );

  // Auto-select all active players when player list loads (via useEffect, not render)
  useEffect(() => {
    if (players && players.length > 0) {
      const activeIds = new Set(
        players.filter((p) => p.active).map((p) => p._id)
      );
      setSelectedPlayerIds(activeIds);
    }
  }, [players, playersInitKey]);

  const selectedCoach = coaches?.find((c) => c._id === coachId);

  const canSubmit =
    !!teamId && !!opponent.trim() && !!selectedCoach && selectedPlayerIds.size > 0 && !submitting;

  function resetForm() {
    setTeamId("");
    setOpponent("");
    setIsHome(true);
    setCoachId("");
    setQuarterCount(4);
    setScheduledAt("");
    setRefereeId("");
    setSelectedPlayerIds(new Set());
    setPlayersInitKey((k) => k + 1);
    setError("");
  }

  function handleTeamChange(id: string) {
    setTeamId(id as Id<"teams"> | "");
    setSelectedPlayerIds(new Set());
    setPlayersInitKey((k) => k + 1);
  }

  function togglePlayer(playerId: Id<"players">) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await createMatch({
        teamId: teamId as Id<"teams">,
        opponent: opponent.trim(),
        isHome,
        coachPin: selectedCoach.pin,
        quarterCount,
        scheduledAt: scheduledAt ? new Date(scheduledAt).getTime() : undefined,
        refereeId: refereeId ? (refereeId as Id<"referees">) : undefined,
        playerIds: Array.from(selectedPlayerIds),
        adminPin: ADMIN_PIN,
      });
      onCreated(result.publicCode);
      resetForm();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout bij aanmaken");
    } finally {
      setSubmitting(false);
    }
  }

  const toggleCls = (active: boolean) =>
    `flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? "bg-dia-green text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Nieuwe wedstrijd formulier"
        className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-lg hover:bg-gray-50 transition-colors rounded-lg"
      >
        <span className="flex items-center gap-2">
          <Plus size={20} className="text-dia-green" />
          Nieuwe wedstrijd
        </span>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Team */}
          <FieldSelect label="Team *" value={teamId} onChange={handleTeamChange} placeholder="Selecteer team...">
            {teams?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </FieldSelect>

          {/* Opponent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tegenstander *</label>
            <input type="text" value={opponent} onChange={(e) => setOpponent(e.target.value)}
              placeholder="Bijv. FC Groningen JO12-1" className="w-full px-3 py-2 border rounded-lg" />
          </div>

          {/* Home / Away toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thuis / Uit</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsHome(true)} className={toggleCls(isHome)}>Thuis</button>
              <button type="button" onClick={() => setIsHome(false)} className={toggleCls(!isHome)}>Uit</button>
            </div>
          </div>

          {/* Coach */}
          <FieldSelect label="Coach *" value={coachId} onChange={(v) => setCoachId(v as Id<"coaches"> | "")} placeholder="Selecteer coach...">
            {coaches?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </FieldSelect>

          {/* Quarter count toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kwarten</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setQuarterCount(4)} className={toggleCls(quarterCount === 4)}>4 kwarten</button>
              <button type="button" onClick={() => setQuarterCount(2)} className={toggleCls(quarterCount === 2)}>2 helften</button>
            </div>
          </div>

          {/* Scheduled at */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum/tijd</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg" />
          </div>

          {/* Referee */}
          <FieldSelect label="Scheidsrechter" value={refereeId} onChange={(v) => setRefereeId(v as Id<"referees"> | "")} placeholder="Geen scheidsrechter">
            {referees?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </FieldSelect>

          {/* Players */}
          {teamId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spelers{" "}
                {players && (
                  <span className="text-gray-400 font-normal">
                    ({selectedPlayerIds.size}/{players.length} geselecteerd)
                  </span>
                )}
              </label>
              <PlayerSelector players={players} selectedIds={selectedPlayerIds} onToggle={togglePlayer} />
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button onClick={handleSubmit} disabled={!canSubmit}
            className="w-full py-3 bg-dia-green text-white rounded-lg font-semibold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-[0.98] transition-transform">
            {submitting ? "Aanmaken..." : "Wedstrijd aanmaken"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Reusable field-level select wrapper */
function FieldSelect({ label, value, onChange, placeholder, children }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white">
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );
}
