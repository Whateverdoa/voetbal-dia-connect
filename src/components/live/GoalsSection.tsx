import type { MatchEvent } from "./types";

interface GoalsSectionProps {
  events: MatchEvent[];
  teamName: string;
}

export function GoalsSection({ events, teamName }: GoalsSectionProps) {
  const goals = events.filter((e) => e.type === "goal" && !e.isOpponentGoal);
  if (goals.length === 0) return null;

  return (
    <section className="bg-white rounded-xl shadow-sm p-4">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <span>⚽</span> Doelpunten {teamName}
      </h2>
      <div className="space-y-2">
        {goals.map((event, i) => (
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
            <span className="text-sm text-gray-400">Q{event.quarter}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
