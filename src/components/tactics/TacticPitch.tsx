"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { FieldLines } from "@/components/match/FieldLines";
import { FIELDS, fieldModeFromFormation } from "@/lib/fieldConfig";
import { getFormation } from "@/lib/formations";
import { formatFieldLabel } from "@/lib/cards/formatCardName";
import { useTacticDrag } from "@/hooks/useTacticDrag";
import { seedTacticTokens } from "@/lib/tactics/seedTokens";
import { TacticToken, type TacticTokenModel } from "./TacticToken";

type LineupPlayer = {
  playerId: string;
  displayName: string;
  number: number | null;
  onField: boolean;
  absent?: boolean;
  fieldSlotIndex: number | null;
  photoUrl?: string | null;
};

interface TacticPitchProps {
  matchId: Id<"matches">;
  formationId: string | null;
  players: LineupPlayer[];
  canEdit: boolean;
}

export function TacticPitch({
  matchId,
  formationId,
  players,
  canEdit,
}: TacticPitchProps) {
  const board = useQuery(
    api.tacticBoards.getBoard,
    canEdit ? { matchId } : "skip"
  );
  const ensureBoard = useMutation(api.tacticBoards.ensureBoard);
  const moveToken = useMutation(api.tacticBoards.moveToken);
  const resetBoard = useMutation(api.tacticBoards.resetBoard);
  const pitchRef = useRef<HTMLDivElement>(null);

  const formation = getFormation(formationId ?? undefined);
  const cfg = FIELDS[fieldModeFromFormation(formationId ?? undefined, {})];
  const seeded = useMemo(() => seedTacticTokens(
    players.map((player) => ({
      playerId: player.playerId,
      onField: player.onField,
      absent: player.absent === true,
      fieldSlotIndex: player.fieldSlotIndex,
    })),
    formation?.slots ?? []
  ), [players, formation]);

  const fallback: TacticTokenModel[] = useMemo(() => {
    const byId = new Map(players.map((player) => [player.playerId, player]));
    return seeded.map((token) => {
      const player = byId.get(token.playerId);
      return {
        ...token,
        name: player?.displayName ?? "",
        number: player?.number ?? null,
        photoUrl: player?.photoUrl ?? null,
      };
    });
  }, [players, seeded]);

  const serverTokens = board?.tokens ?? fallback;

  useEffect(() => {
    if (!canEdit || board !== null) return;
    void ensureBoard({
      matchId,
      tokens: seeded.map((token) => ({
        playerId: token.playerId as Id<"players">,
        x: token.x,
        y: token.y,
        onBoard: token.onBoard,
      })),
    });
  }, [board, canEdit, ensureBoard, matchId, seeded]);

  const onDrop = useCallback(
    (payload: { playerId: Id<"players">; x: number; y: number; onBoard: boolean }) =>
      moveToken({ matchId, ...payload }),
    [matchId, moveToken],
  );
  const { dragId, displayTokens, startDrag } = useTacticDrag(
    canEdit,
    serverTokens,
    pitchRef,
    onDrop,
  );

  const onField = displayTokens.filter((token) => token.onBoard);
  const bench = displayTokens.filter((token) => !token.onBoard);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <p className="text-sm text-slate-300">
          Sleep spelers vrij over het veld. Label: voornaam + nummer.
        </p>
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              void resetBoard({
                matchId,
                tokens: seeded.map((token) => ({
                  playerId: token.playerId as Id<"players">,
                  x: token.x,
                  y: token.y,
                  onBoard: token.onBoard,
                })),
              });
            }}
            className="ml-auto px-3 py-2 rounded-lg bg-dia-yellow text-black font-semibold min-h-[44px]"
          >
            Reset naar opstelling
          </button>
        ) : null}
      </div>
      <div className="w-full flex justify-center">
        <div
          ref={pitchRef}
          className="relative w-full max-w-4xl touch-none overflow-hidden border-2 rounded-md shadow-2xl"
          style={{
            background: "#2d7a3a",
            borderColor: "#1e5c28",
            aspectRatio: `${cfg.w} / ${cfg.h}`,
          }}
        >
          <FieldLines cfg={cfg} />
          {onField.map((token) => (
            <TacticToken
              key={token.playerId}
              token={token}
              dragging={dragId === token.playerId}
              onPointerDown={(event) => startDrag(token.playerId, event)}
            />
          ))}
        </div>
      </div>
      {bench.length > 0 ? (
        <div className="flex flex-wrap gap-2 justify-center">
          {bench.map((token) => (
            <button
              key={token.playerId}
              type="button"
              onPointerDown={(event) => startDrag(token.playerId, event)}
              className="px-3 py-2 rounded-lg bg-dia-black text-white border border-dia-yellow/40 min-h-[44px] font-semibold"
            >
              {formatFieldLabel(token.name, token.number)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
