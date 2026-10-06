"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { readonly transcript: string };
}

interface RecognitionResultEvent {
  readonly results: ArrayLike<RecognitionResult>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => Recognition;
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

interface Session {
  recognition: Recognition;
  emitted: Set<number>;
  stopping: boolean;
  stopTimer: ReturnType<typeof setTimeout> | null;
}

const STOP_TIMEOUT_MS = 3000;

function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function getSupported() { return Boolean(getRecognitionConstructor()); }
function getServerSupported() { return false; }
function subscribeToSupport() { return () => {}; }

function errorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
    case "NotAllowedError":
    case "SecurityError":
      return "Dicteren is niet toegestaan. Geef je browser toegang tot de microfoon of gebruik het toetsenbord.";
    case "audio-capture":
      return "De microfoon is niet beschikbaar. Controleer of deze is aangesloten en vrij is voor gebruik.";
    case "network":
      return "De spraakdienst is niet bereikbaar. Controleer je verbinding en probeer opnieuw.";
    case "no-speech":
      return "Er is geen spraak herkend. Start opnieuw en spreek iets dichter bij de microfoon.";
    case "language-not-supported":
      return "Nederlands dicteren wordt niet ondersteund door deze browser. Gebruik het toetsenbord.";
    case "aborted":
      return "Het dicteren is onderbroken. Je kunt opnieuw beginnen; overgenomen tekst blijft staan.";
    default:
      return "Dicteren is niet gelukt. Probeer opnieuw of gebruik het toetsenbord.";
  }
}

function detachSession(session: Session, abort: boolean) {
  if (session.stopTimer !== null) clearTimeout(session.stopTimer);
  session.stopTimer = null;
  session.recognition.onresult = null;
  session.recognition.onerror = null;
  session.recognition.onend = null;
  if (abort) {
    try { session.recognition.abort(); } catch { /* Already disconnected. */ }
  }
}

/** Browser dictation only: no audio recording, storage, or automatic restart. */
export function useReviewDictation({ onTranscript }: { onTranscript: (text: string) => void }) {
  // The server snapshot also serves the first hydration render.
  const supported = useSyncExternalStore(subscribeToSupport, getSupported, getServerSupported);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const transcriptCallback = useRef(onTranscript);

  useEffect(() => { transcriptCallback.current = onTranscript; }, [onTranscript]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) detachSession(session, true);
    };
  }, []);

  const finish = useCallback((session: Session, abort = false) => {
    if (sessionRef.current !== session) return;
    sessionRef.current = null;
    detachSession(session, abort);
    if (mounted.current) {
      setListening(false);
      setInterim("");
    }
  }, []);

  const start = useCallback(() => {
    if (!mounted.current || sessionRef.current) return;
    const Constructor = getRecognitionConstructor();
    if (!Constructor) {
      setError("Deze browser ondersteunt geen dicteren. Gebruik de dicteerfunctie van je toetsenbord of typ je observatie.");
      return;
    }

    setError("");
    setInterim("");
    try {
      const recognition = new Constructor();
      const session: Session = { recognition, emitted: new Set(), stopping: false, stopTimer: null };
      recognition.lang = "nl-NL";
      recognition.continuous = true;
      recognition.interimResults = true;
      sessionRef.current = session;

      recognition.onresult = (event) => {
        if (!mounted.current || sessionRef.current !== session) return;
        const finalChunks: string[] = [];
        const interimChunks: string[] = [];
        // Results are cumulative. Final entries never change; interim entries can shrink.
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result[0]?.transcript.trim() ?? "";
          if (result.isFinal) {
            if (!session.emitted.has(index)) {
              session.emitted.add(index);
              if (text) finalChunks.push(text);
            }
          } else if (text) {
            interimChunks.push(text);
          }
        }
        setInterim(interimChunks.join(" "));
        if (finalChunks.length) transcriptCallback.current(finalChunks.join(" "));
      };
      recognition.onerror = (event) => {
        if (!mounted.current || sessionRef.current !== session) return;
        setError(errorMessage(event.error));
        finish(session, true);
      };
      recognition.onend = () => finish(session);
      // Includes the permission/start interval to prevent duplicate starts.
      setListening(true);
      recognition.start();
    } catch (cause) {
      const name = typeof cause === "object" && cause !== null && "name" in cause && typeof cause.name === "string" ? cause.name : "unknown";
      setError(errorMessage(name));
      const session = sessionRef.current;
      if (session) finish(session, true);
    }
  }, [finish]);

  const stop = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.stopping) return;
    session.stopping = true;
    // stop() can emit one last final result. Keep the session alive until end.
    session.stopTimer = setTimeout(() => {
      if (!mounted.current || sessionRef.current !== session) return;
      setError("Het dicteren is gestopt. Controleer of de laatste woorden zijn overgenomen.");
      finish(session, true);
    }, STOP_TIMEOUT_MS);
    try {
      session.recognition.stop();
    } catch {
      setError("Het dicteren kon niet worden afgerond. Controleer je tekst en probeer opnieuw.");
      finish(session, true);
    }
  }, [finish]);

  return { supported, listening, interim, error, start, stop };
}
