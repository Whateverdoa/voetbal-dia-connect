"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useConvexConnectionState } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CoachDashboard } from "@/components/CoachDashboard";
import { PinDisplay } from "@/components/PinDisplay";
import { NumericKeypad } from "@/components/NumericKeypad";
import {
  ResumeSessionPrompt,
  type CoachSession,
} from "@/components/ResumeSessionPrompt";

const PIN_LOAD_TIMEOUT_MS = 6000;

const MAX_PIN_LENGTH = 6;
const MIN_PIN_LENGTH = 4;
const COACH_SESSION_KEY = "dia_coach_session";
const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

function saveCoachSession(session: CoachSession) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(COACH_SESSION_KEY, JSON.stringify(session));
  }
}

function getCoachSession(): CoachSession | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(COACH_SESSION_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function clearCoachSession() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(COACH_SESSION_KEY);
  }
}

export default function CoachLoginPage() {
  const accountMode = hasClerkPublishableKey;
  const [pin, setPin] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [existingSession, setExistingSession] = useState<CoachSession | null>(
    null
  );
  const connection = useConvexConnectionState();

  useEffect(() => {
    const session = getCoachSession();
    if (session) {
      setExistingSession(session);
    }
  }, []);

  useEffect(() => {
    if (!accountMode || existingSession || submitted) return;
    setSubmitted(true);
  }, [accountMode, existingSession, submitted]);

  const coachData = useQuery(
    api.matches.verifyCoachPin,
    submitted && (accountMode || pin.length >= MIN_PIN_LENGTH) ? {} : "skip"
  );

  // If we're waiting for PIN verification and the query never returns (no connection), show "try again" after a timeout
  useEffect(() => {
    if (!submitted || coachData !== undefined) {
      setConnectionTimeout(false);
      return;
    }
    const notConnected =
      !connection.isWebSocketConnected || !connection.hasEverConnected;
    const t = setTimeout(
      () => setConnectionTimeout(true),
      PIN_LOAD_TIMEOUT_MS
    );
    return () => clearTimeout(t);
  }, [submitted, coachData, connection.isWebSocketConnected, connection.hasEverConnected]);

  useEffect(() => {
    if (submitted && coachData) {
      const session: CoachSession = {
        coachId: coachData.coach.id,
        coachName: coachData.coach.name,
        pin,
        teams: coachData.teams,
      };
      saveCoachSession(session);
    }
  }, [submitted, coachData, pin]);

  useEffect(() => {
    if (accountMode) return;
    if (submitted && coachData === null) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        setPin("");
        setSubmitted(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [accountMode, submitted, coachData]);

  const handleKeyPress = useCallback(
    (digit: string) => {
      if (pin.length < MAX_PIN_LENGTH && !submitted) {
        setPin((prev) => prev + digit);
        setShowError(false);
      }
    },
    [pin.length, submitted]
  );

  const handleBackspace = useCallback(() => {
    if (!submitted) {
      setPin((prev) => prev.slice(0, -1));
      setShowError(false);
    }
  }, [submitted]);

  const handleClear = useCallback(() => {
    if (!submitted) {
      setPin("");
      setShowError(false);
    }
  }, [submitted]);

  const handleSubmit = useCallback(() => {
    if (accountMode) {
      setSubmitted(true);
      return;
    }
    if (pin.length >= MIN_PIN_LENGTH) {
      setSubmitted(true);
    }
  }, [accountMode, pin.length]);

  useEffect(() => {
    if (accountMode) return;
    if (pin.length === MAX_PIN_LENGTH && !submitted) {
      setSubmitted(true);
    }
  }, [accountMode, pin.length, submitted]);

  const handleLogout = () => {
    clearCoachSession();
    setExistingSession(null);
    setPin("");
    setSubmitted(false);
    setConnectionTimeout(false);
  };

  const handleRetryConnection = () => {
    setConnectionTimeout(false);
    setSubmitted(false);
  };

  if (submitted && coachData) {
    return <CoachDashboard data={coachData} onLogout={handleLogout} />;
  }

  if (accountMode && submitted && coachData === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-600 font-medium">Coachrechten controleren...</p>
      </main>
    );
  }

  if (existingSession && !submitted) {
    return (
      <ResumeSessionPrompt
        session={existingSession}
        onResume={() => {
          setPin(existingSession.pin);
          setSubmitted(true);
        }}
        onNewLogin={() => {
          clearCoachSession();
          setExistingSession(null);
        }}
      />
    );
  }

  if (accountMode && submitted && coachData === null) {
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
            <p className="text-lg text-gray-700 font-medium">Voer je PIN in</p>
            <p className="text-sm text-gray-500 mt-1">4-6 cijfers</p>
          </div>

          <PinDisplay
            pin={pin}
            maxLength={MAX_PIN_LENGTH}
            showError={showError}
          />

          <div className="h-6 flex items-center justify-center min-h-[24px]">
            {showError && (
              <p className="text-red-500 text-sm font-medium animate-pulse">
                Ongeldige PIN
              </p>
            )}
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

          <NumericKeypad
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            onClear={handleClear}
            onSubmit={handleSubmit}
            canSubmit={pin.length >= MIN_PIN_LENGTH}
            disabled={submitted && !connectionTimeout}
          />
        </div>
      </div>
    </main>
  );
}
