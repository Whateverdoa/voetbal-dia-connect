"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FieldLines } from "@/components/match/FieldLines";
import { FormationLines } from "@/components/match/FormationLines";
import { FieldPlayerCard } from "@/components/match/FieldPlayerCard";
import { PitchFitFrame } from "@/components/presentation/PitchFitFrame";
import type { FieldConfig } from "@/lib/fieldConfig";
import type { Formation } from "@/lib/formations/types";
import {
  halfPitchCardTransform,
  HALF_PITCH_WIDEN,
  perspectivePx,
  planeHeightPct,
  TILT_DEG,
  TILT_SHRINK,
  toHalfPitchSlots,
} from "@/lib/halfPitchLayout";
import type { CardSizeMode } from "@/hooks/useCardSize";

export type HalfPitchPlayer = {
  playerId: string;
  displayName: string;
  number: number | null;
  onField: boolean;
  fieldSlotIndex: number | null;
  photoUrl?: string | null;
};

interface HalfPitchPerspectiveProps {
  players: HalfPitchPlayer[];
  formation: Formation;
  cfg: FieldConfig;
  fill?: boolean;
  selectedPlayerId?: string | null;
  canEdit?: boolean;
  onPlayerClick?: (playerId: string) => void;
}

/**
 * Own half in CSS 3D perspective (FC26 style). The grass plane tilts toward the
 * camera; cards counter-rotate and lift so names stay upright and readable.
 */
export function HalfPitchPerspective({
  players,
  formation,
  cfg,
  fill = false,
  selectedPlayerId = null,
  canEdit = false,
  onPlayerClick,
}: HalfPitchPerspectiveProps) {
  const [pitchWidth, setPitchWidth] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageHeight, setStageHeight] = useState(0);
  const sizeMode: CardSizeMode =
    fill && pitchWidth > 0 && pitchWidth < 720 ? "auto" : "presentation";

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageHeight(el.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const slots = useMemo(
    () => toHalfPitchSlots(formation.slots),
    [formation.slots]
  );

  const onField = players.filter((p) => p.onField);
  const playerInSlot = (slotId: number) =>
    onField.find((p) => Number(p.fieldSlotIndex) === Number(slotId));

  const aspectW = cfg.w * HALF_PITCH_WIDEN;
  const aspectH = (cfg.h / 2) * TILT_SHRINK;

  return (
    <PitchFitFrame
      aspectW={aspectW}
      aspectH={aspectH}
      fill={fill}
      allowOverflow
      onWidth={setPitchWidth}
    >
      <div
        ref={stageRef}
        className="absolute inset-0"
        style={{
          perspective: perspectivePx(stageHeight),
          perspectiveOrigin: "50% 100%",
        }}
      >
        <div
          data-testid="half-pitch-plane"
          className="absolute left-0 right-0 bottom-0"
          style={{
            height: `${planeHeightPct()}%`,
            transformOrigin: "50% 100%",
            transform: `rotateX(${TILT_DEG}deg)`,
            transformStyle: "preserve-3d",
            background: "#2d7a3a",
            borderColor: "#1e5c28",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.08) 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)",
            }}
          />

          <FieldLines cfg={cfg} crop="ownHalf" />
          <FormationLines slots={slots} links={formation.links} />

          {slots.map((slot) => {
            const player = playerInSlot(slot.id);
            const isSelected =
              !!player && selectedPlayerId === player.playerId;
            const isDimmed =
              canEdit &&
              selectedPlayerId !== null &&
              (!player || selectedPlayerId !== player.playerId);
            return (
              <FieldPlayerCard
                key={slot.id}
                name={player?.displayName ?? ""}
                number={player?.number}
                position={slot.position}
                photoUrl={player?.photoUrl}
                sizeMode={sizeMode}
                x={slot.x}
                y={slot.y}
                isSelected={isSelected}
                isDimmed={isDimmed}
                isEmpty={!player}
                onClick={() => {
                  if (!player || !canEdit || !onPlayerClick) return;
                  onPlayerClick(player.playerId);
                }}
                extraTransform={halfPitchCardTransform(slot.y, stageHeight)}
              />
            );
          })}
        </div>
      </div>
    </PitchFitFrame>
  );
}
