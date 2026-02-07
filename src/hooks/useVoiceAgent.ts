"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Browser Speech API type declarations.
 * SpeechRecognition is not in all TS lib definitions.
 */
interface SpeechRecognitionResult {
  readonly [index: number]: { transcript: string };
}

interface SpeechRecognitionEvent {
  readonly results: SpeechRecognitionResult[];
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

/** Max conversation history messages sent to the API (sliding window). */
const MAX_HISTORY_LENGTH = 20;

interface UseVoiceAgentOptions {
  matchId: string;
  pin: string;
  onTranscript?: (text: string) => void;
  onAgentReply?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceAgentReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  startListening: () => void;
  stopListening: () => void;
  stopSpeaking: () => void;
}

/**
 * Hook for voice-controlled match agent.
 * Uses Web Speech API for Dutch (nl-NL) speech recognition and synthesis.
 */
export function useVoiceAgent({
  matchId,
  pin,
  onTranscript,
  onAgentReply,
  onError,
}: UseVoiceAgentOptions): UseVoiceAgentReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const historyRef = useRef<unknown[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Cleanup on unmount — stop any active recognition/speech
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      speechSynthesis.cancel();
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    // Check for browser support
    const SR = (
      window as unknown as Record<string, SpeechRecognitionConstructor | undefined>
    ).SpeechRecognition ?? (
      window as unknown as Record<string, SpeechRecognitionConstructor | undefined>
    ).webkitSpeechRecognition;

    if (!SR) {
      onError?.("Spraakherkenning niet beschikbaar in deze browser.");
      return;
    }

    const recognition = new SR();
    recognition.lang = "nl-NL";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onTranscript?.(transcript);
      setIsListening(false);
      setIsProcessing(true);
      recognitionRef.current = null;

      // Haptic feedback: processing started
      navigator.vibrate?.([50, 50, 50]);

      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: transcript,
            matchId,
            pin,
            history: historyRef.current,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error ?? `HTTP ${res.status}`);
        }

        const data = await res.json();

        // Cap history to sliding window
        const newHistory = data.messages as unknown[];
        historyRef.current = newHistory.slice(-MAX_HISTORY_LENGTH);

        onAgentReply?.(data.reply);

        // Speak the reply through earpiece
        const utterance = new SpeechSynthesisUtterance(data.reply);
        utterance.lang = "nl-NL";
        utterance.rate = 1.1;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Fout bij het verwerken.";
        onError?.(errorMsg);
        onAgentReply?.(`Fout: ${errorMsg}`);
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      onError?.("Spraakherkenning mislukt. Probeer opnieuw.");
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    // Cancel any ongoing speech before listening
    speechSynthesis.cancel();
    setIsSpeaking(false);

    // Haptic feedback: listening started
    navigator.vibrate?.(50);

    recognition.start();
    setIsListening(true);
  }, [matchId, pin, onTranscript, onAgentReply, onError]);

  return {
    isListening,
    isSpeaking,
    isProcessing,
    startListening,
    stopListening,
    stopSpeaking,
  };
}
