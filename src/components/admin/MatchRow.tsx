"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getAdminPin } from "@/lib/adminSession";
import { formatMatchDate } from "@/types/publicMatch";

export interface AdminMatch {
  _id: Id<"matches">;
  teamName: string;
  opponent: string;
  isHome: boolean;
  status: string;
  publicCode: string;
  scheduledAt?: number;
  homeScore: number;
  awayScore: number;
  refereeName: string | null;
  coachName: string | null;
  refereeId?: Id<"referees">;
}

interface MatchRowProps {
  match: AdminMatch;
  onEdit: (matchId: Id<"matches">) => void;
  onStatusMessage: (msg: string) => void;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Gepland", cls: "bg-blue-100 text-blue-700" },
  lineup: { label: "Opstelling", cls: "bg-blue-100 text-blue-700" },
  live: { label: "LIVE", cls: "bg-green-100 text-green-700" },
  halftime: { label: "Rust", cls: "bg-orange-100 text-orange-700" },
  finished: { label: "Afgelopen", cls: "bg-red-100 text-red-700" },
};

const showScore = new Set(["live", "halftime", "finished"]);

export function MatchRow({ match, onEdit, onStatusMessage }: MatchRowProps) {
  const [confirming, setConfirming] = useState(false);
  const deleteMatch = useMutation(api.admin.deleteMatch);

  const handleDelete = async () => {
    try {
      await deleteMatch({ matchId: match._id, adminPin: getAdminPin() });
      onStatusMessage("Wedstrijd verwijderd");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      onStatusMessage(`Fout: ${msg}`);
    } finally {
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
        <AlertTriangle size={18} className="text-red-500 shrink-0" />
        <span className="flex-1 text-sm text-red-700">
          Wedstrijd verwijderen? Spelers en events worden ook verwijderd.
        </span>
        <button
          onClick={handleDelete}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium"
        >
          Ja
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium"
        >
          Nee
        </button>
      </div>
    );
  }

  const badge = STATUS_BADGES[match.status] ?? STATUS_BADGES.scheduled;
  const teamLabel = match.isHome
    ? `${match.teamName} vs ${match.opponent}`
    : `${match.teamName} @ ${match.opponent}`;

  return (
    <div className="p-3 bg-gray-50 rounded-lg flex flex-wrap items-center gap-x-3 gap-y-1">
      {/* Team names */}
      <span className="font-semibold text-sm">{teamLabel}</span>

      {/* Status badge */}
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
        {badge.label}
      </span>

      {/* Referee indicator */}
      {match.refereeName ? (
        <span className="text-xs text-green-700">
          Scheidsrechter: {match.refereeName}
        </span>
      ) : (
        <span className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle size={12} /> Geen scheidsrechter
        </span>
      )}

      {/* Coach name */}
      {match.coachName && (
        <span className="text-xs text-gray-400">Coach: {match.coachName}</span>
      )}

      {/* Public code */}
      <span className="text-xs font-mono bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
        {match.publicCode}
      </span>

      {/* Date */}
      {match.scheduledAt && (
        <span className="text-xs text-gray-500">
          {formatMatchDate(match.scheduledAt)}
        </span>
      )}

      {/* Score */}
      {showScore.has(match.status) && (
        <span className="text-sm font-bold tabular-nums">
          {match.homeScore} – {match.awayScore}
        </span>
      )}

      {/* Spacer */}
      <span className="flex-1" />

      {/* Actions */}
      <button
        onClick={() => onEdit(match._id)}
        className="p-2 text-gray-500 hover:bg-gray-200 rounded"
        aria-label="Bewerken"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={() => setConfirming(true)}
        className="p-2 text-red-500 hover:bg-red-50 rounded"
        aria-label="Verwijderen"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
