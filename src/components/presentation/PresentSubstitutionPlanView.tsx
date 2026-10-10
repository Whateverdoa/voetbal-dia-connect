"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import type { PitchLayout } from "@/lib/halfPitchLayout";
import {
  momentIdFromTiming,
  planTimingFromMoment,
  projectSubstitutionMoments,
} from "@/lib/substitutions/projectSubstitutionMoments";
import {
  addPlanPayload,
  parseMinuteDraft,
  pendingPlanIdsForMinuteUpdate,
  withMinuteDraft,
} from "@/lib/substitutions/kleedkamerPlanMinute";
import {
  toMatchPlayers,
  toPlanRows,
  type PresentPlanPlayer,
  type PresentPlanRow,
} from "@/lib/substitutions/presentPlanAdapters";
import { PitchBench } from "@/components/match/PitchBench";
import type { MatchPlayer } from "@/components/match/types";
import { PresentationPitchView } from "./PresentationPitchView";
import {
  numberLookupFromPlayers,
  WisselplanMomentList,
} from "./WisselplanMomentList";
import {
  KleedkamerEmptyPlan,
  KleedkamerPlanTimingBar,
  kleedkamerPlanHint,
} from "./KleedkamerPlanTimingBar";

interface PresentSubstitutionPlanViewProps {
  players: PresentPlanPlayer[];
  plans: PresentPlanRow[];
  quarterCount: number;
  formationId: string | undefined;
  resolvedFormation: Formation | undefined;
  customFormationKind?: "8v8" | "11v11";
  pitchLayout?: PitchLayout;
  matchId?: Id<"matches">;
  canEdit?: boolean;
}

function nameLabel(player: MatchPlayer): string {
  const first = player.name.trim().split(/\s+/)[0] || player.name;
  return first.slice(0, 12);
}

