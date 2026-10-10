"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "dia-show-card-minutes";

function readStored(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "false") return false;
  if (stored === "true") return true;
  return true;
}

/** Coach preference: show season minutes on lineup/plan cards. */
export function useShowCardMinutes(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(readStored());
  }, []);

  const setShowMinutes = useCallback((next: boolean) => {
    setEnabled(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  return [enabled, setShowMinutes];
}
