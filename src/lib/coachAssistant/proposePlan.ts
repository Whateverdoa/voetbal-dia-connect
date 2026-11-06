import type { DemoPlan } from "../substitutions/demoPlan";
import { validatePortableSubstitutionPlan } from "../substitutions/validatePortableSubstitutionPlan";
import { assignField, positionFit } from "./assignment";
import { canonicalPosition, collectEvidence, validDate } from "./history";
import { buildTransition } from "./transitions";
import type { AssistantInput, AssistantResult } from "./types";

/** Deterministic local planner. No model, database writes or invented player attributes. */
export function proposeCoachPlan(input: AssistantInput): AssistantResult {
  const errors: string[] = [];
  const duration = input.plan.match.regulationDurationMinutes;
  const slots = input.plan.formation.slots;
  const keeperSlots = slots.filter((slot) => canonicalPosition(slot.position) === "GK");
  const fieldSlots = slots.filter((slot) => canonicalPosition(slot.position) !== "GK");
  const available = input.players.filter((player) => player.availability === "present");
  const keeper = available.find((player) => player.key === input.keeperKey);
  const changeKeeper = input.includeSubstitutions && input.keepKeeper === false;
  const secondKeeper = changeKeeper ? available.find((player) => player.key === input.secondKeeperKey && player.key !== input.keeperKey) : undefined;
  const keeperKeys = new Set([input.keeperKey, ...(secondKeeper ? [secondKeeper.key] : [])]);
  if (!validDate(input.targetDate)) errors.push("Vul een geldige datum voor de doelwedstrijd in.");
  if (!Number.isFinite(duration) || duration <= 0 || duration > 180) errors.push("Kies een speelduur tussen 1 en 180 minuten.");
  if (slots.length !== input.plan.match.fieldPlayerCountIncludingKeeper || fieldSlots.length > 10 || keeperSlots.length !== 1 ||
      new Set(slots.map((slot) => slot.id)).size !== slots.length || slots.some((slot) => !canonicalPosition(slot.position))) {
    errors.push("De formatie moet geldige, unieke posities en precies één keeper hebben (maximaal elf spelers).");
  }
  if (!keeper) errors.push("Kies een beschikbare keeper en bevestig de selectie.");
  if (changeKeeper && !secondKeeper) errors.push("Kies een andere beschikbare keeper voor de tweede helft.");
  if (changeKeeper && available.length < slots.length + 1) errors.push("Voor twee keepers is naast de veldbezetting één extra beschikbare speler nodig.");
  if (available.length < slots.length) errors.push("Er zijn te weinig beschikbare spelers voor deze formatie.");
  if (input.players.length > 30 || new Set(input.players.map((player) => player.key)).size !== input.players.length ||
      input.players.length !== input.plan.players.length || input.plan.players.some((player) => !input.players.some((row) => row.key === player.key))) {
    errors.push("De selectie moet maximaal dertig unieke spelers bevatten en bij het gekozen plan horen.");
  }
  if (input.includeSubstitutions && (!Number.isFinite(input.intervalMinutes) || input.intervalMinutes < 1 || input.intervalMinutes >= duration)) {
    errors.push("Het wisselinterval moet minimaal één minuut zijn en vóór het einde van de wedstrijd vallen.");
  }
  for (const player of input.players) {
    if (player.maxMinutes !== undefined && (!Number.isFinite(player.maxMinutes) || player.maxMinutes < 0 || player.maxMinutes > duration)) errors.push("Minuten van de coach moeten tussen 0 en de wedstrijdduur liggen.");
    if (player.availability === "present" && player.maxMinutes !== undefined &&
        (keeperKeys.has(player.key) ? player.maxMinutes < (changeKeeper ? duration / 2 : duration) : player.lockedSlotId !== undefined && player.maxMinutes < duration)) {
      errors.push("Een minutengrens botst met de gekozen keeperafspraak of een vaste veldplek.");
    }
    if ([player.primaryPosition, player.secondaryPosition].some((position) => position !== null && canonicalPosition(position) === null)) {
      errors.push("Een positievoorkeur is onbekend. Kies een geldige positie of laat de voorkeur open.");
    }
    if (player.lockedSlotId !== undefined && (player.availability !== "present" ||
        !slots.some((slot) => slot.id === player.lockedSlotId) ||
        (player.key === input.keeperKey) !== (player.lockedSlotId === keeperSlots[0]?.id))) {
      errors.push("Een vastgezette plek conflicteert met beschikbaarheid, keeper of formatie.");
    }
  }
  const locks = input.players.flatMap((player) => player.lockedSlotId === undefined ? [] : [player.lockedSlotId]);
  if (new Set(locks).size !== locks.length) errors.push("Twee spelers staan vast op dezelfde plek.");
  if (errors.length || !keeper) return { ok: false, errors: [...new Set(errors)] };

  const collected = collectEvidence(input);
  const warnings = new Set(collected.warnings);
  const facts = new Map(collected.evidence.map((row) => [row.playerKey, row]));
  const outfieldPlayers = available.filter((player) => !keeperKeys.has(player.key)).map((player) => ({
    ...player, primaryPosition: canonicalPosition(player.primaryPosition), secondaryPosition: canonicalPosition(player.secondaryPosition),
  }));
  const hasFieldMinutes = outfieldPlayers.every((player) => (facts.get(player.key)?.eligibleFieldMinutes ?? 0) > 0);
  const hasRecordedMinutes = outfieldPlayers.every((player) => (facts.get(player.key)?.recordedEligibleMinutes ?? 0) > 0);
  const minuteBasis = hasFieldMinutes ? "field" as const : "recorded" as const;
  const useMinutes = hasFieldMinutes || hasRecordedMinutes;
  if (!hasFieldMinutes && hasRecordedMinutes) warnings.add("Geregistreerde speelminuten uit DIA Live zijn meegewogen. De verdeling tussen keeper- en veldminuten is niet volledig vastgelegd.");
  const useStarts = outfieldPlayers.every((player) => facts.get(player.key)?.starts !== null);
  if (!useMinutes) warnings.add("Onvoldoende gecontroleerde minuten voor de volledige selectie: historische minuten zijn niet meegewogen. De verdeling binnen dit voorstel wordt wel berekend.");
  if (!useStarts) warnings.add("Eerdere basisplaatsen zijn niet voor iedereen bevestigd en worden niet als eerlijkheidscriterium gebruikt.");
  if (input.players.some((player) => player.availability === "unknown")) warnings.add("Spelers met onbekende beschikbaarheid zijn niet opgesteld.");
  const plannedMinutes = new Map(available.map((player) => [player.key, 0]));
  const boundaries = new Set([duration]);
  if (input.includeSubstitutions) {
    for (let minute = input.intervalMinutes; minute < duration; minute += input.intervalMinutes) boundaries.add(minute);
  }
  if (changeKeeper) boundaries.add(duration / 2);
  const moments = [...boundaries].sort((a, b) => a - b);
  if (input.startingField) {
    const start = input.startingField;
    if (start.length !== slots.length || new Set(start.map((entry) => entry.slotId)).size !== slots.length ||
        new Set(start.map((entry) => entry.playerKey)).size !== slots.length ||
        start.some((entry) => !slots.some((slot) => slot.id === entry.slotId) || !available.some((player) => player.key === entry.playerKey))) {
      return { ok: false, errors: ["Vul iedere beginpositie met een andere beschikbare speler."] };
    }
    if (!start.some((entry) => entry.slotId === keeperSlots[0].id && entry.playerKey === keeper.key) ||
        secondKeeper && start.some((entry) => entry.playerKey === secondKeeper.key)) {
      return { ok: false, errors: ["De beginopstelling botst met de keeperafspraken. Zet de eerste keeper op doel en de tweede keeper op de bank."] };
    }
    if (available.some((player) => player.lockedSlotId !== undefined && !start.some((entry) => entry.playerKey === player.key && entry.slotId === player.lockedSlotId))) {
      return { ok: false, errors: ["De beginopstelling botst met een vaste plek van de coach."] };
    }
    if (start.some((entry) => (available.find((player) => player.key === entry.playerKey)?.maxMinutes ?? duration) < moments[0])) {
      return { ok: false, errors: ["Een basisspeler mag minder minuten spelen dan het eerste speelblok. Kies een andere basisspeler of een korter wisselinterval."] };
    }
  }
  if (outfieldPlayers.reduce((total, player) => total + (player.maxMinutes ?? duration), 0) < duration * fieldSlots.length) {
    return { ok: false, errors: ["Met deze minutengrenzen zijn er onvoldoende speelminuten om alle veldplekken te bezetten."] };
  }
  const choose = (reference: DemoPlan["startingLineup"]["field"], kickoff: boolean, activeKeeper = keeper, blockMinutes = moments[0]) => {
    const eligible = outfieldPlayers.filter((player) => player.maxMinutes === undefined || (plannedMinutes.get(player.key) ?? 0) + blockMinutes <= player.maxMinutes + 1e-6);
    const assignment = assignField({ players: eligible, slots: fieldSlots, evidence: facts, plannedMinutes,
      duration, useMinutes, useStarts, reference, kickoff, minuteBasis });
    return assignment ? [{ playerKey: activeKeeper.key, slotId: keeperSlots[0].id }, ...assignment] : null;
  };
  const startingField = input.startingField?.map((entry) => ({ ...entry })) ?? choose(input.plan.startingLineup.field, true);
  if (!startingField) return { ok: false, errors: ["Geen volledige opstelling mogelijk met deze voorkeuren en vaste plekken. Controleer de selectie, minutengrenzen en alternatieve posities."] };
  const steps: DemoPlan["steps"] = [];
  let field = startingField;
  let elapsed = 0;
  for (const [index, boundary] of moments.entries()) {
    for (const entry of field) plannedMinutes.set(entry.playerKey, (plannedMinutes.get(entry.playerKey) ?? 0) + boundary - elapsed);
    elapsed = boundary;
    if (elapsed >= duration) break;
    const activeKeeper = secondKeeper && elapsed >= duration / 2 ? secondKeeper : keeper;
    const next = choose(field, false, activeKeeper, moments[index + 1] - elapsed);
    if (!next) return { ok: false, errors: [`Het wisselplan kan vanaf minuut ${elapsed} niet volledig worden bezet. Pas het wisselinterval, minutengrenzen, voorkeuren of vaste plekken aan.`] };
    const transition = buildTransition(field, next, elapsed);
    // Each intermediate action must identify the player now occupying the GK slot.
    for (const action of transition.actions) {
      if (keeperKeys.has(action.playerInKey) && action.playerInKey === activeKeeper.key) action.keeperKey = activeKeeper.key;
    }
    if (transition.actions.length) steps.push(transition);
    field = next;
  }
  const availability = new Map(input.players.map((player) => [player.key, player.availability]));
  const plan: DemoPlan = {
    ...input.plan,
    players: input.plan.players.map((player) => {
      const next = { ...player, absent: availability.get(player.key) !== "present" };
      delete next.sourceBenchMinutes;
      delete next.unavailableReason;
      if (availability.get(player.key) === "injured") next.unavailableReason = "injured";
      return next;
    }),
    startingLineup: { keeperKey: keeper.key, field: startingField,
      bench: available.filter((player) => !startingField.some((entry) => entry.playerKey === player.key)).map((player) => player.key) },
    steps, review: { sourceConfirmed: false, unresolved: [], integrationRequired: [] },
  };
  const report = validatePortableSubstitutionPlan(plan);
  if (!report.structurallyValid || !report.simulationComplete) return { ok: false, errors: report.issues.filter((issue) => issue.severity === "error").map((issue) => issue.message) };
  for (const snapshot of report.snapshots) {
    for (const entry of snapshot.field) {
      if (keeperKeys.has(entry.playerKey)) continue;
      const player = outfieldPlayers.find((candidate) => candidate.key === entry.playerKey);
      const slot = slots.find((candidate) => candidate.id === entry.slotId);
      const evidence = facts.get(entry.playerKey);
      if (!player || !slot || !evidence) continue;
      const fit = positionFit(player, slot.position, evidence);
      if (fit === "unknown") warnings.add("Er zijn voorgestelde posities zonder bekende voorkeur of bevestigde positiehistorie. Controleer deze plekken als coach.");
      if (fit === "zone") warnings.add("Sommige spelers staan op een andere plek binnen hun voorkeurslinie. Controleer of dat passend is.");
      if (fit === "other") warnings.add("Voor een gelijke speeltijd staan sommige spelers buiten hun voorkeurslinie. Controleer deze posities als coach.");
    }
  }
  const fieldMinutes = report.minutes.byPlayer.filter((row) => !keeperKeys.has(row.playerKey)).map((row) => row.playingMinutes);
  if (input.includeSubstitutions && fieldMinutes.length && Math.max(...fieldMinutes) - Math.min(...fieldMinutes) > input.intervalMinutes + 1e-6) {
    warnings.add("Minutenafspraken of vaste plekken beperken de gelijke minutenverdeling. Bekijk de verschillen per speler.");
  }
  const reasons = startingField.map((entry) => {
    if (entry.playerKey === keeper.key) return { ...entry, text: secondKeeper ? "Door de coach gekozen keeper voor de eerste helft; de tweede keeper neemt het na de rust over. Beide keepers zitten hun andere helft op de bank." : "Door de coach gekozen keeper; blijft tijdens dit voorstel op doel." };
    const player = outfieldPlayers.find((candidate) => candidate.key === entry.playerKey)!;
    const slot = slots.find((candidate) => candidate.id === entry.slotId)!;
    const evidence = facts.get(entry.playerKey)!;
    const fit = positionFit(player, slot.position, evidence);
    const labels = { primary: "Eerste positievoorkeur", secondary: "Tweede positievoorkeur", history: "Bevestigde eerdere basispositie", zone: "Andere plek binnen de voorkeurslinie", unknown: "Positievoorkeur onbekend; controleer deze plek", other: "Andere positie om de speeltijd eerlijk te verdelen; controleer deze plek" };
    const parts = input.startingField
      ? ["Door de coach gekozen beginpositie; vanaf het eerste wisselmoment verdeelt de assistent de minuten"]
      : [fit ? labels[fit] : "Controleer deze positie"];
    if (player.lockedSlotId !== undefined) parts.push("vaste plek van de coach");
    if (useMinutes && evidence.fieldMinutes !== null && evidence.eligibleFieldMinutes !== null) parts.push(`${Math.round(evidence.fieldMinutes * 10) / 10} van ${Math.round(evidence.eligibleFieldMinutes * 10) / 10} beschikbare veldminuten in ${evidence.confirmedGames} gecontroleerde wedstrijd(en)`);
    return { ...entry, text: parts.join(" · ") };
  });
  return { ok: true, proposal: { plan, warnings: [...warnings], evidence: collected.evidence, reasons,
    historicalMinuteBasis: useMinutes ? minuteBasis : null,
    usesHistoricalMinutes: useMinutes, usesHistoricalStarts: useStarts } };
}
