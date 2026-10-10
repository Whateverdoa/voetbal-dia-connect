/** A standalone, nominal-time contract. It does not validate Convex IDs or live events. */
export interface PortableSubstitutionPlan {
  format?: "dia-substitution-plan";
  version?: 1;
  match: {
    regulationDurationMinutes: number;
    fieldPlayerCountIncludingKeeper: number;
    halftimeAtMinute?: number | null;
  };
  players: Array<{
    key: string;
    name: string;
    /** Shirt number for display and review; the stable key remains the identity. */
    number?: number | null;
    /** Not available for selection or minutes, including an injured squad member. */
    absent?: boolean;
    unavailableReason?: "injured";
    sourceBenchMinutes?: number | null;
  }>;
  formation: { slots: Array<{ id: number; position: string }> };
  startingLineup: {
    keeperKey: string;
    field: Array<{ playerKey: string; slotId: number }>;
    bench: string[];
  };
  steps: Array<{
    id: string;
    matchMinute: number;
    actions: Array<{
      id: string;
      kind: "substitution" | "positionSwap";
      playerOutKey: string;
      playerInKey: string;
      /** Required when this action changes which player occupies the GK slot. */
      keeperKey?: string;
    }>;
    sourceBench?: string[];
  }>;
  review?: {
    unresolved?: string[];
    /**
     * Explicit confirmation of the complete transcription, not individual clarifications.
     * Callers must clear this flag whenever the plan or source changes; this pure validator
     * cannot prove that a person reviewed the current revision.
     */
    sourceConfirmed?: boolean;
    integrationRequired?: string[];
  };
}

export interface PortablePlanIssue {
  code: string;
  severity: "error" | "warning" | "review";
  message: string;
  stepId?: string;
  actionId?: string;
  playerKeys?: string[];
}

export interface PortablePlanSnapshot {
  stepId?: string;
  matchMinute: number;
  field: Array<{ playerKey: string; slotId: number }>;
  bench: string[];
  keeperKey: string;
}

export interface PlannedPlayerMinutes {
  playerKey: string;
  name: string;
  /** Missing or invalid shirt numbers remain unknown; never derive them from a key. */
  number: number | null;
  playingMinutes: number;
  benchMinutes: number;
  keeperMinutes: number;
  /** Nominal playing minutes without a bench change; halftime is not elapsed time. */
  longestFieldStintMinutesNominal: number;
  longestBenchStintMinutesNominal: number;
  sourceBenchMinutes: number | null;
  sourceBenchMatches: boolean | null;
}

export interface PortableSubstitutionValidationReport {
  structurallyValid: boolean;
  simulationComplete: boolean;
  readyToPublish: boolean;
  sourceConfirmed: boolean;
  issues: PortablePlanIssue[];
  snapshots: PortablePlanSnapshot[];
  minutes: {
    scope: "complete" | "valid-prefix";
    throughMinute: number;
    basis: "nominal-playing-time-excluding-breaks";
    stintLabel: "Speelminuten zonder bankwissel (rust telt niet mee)";
    byPlayer: PlannedPlayerMinutes[];
  };
  totals?: {
    playingMinutes: number;
    benchMinutes: number;
    expectedPlayingMinutes: number;
    expectedBenchMinutes: number;
  };
  distribution?: {
    /** All players with any keeper duty are reported separately. */
    fieldPlayerKeys: string[];
    keeperPlayerKeys: string[];
    minimumPlayingMinutes: number | null;
    maximumPlayingMinutes: number | null;
    playingGapMinutes: number | null;
    message: string;
  };
  sourceChecks: {
    bankListsChecked: number;
    playerMinutesChecked: number;
    playerKeysWithoutSourceMinutes: string[];
  };
  /** A portable plan alone cannot establish an app match, permissions or player mapping. */
  appIntegration: { status: "not-validated"; requirements: string[] };
  stoppedAt?: { stepId: string; actionId?: string };
}

