import { getMatchPhase } from "./selectors";
import { applyObservationCommand } from "./observationRules";
import { applyPlayerReviewCommand } from "./playerReviewRules";
import { isReviewInterviewDraft } from "./reviewInterview";
import { CATEGORIES, SKILLS, SKILL_LEVELS, VOTE_REASONS, type DemoActor, type DemoCommand, type DemoState } from "./types";

function requireCondition(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

/** Local demo rules. A future backend must independently enforce the same rules. */
export function applyDemoCommand(state: DemoState, actor: DemoActor, command: DemoCommand, now: number): DemoState {
  if (command.type === "saveInterview") {
    requireCondition(actor.role === "coach", "Alleen de coach kan een nabespreking bewaren.");
    requireCondition(state.players.some((player) => player.id === command.playerId), "Speler niet gevonden.");
    requireCondition(state.matches.some((match) => match.id === command.matchId && match.participantIds.includes(command.playerId)), "Kies een speler die aan deze wedstrijd deelnam.");
    requireCondition(isReviewInterviewDraft(command.draft), "Dit gesprek kon niet worden bewaard. Controleer de invoer.");
    const interviews = (state.interviews ?? []).filter((item) => item.matchId !== command.matchId || item.playerId !== command.playerId);
    return { ...state, interviews: [...interviews, { matchId: command.matchId, playerId: command.playerId, draft: structuredClone(command.draft) }] };
  }
  if (command.type === "savePlayerReview" || command.type === "publishPlayerReview") {
    return applyPlayerReviewCommand(state, actor, command, now);
  }
  if (command.type === "setObservationsEnabled" || command.type === "saveObservation" || command.type === "finalizeObservation") {
    return applyObservationCommand(state, actor, command, now);
  }
  const coach = actor.role === "coach";
  const playerId = actor.role === "player" ? actor.playerId : null;
  requireCondition(coach || (playerId && state.players.some((player) => player.id === playerId)), "Deze handeling is alleen voor coaches en spelers.");

  if (command.type === "saveFeedback") {
    requireCondition(coach, "Alleen de coach kan feedback schrijven.");
    requireCondition(state.players.some((player) => player.id === command.playerId), "Speler niet gevonden.");
    requireCondition(command.kind === "periodic" || state.matches.some((match) => match.id === command.matchId && match.participantIds.includes(command.playerId)), "Kies een wedstrijd waaraan deze speler deelnam.");
    const content = { ...command.content, compliment: command.content.compliment.trim(), nextStep: command.content.nextStep.trim(), skills: { ...command.content.skills } };
    requireCondition(content.compliment.length <= 600 && content.nextStep.length <= 600, "Gebruik maximaal 600 tekens per tekstvak.");
    requireCondition(SKILLS.every((skill) => SKILL_LEVELS.includes(content.skills[skill])), "Kies een geldige ontwikkelstap.");
    const matchId = command.kind === "match" ? command.matchId : undefined;
    const previous = state.feedback.find((item) => item.playerId === command.playerId && item.kind === command.kind && item.matchId === matchId);
    const record = { id: previous?.id ?? `feedback-${now}-${state.feedback.length}`, playerId: command.playerId, kind: command.kind, ...(matchId ? { matchId } : {}), draft: content, published: previous?.published ?? null, ...(previous?.publishedAt !== undefined ? { publishedAt: previous.publishedAt } : {}), updatedAt: now };
    return { ...state, feedback: [...state.feedback.filter((item) => item.id !== record.id), record] };
  }
  if (command.type === "publishFeedback") {
    requireCondition(coach, "Alleen de coach kan feedback publiceren.");
    const feedback = state.feedback.find((item) => item.id === command.feedbackId);
    requireCondition(feedback, "Sla eerst je concept op.");
    requireCondition(feedback.draft.compliment.trim() && feedback.draft.nextStep.trim(), "Vul een compliment én een volgend oefenpunt in.");
    return { ...state, feedback: state.feedback.map((item) => item.id === feedback.id ? { ...item, published: structuredClone(item.draft), publishedAt: now } : item) };
  }
  if (command.type === "reviewHighlight") {
    requireCondition(coach, "Alleen de coach kan voorstellen beoordelen.");
    const highlight = state.highlights.find((item) => item.id === command.highlightId);
    requireCondition(highlight, "Actie niet gevonden.");
    const match = state.matches.find((item) => item.id === highlight.matchId);
    requireCondition(match && getMatchPhase(match, now) === "preparing", "De kandidaten staan al vast.");
    requireCondition(highlight.status === "pending", "Dit voorstel is al beoordeeld.");
    return { ...state, highlights: state.highlights.map((item) => item.id === highlight.id ? { ...item, status: command.approved ? "approved" : "rejected" } : item) };
  }

  const match = state.matches.find((item) => item.id === command.matchId);
  requireCondition(match, "Wedstrijd niet gevonden.");
  const phase = getMatchPhase(match, now);
  if (command.type === "addHighlight") {
    requireCondition(phase === "preparing", "De kandidaten staan vast zodra de stemming begint.");
    requireCondition(coach || (playerId && match.participantIds.includes(playerId)), "Alleen deelnemers kunnen een actie voordragen.");
    requireCondition(match.participantIds.includes(command.playerId), "Kies een speler van deze wedstrijd.");
    requireCondition(coach || command.playerId !== playerId, "Draag een mooie actie van een teamgenoot voor.");
    requireCondition(CATEGORIES.includes(command.category), "Kies een positieve categorie.");
    const description = command.description.trim();
    requireCondition(description.length > 0 && description.length <= 240, "Beschrijf de actie in 1 tot 240 tekens.");
    requireCondition(command.minute === undefined || (Number.isInteger(command.minute) && command.minute >= 1 && command.minute <= 120), "Vul een minuut van 1 tot en met 120 in.");
    return { ...state, highlights: [...state.highlights, { id: `highlight-${now}-${state.highlights.length}`, matchId: match.id, playerId: command.playerId, category: command.category, description, ...(command.minute !== undefined ? { minute: command.minute } : {}), status: coach ? "approved" : "pending", submittedBy: playerId ?? "coach" }] };
  }
  if (command.type === "openVoting") {
    requireCondition(coach, "Alleen de coach kan een stemming openen.");
    requireCondition(phase === "preparing", "Deze stemming is al geopend.");
    requireCondition(!state.highlights.some((item) => item.matchId === match.id && item.status === "pending"), "Beoordeel eerst alle voorgestelde acties.");
    return { ...state, matches: state.matches.map((item) => item.id === match.id ? { ...item, phase: "voting", openedAt: now, closesAt: now + 86400000, playerCandidateIds: [...match.participantIds], highlightCandidateIds: state.highlights.filter((highlight) => highlight.matchId === match.id && highlight.status === "approved").map((highlight) => highlight.id) } : item) };
  }
  if (command.type === "closeVoting") {
    requireCondition(coach, "Alleen de coach kan naar de demo-uitslag springen.");
    requireCondition(phase === "voting", "Deze stemming is niet meer open.");
    return { ...state, matches: state.matches.map((item) => item.id === match.id ? { ...item, phase: "closed", closesAt: now } : item) };
  }
  requireCondition(playerId && match.participantIds.includes(playerId), "Alleen deelnemende spelers kunnen stemmen.");
  requireCondition(phase === "voting", "Stemmen kan alleen tijdens een open stemming.");
  if (command.kind === "player") {
    requireCondition(match.playerCandidateIds?.includes(command.targetId), "Deze speler is geen kandidaat.");
    requireCondition(command.targetId !== playerId, "Stem op een teamgenoot, niet op jezelf.");
    requireCondition(command.reason && VOTE_REASONS.includes(command.reason), "Kies een positieve reden voor je stem.");
  } else {
    requireCondition(match.highlightCandidateIds?.includes(command.targetId), "Deze actie is geen kandidaat.");
    const highlight = state.highlights.find((item) => item.id === command.targetId);
    requireCondition(highlight && highlight.playerId !== playerId, "Stem op een actie van een teamgenoot.");
  }
  return { ...state, votes: [...state.votes.filter((vote) => !(vote.matchId === match.id && vote.voterId === playerId && vote.kind === command.kind)), { matchId: match.id, voterId: playerId, kind: command.kind, targetId: command.targetId, ...(command.kind === "player" ? { reason: command.reason } : {}) }] };
}
