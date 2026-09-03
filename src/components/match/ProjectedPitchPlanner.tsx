"use client";

import { useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import { FIELDS } from "@/lib/fieldConfig";
import type { PitchLayout } from "@/lib/halfPitchLayout";
import type { QuarterPreviewProjection } from "@/lib/substitutions/projectSubstitutionPlan";
import { PitchBench } from "./PitchBench";
import { ProjectedPlannerPitch } from "./ProjectedPlannerPitch";
import { PlanPitchMinuteBar } from "./plan/PlanPitchMinuteBar";
import type { MatchPlayer } from "./types";

interface ProjectedPitchPlannerProps {
  formation: Formation;
  quarterCount: number;
  selectedQuarter: number;
  onQuarterChange: (quarter: number) => void;
  preview: QuarterPreviewProjection;
  quarterlessPendingCount: number;
  canEdit: boolean;
  isBusy: boolean;
  /** Override the pitch max-width; planscherm uses a wider value. */
  pitchMaxWidthClass?: string;
  pitchLayout?: PitchLayout;
  seasonMinutesByPlayerId?: Map<string, number>;
  onCreatePlan: (
    playerOutId: Id<"players">,
    playerInId: Id<"players">,
    targetMinute?: number
  ) => Promise<boolean>;
  onCreatePositionSwap: (
    playerAId: Id<"players">,
    playerBId: Id<"players">,
    targetMinute?: number
  ) => Promise<boolean>;
}

function periodButtonLabel(quarterCount: number, quarter: number): string {
  return quarterCount === 2 ? `H${quarter}` : `K${quarter}`;
}

function periodLabel(quarterCount: number): string {
  return quarterCount === 2 ? "helft" : "kwart";
}

export function ProjectedPitchPlanner({
  formation,
  quarterCount,
  selectedQuarter,
  onQuarterChange,
  preview,
  quarterlessPendingCount,
  canEdit,
  isBusy,
  pitchMaxWidthClass = "max-w-lg",
  pitchLayout = "full",
  seasonMinutesByPlayerId,
  onCreatePlan,
  onCreatePositionSwap,
}: ProjectedPitchPlannerProps) {
  const [selectedPlayerOutId, setSelectedPlayerOutId] =
    useState<Id<"players"> | null>(null);
  const [minuteDraft, setMinuteDraft] = useState("");
  const cfg = formation.slots.length >= 11 ? FIELDS["11tal"] : FIELDS["8tal"];
  const onField = preview.projectedOnField;
  const onBench = preview.projectedBench;
  const onFieldUnassigned = onField.filter(
    (player) =>
      player.fieldSlotIndex === undefined || player.fieldSlotIndex === null
  );

  const warningMessages = useMemo(
    () => Array.from(new Set(preview.warnings.map((warning) => warning.message))),
    [preview.warnings]
  );
  const effectiveSelectedPlayerOutId =
    selectedPlayerOutId &&
    onField.some((player) => player.playerId === selectedPlayerOutId)
      ? selectedPlayerOutId
      : null;

  const findPlayer = (playerId: Id<"players">): MatchPlayer | undefined =>
    [...onField, ...onBench].find((player) => player.playerId === playerId);

  const nameLabel = (player: MatchPlayer): string => {
    const firstName = player.name.trim().split(/\s+/)[0] || player.name;
    return firstName.slice(0, 12);
  };

  const statusText = (): string => {
    if (isBusy) return "Wissel wordt toegevoegd...";
    if (!canEdit) return "Planweergave is alleen lezen";
    if (!effectiveSelectedPlayerOutId) {
      return "Tik veldspeler voor wissel of positiewissel";
    }
    const selectedPlayer = findPlayer(effectiveSelectedPlayerOutId);
    const label = selectedPlayer ? nameLabel(selectedPlayer) : "Speler";
    return `${label} geselecteerd - tik bankspeler voor wissel of veldspeler voor positiewissel`;
  };

  const parsedMinute = (): number | undefined => {
    const trimmed = minuteDraft.trim();
    if (trimmed === "") return undefined;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) return undefined;
    return value;
  };

  const handleFieldPlayerClick = async (playerId: Id<"players">) => {
    if (!canEdit || isBusy) return;
    if (!effectiveSelectedPlayerOutId) {
      setSelectedPlayerOutId(playerId);
      return;
    }
    if (effectiveSelectedPlayerOutId === playerId) {
      setSelectedPlayerOutId(null);
      return;
    }
    const success = await onCreatePositionSwap(
      effectiveSelectedPlayerOutId,
      playerId,
      parsedMinute()
    );
    if (success) {
      setSelectedPlayerOutId(null);
    }
  };

  const handleBenchPlayerClick = async (playerId: Id<"players">) => {
    if (!canEdit || isBusy || !effectiveSelectedPlayerOutId) return;
    const success = await onCreatePlan(
      effectiveSelectedPlayerOutId,
      playerId,
      parsedMinute()
    );
    if (success) {
      setSelectedPlayerOutId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: quarterCount }, (_, index) => index + 1).map(
          (quarter) => (
            <button
              key={quarter}
              type="button"
              onClick={() => onQuarterChange(quarter)}
              className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-semibold ${
                selectedQuarter === quarter
                  ? "border-dia-green bg-dia-green text-black"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {periodButtonLabel(quarterCount, quarter)}
            </button>
          )
        )}
      </div>

      <div className="rounded-xl bg-dia-green-light p-3 text-sm text-dia-black">
        <span className="font-semibold">
          Planweergave {periodLabel(quarterCount)} {selectedQuarter}:
        </span>{" "}
        dit veld toont de virtuele situatie volgens de openstaande regels in dit{" "}
        {periodLabel(quarterCount)}.
      </div>

      {quarterlessPendingCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {quarterlessPendingCount} openstaande{" "}
          {quarterlessPendingCount === 1 ? "regel telt" : "regels tellen"} niet
          mee in deze kwartweergave omdat er nog geen kwart/helft is gekozen.
        </div>
      )}

      {warningMessages.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {warningMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <PlanPitchMinuteBar
        statusText={statusText()}
        hasSelection={!!selectedPlayerOutId}
        minuteDraft={minuteDraft}
        onMinuteChange={setMinuteDraft}
        canEdit={canEdit}
      />

      <ProjectedPlannerPitch
        pitchLayout={pitchLayout}
        formation={formation}
        cfg={cfg}
        onField={onField}
        selectedPlayerId={effectiveSelectedPlayerOutId}
        canEdit={canEdit}
        pitchMaxWidthClass={pitchMaxWidthClass}
        seasonMinutesByPlayerId={seasonMinutesByPlayerId}
        onFieldPlayerClick={(playerId) => {
          void handleFieldPlayerClick(playerId);
        }}
      />

      <PitchBench
        onBench={onBench}
        onFieldUnassigned={onFieldUnassigned}
        selectedPlayerId={null}
        onBenchPlayerClick={(playerId) => {
          void handleBenchPlayerClick(playerId);
        }}
        onUnassignedPlayerClick={(playerId) => {
          void handleFieldPlayerClick(playerId);
        }}
        onDeselect={() => setSelectedPlayerOutId(null)}
        nameLabel={nameLabel}
        seasonMinutesByPlayerId={seasonMinutesByPlayerId}
      />
    </div>
  );
}