/** Wisselplan for kleedkamer / TV — editable when canEdit. */
export function PresentSubstitutionPlanView({
  players,
  plans,
  quarterCount,
  formationId,
  resolvedFormation,
  customFormationKind,
  pitchLayout = "full",
  matchId,
  canEdit = false,
}: PresentSubstitutionPlanViewProps) {
  const addPlanItem = useMutation(api.substitutionPlans.addPlanItem);
  const updatePlanItem = useMutation(api.substitutionPlans.updatePlanItem);
  const matchPlayers = useMemo(() => toMatchPlayers(players), [players]);
  const planRows = useMemo(() => toPlanRows(plans), [plans]);
  const numberByPlayerId = useMemo(
    () => numberLookupFromPlayers(players),
    [players]
  );

  const moments = useMemo(
    () => projectSubstitutionMoments(matchPlayers, planRows, quarterCount),
    [matchPlayers, planRows, quarterCount]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOutId, setSelectedOutId] = useState<Id<"players"> | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minuteDraft, setMinuteDraft] = useState("");

  const resolvedId =
    selectedId && moments.some((m) => m.id === selectedId)
      ? selectedId
      : selectedId != null
        ? (moments[moments.length - 1]?.id ?? "kickoff")
        : (moments[0]?.id ?? "kickoff");

  const selected =
    moments.find((m) => m.id === resolvedId) ?? moments[0] ?? null;
  const selectedMinute = selected?.rows[0]?.targetMinute;

  useEffect(() => {
    setSelectedOutId(null);
    setError(null);
    setMinuteDraft(selectedMinute != null ? String(selectedMinute) : "");
  }, [resolvedId, selectedMinute]);

  const effectiveOutId =
    selectedOutId &&
    selected?.onField.some((p) => p.playerId === selectedOutId)
      ? selectedOutId
      : null;

  const previewPlayers = useMemo(() => {
    if (!selected) return [];
    const byId = new Map(players.map((player) => [player.playerId, player]));
    return selected.onField.map((player) => {
      const original = byId.get(String(player.playerId));
      return {
        playerId: String(player.playerId),
        displayName: player.name,
        number: player.number ?? null,
        onField: true,
        fieldSlotIndex: player.fieldSlotIndex ?? null,
        photoUrl: original?.photoUrl ?? null,
        position: player.positionPrimary,
      };
    });
  }, [players, selected]);

  const warningMessages = selected
    ? Array.from(new Set(selected.warnings.map((warning) => warning.message)))
    : [];

  const pendingCount = plans.filter((p) => p.status === "pending").length;
  const editable = canEdit && !!matchId;
  const selectedPlayer =
    effectiveOutId && selected
      ? [...selected.onField, ...selected.bench].find(
          (p) => p.playerId === effectiveOutId
        )
      : undefined;
  const selectedName = selectedPlayer
    ? nameLabel(selectedPlayer)
    : effectiveOutId
      ? "Speler"
      : null;

  const createPlan = async (
    playerOutId: Id<"players">,
    playerInId: Id<"players">,
    kind?: "positionSwap"
  ): Promise<boolean> => {
    if (!matchId || !selected) return false;
    setError(null);
    const timing = withMinuteDraft(planTimingFromMoment(selected), minuteDraft);
    const payload = addPlanPayload(
      matchId,
      playerOutId,
      playerInId,
      timing,
      kind
    );
    try {
      setBusy(true);
      await addPlanItem(payload);
      setSelectedId(momentIdFromTiming(timing));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kon wissel niet opslaan");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveMinuteOnSelected = async () => {
    if (!editable || !selected) return;
    const value = parseMinuteDraft(minuteDraft);
    if (value == null) return;
    const planIds = pendingPlanIdsForMinuteUpdate(selected.rows, value);
    if (planIds.length === 0) return;
    setError(null);
    try {
      setBusy(true);
      for (const planId of planIds) {
        await updatePlanItem({ planId, targetMinute: value });
      }
      setSelectedId(
        momentIdFromTiming({
          targetQuarter: selected.rows[0]?.targetQuarter,
          targetMinute: value,
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kon minuut niet opslaan");
    } finally {
      setBusy(false);
    }
  };

  const handleFieldClick = async (playerId: string) => {
    if (!editable || busy) return;
    const id = playerId as Id<"players">;
    if (!effectiveOutId) {
      setSelectedOutId(id);
      return;
    }
    if (effectiveOutId === id) {
      setSelectedOutId(null);
      return;
    }
    if (await createPlan(effectiveOutId, id, "positionSwap")) {
      setSelectedOutId(null);
    }
  };

  const handleBenchClick = async (playerId: Id<"players">) => {
    if (!editable || busy || !effectiveOutId) return;
    if (await createPlan(effectiveOutId, playerId)) {
      setSelectedOutId(null);
    }
  };

  if (pendingCount === 0 && !editable) {
    return <KleedkamerEmptyPlan />;
  }

  const onFieldUnassigned =
    selected?.onField.filter(
      (p) => p.fieldSlotIndex === undefined || p.fieldSlotIndex === null
    ) ?? [];

  return (
    <div className="h-full min-h-0 flex flex-col lg:flex-row gap-4">
      <WisselplanMomentList
        moments={moments}
        selectedId={resolvedId}
        onSelect={setSelectedId}
        numberByPlayerId={numberByPlayerId}
        slots={resolvedFormation?.slots}
      />

      <div className="flex-1 min-h-0 flex flex-col gap-3">
        {error ? (
          <div className="shrink-0 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {warningMessages.length > 0 ? (
          <div className="shrink-0 rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
            {warningMessages.join(" · ")}
          </div>
        ) : null}

        {editable ? (
          <KleedkamerPlanTimingBar
            statusText={kleedkamerPlanHint(busy, selectedName)}
            hasSelection={!!effectiveOutId}
            minuteDraft={minuteDraft}
            onMinuteChange={setMinuteDraft}
            onSaveMinute={() => void saveMinuteOnSelected()}
            canSaveExisting={(selected?.rows.length ?? 0) > 0}
            isBusy={busy}
          />
        ) : null}

        {resolvedFormation ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <PresentationPitchView
              players={previewPlayers}
              formationId={formationId}
              resolvedFormation={resolvedFormation}
              customFormationKind={customFormationKind}
              fill
              orientation="landscape"
              pitchLayout={pitchLayout}
              selectedPlayerId={effectiveOutId}
              canEdit={editable}
              onPlayerClick={(id) => void handleFieldClick(id)}
            />
          </div>
        ) : (
          <p className="text-center text-slate-400 py-8">
            Geen formatie — alleen de wissel-lijst is beschikbaar.
          </p>
        )}

        {editable && selected ? (
          <div className="shrink-0 max-h-[28vh] overflow-y-auto">
            <PitchBench
              onBench={selected.bench}
              onFieldUnassigned={onFieldUnassigned}
              selectedPlayerId={effectiveOutId}
              onBenchPlayerClick={(id) => void handleBenchClick(id)}
              onUnassignedPlayerClick={(id) => void handleFieldClick(String(id))}
              onDeselect={() => setSelectedOutId(null)}
              nameLabel={nameLabel}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
