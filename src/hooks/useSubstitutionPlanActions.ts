"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createCorrelationId } from "@/lib/correlationId";

export type PlanAddFormPayload = {
  playerOutId: Id<"players">;
  playerInId: Id<"players">;
  kind?: "substitution" | "positionSwap";
  targetQuarter?: number;
  targetMinute?: number;
  note?: string;
};

/**
 * Bundles substitution-plan mutations with shared busy/error state so both the
 * coach tab panel and the wide planscherm can drive the same actions.
 */
export function useSubstitutionPlanActions(matchId: Id<"matches">) {
  const addPlanItem = useMutation(api.substitutionPlans.addPlanItem);
  const skipPlanItem = useMutation(api.substitutionPlans.skipPlanItem);
  const executePlanItem = useMutation(api.substitutionPlans.executePlanItem);
  const removePlanItem = useMutation(api.substitutionPlans.removePlanItem);
  const clearPendingPlan = useMutation(api.substitutionPlans.clearPendingPlan);
  const updatePlanItem = useMutation(api.substitutionPlans.updatePlanItem);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (
    key: string,
    action: () => Promise<unknown>
  ): Promise<boolean> => {
    setError(null);
    try {
      setBusy(key);
      await action();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const addFromForm = async (payload: PlanAddFormPayload): Promise<boolean> => {
    const body: Parameters<typeof addPlanItem>[0] = {
      matchId,
      playerOutId: payload.playerOutId,
      playerInId: payload.playerInId,
      insertAtQuarterBoundary:
        payload.targetQuarter !== undefined &&
        payload.targetMinute === undefined,
    };
    if (payload.kind !== undefined) {
      body.kind = payload.kind;
    }
    if (payload.targetQuarter !== undefined) {
      body.targetQuarter = payload.targetQuarter;
    }
    if (payload.targetMinute !== undefined) {
      body.targetMinute = payload.targetMinute;
    }
    if (payload.note) {
      body.note = payload.note;
    }
    return run("add", () => addPlanItem(body));
  };

  const addSubstitution = async (
    playerOutId: Id<"players">,
    playerInId: Id<"players">,
    targetQuarter: number,
    targetMinute?: number
  ): Promise<boolean> => {
    const body: Parameters<typeof addPlanItem>[0] = {
      matchId,
      playerOutId,
      playerInId,
      targetQuarter,
      insertAtQuarterBoundary: targetMinute === undefined,
    };
    if (targetMinute !== undefined) {
      body.targetMinute = targetMinute;
    }
    return run("field-add", () => addPlanItem(body));
  };

  const addPositionSwap = async (
    playerAId: Id<"players">,
    playerBId: Id<"players">,
    targetQuarter: number,
    targetMinute?: number
  ): Promise<boolean> => {
    const body: Parameters<typeof addPlanItem>[0] = {
      matchId,
      playerOutId: playerAId,
      playerInId: playerBId,
      kind: "positionSwap",
      targetQuarter,
      insertAtQuarterBoundary: targetMinute === undefined,
    };
    if (targetMinute !== undefined) {
      body.targetMinute = targetMinute;
    }
    return run("field-swap", () => addPlanItem(body));
  };

  const remove = async (planId: Id<"substitutionPlans">): Promise<boolean> =>
    run(String(planId), () => removePlanItem({ planId }));

  const skip = async (planId: Id<"substitutionPlans">): Promise<boolean> =>
    run(String(planId), () => skipPlanItem({ planId }));

  const execute = async (planId: Id<"substitutionPlans">): Promise<boolean> =>
    run(String(planId), () =>
      executePlanItem({
        planId,
        correlationId: createCorrelationId("plan-exec"),
      })
    );

  const clearPending = async (): Promise<boolean> =>
    run("clear", () => clearPendingPlan({ matchId }));

  const updateTiming = async (
    planId: Id<"substitutionPlans">,
    timing: { targetMinute?: number; targetQuarter?: number }
  ): Promise<boolean> => {
    const body: Parameters<typeof updatePlanItem>[0] = { planId };
    if (timing.targetMinute !== undefined) {
      body.targetMinute = timing.targetMinute;
    }
    if (timing.targetQuarter !== undefined) {
      body.targetQuarter = timing.targetQuarter;
    }
    return run(`timing-${String(planId)}`, () => updatePlanItem(body));
  };

  return {
    error,
    busy,
    clearError: () => setError(null),
    addFromForm,
    addSubstitution,
    addPositionSwap,
    remove,
    skip,
    execute,
    clearPending,
    updateTiming,
  };
}
