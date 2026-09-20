"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyDemoCommand } from "@/lib/team-portal/commands";
import { createDemoState } from "@/lib/team-portal/fixtures";
import { DEMO_STORAGE_KEY, parseSavedDemo } from "@/lib/team-portal/storage";
import type { DemoActor, DemoCommand } from "@/lib/team-portal/types";

export function useTeamPortalDemo() {
  const [state, setState] = useState(() => createDemoState(0));
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [actor, setActor] = useState<DemoActor>({ role: "player", playerId: "p1" });
  const [storageWarning, setStorageWarning] = useState("");
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    const timestamp = Date.now();
    const load = () => {
      try {
        const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
        const saved = parseSavedDemo(raw);
        if (raw !== null && !saved) setStorageWarning("De opgeslagen demo was niet meer geldig. We hebben de voorbeelden hersteld.");
        return saved ?? createDemoState(timestamp);
      } catch {
        setStorageWarning("Je browser bewaart deze demo niet. Je kunt alles proberen zolang dit tabblad openblijft.");
        return createDemoState(timestamp);
      }
    };
    const initial = load();
    current.current = initial;
    // Browser storage must hydrate after SSR; one intentional render keeps initial HTML stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(initial);
    setActor({ role: "player", playerId: initial.players[0].id });
    setNow(timestamp);
    setReady(true);
    const interval = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state)); }
    catch {
      // Surface an external storage failure; never let a failed write stop the local demo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStorageWarning("Je browser bewaart deze demo niet. Je kunt alles proberen zolang dit tabblad openblijft.");
    }
  }, [state, ready]);

  const run = useCallback((command: DemoCommand): boolean => {
    try {
      const timestamp = Date.now();
      const next = applyDemoCommand(current.current, actor, command, timestamp);
      current.current = next;
      setState(next);
      setNow(timestamp);
      const messages: Record<DemoCommand["type"], string> = {
        saveFeedback: "Concept bewaard. Alleen zichtbaar voor de coach.",
        publishFeedback: "Feedback gedeeld met de speler en gekoppelde ouders.",
        addHighlight: actor.role === "coach" ? "De actie staat klaar voor de stemming." : "Je voorstel is naar de coach. Bedankt voor je compliment!",
        reviewHighlight: "Het voorstel is beoordeeld.",
        openVoting: "De stemming is open. Spelers hebben 24 uur om te stemmen.",
        closeVoting: "De stemming is gesloten. De uitslag staat klaar!",
        castVote: "Je stem is opgeslagen. Je kunt hem tot de sluiting wijzigen.",
        setObservationsEnabled: command.type === "setObservationsEnabled" && command.enabled ? "Observatieruimte aangezet voor coach en scout." : "Observatieruimte uitgezet. Bestaande observaties blijven bewaard.",
        saveObservation: "Observatieconcept bewaard. Alleen zichtbaar voor de maker.",
        finalizeObservation: "Observatie intern vastgelegd voor coach en scout.",
      };
      setNotice({ text: messages[command.type], error: false });
      return true;
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Dat lukte niet. Probeer het nog eens.", error: true });
      return false;
    }
  }, [actor]);

  const reset = () => {
    const timestamp = Date.now();
    const seed = createDemoState(timestamp);
    current.current = seed;
    setState(seed);
    setActor({ role: "player", playerId: seed.players[0].id });
    setNow(timestamp);
    setStorageWarning("");
    setNotice({ text: "De demo is teruggezet naar de voorbeeldspelers en wedstrijden.", error: false });
  };

  return { state, actor, setActor, now, ready, run, reset, storageWarning, notice, dismissNotice: () => setNotice(null) };
}
