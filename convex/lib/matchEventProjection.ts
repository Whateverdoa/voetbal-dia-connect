import type { Doc, Id } from "../_generated/dataModel";

type EventWithNames = Doc<"matchEvents"> & {
  playerName?: string;
  relatedPlayerName?: string;
  incidentCategory?: string;
};

/** Keep manually recorded identities readable after restoring the older UI. */
export function recordedPlayerName(
  event: Pick<Doc<"matchEvents">, "reportedName" | "reportedNumber">,
  rosterName?: string,
): string | undefined {
  return rosterName ?? event.reportedName ??
    (event.reportedNumber !== undefined ? `Nr. ${event.reportedNumber}` : undefined);
}

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

export function applyGoalEnrichments(events: EventWithNames[], partialFields = false): EventWithNames[] {
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
    if (!partialFields) {
      const latest = ordered[ordered.length - 1];
      return { ...event, playerId: latest.playerId ?? event.playerId,
        relatedPlayerId: latest.relatedPlayerId ?? event.relatedPlayerId,
        playerName: latest.playerName ?? event.playerName,
        relatedPlayerName: latest.relatedPlayerName ?? event.relatedPlayerName,
        assistKind: latest.assistKind ?? event.assistKind, matchMs: toMs(event) };
    }
    // Enrichments are partial patches; omitted fields retain earlier values.
    const enriched = ordered.reduce<EventWithNames>((goal, enrichment) => ({
      ...goal,
      playerId: enrichment.playerId ?? goal.playerId,
      relatedPlayerId: enrichment.relatedPlayerId ?? goal.relatedPlayerId,
      reportedNumber: enrichment.reportedNumber ?? goal.reportedNumber,
      playerName: enrichment.reportedNumber !== undefined ? `Nr. ${enrichment.reportedNumber}` : enrichment.playerName ?? goal.playerName,
      relatedPlayerName: enrichment.relatedPlayerName ?? goal.relatedPlayerName,
      assistKind: enrichment.assistKind ?? goal.assistKind,
    }), event);

    return {
      ...enriched,
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
    event.type === "goal_enrichment" ||
    event.type === "clock_guard" || event.type === "official_audit" ||
    event.type === "official_annotation" || event.type === "incident"
  );
}

/** Latest supplied incident note wins; original events remain immutable. */
export function applyIncidentAnnotations<T extends EventWithNames>(events: T[]): T[] {
  const notes = new Map<string, T>();
  for (const patch of events) {
    if (patch.type !== "official_annotation" || !patch.targetEventId || patch.note === undefined) continue;
    const previous = notes.get(patch.targetEventId);
    if (!previous || patch.createdAt > previous.createdAt || patch.createdAt === previous.createdAt && String(patch._id) > String(previous._id)) notes.set(patch.targetEventId, patch);
  }
  return events.map(event => event.type === "incident" && notes.has(event._id) ? { ...event, note: notes.get(event._id)!.note } : event);
}

/** Pilot-only public projection. Do not expose authentication actor metadata. */
export function projectPublicMatchEvents(events: EventWithNames[]) {
  const corrected = new Set(events.filter(e => e.type === "goal_correction").map(e => e.targetEventId));
  return applyGoalEnrichments(applyIncidentAnnotations(events), true).filter(e => e.type === "incident" || !isCoachOnlyEvent(e)).map(event => {
    if (event.type === "incident") {
      const note = event.note;
      const safe: EventWithNames & { corrected: boolean } = { _id: event._id, _creationTime: event._creationTime, matchId: event.matchId,
        type: "incident", quarter: event.quarter, matchMs: event.matchMs, timestamp: event.timestamp, createdAt: event.createdAt, corrected: false,
        incidentCategory: ["Blessure", "Strafschop", "Wangedrag", "Publiek", "Overig"].find(c => note?.startsWith(c + ":")) ?? "Overig" };
      return safe;
    }
    const result = { ...event, corrected: event.type === "goal" && corrected.has(event._id) };
    delete result.actorSubject;
    delete result.actorKind;
    return result;
  });
}
