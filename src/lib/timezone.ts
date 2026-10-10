/**
 * Parse Europe/Amsterdam wall-clock local ISO (no zone suffix) → UTC ms.
 * Mirrors convex/lib/timezone.ts for frontend use.
 */
export function parseAmsterdamTimestamp(isoLocal: string): number {
  const utcGuess = new Date(`${isoLocal}Z`).getTime();
  if (Number.isNaN(utcGuess)) return Number.NaN;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(utcGuess));
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  const amsterdamAtUtc = new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get(
      "minute"
    )}:${get("second")}Z`
  ).getTime();

  const offsetMs = amsterdamAtUtc - utcGuess;
  return utcGuess - offsetMs;
}
