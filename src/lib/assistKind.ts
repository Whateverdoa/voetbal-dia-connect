export const ASSIST_KINDS = ["pass", "corner", "free_kick"] as const;

export type AssistKind = (typeof ASSIST_KINDS)[number];

export const ASSIST_KIND_LABELS: Record<AssistKind, string> = {
  pass: "Assist",
  corner: "Hoekschop",
  free_kick: "Vrije trap",
};

export function isAssistKind(value: string | null | undefined): value is AssistKind {
  return value === "pass" || value === "corner" || value === "free_kick";
}

/** Label for set-piece kinds only; a regular pass stays "Assist". */
export function assistKindLabel(kind?: AssistKind | null): string | null {
  if (!kind) return null;
  return ASSIST_KIND_LABELS[kind];
}

export function formatAssistLine(
  playerName?: string | null,
  kind?: AssistKind | null,
): string | null {
  const setPiece = kind === "corner" || kind === "free_kick";
  const label = setPiece ? ASSIST_KIND_LABELS[kind] : "Assist";
  const name = playerName?.trim();
  if (name && setPiece) return `${label}: ${name}`;
  if (name) return `Assist: ${name}`;
  if (setPiece) return label;
  return null;
}

export function resolveAssistKindForSubmit(
  kind: AssistKind | null,
  playerId: string | null,
): AssistKind | undefined {
  if (kind === "corner" || kind === "free_kick") return kind;
  if (kind === "pass" && playerId) return "pass";
  return undefined;
}

/** Timeline copy for a goal_enrichment event — reflects what was actually saved. */
export function describeGoalEnrichment(args: {
  scorerName?: string | null;
  assistName?: string | null;
  assistKind?: AssistKind | null;
}): string {
  const scorer = args.scorerName?.trim() || null;
  const assist = args.assistName?.trim() || null;
  const kind = args.assistKind ?? null;
  const setPiece = kind === "corner" || kind === "free_kick";
  const setPieceLabel = setPiece ? ASSIST_KIND_LABELS[kind] : null;

  if (!scorer && !assist && setPieceLabel) {
    return `${setPieceLabel} genoteerd`;
  }

  const parts: string[] = [];
  if (scorer) parts.push(`scorer ${scorer}`);
  if (assist && setPieceLabel) parts.push(`${setPieceLabel.toLowerCase()} ${assist}`);
  else if (assist) parts.push(`assist ${assist}`);
  else if (setPieceLabel) parts.push(setPieceLabel.toLowerCase());

  if (parts.length === 0) return "Doelpunt aangevuld";
  if (scorer && assist && !setPiece) return "Scorer en assist toegevoegd";
  return `Doelpunt aangevuld: ${parts.join(" · ")}`;
}
