type CorrectableEvent = { _id?: string; type: string; targetEventId?: string; corrected?: boolean };

/** Preserve history and derive correction labels before filtering a view. */
export function markCorrectedGoals<T extends CorrectableEvent>(events: T[]): T[] {
  const targets = new Set(events.filter(event => event.type === "goal_correction" && event.targetEventId)
    .map(event => event.targetEventId));
  return events.map(event => event.type === "goal" ? { ...event,
    corrected: event.corrected === true || (event._id !== undefined && targets.has(event._id)) } : event);
}
