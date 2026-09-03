"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { parsePitchLayout, type PitchLayout } from "@/lib/halfPitchLayout";

/**
 * Pitch layout state seeded from `?pitch=half`, so a kiosk screen without an
 * operator can be deep-linked into the half-pitch view.
 */
export function usePitchLayout(): [PitchLayout, (next: PitchLayout) => void] {
  const search = useSearchParams();
  const [layout, setLayout] = useState<PitchLayout>(() =>
    parsePitchLayout(search.get("pitch"))
  );
  return [layout, setLayout];
}
