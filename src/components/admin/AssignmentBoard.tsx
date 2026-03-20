"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import clsx from "clsx";
import { Building2, CalendarDays, Plus, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  filterAssignmentBoardMatches,
  filterAssignmentBoardVenueMatches,
  getAssignmentClubTabs,
  getAssignmentDateTabs,
  getVisibleAssignmentBoardMatches,
  type AssignmentBoardStatusFilter,
  type AssignmentBoardVenueFilter,
} from "@/lib/admin/assignmentBoard";
import {
  filterAssignmentBoardDateWindow,
  filterAssignmentBoardRefereeNeeds,
  type AssignmentBoardDateWindowFilter,
  type AssignmentBoardRefereeNeedFilter,
} from "@/lib/admin/assignmentBoardWindowFilters";
import { AssignmentBoardPanel } from "./AssignmentBoardPanel";
import { AssignmentBoardTable } from "./AssignmentBoardTable";
import { AssignmentBoardFilters } from "./AssignmentBoardFilters";
import { MatchForm } from "./MatchForm";
import type { ActiveRefereeOption, AssignmentBoardMatch } from "./types";

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/75 px-4 py-3 shadow-sm backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-dia-green bg-dia-green text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <span>{label}</span>
      <span className={clsx("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>{count}</span>
    </button>
  );
}

