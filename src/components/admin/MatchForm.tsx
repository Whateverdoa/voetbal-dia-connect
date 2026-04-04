"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PlayerSelector } from "./PlayerSelector";
import { MatchTimingPresetPicker } from "@/components/match/MatchTimingPresetPicker";
import {
  MATCH_TIMING_PRESETS,
  type MatchTimingPresetId,
} from "@/lib/matchTimingPresets";

interface MatchFormProps {
  teams: { _id: Id<"teams">; name: string }[] | undefined;
  coaches: { _id: Id<"coaches">; name: string; email?: string }[] | undefined;
  referees:
    | { id: Id<"referees">; name: string; qualificationTags?: string[] }[]
    | undefined;
  onCreated: (publicCode: string) => void;
  mode?: "collapsible" | "embedded";
  onCancel?: () => void;
}

export function MatchForm({
  teams,
  coaches,
  referees,
  onCreated,
  mode = "collapsible",
  onCancel,
}: MatchFormProps) {
  const isEmbedded = mode === "embedded";
  const [open, setOpen] = useState(isEmbedded);
  const [teamId, setTeamId] = useState<Id<"teams"> | "">("");
  const [opponent, setOpponent] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [coachId, setCoachId] = useState<Id<"coaches"> | "">("");
  const [timingPreset, setTimingPreset] = useState<MatchTimingPresetId>("q4_15");
  const [scheduledAt, setScheduledAt] = useState("");
  const [refereeId, setRefereeId] = useState<Id<"referees"> | "">("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<Id<"players">>>(new Set());
  const [playersInitKey, setPlayersInitKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const createMatch = useMutation(api.admin.createMatch);
  const players = useQuery(
    api.admin.listPlayersByTeam,
    teamId ? { teamId: teamId as Id<"teams"> } : "skip"
  );

  useEffect(() => {
    if (players && players.length > 0) {
      const activeIds = new Set(players.filter((player) => player.active).map((player) => player._id));
      setSelectedPlayerIds(activeIds);
    }
  }, [players, playersInitKey]);

  const canSubmit =
    !!teamId && !!opponent.trim() && !!coachId && selectedPlayerIds.size > 0 && !submitting;

  function resetForm() {
    setTeamId("");
    setOpponent("");
    setIsHome(true);
    setCoachId("");
    setTimingPreset("q4_15");
    setScheduledAt("");
    setRefereeId("");
    setSelectedPlayerIds(new Set());
    setPlayersInitKey((value) => value + 1);
    setError("");
  }

  function handleTeamChange(id: string) {
    setTeamId(id as Id<"teams"> | "");
    setSelectedPlayerIds(new Set());
    setPlayersInitKey((value) => value + 1);
  }

  function togglePlayer(playerId: Id<"players">) {
    setSelectedPlayerIds((previous) => {
      const next = new Set(previous);
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
      const timing = MATCH_TIMING_PRESETS[timingPreset];
      const result = await createMatch({
        teamId: teamId as Id<"teams">,
        opponent: opponent.trim(),
        isHome,
        coachId: coachId as Id<"coaches">,
        quarterCount: timing.quarterCount,
        regulationDurationMinutes: timing.regulationDurationMinutes,
        scheduledAt: scheduledAt ? new Date(scheduledAt).getTime() : undefined,
        refereeId: refereeId ? (refereeId as Id<"referees">) : undefined,
        playerIds: Array.from(selectedPlayerIds),
      });
      onCreated(result.publicCode);
      resetForm();
      if (!isEmbedded) {
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout bij aanmaken");
    } finally {
      setSubmitting(false);
    }
  }

  const toggleCls = (active: boolean) =>
    `flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
      active ? "bg-dia-green text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`;

  const formContent = (
    <div className="space-y-4">
      <FieldSelect label="Team *" value={teamId} onChange={handleTeamChange} placeholder="Selecteer team...">
        {teams?.map((team) => (
          <option key={team._id} value={team._id}>
            {team.name}
          </option>
        ))}
      </FieldSelect>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Tegenstander *</label>
        <input
          type="text"
          value={opponent}
          onChange={(event) => setOpponent(event.target.value)}
          placeholder="Bijv. FC Groningen JO12-1"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-dia-green"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Thuis / Uit</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setIsHome(true)} className={toggleCls(isHome)}>
            Thuis
          </button>
          <button type="button" onClick={() => setIsHome(false)} className={toggleCls(!isHome)}>
            Uit
          </button>
        </div>
      </div>

      <FieldSelect
        label="Coach *"
        value={coachId}
        onChange={(value) => setCoachId(value as Id<"coaches"> | "")}
        placeholder="Selecteer coach..."
      >
        {coaches?.map((coach) => (
          <option key={coach._id} value={coach._id}>
            {coach.name}{coach.email ? ` (${coach.email})` : ""}
          </option>
        ))}
      </FieldSelect>

      <MatchTimingPresetPicker value={timingPreset} onChange={setTimingPreset} />

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Datum/tijd</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => setScheduledAt(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-dia-green"
        />
      </div>

      <FieldSelect
        label="Scheidsrechter"
        value={refereeId}
        onChange={(value) => setRefereeId(value as Id<"referees"> | "")}
        placeholder="Geen scheidsrechter"
      >
        {referees?.map((referee) => (
          <option key={referee.id} value={referee.id}>
            {referee.name}
          </option>
        ))}
      </FieldSelect>

      {teamId && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Spelers {players && <span className="font-normal text-slate-400">({selectedPlayerIds.size}/{players.length} geselecteerd)</span>}
          </label>
          <PlayerSelector players={players} selectedIds={selectedPlayerIds} onToggle={togglePlayer} />
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3 pt-2">
        {isEmbedded && onCancel && (
          <button type="button" onClick={onCancel} className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Annuleren
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-dia-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-dia-green-light disabled:bg-slate-300"
        >
          {submitting ? "Aanmaken..." : "Wedstrijd aanmaken"}
        </button>
      </div>
    </div>
  );

  if (isEmbedded) {
    return formContent;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Nieuwe wedstrijd formulier"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-lg font-semibold transition hover:bg-slate-50"
      >
        <span className="flex items-center gap-2">
          <Plus size={20} className="text-dia-green" />
          Nieuwe wedstrijd
        </span>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {open && <div className="border-t border-slate-200 px-4 pb-4 pt-3">{formContent}</div>}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  placeholder,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-dia-green"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );
}
