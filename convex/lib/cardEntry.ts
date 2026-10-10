export type CardRosterPlayer = {
  playerId: string;
  name: string;
  number?: number;
};

export function nameKey(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

export function findRosterPlayer(
  roster: readonly CardRosterPlayer[],
  args: {
    playerId?: string;
    reportedName?: string;
    reportedNumber?: number;
  },
): CardRosterPlayer | null {
  if (args.playerId) {
    return roster.find((player) => player.playerId === args.playerId) ?? null;
  }
  if (args.reportedNumber != null) {
    const byNumber = roster.filter(
      (player) => player.number === args.reportedNumber,
    );
    if (byNumber.length === 1) {
      return byNumber[0] ?? null;
    }
  }
  const name = args.reportedName ? nameKey(args.reportedName) : "";
  if (name) {
    const byName = roster.filter((player) => nameKey(player.name) === name);
    if (byName.length === 1) {
      return byName[0] ?? null;
    }
  }
  return null;
}

export function formatReportedPerson(args: {
  reportedName?: string;
  reportedNumber?: number;
}): string | undefined {
  const bits: string[] = [];
  if (args.reportedNumber != null) {
    bits.push(`#${args.reportedNumber}`);
  }
  const name = args.reportedName?.trim();
  if (name) {
    bits.push(name);
  }
  return bits.length > 0 ? bits.join(" ") : undefined;
}

export function cardPersonDisplay(event: {
  playerName?: string;
  reportedName?: string;
  reportedNumber?: number;
}): string | undefined {
  const fromRoster = event.playerName?.trim();
  if (fromRoster) {
    return fromRoster;
  }
  return formatReportedPerson(event);
}

/** Convex documents cannot store `undefined`; omit those keys. */
export function compactDefined(
  values: Record<string, string | number | boolean | undefined | null>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out;
}

export function hasCardIdentity(args: {
  playerId?: string;
  reportedName?: string;
  reportedNumber?: number;
}): boolean {
  return Boolean(
    args.playerId ||
      args.reportedName?.trim() ||
      args.reportedNumber != null,
  );
}
