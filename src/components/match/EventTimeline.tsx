"use client";

import type { MatchEvent } from "./types";

interface EventTimelineProps {
  events: MatchEvent[];
  teamName?: string;
  opponentName?: string;
}

const EVENT_ICONS: Record<string, string> = {
  goal: "⚽",
  assist: "👟",
  sub_in: "🟢",
  sub_out: "🔴",
  substitution_staged: "🗂️",
  substitution_executed: "✅",
  substitution_cancelled: "🚫",
  goal_enrichment: "✍️",
  quarter_start: "▶️",
  quarter_end: "⏸️",
  yellow_card: "🟨",
  red_card: "🟥",
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGameMinute(event: MatchEvent): string | null {
  if (event.displayMinute == null) {
    return null;
  }
  if (event.displayExtraMinute && event.displayExtraMinute > 0) {
    return `${event.displayMinute}+${event.displayExtraMinute}'`;
  }
  return `${event.displayMinute}'`;
}

function getEventText(
  event: MatchEvent,
  teamName?: string,
  opponentName?: string
): string {
  switch (event.type) {
    case "goal":
      const scoredByOpponent = event.isOpponentGoal || event.isOwnGoal;
      const scoringTeamName = scoredByOpponent
        ? opponentName || "Tegenstander"
        : teamName || "Ons team";
      if (event.isOwnGoal) {
        return event.playerName
          ? `Eigen doelpunt ${event.playerName} (${scoringTeamName})`
          : event.note
            ? `Eigen doelpunt (${scoringTeamName}) (${event.note})`
            : `Eigen doelpunt (${scoringTeamName})`;
      }
      if (event.playerName) {
        return `Doelpunt ${event.playerName} (${scoringTeamName})`;
      }
      if (event.note) {
        return `Doelpunt ${scoringTeamName} (${event.note})`;
      }
      return `Doelpunt ${scoringTeamName}`;
    case "assist":
      return `Assist ${event.playerName || ""}`;
    case "sub_in":
      return `${event.playerName || "Speler"} erin`;
    case "sub_out":
      return `${event.playerName || "Speler"} eruit`;
    case "substitution_staged":
      return `Wissel klaargezet: ${event.playerName || "Speler"} → ${event.relatedPlayerName || "Speler"}`;
    case "substitution_executed":
      return `Klaargezette wissel bevestigd`;
    case "substitution_cancelled":
      return `Klaargezette wissel geannuleerd`;
    case "goal_enrichment":
      return "Scorer en assist toegevoegd";
    case "quarter_start":
      return `Kwart ${event.quarter} gestart`;
    case "quarter_end":
      return `Kwart ${event.quarter} afgelopen`;
    case "yellow_card":
      return `Gele kaart ${event.playerName || ""}`;
    case "red_card":
      return `Rode kaart ${event.playerName || ""}`;
    default:
      return event.type;
  }
}

export function EventTimeline({
  events,
  teamName,
  opponentName,
}: EventTimelineProps) {
  // Reverse chronological order
  const sortedEvents = [...events].reverse();

  if (sortedEvents.length === 0) {
    return (
      <section className="bg-white rounded-xl shadow-md p-4">
        <h2 className="font-semibold mb-3 text-gray-700">Events</h2>
        <p className="text-gray-500 text-sm text-center py-4">
          Nog geen events
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-md p-4">
      <h2 className="font-semibold mb-3 text-gray-700">
        Events ({sortedEvents.length})
      </h2>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {sortedEvents.map((event) => (
          <div
            key={event._id}
            className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {(() => {
              const gameMinute = formatGameMinute(event);
              if (!gameMinute) {
                return (
                  <span className="text-xs text-gray-400 w-12 flex-shrink-0 font-mono">
                    {formatTime(event.timestamp)}
                  </span>
                );
              }
              return (
                <div className="w-14 flex-shrink-0 leading-tight">
                  <span className="text-xs text-gray-700 font-semibold font-mono block">
                    {gameMinute}
                  </span>
                  <span className="text-xs text-gray-500 font-mono block">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
              );
            })()}

            {/* Icon */}
            <span className="text-base w-6 text-center flex-shrink-0">
              {EVENT_ICONS[event.type] || "•"}
            </span>

            {/* Description */}
            <span className="flex-1 text-sm text-gray-700 truncate">
              {getEventText(event, teamName, opponentName)}
            </span>

            {/* Quarter badge */}
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded flex-shrink-0">
              K{event.quarter}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
