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
  RefereeAssignment,
} from "@/components/match";
import type { Match } from "@/components/match";
import { TabButton } from "@/components/match/TabButton";
import { FormationSelector } from "@/components/match/FormationSelector";

type ViewTab = "opstelling" | "speeltijd";
type LineupView = "veld" | "lijst";

interface MatchControlPanelProps {
  match: Match;
  pin: string;
}

export function MatchControlPanel({ match, pin }: MatchControlPanelProps) {
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
  const canEditLineup = isPregame || (match.isCurrentCoachLead ?? false);
  const canDoSubstitutions = match.isCurrentCoachLead ?? false;
  const canControlClock = match.canControlClock ?? true;

  return (
    <main className="min-h-screen bg-gray-100 pb-8">
      <nav className="bg-dia-green-dark text-white px-4 py-2 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href={`/coach?pin=${pin}`}
            className="text-sm opacity-80 hover:opacity-100 flex items-center gap-1 min-h-[44px] px-2 -ml-2"
          >
            ← Terug
          </Link>
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
          pin={pin}
          status={match.status}
          currentQuarter={match.currentQuarter}
          quarterCount={match.quarterCount}
          homeScore={match.homeScore}
          awayScore={match.awayScore}
          pausedAt={match.pausedAt}
          canControlClock={canControlClock}
          canDoSubstitutions={canDoSubstitutions}
          onGoalClick={() => setShowGoalModal(true)}
          onSubClick={() => setShowSubModal(true)}
        />

        <RefereeAssignment
          matchId={match._id}
          pin={pin}
          currentRefereeId={match.refereeId}
          currentRefereeName={match.refereeName}
        />

        {isPregame && <MatchSettingsEdit match={match} pin={pin} />}

        <MatchLeadBadge
          matchId={match._id}
          pin={pin}
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
        </div>

        {activeTab === "opstelling" && (
          <>
            <LineupToggle
              matchId={match._id}
              pin={pin}
              showLineup={match.showLineup}
            />

            <FormationSelector
              matchId={match._id}
              pin={pin}
              formationId={match.formationId}
              lineupView={lineupView}
              onLineupViewChange={setLineupView}
              canEdit={canEditLineup}
            />

            {lineupView === "veld" ? (
              <PitchView
                matchId={match._id}
                pin={pin}
                players={match.players}
                formationId={match.formationId}
                canEdit={canEditLineup}
              />
            ) : (
              <PlayerList
                matchId={match._id}
                pin={pin}
                playersOnField={playersOnField}
                playersOnBench={playersOnBench}
                playersAbsent={playersAbsent}
                canEdit={canEditLineup}
                canToggleAbsent={isPregame}
              />
            )}

            <EventTimeline events={match.events} />
          </>
        )}

        {activeTab === "speeltijd" && (
          <>
            {isLive && canDoSubstitutions && (
              <SubstitutionSuggestions matchId={match._id} pin={pin} />
            )}
            <PlayingTimePanel matchId={match._id} pin={pin} />
            <EventTimeline events={match.events} />
          </>
        )}
      </div>

      {showGoalModal && (
        <GoalModal
          matchId={match._id}
          pin={pin}
          playersOnField={playersOnField}
          onClose={() => setShowGoalModal(false)}
        />
      )}

      {showSubModal && (
        <SubstitutionPanel
          matchId={match._id}
          pin={pin}
          playersOnField={playersOnField}
          playersOnBench={playersOnBench}
          canEdit={canDoSubstitutions}
          onClose={() => setShowSubModal(false)}
        />
      )}
    </main>
  );
}