export function AssignmentBoard() {
  const boardData = useQuery(api.admin.listAssignmentBoard, {}) as AssignmentBoardMatch[] | undefined;
  const teams = useQuery(api.admin.listAllTeams);
  const coaches = useQuery(api.admin.listCoaches);
  const referees = useQuery(api.matches.listActiveReferees) as ActiveRefereeOption[] | undefined;

  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("alle");
  const [statusFilter, setStatusFilter] = useState<AssignmentBoardStatusFilter>("alle");
  const [venueFilter, setVenueFilter] = useState<AssignmentBoardVenueFilter>("alle");
  const [refereeNeedFilter, setRefereeNeedFilter] =
    useState<AssignmentBoardRefereeNeedFilter>("scheids-nodig");
  const [dateWindowFilter, setDateWindowFilter] =
    useState<AssignmentBoardDateWindowFilter>("huidige-speelweek");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<AssignmentBoardMatch["_id"] | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const allMatches = boardData ?? [];
  const dateWindowScopedMatches = filterAssignmentBoardDateWindow(allMatches, dateWindowFilter);
  const locationScopedMatches = filterAssignmentBoardVenueMatches(dateWindowScopedMatches, venueFilter);
  const refereeNeedScopedMatches = filterAssignmentBoardRefereeNeeds(
    locationScopedMatches,
    refereeNeedFilter
  );
  const statusScopedMatches = filterAssignmentBoardMatches(
    refereeNeedScopedMatches,
    "",
    statusFilter,
    teamFilter
  );
  const teamOptions = Array.from(
    new Set(locationScopedMatches.map((match) => match.teamName))
  ).sort((left, right) => left.localeCompare(right, "nl-NL"));
  const clubTabs = getAssignmentClubTabs(statusScopedMatches);
  const dateTabs = selectedClubId ? getAssignmentDateTabs(statusScopedMatches, selectedClubId) : [];
  const searchedMatches = filterAssignmentBoardMatches(
    statusScopedMatches,
    deferredSearchTerm,
    "alle",
    "alle"
  );
  const visibleMatches = selectedClubId && selectedDateKey
    ? getVisibleAssignmentBoardMatches(searchedMatches, selectedClubId, selectedDateKey)
    : [];
  const selectedMatch = visibleMatches.find((match) => match._id === selectedMatchId) ?? null;

  useEffect(() => {
    if (clubTabs.length === 0) {
      setSelectedClubId("");
      return;
    }
    if (!clubTabs.some((tab) => tab.key === selectedClubId)) {
      setSelectedClubId(clubTabs[0].key);
    }
  }, [clubTabs, selectedClubId]);

  useEffect(() => {
    if (dateTabs.length === 0) {
      setSelectedDateKey("");
      return;
    }
    if (!dateTabs.some((tab) => tab.key === selectedDateKey)) {
      setSelectedDateKey(dateTabs[0].key);
    }
  }, [dateTabs, selectedDateKey]);

  useEffect(() => {
    if (selectedMatchId && !visibleMatches.some((match) => match._id === selectedMatchId)) {
      setSelectedMatchId(null);
    }
  }, [selectedMatchId, visibleMatches]);

  if (boardData === undefined || referees === undefined) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">Toewijzingsbord laden...</p>
      </div>
    );
  }

  const liveCount = locationScopedMatches.filter((match) => ["live", "halftime", "lineup"].includes(match.status)).length;
  const unassignedCount = locationScopedMatches.filter((match) => !match.refereeName).length;
  const plannedCount = locationScopedMatches.filter((match) => match.status === "scheduled").length;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(214,246,214,0.9),_rgba(255,255,255,0.95)_40%,_rgba(240,249,255,0.9)_100%)] shadow-[0_22px_70px_rgba(15,23,42,0.12)]">
        <div className="border-b border-white/70 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dia-green">Admin toewijzing</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Scheidsrechters per speeldag toewijzen</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Kies eerst een club en daarna de speeldag. Je ziet standaard alle wedstrijden in de gekozen periode, zodat ook uitwedstrijden meteen zichtbaar zijn.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryPill label="In bord" value={locationScopedMatches.length} />
              <SummaryPill label="Live" value={liveCount} />
              <SummaryPill label="Zonder scheids" value={unassignedCount} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-5 md:px-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <AssignmentBoardFilters
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            venueFilter={venueFilter}
            onVenueFilterChange={setVenueFilter}
            teamFilter={teamFilter}
            onTeamFilterChange={setTeamFilter}
            teamOptions={teamOptions}
            refereeNeedFilter={refereeNeedFilter}
            onRefereeNeedFilterChange={setRefereeNeedFilter}
            dateWindowFilter={dateWindowFilter}
            onDateWindowFilterChange={setDateWindowFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          <button type="button" onClick={() => setIsCreateOpen(true)} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-dia-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-dia-green-light">
            <Plus size={18} />
            Nieuwe wedstrijd
          </button>
        </div>
      </section>

      {statusMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage("")} className="rounded-full p-1 text-emerald-700 transition hover:bg-emerald-100" aria-label="Melding sluiten">
            <X size={14} />
          </button>
        </div>
      )}

      <section className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          <Building2 size={14} />
          Club en speeldag
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {clubTabs.map((tab) => (
            <TabButton key={tab.key} active={selectedClubId === tab.key} label={tab.label} count={tab.count} onClick={() => {
              setSelectedClubId(tab.key);
              setSelectedMatchId(null);
            }} />
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          <CalendarDays size={14} />
          Speeldagen
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {dateTabs.map((tab) => (
            <TabButton key={tab.key} active={selectedDateKey === tab.key} label={tab.label} count={tab.count} onClick={() => {
              setSelectedDateKey(tab.key);
              setSelectedMatchId(null);
            }} />
          ))}
        </div>

        <AssignmentBoardTable matches={visibleMatches} selectedMatchId={selectedMatchId} onSelect={setSelectedMatchId} />

        {visibleMatches.length === 0 && searchTerm && (
          <p className="text-sm text-slate-400">Geen resultaten voor deze zoekterm binnen de gekozen club en speeldag.</p>
        )}
      </section>

      {selectedMatch && (
        <AssignmentBoardPanel match={selectedMatch} referees={referees} onClose={() => setSelectedMatchId(null)} onStatusMessage={setStatusMessage} />
      )}

      {isCreateOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-5 shadow-2xl md:inset-x-auto md:top-6 md:right-6 md:bottom-6 md:w-[620px] md:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dia-green">Nieuwe wedstrijd</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Voeg een wedstrijd toe aan het bord</h3>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Formulier sluiten">
                <X size={18} />
              </button>
            </div>
            <div className="pt-5">
              <MatchForm
                teams={teams}
                coaches={coaches}
                referees={referees}
                mode="embedded"
                onCancel={() => setIsCreateOpen(false)}
                onCreated={(publicCode) => {
                  setStatusMessage(`Wedstrijd aangemaakt. Code: ${publicCode}`);
                  setIsCreateOpen(false);
                }}
              />
            </div>
          </div>
        </>
      )}

      {boardData.length === 0 && (
        <section className="rounded-[32px] border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">Nog geen wedstrijden beschikbaar.</p>
          <p className="mt-2 text-sm text-slate-400">Gebruik 'Nieuwe wedstrijd' om het toewijzingsbord te vullen.</p>
        </section>
      )}

      {plannedCount === 0 && boardData.length > 0 && (
        <p className="text-sm text-slate-400">Binnen deze selectie zijn geen geplande wedstrijden meer zichtbaar; pas eventueel de filters aan.</p>
      )}
    </div>
  );
}
