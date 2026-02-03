"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, Suspense } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function CoachMatchPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CoachMatchContent />
    </Suspense>
  );
}

function CoachMatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.id as Id<"matches">;
  const pin = searchParams.get("pin") || "";

  const match = useQuery(api.matches.getForCoach, { matchId, pin });

  if (match === undefined) {
    return <LoadingScreen />;
  }

  if (match === null) {
    return <ErrorScreen message="Wedstrijd niet gevonden of ongeldige PIN" />;
  }

  return <MatchControl match={match} pin={pin} />;
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-dia-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Laden...</p>
      </div>
    </main>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-red-500 mb-4">{message}</p>
        <Link href="/coach" className="text-dia-green hover:underline">
          ← Terug naar dashboard
        </Link>
      </div>
    </main>
  );
}

function MatchControl({ match, pin }: { match: any; pin: string }) {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  const startMatch = useMutation(api.matchActions.start);
  const nextQuarter = useMutation(api.matchActions.nextQuarter);
  const resumeHalftime = useMutation(api.matchActions.resumeFromHalftime);
  const toggleLineup = useMutation(api.matchActions.toggleShowLineup);
  const toggleOnField = useMutation(api.matchActions.togglePlayerOnField);
  const toggleKeeper = useMutation(api.matchActions.toggleKeeper);

  const isLive = match.status === "live";
  const isHalftime = match.status === "halftime";
  const isFinished = match.status === "finished";
  const isScheduled = match.status === "scheduled" || match.status === "lineup";

  const playersOnField = match.players.filter((p: any) => p.onField);
  const playersOnBench = match.players.filter((p: any) => !p.onField);

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="bg-dia-green text-white p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <Link href={`/coach?pin=${pin}`} className="text-sm opacity-75 hover:opacity-100">
              ← Terug
            </Link>
            <span className="text-sm font-mono bg-white/20 px-2 py-1 rounded">
              {match.publicCode}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-75">{match.teamName}</p>
              <p className="text-xl font-bold">
                {match.isHome ? "vs" : "@"} {match.opponent}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">
                {match.homeScore} - {match.awayScore}
              </p>
              {isLive && (
                <p className="text-sm">Kwart {match.currentQuarter}</p>
              )}
              {isHalftime && <p className="text-sm">Rust</p>}
              {isFinished && <p className="text-sm">Afgelopen</p>}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Match controls */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Wedstrijd besturing</h2>
          
          {isScheduled && (
            <button
              onClick={() => startMatch({ matchId: match._id, pin })}
              className="w-full py-3 bg-dia-green text-white font-semibold rounded-lg hover:bg-green-700"
            >
              Start wedstrijd
            </button>
          )}

          {isLive && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowGoalModal(true)}
                className="py-3 bg-dia-green text-white font-semibold rounded-lg hover:bg-green-700"
              >
                ⚽ Goal
              </button>
              <button
                onClick={() => setShowSubModal(true)}
                className="py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                🔄 Wissel
              </button>
              <button
                onClick={() => nextQuarter({ matchId: match._id, pin })}
                className="col-span-2 py-3 border-2 border-gray-300 font-semibold rounded-lg hover:bg-gray-50"
              >
                {match.currentQuarter >= match.quarterCount
                  ? "Einde wedstrijd"
                  : `Einde kwart ${match.currentQuarter}`}
              </button>
            </div>
          )}

          {isHalftime && (
            <button
              onClick={() => resumeHalftime({ matchId: match._id, pin })}
              className="w-full py-3 bg-dia-green text-white font-semibold rounded-lg hover:bg-green-700"
            >
              Start 2e helft
            </button>
          )}

          {isFinished && (
            <p className="text-center text-gray-500">Wedstrijd is afgelopen</p>
          )}
        </section>

        {/* Lineup toggle */}
        <section className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Opstelling zichtbaar</h2>
              <p className="text-sm text-gray-500">Voor publiek op live pagina</p>
            </div>
            <button
              onClick={() => toggleLineup({ matchId: match._id, pin })}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                match.showLineup ? "bg-dia-green" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  match.showLineup ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </section>

        {/* Players on field */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">
            Op het veld ({playersOnField.length})
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {playersOnField.map((player: any) => (
              <PlayerCard
                key={player.playerId}
                player={player}
                onToggleField={() =>
                  toggleOnField({ matchId: match._id, pin, playerId: player.playerId })
                }
                onToggleKeeper={() =>
                  toggleKeeper({ matchId: match._id, pin, playerId: player.playerId })
                }
              />
            ))}
          </div>
        </section>

        {/* Bench */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Bank ({playersOnBench.length})</h2>
          <div className="grid grid-cols-2 gap-2">
            {playersOnBench.map((player: any) => (
              <PlayerCard
                key={player.playerId}
                player={player}
                onToggleField={() =>
                  toggleOnField({ matchId: match._id, pin, playerId: player.playerId })
                }
                onToggleKeeper={() =>
                  toggleKeeper({ matchId: match._id, pin, playerId: player.playerId })
                }
                isBench
              />
            ))}
          </div>
        </section>

        {/* Events timeline */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Events</h2>
          {match.events.length === 0 ? (
            <p className="text-gray-500 text-sm">Nog geen events</p>
          ) : (
            <div className="space-y-2">
              {[...match.events].reverse().map((event: any) => (
                <EventItem key={event._id} event={event} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Goal Modal */}
      {showGoalModal && (
        <GoalModal
          match={match}
          pin={pin}
          onClose={() => setShowGoalModal(false)}
        />
      )}

      {/* Sub Modal */}
      {showSubModal && (
        <SubModal
          match={match}
          pin={pin}
          onClose={() => setShowSubModal(false)}
        />
      )}
    </main>
  );
}

function PlayerCard({
  player,
  onToggleField,
  onToggleKeeper,
  isBench,
}: {
  player: any;
  onToggleField: () => void;
  onToggleKeeper: () => void;
  isBench?: boolean;
}) {
  return (
    <div
      className={`player-card ${player.onField ? "on-field" : ""} ${
        player.isKeeper ? "is-keeper" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {player.number && (
            <span className="w-6 h-6 bg-gray-200 rounded text-xs flex items-center justify-center font-medium">
              {player.number}
            </span>
          )}
          <span className="font-medium text-sm">{player.name}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onToggleKeeper}
            className={`w-7 h-7 rounded text-xs ${
              player.isKeeper
                ? "bg-yellow-400 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
            title="Keeper"
          >
            🧤
          </button>
          <button
            onClick={onToggleField}
            className={`w-7 h-7 rounded text-xs ${
              isBench
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
            title={isBench ? "Naar veld" : "Naar bank"}
          >
            {isBench ? "↑" : "↓"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventItem({ event }: { event: any }) {
  const time = new Date(event.timestamp).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const icons: Record<string, string> = {
    goal: "⚽",
    assist: "👟",
    sub_in: "🟢",
    sub_out: "🔴",
    quarter_start: "▶️",
    quarter_end: "⏸️",
    yellow_card: "🟨",
    red_card: "🟥",
  };

  let text = "";
  switch (event.type) {
    case "goal":
      text = event.isOpponentGoal
        ? "Tegendoelpunt"
        : event.isOwnGoal
        ? `Eigen goal ${event.playerName || ""}`
        : `Goal ${event.playerName || ""}`;
      break;
    case "assist":
      text = `Assist ${event.playerName || ""}`;
      break;
    case "sub_in":
      text = `${event.playerName} erin`;
      break;
    case "sub_out":
      text = `${event.playerName} eruit`;
      break;
    case "quarter_start":
      text = `Kwart ${event.quarter} gestart`;
      break;
    case "quarter_end":
      text = `Kwart ${event.quarter} afgelopen`;
      break;
    default:
      text = event.type;
  }

  return (
    <div className="flex items-center gap-3 text-sm py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-400 w-12">{time}</span>
      <span>{icons[event.type] || "•"}</span>
      <span className="flex-1">{text}</span>
      <span className="text-gray-400">Q{event.quarter}</span>
    </div>
  );
}

function GoalModal({
  match,
  pin,
  onClose,
}: {
  match: any;
  pin: string;
  onClose: () => void;
}) {
  const [scorer, setScorer] = useState<string | null>(null);
  const [assist, setAssist] = useState<string | null>(null);
  const [isOpponent, setIsOpponent] = useState(false);

  const addGoal = useMutation(api.matchActions.addGoal);

  const handleSubmit = async () => {
    await addGoal({
      matchId: match._id,
      pin,
      playerId: scorer ? (scorer as any) : undefined,
      assistPlayerId: assist ? (assist as any) : undefined,
      isOpponentGoal: isOpponent,
    });
    onClose();
  };

  const playersOnField = match.players.filter((p: any) => p.onField);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Goal registreren</h2>

        {/* Opponent goal toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg mb-4">
          <span>Tegendoelpunt</span>
          <button
            onClick={() => setIsOpponent(!isOpponent)}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
              isOpponent ? "bg-red-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isOpponent ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {!isOpponent && (
          <>
            {/* Scorer */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Scorer</label>
              <div className="grid grid-cols-2 gap-2">
                {playersOnField.map((p: any) => (
                  <button
                    key={p.playerId}
                    onClick={() => setScorer(p.playerId)}
                    className={`p-2 rounded border text-sm ${
                      scorer === p.playerId
                        ? "border-dia-green bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    {p.number && `#${p.number} `}
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Assist */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Assist (optioneel)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAssist(null)}
                  className={`p-2 rounded border text-sm ${
                    assist === null
                      ? "border-dia-green bg-green-50"
                      : "border-gray-200"
                  }`}
                >
                  Geen assist
                </button>
                {playersOnField
                  .filter((p: any) => p.playerId !== scorer)
                  .map((p: any) => (
                    <button
                      key={p.playerId}
                      onClick={() => setAssist(p.playerId)}
                      className={`p-2 rounded border text-sm ${
                        assist === p.playerId
                          ? "border-dia-green bg-green-50"
                          : "border-gray-200"
                      }`}
                    >
                      {p.number && `#${p.number} `}
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-lg font-medium"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isOpponent && !scorer}
            className="flex-1 py-3 bg-dia-green text-white rounded-lg font-medium disabled:bg-gray-300"
          >
            Registreren
          </button>
        </div>
      </div>
    </div>
  );
}

function SubModal({
  match,
  pin,
  onClose,
}: {
  match: any;
  pin: string;
  onClose: () => void;
}) {
  const [playerOut, setPlayerOut] = useState<string | null>(null);
  const [playerIn, setPlayerIn] = useState<string | null>(null);

  const substitute = useMutation(api.matchActions.substitute);

  const handleSubmit = async () => {
    if (playerOut && playerIn) {
      await substitute({
        matchId: match._id,
        pin,
        playerOutId: playerOut as any,
        playerInId: playerIn as any,
      });
      onClose();
    }
  };

  const playersOnField = match.players.filter((p: any) => p.onField);
  const playersOnBench = match.players.filter((p: any) => !p.onField);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Wissel</h2>

        {/* Player out */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Eruit</label>
          <div className="grid grid-cols-2 gap-2">
            {playersOnField.map((p: any) => (
              <button
                key={p.playerId}
                onClick={() => setPlayerOut(p.playerId)}
                className={`p-2 rounded border text-sm ${
                  playerOut === p.playerId
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200"
                }`}
              >
                {p.number && `#${p.number} `}
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Player in */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Erin</label>
          <div className="grid grid-cols-2 gap-2">
            {playersOnBench.map((p: any) => (
              <button
                key={p.playerId}
                onClick={() => setPlayerIn(p.playerId)}
                className={`p-2 rounded border text-sm ${
                  playerIn === p.playerId
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                {p.number && `#${p.number} `}
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-lg font-medium"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={!playerOut || !playerIn}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium disabled:bg-gray-300"
          >
            Wisselen
          </button>
        </div>
      </div>
    </div>
  );
}
