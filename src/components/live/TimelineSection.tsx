import type { MatchEvent } from "./types";

interface TimelineSectionProps {
  events: MatchEvent[];
  teamName: string;
  isScheduled: boolean;
}

export function TimelineSection({
  events,
  teamName,
  isScheduled,
}: TimelineSectionProps) {
  return (
    <section className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <span>📋</span> Wedstrijdverloop
      </h2>
      {events.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          {isScheduled ? "Wedstrijd is nog niet begonnen" : "Nog geen events"}
        </p>
      ) : (
        <div className="space-y-1">
          {[...events].reverse().map((event, i) => (
            <TimelineEvent key={event._id ?? `${event.timestamp}-${i}`} event={event} teamName={teamName} />
          ))}
        </div>
      )}
    </section>
  );
}

interface TimelineEventProps {
  event: MatchEvent;
  teamName: string;
}

function TimelineEvent({ event, teamName }: TimelineEventProps) {
  const wallClockTime = new Date(event.timestamp).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const gameMinute =
    event.displayMinute != null
      ? event.displayExtraMinute && event.displayExtraMinute > 0
        ? `${event.displayMinute}+${event.displayExtraMinute}'`
        : `${event.displayMinute}'`
      : null;

  let icon = "•";
  let text = "";
  let highlight = false;

  switch (event.type) {
    case "goal":
      icon = "⚽";
      if (event.isOpponentGoal) {
        text = "Tegendoelpunt";
      } else if (event.isOwnGoal) {
        text = `Eigen doelpunt ${event.playerName || ""}`;
      } else {
        text = event.playerName
          ? `Doelpunt ${event.playerName}`
          : event.note
          ? `${teamName} (${event.note})`
          : `Doelpunt ${teamName}`;
        highlight = true;
      }
      break;
    case "sub_out":
      icon = "🔁";
      text =
        event.playerName && event.relatedPlayerName
          ? `Wissel: ${event.playerName} eruit, ${event.relatedPlayerName} erin`
          : "Wissel uitgevoerd";
      break;
    case "sub_in":
      // sub_out already explains the pair; avoid duplicate noisy line.
      return null;
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
    <div className={highlight ? "bg-green-50 -mx-2 px-2 py-1 rounded" : "py-1"}>
      <div className="flex items-center gap-3">
        {gameMinute ? (
          <div className="w-14 leading-tight">
            <span className="text-xs text-gray-700 font-semibold font-mono block">
              {gameMinute}
            </span>
            <span className="text-[10px] text-gray-400 font-mono block">
              {wallClockTime}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400 w-12">{wallClockTime}</span>
        )}
        <span className="text-lg">{icon}</span>
        <span className={highlight ? "font-medium" : ""}>{text}</span>
      </div>
    </div>
  );
}
