"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ScoreDisplay,
  MatchControls,
  GoalModal,
  SubstitutionPanel,
  PlayerList,
  PitchView,
  EventTimeline,
  LineupToggle,
  PlayingTimePanel,
  SubstitutionSuggestions,
  MatchLeadBadge,
  MatchSettingsEdit,
  LateRosterPanel,
  RefereeAssignment,
  StagedSubstitutionsPanel,
  GoalEnrichmentPanel,
  CardModal,
  TimePenaltyPanel,
} from "@/components/match";
import type { Match } from "@/components/match";
import { resolveLogoUrl } from "@/lib/logos";
import { TabButton } from "@/components/match/TabButton";
import { FormationSelector } from "@/components/match/FormationSelector";
import { resolveMatchFormation } from "@/lib/formations/resolveMatchFormation";
import { useSeasonMinutesMap } from "@/hooks/useSeasonMinutesMap";
import { OfficialDutyNotice } from "@/components/coach/OfficialDutyNotice";
import { useShowCardMinutes } from "@/hooks/useShowCardMinutes";
import { TeamSeasonMinutesPanel } from "@/components/coach/TeamSeasonMinutesPanel";
import { CardMinutesToggle } from "@/components/coach/CardMinutesToggle";
import { CoachWisselplanTab } from "@/components/coach/CoachWisselplanTab";
import { useDeviceSurface } from "@/hooks/useDeviceSurface";
type ViewTab = "opstelling" | "wisselplan" | "speeltijd" | "seizoen";
type LineupView = "veld" | "lijst";

interface MatchControlPanelProps {
  match: Match;
}

