import type { Doc, Id } from "../_generated/dataModel";

type EventWithNames = Doc<"matchEvents"> & {
  playerName?: string;
  relatedPlayerName?: string;
};

export type StagedSubstitution = {
  stagedEventId: Id<"matchEvents">;
  outId?: Id<"players">;
  outName?: string;
  inId?: Id<"players">;
  inName?: string;
  quarter: number;
  matchMs?: number;
  createdAt: number;
};

function toMs(event: Doc<"matchEvents">): number | undefined {
  if (event.matchMs != null) {
    return event.matchMs;
  }
  if (event.gameSecond != null) {
    return event.gameSecond * 1000;
  }
  return undefined;
}

export function applyGoalEnrichments(events: EventWithNames[]): EventWithNames[] {
  const byGoal = new Map<string, EventWithNames[]>();
  for (const event of events) {
    if (event.type === "goal_enrichment" && event.targetEventId) {
      const key = String(event.targetEventId);
      const list = byGoal.get(key) ?? [];
      list.push(event);
      byGoal.set(key, list);
    }
  }

  return events.map((event) => {
    if (event.type !== "goal") {
      return { ...event, matchMs: toMs(event) };
    }

    const enrichments = byGoal.get(String(event._id));
    if (!enrichments || enrichments.length === 0) {
      return { ...event, matchMs: toMs(event) };
    }

    const ordered = [...enrichments].sort(
      (a, b) => a.createdAt - b.createdAt || String(a._id).localeCompare(String(b._id))
    );
    const latest = ordered[ordered.length - 1];

    return {
      ...event,
      playerId: latest.playerId ?? event.playerId,
      relatedPlayerId: latest.relatedPlayerId ?? event.relatedPlayerId,
      playerName: latest.playerName ?? event.playerName,
      relatedPlayerName: latest.relatedPlayerName ?? event.relatedPlayerName,
      matchMs: toMs(event),
    };
  });
}

export function deriveOpenStagedSubstitutions(
  events: EventWithNames[]
): StagedSubstitution[] {
  const staged = events.filter((e) => e.type === "substitution_staged");
  const closed = new Set<string>();

  for (const event of events) {
    if (
      (event.type === "substitution_cancelled" ||
        event.type === "substitution_executed") &&
      event.stagedEventId
    ) {
      closed.add(String(event.stagedEventId));
    }
  }

  return staged
    .filter((event) => !closed.has(String(event._id)))
    .map((event) => ({
      stagedEventId: event._id,
      outId: event.playerId,
      outName: event.playerName,
      inId: event.relatedPlayerId,
      inName: event.relatedPlayerName,
      quarter: event.quarter,
      matchMs: toMs(event),
      createdAt: event.createdAt,
    }));
}

export function isCoachOnlyEvent(event: Doc<"matchEvents">): boolean {
  return (
    event.type === "substitution_staged" ||
    event.type === "substitution_executed" ||
    event.type === "substitution_cancelled" ||
    event.type === "goal_enrichment"
  );
}
