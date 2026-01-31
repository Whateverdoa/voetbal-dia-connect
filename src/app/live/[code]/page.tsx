"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function LiveMatchPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const match = useQuery(api.matches.getByPublicCode, { code });

  if (match === undefined) {
    return <LoadingScreen />;
  }

  if (match === null) {
    return <NotFoundScreen code={code} />;
  }

  return <LiveMatch match={match} code={code} />;
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-dia-green to-green-800">
      <div className="text-center text-white">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4">Wedstrijd laden...</p>
      </div>
    </main>
  );
}

function NotFoundScreen({ code }: { code: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-2">Wedstrijd niet gevonden</h1>
        <p className="text-gray-500 mb-6">
          Code <span className="font-mono font-bold">{code}</span> bestaat niet
          of is verlopen.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-dia-green text-white rounded-lg font-medium"
        >
          Andere code invoeren
        </Link>
      </div>
    </main>
  );
}

function LiveMatch({ match, code }: { match: any; code: string }) {
  const isLive = match.status === "live";
  const isHalftime = match.status === "halftime";
  const isFinished = match.status === "finished";
  const isScheduled = match.status === "scheduled" || match.status === "lineup";

  // Filter relevant events for public view
  const publicEvents = match.events.filter(
    (e: any) =>
      e.type === "goal" ||
      e.type === "quarter_start" ||
      e.type === "quarter_end"
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Scoreboard header */}
      <header
        className={`p-6 text-white ${
          isLive
            ? "bg-gradient-to-b from-red-600 to-red-700"
            : isFinished
            ? "bg-gradient-to-b from-gray-600 to-gray-700"
            : "bg-gradient-to-b from-dia-green to-green-700"
        }`}
      >
        <div className="max-w-lg mx-auto">
          {/* Status indicator */}
          <div className="flex justify-center mb-4">
            {isLive && (
              <span className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE - Kwart {match.currentQuarter}
              </span>
            )}
            {isHalftime && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                RUST
              </span>
            )}
            {isFinished && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                AFGELOPEN
              </span>
            )}
            {isScheduled && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                NOG NIET BEGONNEN
              </span>
            )}
          </div>

          {/* Teams and score */}
          <div className="flex items-center justify-between">
            {/* Home team */}
            <div className="text-center flex-1">
              <p className="text-lg font-bold">
                {match.isHome ? match.teamName : match.opponent}
              </p>
              <p className="text-sm opacity-75">Thuis</p>
            </div>

            {/* Score */}
            <div className="px-6">
              <div className="text-5xl md:text-6xl font-bold tracking-tight">
                <span>{match.homeScore}</span>
                <span className="mx-2 opacity-50">-</span>
                <span>{match.awayScore}</span>
              </div>
            </div>

            {/* Away team */}
            <div className="text-center flex-1">
              <p className="text-lg font-bold">
                {match.isHome ? match.opponent : match.teamName}
              </p>
              <p className="text-sm opacity-75">Uit</p>
            </div>
          </div>

          {/* Club name */}
          <p className="text-center text-sm opacity-75 mt-4">{match.clubName}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Lineup (if enabled) */}
        {match.showLineup && match.lineup && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <span>👕</span> Opstelling {match.teamName}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* On field */}
              <div>
                <p className="text-xs text-gray-500 uppercase mb-2">Op veld</p>
                <div className="space-y-1">
                  {match.lineup
                    .filter((p: any) => p.onField)
                    .map((p: any) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2 text-sm p-1.5 rounded ${
                          p.isKeeper ? "bg-yellow-50" : "bg-green-50"
                        }`}
                      >
                        {p.number && (
                          <span className="w-5 h-5 bg-white rounded text-xs flex items-center justify-center">
                            {p.number}
                          </span>
                        )}
                        <span>{p.name}</span>
                        {p.isKeeper && <span className="text-xs">🧤</span>}
                      </div>
                    ))}
                </div>
              </div>

              {/* Bench */}
              <div>
                <p className="text-xs text-gray-500 uppercase mb-2">Bank</p>
                <div className="space-y-1">
                  {match.lineup
                    .filter((p: any) => !p.onField)
                    .map((p: any) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 text-sm p-1.5 rounded bg-gray-50"
                      >
                        {p.number && (
                          <span className="w-5 h-5 bg-white rounded text-xs flex items-center justify-center">
                            {p.number}
                          </span>
                        )}
                        <span className="text-gray-600">{p.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Goals scorers */}
        {publicEvents.filter((e: any) => e.type === "goal" && !e.isOpponentGoal).length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <span>⚽</span> Doelpunten {match.teamName}
            </h2>
            <div className="space-y-2">
              {publicEvents
                .filter((e: any) => e.type === "goal" && !e.isOpponentGoal)
                .map((event: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚽</span>
                      <div>
                        <p className="font-medium">
                          {event.playerName || "Goal"}
                          {event.isOwnGoal && " (eigen goal)"}
                        </p>
                        {event.relatedPlayerName && (
                          <p className="text-sm text-gray-500">
                            Assist: {event.relatedPlayerName}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-400">
                      Q{event.quarter}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Timeline */}
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <span>📋</span> Wedstrijdverloop
          </h2>

          {publicEvents.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              {isScheduled
                ? "Wedstrijd is nog niet begonnen"
                : "Nog geen events"}
            </p>
          ) : (
            <div className="space-y-0">
              {[...publicEvents].reverse().map((event: any, i: number) => (
                <TimelineEvent key={i} event={event} teamName={match.teamName} />
              ))}
            </div>
          )}
        </section>

        {/* Match code */}
        <div className="text-center text-sm text-gray-400 py-4">
          <p>
            Wedstrijd code: <span className="font-mono">{code}</span>
          </p>
          <Link href="/" className="text-dia-green hover:underline">
            Andere wedstrijd volgen
          </Link>
        </div>
      </div>
    </main>
  );
}

function TimelineEvent({ event, teamName }: { event: any; teamName: string }) {
  const time = new Date(event.timestamp).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let icon = "•";
  let text = "";
  let highlight = false;

  switch (event.type) {
    case "goal":
      icon = "⚽";
      if (event.isOpponentGoal) {
        text = "Tegendoelpunt";
      } else if (event.isOwnGoal) {
        text = `Eigen goal ${event.playerName || ""}`;
      } else {
        text = event.playerName ? `Goal ${event.playerName}` : `Goal ${teamName}`;
        highlight = true;
      }
      break;
    case "quarter_start":
      icon = "▶️";
      text = event.quarter === 1 ? "Wedstrijd gestart" : `Kwart ${event.quarter} gestart`;
      break;
    case "quarter_end":
      icon = "⏸️";
      text = `Einde kwart ${event.quarter}`;
      break;
    default:
      text = event.type;
  }

  return (
    <div
      className={`timeline-event ${highlight ? "bg-green-50 -mx-2 px-2 rounded" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 w-12">{time}</span>
        <span className="text-lg">{icon}</span>
        <span className={highlight ? "font-medium" : ""}>{text}</span>
      </div>
    </div>
  );
}
