"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export default function CoachLoginPage() {
  const [pin, setPin] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const coachData = useQuery(
    api.matches.verifyCoachPin,
    submitted && pin.length >= 4 ? { pin } : "skip"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      setSubmitted(true);
    }
  };

  // Show dashboard if PIN is valid
  if (submitted && coachData) {
    return <CoachDashboard data={coachData} pin={pin} />;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="text-4xl font-bold text-dia-green">
            DIA Live
          </Link>
          <p className="mt-2 text-gray-600">Coach login</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              PIN code
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setSubmitted(false);
              }}
              placeholder="••••"
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border-2 border-gray-300 rounded-lg focus:border-dia-green focus:outline-none"
              maxLength={6}
              autoComplete="off"
            />
          </div>

          {submitted && coachData === null && (
            <p className="text-red-500 text-sm text-center">
              Ongeldige PIN code
            </p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full py-3 px-4 bg-dia-green text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Inloggen
          </button>
        </form>

        <Link
          href="/"
          className="block text-center text-sm text-gray-500 hover:text-dia-green"
        >
          ← Terug naar home
        </Link>
      </div>
    </main>
  );
}

function CoachDashboard({
  data,
  pin,
}: {
  data: {
    coach: { id: string; name: string };
    teams: { id: string; name: string }[];
    matches: any[];
  };
  pin: string;
}) {
  const liveMatches = data.matches.filter(
    (m) => m.status === "live" || m.status === "halftime" || m.status === "lineup"
  );
  const scheduledMatches = data.matches.filter((m) => m.status === "scheduled");
  const finishedMatches = data.matches.filter((m) => m.status === "finished");

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dia-green">Welkom, {data.coach.name}</h1>
          <p className="text-gray-600">
            {data.teams.map((t) => t.name).join(", ")}
          </p>
        </div>
        <Link href="/" className="text-sm text-gray-500 hover:text-dia-green">
          Uitloggen
        </Link>
      </header>

      {/* Live matches */}
      {liveMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Live wedstrijden
          </h2>
          <div className="space-y-3">
            {liveMatches.map((match) => (
              <MatchCard key={match._id} match={match} pin={pin} />
            ))}
          </div>
        </section>
      )}

      {/* Scheduled */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Gepland</h2>
        {scheduledMatches.length === 0 ? (
          <p className="text-gray-500">Geen geplande wedstrijden</p>
        ) : (
          <div className="space-y-3">
            {scheduledMatches.map((match) => (
              <MatchCard key={match._id} match={match} pin={pin} />
            ))}
          </div>
        )}
      </section>

      {/* Create new match */}
      <section className="mb-8">
        <Link
          href={`/coach/new?pin=${pin}&teamId=${data.teams[0]?.id}`}
          className="block w-full py-3 px-4 text-center border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-dia-green hover:text-dia-green transition-colors"
        >
          + Nieuwe wedstrijd aanmaken
        </Link>
      </section>

      {/* Finished */}
      {finishedMatches.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Afgelopen</h2>
          <div className="space-y-3">
            {finishedMatches.slice(0, 5).map((match) => (
              <MatchCard key={match._id} match={match} pin={pin} finished />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function MatchCard({
  match,
  pin,
  finished,
}: {
  match: any;
  pin: string;
  finished?: boolean;
}) {
  const isLive = match.status === "live" || match.status === "halftime";
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("nl-NL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Link
      href={`/coach/match/${match._id}?pin=${pin}`}
      className={`block p-4 bg-white rounded-lg shadow-sm border transition-all hover:shadow-md ${
        isLive ? "border-red-300 bg-red-50" : "border-gray-100"
      }`}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">
            {match.isHome ? "vs " : "@ "}
            {match.opponent}
          </p>
          <p className="text-sm text-gray-500">
            {match.scheduledAt && (
              <span className="mr-2">
                {formatDate(match.scheduledAt)} {formatTime(match.scheduledAt)}
              </span>
            )}
            <span className="font-mono text-xs bg-gray-100 px-1 rounded">
              {match.publicCode}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isLive ? "text-red-600" : ""}`}>
            {match.homeScore} - {match.awayScore}
          </p>
          {isLive && (
            <p className="text-xs text-red-500 uppercase">
              {match.status === "halftime" ? "Rust" : `Q${match.currentQuarter}`}
            </p>
          )}
          {finished && (
            <p className="text-xs text-gray-400 uppercase">Afgelopen</p>
          )}
          {match.status === "scheduled" && (
            <p className="text-xs text-gray-400 uppercase">Gepland</p>
          )}
        </div>
      </div>
    </Link>
  );
}
