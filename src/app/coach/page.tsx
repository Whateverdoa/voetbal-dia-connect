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

  const coachData = useQuery(
    api.matches.verifyCoachPin,
    submitted && pin.length >= MIN_PIN_LENGTH ? { pin } : "skip"
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
    if (submitted && coachData === null) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        setPin("");
        setSubmitted(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [submitted, coachData]);

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
    if (pin.length >= MIN_PIN_LENGTH) {
      setSubmitted(true);
    }
  }, [pin.length]);

  useEffect(() => {
    if (pin.length === MAX_PIN_LENGTH && !submitted) {
      setSubmitted(true);
    }
  }, [pin.length, submitted]);

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
    return <CoachDashboard data={coachData} pin={pin} onLogout={handleLogout} />;
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
