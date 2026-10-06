import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JO13_02_DEMO_PROFILE, type DemoProfile } from "./demoProfiles";
import { parseLocalDemoRoster } from "./localRoster";

/** Read private snapshots only from this machine, never from a hosted preview. */
export function getLocalJo13DemoProfile(): DemoProfile {
  if (process.env.NODE_ENV !== "development" ||
    (process.env.VERCEL && process.env.VERCEL !== "0") ||
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "development")) {
    return JO13_02_DEMO_PROFILE;
  }
  try {
    const raw = readFileSync(join(process.cwd(), ".local", "teamportaal", "jo13-2.json"), "utf8");
    if (raw.length > 1_000_000) return JO13_02_DEMO_PROFILE;
    const roster = parseLocalDemoRoster(JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown);
    if (!roster) return JO13_02_DEMO_PROFILE;
    // Refreshes with unchanged identities/matches preserve local reviews; changed
    // source records get their own namespace, leaving the earlier demo intact.
    const fingerprint = createHash("sha256").update(JSON.stringify({ players: roster.players, matches: roster.matches })).digest("hex").slice(0, 16);
    return {
      ...JO13_02_DEMO_PROFILE,
      id: `${JO13_02_DEMO_PROFILE.id}-roster-${fingerprint}`,
      storageKey: `${JO13_02_DEMO_PROFILE.storageKey}-roster-${fingerprint}`,
      roster,
    };
  } catch {
    // Missing, inaccessible or invalid local data keeps the fictional demo usable.
    return JO13_02_DEMO_PROFILE;
  }
}
