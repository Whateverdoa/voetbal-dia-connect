"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { canonicalPosition } from "@/lib/coachAssistant/history";
import type { AssistantPlayer } from "@/lib/coachAssistant/types";

type Preference = Pick<AssistantPlayer, "availability" | "primaryPosition" | "secondaryPosition">;
type Memory = Record<string, Partial<Preference>>;
const eventName = "dia-coach-preferences-changed";
const emptySnapshot = () => null;

function parse(raw: string | null): Memory {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result: Memory = {};
    for (const [key, row] of Object.entries(value)) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const preference: Partial<Preference> = {};
      if ("availability" in row && ["present", "absent", "injured", "unknown"].includes(String(row.availability))) {
        preference.availability = row.availability as Preference["availability"];
      }
      for (const field of ["primaryPosition", "secondaryPosition"] as const) {
        if (field in row && (row[field] === null || typeof row[field] === "string" && canonicalPosition(row[field]))) {
          preference[field] = row[field] === null ? null : canonicalPosition(row[field]);
        }
      }
      result[key] = preference;
    }
    return result;
  } catch { return {}; }
}

/** Only explicit player choices persist; match minutes, private notes and approval do not. */
export function useRememberedPlayers(scope: string | undefined, players: AssistantPlayer[]) {
  const key = scope ? `dia-coach-player-preferences:v1:${scope}` : null;
  const [storageError, setStorageError] = useState(false);
  const getSnapshot = useCallback(() => {
    try { return key ? window.localStorage.getItem(key) : null; } catch { return null; }
  }, [key]);
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener("storage", notify);
    window.addEventListener(eventName, notify);
    return () => {
      window.removeEventListener("storage", notify);
      window.removeEventListener(eventName, notify);
    };
  }, []);
  const raw = useSyncExternalStore(subscribe, getSnapshot, emptySnapshot);
  const memory = parse(raw);
  function remember(playerKey: string, patch: Partial<AssistantPlayer>) {
    if (!key) return;
    const fields: Partial<Preference> = {};
    for (const field of ["availability", "primaryPosition", "secondaryPosition"] as const) {
      if (field in patch) Object.assign(fields, { [field]: patch[field] });
    }
    if (!Object.keys(fields).length) return;
    try {
      const latest = parse(window.localStorage.getItem(key));
      latest[playerKey] = { ...latest[playerKey], ...fields };
      window.localStorage.setItem(key, JSON.stringify(latest));
      window.dispatchEvent(new Event(eventName));
      setStorageError(false);
    } catch { setStorageError(true); }
  }
  return { players: players.map((player) => ({ ...player, ...memory[player.key] })), remember, storageError };
}
