/**
 * Client-side mirror of Convex match-player availability helpers.
 */

export type PlayerAvailabilityStatus = "available" | "absent" | "injured";

export type AvailabilityFlags = {
  absent?: boolean;
  injured?: boolean;
};

export function isUnavailable(mp: AvailabilityFlags): boolean {
  return mp.absent === true || mp.injured === true;
}

export function availabilityStatus(
  mp: AvailabilityFlags
): PlayerAvailabilityStatus {
  if (mp.injured === true) return "injured";
  if (mp.absent === true) return "absent";
  return "available";
}

/** Patch fields for a status change (client mirror of Convex helper). */
export function availabilityFlagsForStatus(
  status: PlayerAvailabilityStatus
): { absent: boolean; injured: boolean } {
  switch (status) {
    case "available":
      return { absent: false, injured: false };
    case "absent":
      return { absent: true, injured: false };
    case "injured":
      return { absent: false, injured: true };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export type UnavailableAction = "field" | "sub" | "plan";

/** Throw when the player cannot take this action (absent or injured). */
export function throwIfUnavailable(
  mp: AvailabilityFlags,
  action: UnavailableAction
): void {
  if (!isUnavailable(mp)) return;
  const injured = mp.injured === true;
  switch (action) {
    case "field":
      throw new Error(
        injured
          ? "Geblesseerde speler kan niet op het veld worden geplaatst"
          : "Afwezige speler kan niet op het veld worden geplaatst"
      );
    case "sub":
      throw new Error(
        injured
          ? "Geblesseerde speler kan niet worden ingewisseld"
          : "Afwezige speler kan niet worden ingewisseld"
      );
    case "plan":
      throw new Error(
        injured
          ? "Geblesseerde speler kan niet in het wisselplan"
          : "Afwezige speler kan niet in het wisselplan"
      );
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
