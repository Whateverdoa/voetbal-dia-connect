"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import {
  ScoreDisplay,
  MatchControls,
  GoalModal,
  SubstitutionPanel,
  PlayerList,
  EventTimeline,
  LineupToggle,
  PlayingTimePanel,
  SubstitutionSuggestions,
  MatchLoadingScreen,
  MatchErrorScreen,
  VoiceAssistant,
} from "@/components/match";
import type { Match, MatchPlayer, MatchEvent } from "@/components/match";

export default function CoachMatchPage() {
  return (
    <Suspense fallback={<MatchLoadingScreen />}>
      <CoachMatchContent />
    </Suspense>
  );
}

function CoachMatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.id as Id<"matches">;
  const pin = searchParams.get("pin") || "";

  // Track connection state for visibility change handling
  const [isReconnecting, setIsReconnecting] = useState(false);
  const lastDataRef = useRef<typeof match>(undefined);

  const match = useQuery(api.matches.getForCoach, { matchId, pin });

  // Handle visibility change (mobile tab sleep/wake)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab became visible - check if we need to show reconnecting state
        if (lastDataRef.current !== undefined && match === undefined) {
          setIsReconnecting(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [match]);

  // Update refs and clear reconnecting state when data arrives
  useEffect(() => {
    if (match !== undefined) {
      lastDataRef.current = match;
      setIsReconnecting(false);
    }
  }, [match]);

  if (match === undefined) {
    return <MatchLoadingScreen isReconnecting={isReconnecting} />;
  }

  if (match === null) {
    return (
      <MatchErrorScreen
        message="Wedstrijd niet gevonden of ongeldige PIN"
        backHref={`/coach?pin=${pin}`}
      />
    );
  }

  // Type the match data properly
  const typedMatch: Match = {
    ...match,
    players: match.players as MatchPlayer[],
    events: match.events as MatchEvent[],
  };

  return <MatchControlPanel match={typedMatch} pin={pin} />;
}

type ViewTab = "opstelling" | "speeltijd";

function MatchControlPanel({ match, pin }: { match: Match; pin: string }) {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("opstelling");
  const [isConnected, setIsConnected] = useState(true);
  const lastUpdateRef = useRef(Date.now());

  // Track connection state based on data freshness
  useEffect(() => {
    lastUpdateRef.current = Date.now();
    setIsConnected(true);
  }, [match]);

  // Check for stale data periodically during live matches
  useEffect(() => {
    if (match.status !== "live") return;

    const checkConnection = () => {
      const timeSinceUpdate = Date.now() - lastUpdateRef.current;
      // If no updates for 30 seconds during live match, show warning
      if (timeSinceUpdate > 30000) {
        setIsConnected(false);
      }
    };

    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [match.status]);

  const playersOnField = match.players.filter((p) => p.onField);
  const playersOnBench = match.players.filter((p) => !p.onField);

  const isLive = match.status === "live" || match.status === "halftime";

  return (
    <main className="min-h-screen bg-gray-100 pb-8">
      {/* Back navigation - sticky */}
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

      {/* Score display - always visible at top */}
      <ScoreDisplay
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        teamName={match.teamName}
        opponent={match.opponent}
        isHome={match.isHome}
        status={match.status}
        currentQuarter={match.currentQuarter}
        quarterCount={match.quarterCount}
        publicCode={match.publicCode}
      />

      {/* Main content */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Match controls - most important, at top */}
        <MatchControls
          matchId={match._id}
          pin={pin}
          status={match.status}
          currentQuarter={match.currentQuarter}
          quarterCount={match.quarterCount}
          onGoalClick={() => setShowGoalModal(true)}
          onSubClick={() => setShowSubModal(true)}
        />

        {/* Voice assistant - available during live matches */}
        {isLive && (
          <VoiceAssistant matchId={match._id} pin={pin} />
        )}

        {/* Tab navigation */}
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

        {/* Tab content */}
        {activeTab === "opstelling" && (
          <>
            {/* Lineup visibility toggle */}
            <LineupToggle
              matchId={match._id}
              pin={pin}
              showLineup={match.showLineup}
            />

            {/* Player lists */}
            <PlayerList
              matchId={match._id}
              pin={pin}
              playersOnField={playersOnField}
              playersOnBench={playersOnBench}
            />

            {/* Event timeline */}
            <EventTimeline events={match.events} />
          </>
        )}

        {activeTab === "speeltijd" && (
          <>
            {/* Substitution suggestions - prominent during live match */}
            {isLive && (
              <SubstitutionSuggestions matchId={match._id} pin={pin} />
            )}

            {/* Playing time panel */}
            <PlayingTimePanel matchId={match._id} pin={pin} />

            {/* Event timeline */}
            <EventTimeline events={match.events} />
          </>
        )}
      </div>

      {/* Modals */}
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
          onClose={() => setShowSubModal(false)}
        />
      )}
    </main>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  badge?: boolean;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex-1 py-3 px-4 rounded-lg font-semibold transition-all",
        "min-h-[48px] active:scale-[0.98] flex items-center justify-center gap-2",
        active
          ? "bg-dia-green text-white shadow-md"
          : "bg-transparent text-gray-600 hover:bg-gray-100"
      )}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
      {badge && (
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      )}
    </button>
  );
}
