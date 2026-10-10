import type { DemoPlan } from "./demoPlan";

/** Starts a manual plan without retaining substitutions or bench-minute claims from the photo. */
export function createManualDemoPlan(plan: DemoPlan): DemoPlan {
  return {
    ...plan,
    players: plan.players.map((player) => ({ ...player, sourceBenchMinutes: null })),
    steps: [],
    review: { ...plan.review, sourceConfirmed: false },
  };
}

function assertCompleteStartingLineup(plan: DemoPlan): void {
  const playerKeys = new Set(plan.players.map((player) => player.key));
  const present = new Set(plan.players.filter((player) => !player.absent).map((player) => player.key));
  if (playerKeys.size !== plan.players.length || plan.players.some((player) => !player.key.trim())) {
    throw new Error("Iedere speler moet een eigen, niet-lege spelerssleutel hebben.");
  }
  const slots = new Set(plan.formation.slots.map((slot) => slot.id));
  const field = plan.startingLineup.field;
  const bench = plan.startingLineup.bench;
  if (slots.size !== plan.formation.slots.length || slots.size !== plan.match.fieldPlayerCountIncludingKeeper ||
      plan.formation.slots.some((slot) => !Number.isInteger(slot.id) || slot.id < 0) ||
      field.length !== slots.size || new Set(field.map((entry) => entry.slotId)).size !== slots.size ||
      field.some((entry) => !slots.has(entry.slotId))) {
    throw new Error("Iedere veldpositie moet precies één speler hebben en bij de formatie horen.");
  }
  const assigned = [...field.map((entry) => entry.playerKey), ...bench];
  if (new Set(assigned).size !== assigned.length || assigned.length !== present.size || assigned.some((key) => !present.has(key))) {
    throw new Error("Zet iedere aanwezige speler precies eenmaal op het veld of de bank; afwezige spelers doen niet mee.");
  }
  const keeperSlots = plan.formation.slots.filter((slot) => slot.position === "GK");
  if (keeperSlots.length !== 1 || !field.some((entry) => entry.slotId === keeperSlots[0].id && entry.playerKey === plan.startingLineup.keeperKey)) {
    throw new Error("Wijs precies één keeper aan op de keeperpositie.");
  }
}

/** Assigns a present player without losing or duplicating a player in the starting selection. */
export function assignDemoStartingPlayer(plan: DemoPlan, slotId: number, playerKey: string): DemoPlan {
  assertCompleteStartingLineup(plan);
  const current = plan.startingLineup.field.find((entry) => entry.slotId === slotId);
  if (!current) throw new Error("Kies een bestaande veldpositie.");
  const player = plan.players.find((candidate) => candidate.key === playerKey);
  if (!player || player.absent) throw new Error("Kies een aanwezige speler uit de selectie.");
  if (current.playerKey === playerKey) return plan;
  if (plan.startingLineup.field.some((entry) => entry.playerKey === playerKey)) {
    return swapDemoStartingPositions(plan, current.playerKey, playerKey);
  }

  const keeperSlot = plan.formation.slots.find((slot) => slot.position === "GK")!.id;
  return {
    ...plan,
    startingLineup: {
      ...plan.startingLineup,
      keeperKey: slotId === keeperSlot ? playerKey : plan.startingLineup.keeperKey,
      field: plan.startingLineup.field.map((entry) => entry.slotId === slotId ? { ...entry, playerKey } : entry),
      bench: plan.startingLineup.bench.map((key) => key === playerKey ? current.playerKey : key),
    },
    review: { ...plan.review, sourceConfirmed: false },
  };
}

/** Swap starting roles without changing identities, bench selection or the substitution plan. */
export function swapDemoStartingPositions(plan: DemoPlan, playerA: string, playerB: string): DemoPlan {
  if (playerA === playerB) throw new Error("Kies twee verschillende spelers op het veld.");

  const selected = [playerA, playerB].map((key) => ({
    key,
    players: plan.players.filter((player) => player.key === key && !player.absent),
    entries: plan.startingLineup.field.filter((entry) => entry.playerKey === key),
  }));
  if (selected.some(({ key, players, entries }) =>
    players.length !== 1 || entries.length !== 1 || plan.startingLineup.bench.includes(key))) {
    throw new Error("Beide spelers moeten in de beginopstelling op het veld staan.");
  }

  const [entryA, entryB] = selected.map(({ entries }) => entries[0]);
  if (entryA.slotId === entryB.slotId || [entryA, entryB].some((entry) =>
    plan.formation.slots.filter((slot) => slot.id === entry.slotId).length !== 1 ||
    plan.startingLineup.field.filter((occupant) => occupant.slotId === entry.slotId).length !== 1)) {
    throw new Error("De gekozen spelers hebben geen geldige, verschillende veldposities.");
  }
  const keeperSlots = plan.formation.slots.filter((slot) => slot.position === "GK");
  if (keeperSlots.length !== 1) throw new Error("De opstelling moet precies één keeperpositie hebben.");
  const keeperSlotId = keeperSlots[0].id;

  return {
    ...plan,
    startingLineup: {
      ...plan.startingLineup,
      keeperKey: entryA.slotId === keeperSlotId ? playerB
        : entryB.slotId === keeperSlotId ? playerA
          : plan.startingLineup.keeperKey,
      field: plan.startingLineup.field.map((entry) => {
        if (entry.playerKey === playerA) return { ...entry, slotId: entryB.slotId };
        if (entry.playerKey === playerB) return { ...entry, slotId: entryA.slotId };
        return entry;
      }),
    },
    review: { ...plan.review, sourceConfirmed: false },
  };
}
