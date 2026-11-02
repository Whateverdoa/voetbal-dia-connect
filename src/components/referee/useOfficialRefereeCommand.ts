"use client";
import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { refereePolicyApi, clockReviewReason, type OfficialReceipt } from "@/lib/refereePolicyApi";
import type { RefereeDetail } from "@/convex/lib/refereeMatchRead";
import type { RefereeAction } from "@/convex/lib/refereeRegistrationContract";
import { guardOfficialClock } from "@/convex/lib/officialMatchClock";

type Intent = { matchId: RefereeDetail["matchId"]; expectedVersion: number; correlationId: string; actorSubject: string; action: RefereeAction };
export function effectiveCommandVersion(match: RefereeDetail, now: number) {
  if (!match.clock) return match.version;
  const projected = guardOfficialClock({ ...match.clock, clockReviewReason: clockReviewReason(match.clock.clockReviewReason), status: match.status === "halftime" ? "break" : match.status,
    period: match.period, periodCount: match.periodCount, periodMinutes: match.periodMinutes }, now);
  return match.version + (projected.changed ? 1 : 0);
}
/** One immutable intent across uncertain retries; never silently rebase a write. */
export function useOfficialRefereeCommand(match: RefereeDetail | undefined, serverNow: number) {
  const mutate = useMutation(refereePolicyApi.command);
  const lock = useRef(false);
  const [confirmed, setConfirmed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = match ? effectiveCommandVersion(match, serverNow) : 0;
  const waitingForRead = version < confirmed;
  async function send(intent: Intent): Promise<OfficialReceipt | null> {
    if (lock.current) return null;
    lock.current = true; setBusy(true); setError(null);
    try {
      const receipt = await mutate(intent);
      if (receipt.commandCorrelationId !== intent.correlationId || !receipt.commandEventId || receipt.version !== intent.expectedVersion + 1) {
        throw new Error("Bevestiging ontbreekt");
      }
      setConfirmed(prior => Math.max(prior, receipt.version));
      setPending(null); return receipt;
    } catch (cause) {
      // Structured Convex errors confirm rejection. Transport failures require the same intent.
      const rejected = cause instanceof ConvexError;
      setPending(rejected ? null : intent);
      setError(rejected ? "Actie geweigerd. Controleer de actuele wedstrijd en je registratierecht." : "Bevestiging ontbreekt. Herhaal dezelfde actie; voer nog geen andere actie uit.");
      return null;
    } finally { lock.current = false; setBusy(false); }
  }
  return { busy, pending, error, waitingForRead,
    retry: () => pending ? send(pending) : Promise.resolve(null),
    act: (action: RefereeAction) => {
      if (!match || serverNow >= match.expiresAt || !match.writesEnabled || !(match.canControl || match.canAnnotate) || pending || waitingForRead || lock.current) return Promise.resolve(null);
      return send({ matchId: match.matchId, actorSubject: match.actorSubject, expectedVersion: version, correlationId: crypto.randomUUID(), action });
    } };
}
