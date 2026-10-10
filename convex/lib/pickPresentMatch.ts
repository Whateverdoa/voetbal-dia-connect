/** Pick which match the kleedkamer / TV should bind to. */

type PresentableMatch = {
  status: string;
  scheduledAt?: number;
};

const IN_PLAY = new Set(["live", "halftime", "lineup"]);

export function pickPresentMatch<T extends PresentableMatch>(
  matches: T[]
): T | undefined {
  const inPlay = matches.find((match) => IN_PLAY.has(match.status));
  if (inPlay) return inPlay;

  const scheduled = matches.filter((match) => match.status === "scheduled");
  if (scheduled.length === 0) return undefined;

  return scheduled.reduce((best, match) =>
    (match.scheduledAt ?? 0) >= (best.scheduledAt ?? 0) ? match : best
  );
}