export function MatchControlPanel({ match }: MatchControlPanelProps) {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("opstelling");
  const [lineupView, setLineupView] = useState<LineupView>("lijst");
  const [isConnected, setIsConnected] = useState(true);
  const lastUpdateRef = useRef(0);
  const seasonMinutesByPlayerId = useSeasonMinutesMap(match.teamId);
  const [showCardMinutes, setShowCardMinutes] = useShowCardMinutes();
  const cardMinutes = showCardMinutes ? seasonMinutesByPlayerId : undefined;
  const surface = useDeviceSurface();
  const isPc = surface === "pc";

  useEffect(() => {
    lastUpdateRef.current = Date.now();
    const reconnectTimer = window.setTimeout(() => {
      setIsConnected(true);
    }, 0);
    return () => window.clearTimeout(reconnectTimer);
  }, [match]);

  useEffect(() => {
    if (match.status !== "live") return;
    const interval = setInterval(() => {
      if (Date.now() - lastUpdateRef.current > 30000) {
        setIsConnected(false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [match.status]);

  const playersOnField = match.players.filter((p) => p.onField);
  const playersOnBench = match.players.filter(
    (p) => !p.onField && !(p.absent ?? false) && !(p.injured ?? false)
  );
  const playersAbsent = match.players.filter(
    (p) => !p.onField && (p.absent ?? false) && !(p.injured ?? false)
  );
  const playersInjured = match.players.filter(
    (p) => !p.onField && (p.injured ?? false)
  );

  const resolvedFormation = resolveMatchFormation(
    match.formationId,
    match.customFormationTemplate
      ? {
          name: match.customFormationTemplate.name,
          kind: match.customFormationTemplate.kind,
          slots: match.customFormationTemplate.slots,
          links: match.customFormationTemplate.links,
        }
      : undefined
  );

  const isLive = match.status === "live" || match.status === "halftime";
  const isPregame = match.status === "scheduled" || match.status === "lineup";
  const isLead = match.isCurrentCoachLead ?? false;
  // After the match ends, lineup moves and live subs stay closed.
  const canEditLineup = isPregame || (isLive && isLead);
  const canDoSubstitutions = isLive && isLead;
  const canControlClock = match.canControlClock ?? true;

  const diaLogo = resolveLogoUrl(match.teamLogoUrl, match.clubLogoUrl);
  const oppLogo = match.opponentLogoUrl ?? null;
  const homeLogoUrl = match.isHome ? diaLogo : oppLogo;
  const awayLogoUrl = match.isHome ? oppLogo : diaLogo;

  return (
    <main className="min-h-screen bg-gray-100 pb-8">
      <nav className="bg-dia-green text-white px-4 py-2 sticky top-0 z-20">
        <div
          className={`${
            isPc && activeTab === "wisselplan" ? "max-w-7xl" : "max-w-2xl"
          } mx-auto flex items-center justify-between`}
        >
          <div className="flex items-center gap-1">
            <Link
              href="/coach"
              className="text-sm opacity-80 hover:opacity-100 flex items-center gap-1 min-h-[44px] px-2 -ml-2"
            >
              ← Terug
            </Link>
            <Link
              href={`/live/${match.publicCode}`}
              className="text-sm opacity-80 hover:opacity-100 min-h-[44px] px-2 flex items-center"
            >
              Live view
            </Link>
            {isPc ? (
              <Link
                href={`/coach/match/${match._id}/wisselplan`}
                className="text-sm opacity-80 hover:opacity-100 min-h-[44px] px-2 flex items-center"
                title="Wisselplan op iPad of laptop"
              >
                Planscherm
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {!isConnected && (
              <span className="flex items-center gap-1 text-xs bg-red-500/80 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full" />
                Verbinding verbroken
              </span>
            )}
            <span className="text-xs opacity-60">Coach modus</span>
          </div>
        </div>
      </nav>

      <ScoreDisplay
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        teamName={match.teamName}
        opponent={match.opponent}
        isHome={match.isHome}
        status={match.status}
        currentQuarter={match.currentQuarter}
        quarterCount={match.quarterCount}
        regulationDurationMinutes={match.regulationDurationMinutes ?? 60}
        quarterStartedAt={match.quarterStartedAt}
        pausedAt={match.pausedAt}
        accumulatedPauseTime={match.accumulatedPauseTime}
        frozenClockMs={match.frozenClockMs}
        publicCode={match.publicCode}
        scheduledAt={match.scheduledAt}
        venueField={match.venueField}
        homeLogoUrl={homeLogoUrl}
        awayLogoUrl={awayLogoUrl}
      />

      <div
        className={`${
          isPc && activeTab === "wisselplan" ? "max-w-7xl" : "max-w-2xl"
        } mx-auto p-4 space-y-4`}
      >
        {match.refereeId ? (
          <OfficialDutyNotice refereeName={match.refereeName} />
        ) : null}

        <MatchControls
          matchId={match._id}
          status={match.status}
          currentQuarter={match.currentQuarter}
          quarterCount={match.quarterCount}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          pausedAt={match.pausedAt}
          activeStoppageStartedAt={match.activeStoppageStartedAt}
          stoppageAdvisoryMs={match.stoppageAdvisoryMs}
          useBreakClock={match.useBreakClock}
          breakClockAutoStart={match.breakClockAutoStart}
          scheduledBreakEndAt={match.scheduledBreakEndAt}
          canControlClock={canControlClock}
          canAddGoals={canControlClock}
          canDoSubstitutions={canDoSubstitutions}
          onGoalClick={() => setShowGoalModal(true)}
          onSubClick={() => setShowSubModal(true)}
          onCardClick={
            isLive && canControlClock ? () => setShowCardModal(true) : undefined
          }
        />

        {isLive ? (
          <StagedSubstitutionsPanel
            matchId={match._id}
            stagedSubstitutions={match.stagedSubstitutions ?? []}
          />
        ) : null}

        {isLive ? (
          <TimePenaltyPanel
            events={match.events}
            status={match.status}
            pausedAt={match.pausedAt}
            activeStoppageStartedAt={match.activeStoppageStartedAt}
            halftimeStartedAt={match.halftimeStartedAt}
          />
        ) : null}

        <RefereeAssignment
          matchId={match._id}
          currentRefereeId={match.refereeId}
          currentRefereeName={match.refereeName}
        />

        {isPregame && <MatchSettingsEdit match={match} />}

        <MatchLeadBadge
          matchId={match._id}
          hasLead={match.hasLead ?? false}
          leadCoachName={match.leadCoachName ?? null}
        />

        <div className="bg-white rounded-xl shadow-md p-1 flex gap-1">
          <TabButton
            active={activeTab === "opstelling"}
            onClick={() => setActiveTab("opstelling")}
            icon="👥"
            label="Opstelling"
          />
          <TabButton
            active={activeTab === "speeltijd"}
            onClick={() => setActiveTab("speeltijd")}
            icon="⏱️"
            label="Speeltijd"
            badge={isLive}
          />
          <TabButton
            active={activeTab === "wisselplan"}
            onClick={() => setActiveTab("wisselplan")}
            icon="🔁"
            label="Wisselplan"
          />
          <TabButton
            active={activeTab === "seizoen"}
            onClick={() => setActiveTab("seizoen")}
            icon="📊"
            label="Seizoen"
          />
        </div>

        {activeTab === "opstelling" && (
          <>
            <LineupToggle
              matchId={match._id}
              showLineup={match.showLineup}
            />

            <FormationSelector
              matchId={match._id}
              teamId={match.teamId}
              formationId={match.formationId}
              customFormationTemplateId={match.customFormationTemplate?._id}
              lineupView={lineupView}
              onLineupViewChange={setLineupView}
              canEdit={canEditLineup}
            />
            <CardMinutesToggle
              enabled={showCardMinutes}
              onChange={setShowCardMinutes}
            />

            {lineupView === "veld" ? (
              <PitchView
                matchId={match._id}
                players={match.players}
                formationId={match.formationId}
                resolvedFormation={resolvedFormation}
                customFormationKind={match.customFormationTemplate?.kind}
                status={match.status}
                canEdit={canEditLineup}
                seasonMinutesByPlayerId={cardMinutes}
                events={match.events}
              />
            ) : (
              <PlayerList
                matchId={match._id}
                playersOnField={playersOnField}
                playersOnBench={playersOnBench}
                playersAbsent={playersAbsent}
                playersInjured={playersInjured}
                canEdit={canEditLineup}
                canToggleAvailability={isPregame || isLive}
                availabilityActions={
                  isPregame ? ["absent", "injured"] : ["injured"]
                }
                seasonMinutesByPlayerId={cardMinutes}
                events={match.events}
              />
            )}
            <EventTimeline
              events={match.events}
              teamName={match.teamName}
              opponentName={match.opponent}
            />
            <GoalEnrichmentPanel
              matchId={match._id}
              events={match.events}
              players={match.players}
              teamName={match.teamName}
              opponentName={match.opponent}
            />
          </>
        )}

        {activeTab === "wisselplan" && (
          <CoachWisselplanTab
            match={match}
            resolvedFormation={resolvedFormation}
            surface={surface}
            canEditPlan={isPregame || isLead}
            canExecute={isLive && isLead}
          />
        )}

        {activeTab === "seizoen" && (
          <TeamSeasonMinutesPanel teamId={match.teamId} />
        )}

        {activeTab === "speeltijd" && (
          <>
            {isLive && canDoSubstitutions && (
              <SubstitutionSuggestions matchId={match._id} />
            )}
            <PlayingTimePanel matchId={match._id} />
            <EventTimeline
              events={match.events}
              teamName={match.teamName}
              opponentName={match.opponent}
            />
            <GoalEnrichmentPanel
              matchId={match._id}
              events={match.events}
              players={match.players}
              teamName={match.teamName}
              opponentName={match.opponent}
            />
          </>
        )}

        {!isPregame && isLead ? (
          <LateRosterPanel matchId={match._id} />
        ) : null}
      </div>

      {showGoalModal && (
        <GoalModal
          matchId={match._id}
          playersOnField={playersOnField}
          onClose={() => setShowGoalModal(false)}
        />
      )}

      {showSubModal && (
        <SubstitutionPanel
          matchId={match._id}
          playersOnField={playersOnField}
          playersOnBench={playersOnBench}
          canEdit={canDoSubstitutions}
          onClose={() => setShowSubModal(false)}
        />
      )}

      {showCardModal ? (
        <CardModal
          matchId={match._id}
          players={match.players}
          teamName={match.teamName}
          opponentName={match.opponent}
          onClose={() => setShowCardModal(false)}
        />
      ) : null}
    </main>
  );
}
