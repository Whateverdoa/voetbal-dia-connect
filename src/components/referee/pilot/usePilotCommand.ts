"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { createCorrelationId } from "@/lib/correlationId";
import { pilotCommandMutation, projectPilotClock, type PilotCommand, type PilotReceipt, type RefereeAction, type RefereeDetail } from "@/lib/refereePilot";

type Pending = { args: PilotCommand; receipt?: PilotReceipt; uncertain: boolean };
export function usePilotCommand(match: RefereeDetail | null | undefined) {
  const mutate = useMutation(pilotCommandMutation);
  const active = useRef(false);
  const pendingRef = useRef<Pending | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const replace = (value: Pending | null) => { pendingRef.current = value; setPending(value); };
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    if (pending?.receipt && match && match.version >= pending.receipt.version) { pendingRef.current = null; setPending(null); }
  }, [match, pending]);
  const send = async (args: PilotCommand): Promise<PilotReceipt | null> => {
    if (active.current || !online || !match?.writesEnabled || !(match.canControl || match.canAnnotate)) return null;
    active.current = true; replace({ args, uncertain: false }); setError(null);
    try {
      const receipt = await mutate(args);
      if (receipt.commandCorrelationId !== args.correlationId || !receipt.commandEventId || receipt.version !== args.expectedVersion + 1) throw new Error("Onjuiste bevestiging");
      replace({ args, receipt, uncertain: false });
      return receipt;
    } catch (cause) {
      if (cause instanceof ConvexError) { replace(null); setError(typeof cause.data === "string" ? cause.data : "Actie geweigerd. Vernieuw de wedstrijd."); }
      else { replace({ args, uncertain: true }); setError("Bevestiging ontbreekt. Verstuur dezelfde actie opnieuw om de uitkomst te controleren."); }
      return null;
    } finally { active.current = false; }
  };
  return { pending, error, online, busy: pending !== null,
    perform: async (action: RefereeAction) => {
      if (!match || pendingRef.current || active.current || !online) return null;
      return await send({ actorSubject: match.actorSubject, matchId: match.matchId, expectedVersion: projectPilotClock(match, Date.now()).version,
        correlationId: createCorrelationId("referee-web"), action });
    },
    retry: async () => pendingRef.current?.uncertain ? await send(pendingRef.current.args) : null,
  };
}
