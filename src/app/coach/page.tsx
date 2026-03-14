"use client";

import { useEffect, useState } from "react";
import { useConvexConnectionState, useQuery } from "convex/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { CoachDashboard } from "@/components/CoachDashboard";
import { type CoachSession } from "@/components/ResumeSessionPrompt";

const ACCESS_LOAD_TIMEOUT_MS = 6000;
const COACH_SESSION_KEY = "dia_coach_session";
const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

function saveCoachSession(session: CoachSession) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(COACH_SESSION_KEY, JSON.stringify(session));
  }
}

function clearCoachSession() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(COACH_SESSION_KEY);
  }
}

export default function CoachLoginPage() {
  const [submitted, setSubmitted] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const connection = useConvexConnectionState();

  useEffect(() => {
    if (!hasClerkPublishableKey || submitted) return;
    setSubmitted(true);
  }, [submitted]);

  const coachData = useQuery(api.matches.verifyCoachAccess, submitted ? {} : "skip");

  useEffect(() => {
    if (!submitted || coachData !== undefined) {
      setConnectionTimeout(false);
      return;
    }

    const notConnected =
      !connection.isWebSocketConnected || !connection.hasEverConnected;
    if (!notConnected) return;

    const timer = setTimeout(() => {
      setConnectionTimeout(true);
    }, ACCESS_LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [
    submitted,
    coachData,
    connection.isWebSocketConnected,
    connection.hasEverConnected,
  ]);

  useEffect(() => {
    if (!submitted || !coachData) return;
    saveCoachSession({
      coachId: coachData.coach.id,
      coachName: coachData.coach.name,
      teams: coachData.teams,
    });
  }, [submitted, coachData]);

  const handleLogout = () => {
    clearCoachSession();
    setSubmitted(false);
    setConnectionTimeout(false);
  };

  const handleRetryConnection = () => {
    setConnectionTimeout(false);
    setSubmitted(false);
  };

  if (!hasClerkPublishableKey) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center space-y-3">
          <h1 className="text-xl font-bold text-dia-green">Clerk vereist</h1>
          <p className="text-sm text-gray-600">
            Deze omgeving gebruikt alleen account-login via e-mail en rollen.
          </p>
          <Link href="/" className="text-sm text-dia-green hover:underline">
            ← Terug naar start
          </Link>
        </div>
      </main>
    );
  }

  if (submitted && coachData) {
    return <CoachDashboard data={coachData} onLogout={handleLogout} />;
  }

  if (submitted && coachData === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-600 font-medium">Coachrechten controleren...</p>
      </main>
    );
  }

  if (submitted && coachData === null) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center space-y-4">
          <h1 className="text-xl font-bold text-dia-green">Geen coachtoegang</h1>
          <p className="text-sm text-gray-600">
            Dit account heeft nog geen coachkoppeling via e-mail.
          </p>
          <Link href="/" className="inline-block text-sm text-dia-green hover:underline">
            ← Terug naar start
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-dia-green text-white p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">DIA Live</h1>
            <p className="text-sm text-white/80">Coach inloggen</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="text-lg text-gray-700 font-medium">
              Inloggen verloopt via accountrechten
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Deze omgeving gebruikt alleen Clerk op basis van e-mail en rollen.
            </p>
          </div>

          <div className="h-6 flex items-center justify-center min-h-[24px]">
            {connectionTimeout && (
              <p className="text-amber-600 text-sm font-medium text-center">
                Geen verbinding. Controleer je internet en probeer opnieuw.
              </p>
            )}
          </div>

          {connectionTimeout && (
            <button
              type="button"
              onClick={handleRetryConnection}
              className="w-full py-3 rounded-xl border-2 border-amber-500 text-amber-700 font-medium hover:bg-amber-50 transition-colors"
            >
              Opnieuw proberen
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
