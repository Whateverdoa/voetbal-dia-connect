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
  MatchSettingsEdit,
  RefereeAssignment,
  StagedSubstitutionsPanel,
  GoalEnrichmentPanel,
} from "@/components/match";
import type { Match } from "@/components/match";
import { TabButton } from "@/components/match/TabButton";
import { FormationSelector } from "@/components/match/FormationSelector";

type ViewTab = "opstelling" | "speeltijd";
type LineupView = "veld" | "lijst";

interface MatchControlPanelProps {
  match: Match;
}

export function MatchControlPanel({ match }: MatchControlPanelProps) {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("opstelling");
  const [lineupView, setLineupView] = useState<LineupView>("lijst");
  const [isConnected, setIsConnected] = useState(true);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    lastUpdateRef.current = Date.now();
    setIsConnected(true);
  }, [match]);

  useEffect(() => {
    if (match.status !== "live") return;

    const checkConnection = () => {
      const timeSinceUpdate = Date.now() - lastUpdateRef.current;
      if (timeSinceUpdate > 30000) {
        setIsConnected(false);
      }
    };

    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [match.status]);

  const playersOnField = match.players.filter((p) => p.onField);
  const playersOnBench = match.players.filter(
    (p) => !p.onField && !(p.absent ?? false)
  );
  const playersAbsent = match.players.filter(
    (p) => !p.onField && (p.absent ?? false)
  );

  const isLive = match.status === "live" || match.status === "halftime";
  const isPregame = match.status === "scheduled" || match.status === "lineup";
  const capabilities = match.capabilities ?? {
    canControlClock: true,
    canDoSubstitutions: match.status !== "finished",
    canManageLineup: match.status !== "finished",
    canManagePregameSettings: isPregame,
    canAssignReferee: isPregame,
    canEnrichGoals: true,
    canAddGoals: true,
  };
  const canEditLineup = capabilities.canManageLineup;
  const canDoSubstitutions = capabilities.canDoSubstitutions;
  const canControlClock = capabilities.canControlClock;
  const canManagePregameSettings = capabilities.canManagePregameSettings;
  const canAssignReferee = capabilities.canAssignReferee;
  const canEnrichGoals = capabilities.canEnrichGoals;
  const canAddGoals = capabilities.canAddGoals;

  return (
    <main className="min-h-dvh bg-gray-100 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <nav className="bg-dia-green-dark text-white px-4 py-2 sticky top-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
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
              Toeschouwerweergave
            </Link>
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
        quarterStartedAt={match.quarterStartedAt}
        pausedAt={match.pausedAt}
        accumulatedPauseTime={match.accumulatedPauseTime}
        publicCode={match.publicCode}
      />

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <MatchControls
          matchId={match._id}
          status={match.status}
          currentQuarter={match.currentQuarter}
          quarterCount={match.quarterCount}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          pausedAt={match.pausedAt}
          canControlClock={canControlClock}
          canDoSubstitutions={canDoSubstitutions}
          canAddGoals={canAddGoals}
          onGoalClick={() => setShowGoalModal(true)}
          onSubClick={() => setShowSubModal(true)}
        />

        {canDoSubstitutions && (
          <StagedSubstitutionsPanel
            matchId={match._id}
            stagedSubstitutions={match.stagedSubstitutions ?? []}
          />
        )}

        {canAssignReferee && (
          <RefereeAssignment
            matchId={match._id}
            currentRefereeId={match.refereeId}
            currentRefereeName={match.refereeName}
          />
        )}

        {canManagePregameSettings && <MatchSettingsEdit match={match} />}

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
        </div>

        {activeTab === "opstelling" && (
          <>
            <LineupToggle
              matchId={match._id}
              showLineup={match.showLineup}
            />

            <FormationSelector
              matchId={match._id}
              formationId={match.formationId}
              lineupView={lineupView}
              onLineupViewChange={setLineupView}
              canEdit={canEditLineup}
            />

            {lineupView === "veld" ? (
              <PitchView
                matchId={match._id}
                players={match.players}
                formationId={match.formationId}
                status={match.status}
                canEdit={canEditLineup}
              />
            ) : (
              <PlayerList
                matchId={match._id}
                playersOnField={playersOnField}
                playersOnBench={playersOnBench}
                playersAbsent={playersAbsent}
                canEdit={canEditLineup}
                canToggleAbsent={isPregame}
              />
            )}

            <EventTimeline
              events={match.events}
              teamName={match.teamName}
              opponentName={match.opponent}
            />
            {canEnrichGoals && (
              <GoalEnrichmentPanel
                matchId={match._id}
                events={match.events}
                players={match.players}
                teamName={match.teamName}
                opponentName={match.opponent}
              />
            )}
          </>
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
            {canEnrichGoals && (
              <GoalEnrichmentPanel
                matchId={match._id}
                events={match.events}
                players={match.players}
                teamName={match.teamName}
                opponentName={match.opponent}
              />
            )}
          </>
        )}
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
    </main>
  );
}
