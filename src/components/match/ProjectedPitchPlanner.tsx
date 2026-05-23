"use client";

import { useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import { FIELDS } from "@/lib/fieldConfig";
import type { QuarterPreviewProjection } from "@/lib/substitutions/projectSubstitutionPlan";
import { FieldLines } from "./FieldLines";
import { FormationLines } from "./FormationLines";
import { FieldPlayerCard } from "./FieldPlayerCard";
import { PitchBench } from "./PitchBench";
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
  onCreatePlan: (
    playerOutId: Id<"players">,
    playerInId: Id<"players">
  ) => Promise<boolean>;
  onCreatePositionSwap: (
    playerAId: Id<"players">,
    playerBId: Id<"players">
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
  onCreatePlan,
  onCreatePositionSwap,
}: ProjectedPitchPlannerProps) {
  const [selectedPlayerOutId, setSelectedPlayerOutId] =
    useState<Id<"players"> | null>(null);
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

  const playerInSlot = (slotId: number): MatchPlayer | undefined =>
    onField.find((player) => Number(player.fieldSlotIndex) === Number(slotId));

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
      playerId
    );
    if (success) {
      setSelectedPlayerOutId(null);
    }
  };

  const handleBenchPlayerClick = async (playerId: Id<"players">) => {
    if (!canEdit || isBusy || !effectiveSelectedPlayerOutId) return;
    const success = await onCreatePlan(effectiveSelectedPlayerOutId, playerId);
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
                  ? "border-dia-green bg-dia-green text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {periodButtonLabel(quarterCount, quarter)}
            </button>
          )
        )}
      </div>

      <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
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

      <div className="h-5 flex items-center justify-center">
        <span
          className={`text-xs font-bold uppercase tracking-widest ${
            selectedPlayerOutId ? "text-amber-500" : "text-slate-400"
          }`}
        >
          {statusText()}
        </span>
      </div>

      <div className="w-full flex justify-center">
        <div
          className="relative w-full max-w-lg overflow-hidden border rounded-sm shadow-md"
          style={{
            background: "#2d7a3a",
            borderColor: "#1e5c28",
            aspectRatio: `${cfg.w} / ${cfg.h}`,
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.08) 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)",
            }}
          />

          <FieldLines cfg={cfg} />
          <FormationLines slots={formation.slots} links={formation.links} />

          {formation.slots.map((slot) => {
            const player = playerInSlot(slot.id);

            return (
              <FieldPlayerCard
                key={slot.id}
                name={player?.name ?? ""}
                number={player?.number}
                position={slot.position}
                x={slot.x}
                y={slot.y}
                isSelected={
                  player ? effectiveSelectedPlayerOutId === player.playerId : false
                }
                isDimmed={
                  effectiveSelectedPlayerOutId !== null &&
                  (!player || effectiveSelectedPlayerOutId !== player.playerId)
                }
                isEmpty={!player}
                onClick={() => {
                  if (!player) return;
                  void handleFieldPlayerClick(player.playerId);
                }}
              />
            );
          })}
        </div>
      </div>

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
      />
    </div>
  );
}
