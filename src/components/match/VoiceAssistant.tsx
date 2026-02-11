"use client";

import { useState, useRef, useEffect } from "react";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import clsx from "clsx";

interface ChatMessage {
  role: "coach" | "agent";
  text: string;
  timestamp: number;
}

interface VoiceAssistantProps {
  matchId: string;
  pin: string;
}

/**
 * Voice assistant panel for the match control page.
 * Large microphone button, chat history, and visual feedback.
 */
export function VoiceAssistant({ matchId, pin }: VoiceAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { isListening, isSpeaking, isProcessing, startListening, stopListening, stopSpeaking } =
    useVoiceAgent({
      matchId,
      pin,
      onTranscript: (text) => {
        setError(null);
        setMessages((prev) => [
          ...prev,
          { role: "coach", text, timestamp: Date.now() },
        ]);
        setIsExpanded(true);
      },
      onAgentReply: (text) => {
        setMessages((prev) => [
          ...prev,
          { role: "agent", text, timestamp: Date.now() },
        ]);
      },
      onError: (err) => {
        setError(err);
        // Auto-clear error after 5 seconds
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setError(null), 5000);
      },
    });

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isBusy = isListening || isProcessing || isSpeaking;

  const statusLabel = isListening
    ? "Luisteren..."
    : isProcessing
      ? "Bezig..."
      : isSpeaking
        ? "Spreekt..."
        : "Druk om te spreken";

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header with toggle */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left min-h-[48px]"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎙️</span>
          <span className="font-semibold text-gray-800">Assistent</span>
          {isBusy && (
            <span className="text-xs bg-dia-green text-white px-1.5 py-0.5 rounded-full animate-pulse">
              Actief
            </span>
          )}
        </div>
        <span className="text-gray-600 text-sm">
          {isExpanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="max-h-48 overflow-y-auto px-4 py-2 space-y-2">
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500 text-center">
              Zeg bijv. &quot;Doelpunt Jens&quot; of &quot;Wissel Tim
              eruit&quot;
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-2 text-sm text-red-600 bg-red-50 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600"
                aria-label="Sluiten"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mic button + status */}
          <div className="flex flex-col items-center gap-2 p-4 pt-2">
            <button
              onClick={
                isListening
                  ? stopListening
                  : isSpeaking
                    ? stopSpeaking
                    : startListening
              }
              disabled={isProcessing}
              className={clsx(
                "w-16 h-16 rounded-full flex items-center justify-center",
                "transition-all shadow-lg active:scale-95",
                "focus:outline-none focus:ring-4 focus:ring-dia-green/30",
                isListening &&
                  "bg-red-500 text-white animate-pulse scale-110",
                isProcessing &&
                  "bg-gray-300 text-gray-500 cursor-not-allowed",
                isSpeaking && "bg-dia-green text-white",
                !isBusy &&
                  "bg-dia-green text-white hover:bg-dia-green-dark",
              )}
              aria-label={statusLabel}
            >
              {isListening ? (
                <MicOnIcon />
              ) : isSpeaking ? (
                <SpeakerIcon />
              ) : (
                <MicIdleIcon />
              )}
            </button>
            <span className="text-sm text-gray-700 font-semibold">
              {statusLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──── Sub-components ──── */

function ChatBubble({ message }: { message: ChatMessage }) {
  const isCoach = message.role === "coach";
  return (
    <div
      className={clsx(
        "text-sm px-3 py-2 rounded-lg max-w-[85%] whitespace-pre-wrap",
        isCoach
          ? "bg-dia-green/10 text-gray-800 ml-auto"
          : "bg-gray-100 text-gray-700",
      )}
    >
      <span className="font-semibold text-sm text-gray-600 block mb-0.5">
        {isCoach ? "Jij" : "Assistent"}
      </span>
      {message.text}
    </div>
  );
}

/* ──── Icons (inline SVG — no extra deps) ──── */

function MicOnIcon() {
  return (
    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function MicIdleIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
        opacity="0.6"
      />
      <path
        fill="currentColor"
        d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
        opacity="0.6"
      />
      <line
        x1="4"
        y1="4"
        x2="20"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.5v7a4.47 4.47 0 002.5-3.5zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}
