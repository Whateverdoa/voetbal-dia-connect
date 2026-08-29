"use client";

import { useCallback, useEffect, useState } from "react";

export type RoleViewMode = "admin" | "own";

const STORAGE_PREFIX = "dia-role-view:";

function readStoredMode(page: "coach" | "referee"): RoleViewMode | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${page}`);
  if (stored === "admin" || stored === "own") return stored;
  return null;
}

function defaultMode(hasOwnRole: boolean): RoleViewMode {
  return hasOwnRole ? "own" : "admin";
}

export function useRoleViewMode(
  page: "coach" | "referee",
  options: { isAdmin: boolean; hasOwnRole: boolean },
): [RoleViewMode, (mode: RoleViewMode) => void] {
  const [mode, setMode] = useState<RoleViewMode>(() => {
    if (!options.isAdmin) return "own";
    return readStoredMode(page) ?? defaultMode(options.hasOwnRole);
  });

  useEffect(() => {
    if (!options.isAdmin) {
      setMode("own");
      return;
    }
    const stored = readStoredMode(page);
    if (stored === "own" && !options.hasOwnRole) {
      setMode("admin");
      return;
    }
    if (stored) {
      setMode(stored);
      return;
    }
    setMode(defaultMode(options.hasOwnRole));
  }, [options.hasOwnRole, options.isAdmin, page]);

  const setViewMode = useCallback(
    (next: RoleViewMode) => {
      if (next === "own" && !options.hasOwnRole) return;
      setMode(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`${STORAGE_PREFIX}${page}`, next);
      }
    },
    [options.hasOwnRole, page],
  );

  return [mode, setViewMode];
}
