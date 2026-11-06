import type { DemoPlan } from "../substitutions/demoPlan";
import { validatePortableSubstitutionPlan } from "../substitutions/validatePortableSubstitutionPlan";

export type PlanTiming = { id: string; quarter?: number; minute?: number };

export function openingActionIds(timing: readonly PlanTiming[]): string[] {
  return timing.filter((row) => (row.quarter ?? 1) === 1 && row.minute !== undefined && row.minute >= 0 && row.minute <= 1).map((row) => row.id);
}

/** Opt-in interpretation of a minute entered within its selected period. */
export function preparationMinute(row: PlanTiming, duration: number, quarterCount: number): number | undefined {
  const start = ((row.quarter ?? 1) - 1) * duration / quarterCount;
  return row.minute === undefined ? (row.quarter === undefined ? undefined : start) : row.minute < start ? start + row.minute : row.minute;
}

/** Only changes a local draft; no clock, events, historical minutes or app writes. */
export function planFromOpeningLineup(plan: DemoPlan, timing: readonly PlanTiming[], quarterCount: number, overrides: Record<string, number> = {}): { plan: DemoPlan; error?: never } | { error: string; plan?: never } {
  const ids = new Set(openingActionIds(timing));
  const prefixSteps = plan.steps.filter((step) => step.matchMinute <= 1).map((step) => ({ ...step, actions: step.actions.filter((action) => ids.has(action.id)) })).filter((step) => step.actions.length > 0);
  if (!ids.size || prefixSteps.reduce((count, step) => count + step.actions.length, 0) !== ids.size) return { error: "De acties voor de beginopstelling zijn niet volledig geladen. Laad het actuele plan opnieuw." };
  const report = validatePortableSubstitutionPlan({ ...plan, steps: prefixSteps, review: { sourceConfirmed: false, unresolved: [] } });
  if (!report.structurallyValid || !report.simulationComplete) return { error: report.issues.find((issue) => issue.severity === "error")?.message ?? "De wissels op minuut 1 leveren geen geldige beginopstelling op." };
  const last = report.snapshots.at(-1);
  if (!last) return { error: "De beginopstelling kon niet worden bepaald." };
  const groups = new Map<number, DemoPlan["steps"][number]>();
  const remaining = plan.steps.flatMap((step) => step.actions.filter((action) => !ids.has(action.id)).map((action) => ({ action, minute: step.matchMinute })));
  // Moved actions follow the already planned actions at their new time. This
  // allows an incoming player to enter before swapping positions at that minute.
  remaining.sort((a, b) => Number(overrides[a.action.id] !== undefined) - Number(overrides[b.action.id] !== undefined));
  for (const { action, minute } of remaining) {
    const row = timing.find((item) => item.id === action.id);
    const target = overrides[action.id] ?? (row ? preparationMinute(row, plan.match.regulationDurationMinutes, quarterCount) : undefined) ?? minute;
    if (!Number.isFinite(target) || target <= 1 || target > plan.match.regulationDurationMinutes) return { error: "Kies voor de resterende acties een geldige wedstrijdminuut na minuut 1." };
    if (row?.quarter !== undefined && (target < (row.quarter - 1) * plan.match.regulationDurationMinutes / quarterCount || target > row.quarter * plan.match.regulationDurationMinutes / quarterCount)) return { error: "Een verplaatste positieruil moet binnen de gekozen helft of periode blijven." };
    const group = groups.get(target) ?? { id: `minute-${target}`, matchMinute: target, actions: [] };
    group.actions.push({ ...action }); groups.set(target, group);
  }
  return { plan: { ...structuredClone(plan), startingLineup: { keeperKey: last.keeperKey, field: last.field.map((entry) => ({ ...entry })), bench: [...last.bench] }, steps: [...groups.values()].sort((a, b) => a.matchMinute - b.matchMinute), review: { ...plan.review, sourceConfirmed: false } } };
}
