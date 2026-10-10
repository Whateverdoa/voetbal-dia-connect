"use client";

import {
  fieldPositionLookup,
  planKindLabel,
  presentRowLabel,
  type PresentPlanPlayer,
  type PresentPlanRow,
} from "@/lib/substitutions/presentPlanAdapters";
import type { SubstitutionMoment } from "@/lib/substitutions/projectSubstitutionMoments";
import type { SubstitutionPlanRow } from "@/components/match/types";

interface WisselplanMomentListProps {
  moments: SubstitutionMoment[];
  selectedId: string;
  onSelect: (id: string) => void;
  numberByPlayerId: ReadonlyMap<string, number | null>;
  /** Formation slots, so rows can name the position each player holds. */
  slots?: readonly { id: number; position: string }[];
}

function rowAsPresent(row: SubstitutionPlanRow): PresentPlanRow {
  return {
    _id: row._id,
    matchId: row.matchId,
    sequence: row.sequence,
    kind: row.kind ?? "substitution",
    targetQuarter: row.targetQuarter ?? null,
    targetMinute: row.targetMinute ?? null,
    playerOutId: row.playerOutId,
    playerInId: row.playerInId,
    status: row.status,
    note: row.note ?? null,
    outDisplayName: row.outName ?? "?",
    inDisplayName: row.inName ?? "?",
  };
}

/**
 * Bench substitutions and position changes are the same shape of data but very
 * different instructions, so they get their own colour: amber means a player
 * leaves the pitch, sky means both stay on it and only trade places.
 */
const KIND_PILL: Record<"substitution" | "positionSwap", string> = {
  substitution: "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40",
  positionSwap: "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40",
};

/** Left sidebar: one button per substitution moment for the TV pitch. */
export function WisselplanMomentList({
  moments,
  selectedId,
  onSelect,
  numberByPlayerId,
  slots,
}: WisselplanMomentListProps) {
  return (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col min-h-0 overflow-hidden">
      <h2 className="shrink-0 text-lg font-bold text-white mb-3">Wisselplan</h2>
      <ul className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {moments.map((moment, index) => {
          const active = moment.id === selectedId;
          // A moment's own snapshot is the situation *after* its rows fire, so
          // positions come from the previous one — that is where the outgoing
          // player still stands in the slot the row is about.
          const positionByPlayerId = slots
            ? fieldPositionLookup(
                (moments[index - 1] ?? moment).onField,
                slots
              )
            : undefined;
          return (
            <li key={moment.id}>
              <button
                type="button"
                onClick={() => onSelect(moment.id)}
                className={`w-full text-left rounded-xl px-3 py-3 min-h-[48px] transition-colors ${
                  active
                    ? "bg-dia-black text-dia-yellow ring-2 ring-dia-yellow"
                    : "bg-slate-800/80 text-white hover:bg-slate-700/80"
                }`}
              >
                <span className="block text-xs uppercase tracking-wide opacity-80">
                  {moment.label}
                </span>
                {moment.rows.length === 0 ? (
                  <span className="block mt-1 text-sm font-semibold">
                    Beginopstelling
                  </span>
                ) : (
                  <ul className="mt-1 space-y-2">
                    {moment.rows.map((row) => {
                      const present = rowAsPresent(row);
                      return (
                        <li
                          key={String(row._id)}
                          className="text-sm font-semibold leading-snug"
                        >
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${KIND_PILL[present.kind]}`}
                          >
                            {planKindLabel(present.kind)}
                          </span>
                          <span className="block">
                            {presentRowLabel(
                              present,
                              numberByPlayerId,
                              positionByPlayerId
                            )}
                          </span>
                          {row.note ? (
                            <span className="block text-xs font-normal opacity-70">
                              {row.note}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** Build a playerId → shirt number map for presentRowLabel. */
export function numberLookupFromPlayers(
  players: PresentPlanPlayer[]
): Map<string, number | null> {
  return new Map(players.map((p) => [p.playerId, p.number]));
}
