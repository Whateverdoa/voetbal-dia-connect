"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getFormation } from "@/lib/formations";
import type { MatchPlayer } from "./types";

const VIEWBOX = "0 0 100 150";

interface PitchViewProps {
  matchId: Id<"matches">;
  pin: string;
  players: MatchPlayer[];
  formationId: string | undefined;
}

export function PitchView({ matchId, pin, players, formationId }: PitchViewProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const assignToSlot = useMutation(api.matchActions.assignPlayerToSlot);
  const toggleOffField = useMutation(api.matchActions.togglePlayerOnField);
  const formation = formationId ? getFormation(formationId) : undefined;
  const onField = players.filter((p) => p.onField);
  const onBench = players.filter((p) => !p.onField);
  // Spelers die op het veld staan maar nog geen positie hebben (uit de lijst gezet)
  const onFieldUnassigned = onField.filter(
    (p) => p.fieldSlotIndex === undefined || p.fieldSlotIndex === null
  );

  const playerInSlot = (slotId: number): MatchPlayer | undefined =>
    onField.find((p) => Number(p.fieldSlotIndex) === Number(slotId));

  /** Tekst in de cirkel: alleen rugnummer (of eerste letter van naam). */
  const circleLabel = (p: MatchPlayer): string => {
    if (p.number != null) return String(p.number);
    return (p.name.trim()[0] || "?").toUpperCase();
  };

  /** Naam in het rechthoekje onder de cirkel: altijd voornaam (geen nummer). */
  const nameLabel = (p: MatchPlayer): string => {
    const firstName = p.name.trim().split(/\s+/)[0] || p.name;
    return firstName.slice(0, 12);
  };

  const handleSlotClick = (slotId: number) => {
    const current = playerInSlot(slotId);
    if (current) {
      toggleOffField({ matchId, pin, playerId: current.playerId });
      return;
    }
    setSelectedSlot(slotId);
  };

  const handleBenchPlayerClick = (playerId: Id<"players">) => {
    if (selectedSlot === null) return;
    assignToSlot({ matchId, pin, playerId, fieldSlotIndex: selectedSlot });
    setSelectedSlot(null);
  };

  if (!formation) {
    return (
      <div className="rounded-xl bg-gray-100 p-6 text-center text-gray-500">
        Selecteer een formatie om het veld te tonen.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Veld even breed als formatieblok, schaalbaar; opbouw van onder (ons doel) naar boven */}
      <div className="w-full min-h-0" style={{ aspectRatio: "100/150" }}>
        <svg
          viewBox={VIEWBOX}
          className="w-full h-full block"
          preserveAspectRatio="xMidYMax meet"
        >
          {/* Gras — rechte hoeken, strak */}
          <rect x="5" y="5" width="90" height="140" rx="0" fill="var(--color-dia-green, #22c55e)" className="opacity-90" />
          <rect x="8" y="8" width="84" height="134" rx="0" fill="none" stroke="white" strokeWidth="0.5" />
          {/* Slots: plaatsing van onder (ons doel) naar boven; offset zodat formatie onderaan begint */}
          {formation.slots.map((slot) => {
            const player = playerInSlot(slot.id);
            const isEmpty = !player;
            const isSelected = selectedSlot === slot.id;
            const scale = 0.5;
            const r = 8 * scale;
            const labelW = 24 * scale;
            const labelH = 8 * scale;
            const slotY = slot.y + 36;
            const labelY = slotY + labelH / 2;
            return (
              <g
                key={slot.id}
                onClick={() => handleSlotClick(slot.id)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={slot.x}
                  cy={slotY}
                  r={r}
                  fill={isEmpty ? "rgba(255,255,255,0.25)" : "white"}
                  stroke={isSelected ? "#0f766e" : "rgba(0,0,0,0.2)"}
                  strokeWidth={isSelected ? 1 : 0.5}
                />
                {player ? (
                  <>
                    <text
                      x={slot.x}
                      y={slotY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={5 * scale}
                      fill="#111"
                      fontWeight="700"
                    >
                      {circleLabel(player)}
                    </text>
                    <rect
                      x={slot.x - labelW / 2}
                      y={labelY}
                      width={labelW}
                      height={labelH}
                      rx={1}
                      fill="white"
                      stroke="#334155"
                      strokeWidth={0.6 * scale}
                    />
                    <text
                      x={slot.x}
                      y={labelY + labelH / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={5.5 * scale}
                      fill="#0f172a"
                      fontWeight="600"
                    >
                      {nameLabel(player)}
                    </text>
                  </>
                ) : (
                  <text x={slot.x} y={slotY} textAnchor="middle" dominantBaseline="middle" fontSize={4 * scale} fill="rgba(0,0,0,0.4)">
                    +
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Op veld maar nog geen positie: altijd zichtbaar, dan klopt het totaal met de lijst */}
      {onFieldUnassigned.length > 0 && (
        <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
          <p className="text-xs font-medium text-amber-800 mb-1.5">
            Op veld, nog geen positie ({onFieldUnassigned.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {onFieldUnassigned.map((p) => (
              <span
                key={p.playerId}
                className="inline-flex items-center px-2 py-1 bg-white rounded text-sm text-gray-800 border border-amber-200"
              >
                {p.number != null && <span className="font-bold text-gray-500 mr-1">#{p.number}</span>}
                {p.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-amber-700 mt-1">Tik op een cirkel en kies een speler om te plaatsen.</p>
        </div>
      )}

      {/* Bank: altijd zichtbaar onder het veld */}
      {onBench.length > 0 && (
        <div className="bg-gray-100 rounded-lg px-3 py-2 border border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-1.5">Bank ({onBench.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {onBench.map((p) => (
              <span
                key={p.playerId}
                className="inline-flex items-center px-2 py-1 bg-white rounded text-sm text-gray-800 border border-gray-200"
              >
                {p.number != null && <span className="font-bold text-gray-500 mr-1">#{p.number}</span>}
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tap-to-Move: kies speler voor deze positie (op veld zonder positie + bank) */}
      {selectedSlot !== null && (
        <div className="bg-white rounded-lg border border-dia-green p-3 shadow">
          <p className="text-sm font-medium text-gray-700 mb-2">Kies speler voor positie</p>
          {onFieldUnassigned.length > 0 && (
            <p className="text-xs text-gray-500 mb-1">Op veld, nog geen positie</p>
          )}
          <div className="flex flex-wrap gap-2 mb-2">
            {onFieldUnassigned.map((p) => (
              <button
                key={p.playerId}
                type="button"
                onClick={() => handleBenchPlayerClick(p.playerId)}
                className="px-3 py-2 bg-dia-green/30 hover:bg-dia-green/50 rounded-lg text-sm font-medium"
              >
                {p.number ? `#${p.number}` : ""} {p.name}
              </button>
            ))}
          </div>
          {onBench.length > 0 && <p className="text-xs text-gray-500 mb-1">Bank</p>}
          <div className="flex flex-wrap gap-2">
            {onBench.map((p) => (
              <button
                key={p.playerId}
                type="button"
                onClick={() => handleBenchPlayerClick(p.playerId)}
                className="px-3 py-2 bg-dia-green/20 hover:bg-dia-green/40 rounded-lg text-sm font-medium"
              >
                {p.number ? `#${p.number}` : ""} {p.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedSlot(null)}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        Tik op een lege cirkel om een speler te plaatsen, tik op een gevulde cirkel om naar de bank te zetten.
      </p>
    </div>
  );
}
