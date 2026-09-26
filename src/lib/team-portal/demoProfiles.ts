import { DEMO_STORAGE_KEY } from "./storage";

/** Display and storage scope only. Demo profiles never grant real team access. */
export interface DemoProfile {
  id: string;
  teamName: string;
  teamSlug: string | null;
  seasonLabel: string;
  storageKey: string;
  pilot: boolean;
}

export const GENERAL_DEMO_PROFILE: DemoProfile = {
  id: "general",
  teamName: "DIA JO13",
  teamSlug: null,
  seasonLabel: "2026–2027",
  storageKey: DEMO_STORAGE_KEY,
  pilot: false,
};

export const JO13_02_DEMO_PROFILE: DemoProfile = {
  id: "jo13-2-2026-2027",
  teamName: "DIA JO13-02",
  teamSlug: "jo13-2",
  seasonLabel: "2026–2027",
  storageKey: "dia-teamportaal-demo-jo13-2-2026-2027-v1",
  pilot: true,
};
