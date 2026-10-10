"use client";

import { useEffect, useRef, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import {
  clientToPitchPercent,
  tokenPercentFromPointer,
  type PitchPercent,
} from "@/lib/tactics/dragPosition";
import type { TacticTokenModel } from "@/components/tactics/TacticToken";

export type TacticDrop = PitchPercent & { playerId: Id<"players"> };

export function useTacticDrag(
  canEdit: boolean,
  tokens: TacticTokenModel[],
  pitchRef: React.RefObject<HTMLDivElement | null>,
  onDrop: (payload: TacticDrop) => Promise<void> | void,
) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [local, setLocal] = useState<TacticTokenModel[] | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const grabOffsetRef = useRef({ x: 0, y: 0 });
  const tokensRef = useRef(tokens);
  const onDropRef = useRef(onDrop);
  const pendingRef = useRef<PitchPercent | null>(null);
  const rafRef = useRef(0);

  tokensRef.current = tokens;
  onDropRef.current = onDrop;

  const displayTokens = local ?? tokens;

  const applyPending = () => {
    rafRef.current = 0;
    const next = pendingRef.current;
    const playerId = dragIdRef.current;
    if (!next || !playerId) return;
    setLocal((current) =>
      (current ?? tokensRef.current).map((token) =>
        token.playerId === playerId ? { ...token, ...next } : token,
      ),
    );
  };

  const percentFromClient = (clientX: number, clientY: number): PitchPercent => {
    const box = pitchRef.current?.getBoundingClientRect();
    if (!box) return { x: 50, y: 50, onBoard: true };
    return tokenPercentFromPointer(
      clientToPitchPercent(clientX, clientY, box),
      grabOffsetRef.current,
    );
  };

  const startDrag = (playerId: string, event: React.PointerEvent) => {
    if (!canEdit) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const token = displayTokens.find((item) => item.playerId === playerId);
    const box = pitchRef.current?.getBoundingClientRect();
    if (token && box) {
      const pointer = clientToPitchPercent(event.clientX, event.clientY, box);
      grabOffsetRef.current = {
        x: pointer.x - token.x,
        y: pointer.y - token.y,
      };
    } else {
      grabOffsetRef.current = { x: 0, y: 0 };
    }

    dragIdRef.current = playerId;
    setDragId(playerId);
    setLocal(displayTokens);
  };

  useEffect(() => {
    if (!dragId) return;

    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      pendingRef.current = percentFromClient(event.clientX, event.clientY);
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(applyPending);
    };

    const onUp = (event: PointerEvent) => {
      const playerId = dragIdRef.current;
      if (!playerId) return;
      const next = percentFromClient(event.clientX, event.clientY);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      pendingRef.current = null;
      setLocal((current) =>
        (current ?? tokensRef.current).map((token) =>
          token.playerId === playerId ? { ...token, ...next } : token,
        ),
      );
      dragIdRef.current = null;
      setDragId(null);
      void onDropRef.current({
        playerId: playerId as Id<"players">,
        ...next,
      });
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [dragId]);

  useEffect(() => {
    if (dragIdRef.current) return;
    setLocal(null);
  }, [tokens]);

  return { dragId, displayTokens, startDrag };
}
