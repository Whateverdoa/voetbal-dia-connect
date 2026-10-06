import type { DemoActor, DemoMatch, DemoState } from "./types";

export function getMatchPhase(match: DemoMatch, now: number): DemoMatch["phase"] {
  return match.phase === "voting" && match.closesAt !== undefined && now >= match.closesAt ? "closed" : match.phase;
}

export function getWinners(state: DemoState, matchId: string, now: number): { playerIds: string[]; highlightIds: string[] } {
  const match = state.matches.find((item) => item.id === matchId);
  if (!match || getMatchPhase(match, now) !== "closed") return { playerIds: [], highlightIds: [] };
  const winners = (kind: "player" | "highlight", candidateIds: string[]) => {
    const counts = new Map<string, number>();
    for (const vote of state.votes.filter((item) => item.matchId === matchId && item.kind === kind && candidateIds.includes(item.targetId))) {
      counts.set(vote.targetId, (counts.get(vote.targetId) ?? 0) + 1);
    }
    const highest = Math.max(0, ...counts.values());
    return candidateIds.filter((id) => highest > 0 && counts.get(id) === highest);
  };
  return { playerIds: winners("player", match.playerCandidateIds ?? []), highlightIds: winners("highlight", match.highlightCandidateIds ?? []) };
}

export function canReadPlayer(state: DemoState, actor: DemoActor, playerId: string): boolean {
  if (actor.role === "coach") return true;
  if (actor.role === "scout") return false;
  if (actor.role === "player") return actor.playerId === playerId;
  return state.guardians.some((guardian) => guardian.id === actor.guardianId && guardian.childrenIds.includes(playerId));
}

/** Only published snapshots leave this selector; drafts never reach member views. */
export function getPublishedFeedback(state: DemoState, actor: DemoActor, playerId: string) {
  if (!canReadPlayer(state, actor, playerId)) return [];
  return state.feedback.filter((item) => item.playerId === playerId && item.published !== null)
    .map(({ id, kind, matchId, published, publishedAt }) => ({ id, kind, matchId, content: published!, publishedAt: publishedAt ?? 0 }))
    .sort((a, b) => b.publishedAt - a.publishedAt);
}

/** Personal match reports only expose the last explicitly published snapshot. */
export function getPublishedPlayerReviews(state: DemoState, actor: DemoActor, playerId: string) {
  if (!canReadPlayer(state, actor, playerId)) return [];
  return (state.playerReviews ?? []).filter((item) => item.playerId === playerId && item.published !== null)
    .map(({ id, matchId, playerId: reviewedPlayerId, published, publishedAt }) => ({ id, matchId, playerId: reviewedPlayerId, content: structuredClone(published!), publishedAt: publishedAt ?? 0 }))
    .sort((a, b) => b.publishedAt - a.publishedAt);
}

export function getPlayerBadges(state: DemoState, playerId: string, now: number) {
  return state.matches.flatMap((match) => {
    const result = getWinners(state, match.id, now);
    const badges: { id: string; label: string; opponent: string }[] = [];
    if (result.playerIds.includes(playerId)) badges.push({ id: `${match.id}-player`, label: "Speler van de wedstrijd", opponent: match.opponent });
    if (state.highlights.some((highlight) => highlight.playerId === playerId && result.highlightIds.includes(highlight.id))) badges.push({ id: `${match.id}-highlight`, label: "Actie van de wedstrijd", opponent: match.opponent });
    return badges;
  });
}