type IssueRef = Pick<PortablePlanIssue, "stepId" | "actionId" | "playerKeys">;
type State = { field: Map<string, number>; bench: Set<string>; keeperKey: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";
const validPlayerNumber = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
const stringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

/** Checks the supported boundary before using imported JSON; extra presentation fields are ignored. */
function hasPortableShape(value: unknown): value is PortableSubstitutionPlan {
  if (!isRecord(value) || !isRecord(value.match) || !isRecord(value.formation) ||
      !isRecord(value.startingLineup)) return false;
  if (value.format !== undefined && value.format !== "dia-substitution-plan") return false;
  if (value.version !== undefined && value.version !== 1) return false;
  if (!isNumber(value.match.regulationDurationMinutes) ||
      !isNumber(value.match.fieldPlayerCountIncludingKeeper) ||
      (value.match.halftimeAtMinute != null && !isNumber(value.match.halftimeAtMinute))) return false;
  if (!Array.isArray(value.players) || !value.players.every((player: unknown) =>
    isRecord(player) && isString(player.key) && isString(player.name) &&
    (player.number == null || isNumber(player.number)) &&
    (player.absent === undefined || typeof player.absent === "boolean") &&
    (player.sourceBenchMinutes == null || isNumber(player.sourceBenchMinutes)))) return false;
  if (!Array.isArray(value.formation.slots) || !value.formation.slots.every((slot: unknown) =>
    isRecord(slot) && isNumber(slot.id) && isString(slot.position))) return false;
  if (!isString(value.startingLineup.keeperKey) || !stringArray(value.startingLineup.bench) ||
      !Array.isArray(value.startingLineup.field) || !value.startingLineup.field.every((entry: unknown) =>
        isRecord(entry) && isString(entry.playerKey) && isNumber(entry.slotId))) return false;
  if (!Array.isArray(value.steps) || !value.steps.every((step: unknown) => {
    if (!isRecord(step) || !isString(step.id) || !isNumber(step.matchMinute) ||
        (step.sourceBench !== undefined && !stringArray(step.sourceBench)) ||
        !Array.isArray(step.actions)) return false;
    return step.actions.every((action: unknown) => isRecord(action) && isString(action.id) &&
      (action.kind === "substitution" || action.kind === "positionSwap") &&
      isString(action.playerOutKey) && isString(action.playerInKey) &&
      (action.keeperKey === undefined || isString(action.keeperKey)));
  })) return false;
  return value.review === undefined || (isRecord(value.review) &&
    (value.review.unresolved === undefined || stringArray(value.review.unresolved)) &&
    (value.review.integrationRequired === undefined || stringArray(value.review.integrationRequired)) &&
    (value.review.sourceConfirmed === undefined || typeof value.review.sourceConfirmed === "boolean"));
}

function snapshot(state: State, minute: number, stepId?: string): PortablePlanSnapshot {
  return {
    stepId,
    matchMinute: minute,
    field: [...state.field].map(([playerKey, slotId]) => ({ playerKey, slotId })),
    bench: [...state.bench],
    keeperKey: state.keeperKey,
  };
}

function calculateMinutes(
  plan: PortableSubstitutionPlan,
  snapshots: PortablePlanSnapshot[],
  throughMinute: number,
): PlannedPlayerMinutes[] {
  return plan.players.filter((player) => !player.absent).map((player) => {
    let playingMinutes = 0;
    let benchMinutes = 0;
    let keeperMinutes = 0;
    let fieldStint = 0;
    let benchStint = 0;
    let longestFieldStintMinutesNominal = 0;
    let longestBenchStintMinutesNominal = 0;
    for (let index = 0; index < snapshots.length; index++) {
      const current = snapshots[index];
      const duration = (snapshots[index + 1]?.matchMinute ?? throughMinute) - current.matchMinute;
      if (duration <= 0) continue;
      if (current.field.some((entry) => entry.playerKey === player.key)) {
        playingMinutes += duration;
        fieldStint += duration;
        benchStint = 0;
        longestFieldStintMinutesNominal = Math.max(longestFieldStintMinutesNominal, fieldStint);
        if (current.keeperKey === player.key) keeperMinutes += duration;
      } else {
        benchMinutes += duration;
        benchStint += duration;
        fieldStint = 0;
        longestBenchStintMinutesNominal = Math.max(longestBenchStintMinutesNominal, benchStint);
      }
    }
    return {
      playerKey: player.key,
      name: player.name,
      number: validPlayerNumber(player.number) ? player.number : null,
      playingMinutes, benchMinutes, keeperMinutes,
      longestFieldStintMinutesNominal, longestBenchStintMinutesNominal,
      sourceBenchMinutes: player.sourceBenchMinutes ?? null,
      sourceBenchMatches: null,
    };
  });
}

/**
 * Executes each ordered step atomically. An invalid step stops dependent simulation;
 * only minutes before that step are returned. Source discrepancies do not rewrite the plan.
 * All time is scheduled playing time, never recorded or stopwatch time.
 */
export function validatePortableSubstitutionPlan(
  input: unknown,
  options: { maxFieldPlayerPlayingGapMinutes?: number } = {},
): PortableSubstitutionValidationReport {
  const issues: PortablePlanIssue[] = [];
  const add = (code: string, severity: PortablePlanIssue["severity"], message: string, ref: IssueRef = {}) =>
    issues.push({ code, severity, message, ...ref });
  const report: PortableSubstitutionValidationReport = {
    structurallyValid: false,
    simulationComplete: false,
    readyToPublish: false,
    sourceConfirmed: false,
    issues,
    snapshots: [],
    minutes: {
      scope: "valid-prefix", throughMinute: 0,
      basis: "nominal-playing-time-excluding-breaks",
      stintLabel: "Speelminuten zonder bankwissel (rust telt niet mee)",
      byPlayer: [],
    },
    sourceChecks: { bankListsChecked: 0, playerMinutesChecked: 0, playerKeysWithoutSourceMinutes: [] },
    appIntegration: {
      status: "not-validated",
      requirements: ["Kies een wedstrijd en controleer de wedstrijdinstellingen.",
        "Koppel de spelers aan de aanwezige wedstrijdselectie.",
        "Laat de appadapter rechten en import opnieuw controleren."],
    },
  };
  if (!hasPortableShape(input)) {
    add("INVALID_FORMAT", "error", "Het wisselblad heeft ontbrekende of ongeldige velden. Controleer wedstrijd, spelers, opstelling en wisselregels (formaatversie 1)." );
    return report;
  }
  const plan = input;
  const duration = plan.match.regulationDurationMinutes;
  const fieldCount = plan.match.fieldPlayerCountIncludingKeeper;
  report.sourceConfirmed = plan.review?.sourceConfirmed === true;
  report.appIntegration.requirements = [...new Set([
    ...report.appIntegration.requirements, ...(plan.review?.integrationRequired ?? []),
  ])];
  if (!report.sourceConfirmed) {
    add("SOURCE_REVIEW_REQUIRED", "review", "Controleer de volledige overname naast de foto en bevestig die. Een kloppende berekening bewijst niet dat het handschrift goed is gelezen.");
  }
  for (const unresolved of plan.review?.unresolved ?? []) {
    add("UNRESOLVED_REVIEW", "review", `Los deze open controle eerst op: ${unresolved}`);
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    add("INVALID_DURATION", "error", "Vul een eindige, positieve wedstrijdduur in speelminuten in.");
  }
  if (!Number.isInteger(fieldCount) || fieldCount < 1) {
    add("INVALID_FIELD_COUNT", "error", "Vul een positief, geheel aantal spelers op het veld in, inclusief keeper.");
  }
  if (plan.match.halftimeAtMinute != null && (!Number.isFinite(plan.match.halftimeAtMinute) ||
      plan.match.halftimeAtMinute <= 0 || plan.match.halftimeAtMinute >= duration)) {
    add("INVALID_HALFTIME", "error", "Plaats de rust tussen aftrap en einde; rustduur telt niet mee in de speelminuten.");
  }
  const players = new Map<string, PortableSubstitutionPlan["players"][number]>();
  const presentPlayerNumbers = new Map<number, string[]>();
  for (const player of plan.players) {
    if (!player.key.trim() || players.has(player.key)) {
      add("DUPLICATE_PLAYER", "error", "Geef iedere speler een eigen, niet-lege sleutel; voeg verschillende spelers met dezelfde naam niet samen.", { playerKeys: [player.key] });
    }
    if (!player.name.trim()) add("MISSING_PLAYER_NAME", "error", "Vul de naam van deze speler in.", { playerKeys: [player.key] });
    if (!player.absent) {
      if (player.number == null) {
        add("MISSING_PLAYER_NUMBER", "review", `Vul het rugnummer van ${player.name} in en controleer het naast de naam. Leid het nummer niet af uit de spelerssleutel.`, { playerKeys: [player.key] });
      } else if (!validPlayerNumber(player.number)) {
        add("INVALID_PLAYER_NUMBER", "review", `Controleer het rugnummer van ${player.name}: gebruik een eindig, geheel getal van 0 of hoger.`, { playerKeys: [player.key] });
      } else {
        presentPlayerNumbers.set(player.number, [...(presentPlayerNumbers.get(player.number) ?? []), player.key]);
      }
    }
    players.set(player.key, player);
  }
  for (const [number, playerKeys] of presentPlayerNumbers) {
    if (playerKeys.length > 1) {
      add("DUPLICATE_PLAYER_NUMBER", "review", `Rugnummer ${number} staat bij meerdere aanwezige spelers. Controleer de naam en het juiste rugnummer van iedere speler.`, { playerKeys });
    }
  }
  const slots = new Set<number>();
  for (const slot of plan.formation.slots) {
    if (!Number.isInteger(slot.id) || slot.id < 0 || slots.has(slot.id)) {
      add("DUPLICATE_OR_INVALID_SLOT", "error", "Geef iedere veldpositie een uniek, niet-negatief geheel positienummer.");
    }
    slots.add(slot.id);
  }
  const keeperSlots = plan.formation.slots.filter((slot) => slot.position === "GK");
  if (keeperSlots.length !== 1) add("INVALID_KEEPER_SLOT", "error", "Wijs precies één keeperpositie met code GK aan.");
  if (slots.size !== fieldCount) add("FORMATION_COUNT_MISMATCH", "error", "Laat het aantal veldposities overeenkomen met het gekozen aantal spelers inclusief keeper.");
  const seenStarting = new Set<string>();
  const seenStartingSlots = new Set<number>();
  for (const key of [...plan.startingLineup.field.map((entry) => entry.playerKey), ...plan.startingLineup.bench]) {
    if (seenStarting.has(key)) add("DUPLICATE_STARTING_PLAYER", "error", "Deze speler staat dubbel in de beginopstelling of tegelijk op het veld en de bank. Kies één plek.", { playerKeys: [key] });
    seenStarting.add(key);
    if (!players.has(key)) add("UNKNOWN_STARTING_PLAYER", "error", "Koppel deze speler in de beginopstelling aan de spelerslijst.", { playerKeys: [key] });
    if (players.get(key)?.absent) add("ABSENT_STARTING_PLAYER", "error", "Haal deze afwezige speler uit de beginopstelling en van de bank.", { playerKeys: [key] });
  }
  for (const entry of plan.startingLineup.field) {
    if (!slots.has(entry.slotId)) add("UNKNOWN_STARTING_SLOT", "error", "Kies een bestaande veldpositie voor deze speler.", { playerKeys: [entry.playerKey] });
    if (seenStartingSlots.has(entry.slotId)) add("OCCUPIED_STARTING_SLOT", "error", "Er staan twee spelers op dezelfde veldpositie. Geef iedere speler een eigen positie.", { playerKeys: [entry.playerKey] });
    seenStartingSlots.add(entry.slotId);
  }
  for (const player of plan.players) {
    if (!player.absent && !seenStarting.has(player.key)) add("MISSING_STARTING_PLAYER", "error", "Zet iedere aanwezige speler op het veld of op de bank.", { playerKeys: [player.key] });
  }
  if (plan.startingLineup.field.length !== fieldCount) add("STARTING_FIELD_COUNT", "error", `Controleer de beginopstelling: er moeten ${fieldCount} spelers op het veld staan, inclusief keeper.`);
  let state: State = {
    field: new Map(plan.startingLineup.field.map((entry) => [entry.playerKey, entry.slotId])),
    bench: new Set(plan.startingLineup.bench),
    keeperKey: plan.startingLineup.keeperKey,
  };
  const validKeeper = (candidate: State) => keeperSlots.length === 1 &&
    candidate.field.get(candidate.keeperKey) === keeperSlots[0].id;
  if (!validKeeper(state)) add("INVALID_STARTING_KEEPER", "error", "Zet de aangewezen keeper op de GK-positie in de beginopstelling.", { playerKeys: [state.keeperKey] });
  if (issues.some((issue) => issue.severity === "error")) return report;

  report.snapshots.push(snapshot(state, 0));
  const stepIds = new Set<string>();
  const actionIds = new Set<string>();
  let lastMinute = 0;
  let throughMinute = 0;
  let simultaneousSubstitutions = new Set<string>();
  let simultaneousPositionPairs = new Set<string>();
  for (const step of plan.steps) {
    const ref = { stepId: step.id };
    let invalid = false;
    const fail = (code: string, message: string, actionRef: IssueRef = {}) => {
      invalid = true;
      add(code, "error", message, { ...ref, ...actionRef });
      report.stoppedAt = { stepId: step.id, actionId: actionRef.actionId };
    };
    if (!step.id.trim() || stepIds.has(step.id)) fail("DUPLICATE_STEP", "Geef elk wisselmoment een eigen, niet-lege sleutel.");
    stepIds.add(step.id);
    if (!Number.isFinite(step.matchMinute) || step.matchMinute < 0 || step.matchMinute > duration) {
      fail("INVALID_STEP_MINUTE", `Kies een eindige wisselminuut tussen 0 en ${duration}.`);
    } else if (step.matchMinute < lastMinute) {
      fail("STEP_OUT_OF_ORDER", "Zet de wisselmomenten in oplopende tijdsvolgorde; de controle sorteert de lijst niet automatisch.");
    }
    if (invalid) break;
    throughMinute = step.matchMinute;
    if (step.matchMinute !== lastMinute) {
      simultaneousSubstitutions = new Set();
      simultaneousPositionPairs = new Set();
    }
    const candidate: State = { field: new Map(state.field), bench: new Set(state.bench), keeperKey: state.keeperKey };
    for (const action of step.actions) {
      const { playerOutKey: outKey, playerInKey: inKey } = action;
      const actionRef = { actionId: action.id, playerKeys: [outKey, inKey] };
      if (!action.id.trim() || actionIds.has(action.id)) {
        fail("DUPLICATE_ACTION", "Geef elke wisselregel in het hele blad een eigen, niet-lege sleutel.", actionRef);
        break;
      }
      actionIds.add(action.id);
      if (!players.has(outKey) || !players.has(inKey)) {
        fail("UNKNOWN_ACTION_PLAYER", "Een naam in deze wisselregel is niet gekoppeld aan de spelerslijst. Koppel de juiste speler.", actionRef);
        break;
      }
      if (players.get(outKey)?.absent || players.get(inKey)?.absent) {
        fail("ABSENT_ACTION_PLAYER", "Deze wissel gebruikt een afwezige speler. Pas de wissel of de aanwezigheidslijst aan.", actionRef);
        break;
      }
      if (outKey === inKey) {
        fail("SELF_SWAP", "Een speler kan niet met zichzelf wisselen. Kies twee verschillende spelers.", actionRef);
        break;
      }
      if (!candidate.field.has(outKey)) {
        fail("OUT_NOT_ON_FIELD", "De uitgaande speler staat op dit moment niet op het veld. Controleer deze en eerdere wissels.", actionRef);
        break;
      }
      if (action.kind === "substitution") {
        if (!candidate.bench.has(inKey)) {
          fail("IN_NOT_ON_BENCH", "De invaller zit op dit moment niet op de bank. Controleer deze en eerdere wissels.", actionRef);
          break;
        }
        if (simultaneousSubstitutions.has(outKey) || simultaneousSubstitutions.has(inKey)) {
          fail("CONFLICTING_SIMULTANEOUS_SUBSTITUTION", "Deze speler wordt op dezelfde minuut meermaals in- of uitgewisseld. Verwijder de tegenstrijdige wissel of verduidelijk het tijdstip.", actionRef);
          break;
        }
        const slot = candidate.field.get(outKey)!;
        candidate.field.delete(outKey);
        candidate.field.set(inKey, slot);
        candidate.bench.delete(inKey);
        candidate.bench.add(outKey);
        simultaneousSubstitutions.add(outKey);
        simultaneousSubstitutions.add(inKey);
      } else {
        if (!candidate.field.has(inKey)) {
          fail("POSITION_SWAP_NOT_ON_FIELD", "Voor een positiewissel moeten beide spelers op het veld staan. Controleer de volgorde van deze regels.", actionRef);
          break;
        }
        const pair = JSON.stringify([outKey, inKey].sort());
        if (simultaneousPositionPairs.has(pair)) {
          fail("DUPLICATE_SIMULTANEOUS_POSITION_SWAP", "Deze twee spelers wisselen op dezelfde minuut dubbel van positie. Verwijder de dubbele regel.", actionRef);
          break;
        }
        const outSlot = candidate.field.get(outKey)!;
        candidate.field.set(outKey, candidate.field.get(inKey)!);
        candidate.field.set(inKey, outSlot);
        simultaneousPositionPairs.add(pair);
      }
      if (action.keeperKey !== undefined) candidate.keeperKey = action.keeperKey;
      if (!validKeeper(candidate)) {
        fail("INVALID_KEEPER_AFTER_ACTION", "Wijs bij deze wissel expliciet de speler op de GK-positie aan als keeper (keeperKey).", actionRef);
        break;
      }
      if (candidate.field.size !== fieldCount || new Set(candidate.field.values()).size !== fieldCount ||
          candidate.field.size + candidate.bench.size !== players.size - plan.players.filter((player) => player.absent).length) {
        fail("INVALID_STATE_AFTER_ACTION", "Deze wissel bewaart het aantal spelers of veldposities niet. Herstel de regel.", actionRef);
        break;
      }
    }
    if (invalid) break;
    state = candidate;
    lastMinute = step.matchMinute;
    report.snapshots.push(snapshot(state, step.matchMinute, step.id));
    if (step.sourceBench !== undefined) {
      report.sourceChecks.bankListsChecked++;
      const source = new Set(step.sourceBench);
      if (source.size !== step.sourceBench.length || source.size !== state.bench.size ||
          [...source].some((key) => !state.bench.has(key))) {
        add("SOURCE_BENCH_MISMATCH", "error", "De banklijst op de bron komt niet overeen met de berekende bank. Controleer de namen en wissels op deze minuut.", {
          ...ref, playerKeys: [...new Set([...step.sourceBench, ...state.bench])].filter((key) => source.has(key) !== state.bench.has(key)),
        });
      }
    }
  }
  report.simulationComplete = report.stoppedAt === undefined;
  report.structurallyValid = report.simulationComplete;
  if (report.simulationComplete) throughMinute = duration;
  report.minutes.throughMinute = throughMinute;
  report.minutes.scope = report.simulationComplete ? "complete" : "valid-prefix";
  report.minutes.byPlayer = calculateMinutes(plan, report.snapshots, throughMinute);
  report.sourceChecks.playerKeysWithoutSourceMinutes = plan.players
    .filter((player) => !player.absent && player.sourceBenchMinutes == null).map((player) => player.key);
  if (report.simulationComplete) {
    for (const player of report.minutes.byPlayer) {
      if (player.sourceBenchMinutes === null) continue;
      report.sourceChecks.playerMinutesChecked++;
      player.sourceBenchMatches = Number.isFinite(player.sourceBenchMinutes) &&
        Math.abs(player.sourceBenchMinutes - player.benchMinutes) < 1e-9;
      if (!player.sourceBenchMatches) add("SOURCE_MINUTES_MISMATCH", "error", `De bron vermeldt ${player.sourceBenchMinutes} bankminuten; de wissels leveren ${player.benchMinutes} op. Controleer de bron en de wisselregels.`, { playerKeys: [player.playerKey] });
    }
    const presentCount = plan.players.filter((player) => !player.absent).length;
    report.totals = {
      playingMinutes: report.minutes.byPlayer.reduce((sum, player) => sum + player.playingMinutes, 0),
      benchMinutes: report.minutes.byPlayer.reduce((sum, player) => sum + player.benchMinutes, 0),
      expectedPlayingMinutes: duration * fieldCount,
      expectedBenchMinutes: duration * (presentCount - fieldCount),
    };
    if (Math.abs(report.totals.playingMinutes - report.totals.expectedPlayingMinutes) > 1e-9 ||
        Math.abs(report.totals.benchMinutes - report.totals.expectedBenchMinutes) > 1e-9) {
      add("MINUTE_CONSERVATION_FAILED", "error", "De totale veld- en bankminuten sluiten niet aan op de wedstrijdduur. Herstel het plan voordat je het gebruikt.");
    }
    const fieldPlayers = report.minutes.byPlayer.filter((player) => player.keeperMinutes === 0);
    const minimum = fieldPlayers.length ? Math.min(...fieldPlayers.map((player) => player.playingMinutes)) : null;
    const maximum = fieldPlayers.length ? Math.max(...fieldPlayers.map((player) => player.playingMinutes)) : null;
    const gap = minimum === null || maximum === null ? null : maximum - minimum;
    report.distribution = {
      fieldPlayerKeys: fieldPlayers.map((player) => player.playerKey),
      keeperPlayerKeys: report.minutes.byPlayer.filter((player) => player.keeperMinutes > 0).map((player) => player.playerKey),
      minimumPlayingMinutes: minimum,
      maximumPlayingMinutes: maximum,
      playingGapMinutes: gap,
      message: gap === null ? "Geen afzonderlijke veldspelers om te vergelijken." :
        `Veldspelers: ${minimum}–${maximum} geplande speelminuten (verschil ${gap}). Beoordeel de verdeling met de coach; gelijke minuten zijn geen automatische eis. Keepers staan apart.`,
    };
    const limit = options.maxFieldPlayerPlayingGapMinutes;
    if (limit !== undefined && (!Number.isFinite(limit) || limit < 0)) {
      add("INVALID_PLAYING_GAP_LIMIT", "error", "Kies een eindige, niet-negatieve grens voor het verschil in geplande speelminuten.");
    } else if (limit !== undefined && gap !== null && gap > limit) {
      add("PLAYING_GAP_EXCEEDS_LIMIT", "warning", `Het verschil in geplande speelminuten is ${gap}; de gekozen grens is ${limit}. Bekijk de verdeling van de veldspelers.`, { playerKeys: fieldPlayers.map((player) => player.playerKey) });
    }
  }
  report.readyToPublish = report.simulationComplete && report.sourceConfirmed &&
    !issues.some((issue) => issue.severity === "error" || issue.severity === "review");
  return report;
}
