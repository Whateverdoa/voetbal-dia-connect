import {
  assistKindLabel,
  isSetPieceKind,
  type AssistKind,
} from "@/lib/assistKind";

export type GoalEventCopy = {
  isOpponentGoal?: boolean;
  isOwnGoal?: boolean;
  playerName?: string;
  note?: string;
  assistKind?: AssistKind | null;
};

export function ownGoalBeneficiary(kicker: "home" | "away"): "home" | "away" {
  return kicker === "home" ? "away" : "home";
}

function shirtFromNote(note?: string): string | undefined {
  const match = note?.match(/Rugnummer:\s*(\d+)/i);
  return match?.[1] ? `#${match[1]}` : undefined;
}

/** Own-goal copy: who kicked it in, and who gets the point. */
export function describeOwnGoal(
  event: GoalEventCopy,
  teamName: string,
  opponentName: string,
): string {
  const credited = event.isOpponentGoal ? opponentName : teamName;
  const kicker = event.isOpponentGoal ? teamName : opponentName;
  const who = event.playerName?.trim() || shirtFromNote(event.note);
  return who
    ? `Eigen doelpunt ${kicker} ${who} · telt voor ${credited}`
    : `Eigen doelpunt ${kicker} · telt voor ${credited}`;
}

export function describeGoalEvent(
  event: GoalEventCopy,
  teamName: string,
  opponentName: string,
): string {
  if (event.isOwnGoal) {
    return describeOwnGoal(event, teamName, opponentName);
  }

  const scoringTeamName = event.isOpponentGoal ? opponentName : teamName;
  const who = event.playerName?.trim() || shirtFromNote(event.note);
  const setPiece = assistKindLabel(event.assistKind);
  const piece =
    isSetPieceKind(event.assistKind) && setPiece ? ` · ${setPiece}` : "";
  if (who) {
    return `Doelpunt ${who} (${scoringTeamName})${piece}`;
  }
  if (isSetPieceKind(event.assistKind)) {
    return `Doelpunt ${scoringTeamName} · ${assistKindLabel(event.assistKind)}`;
  }
  return `Doelpunt ${scoringTeamName}`;
}
