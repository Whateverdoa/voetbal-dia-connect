/**
 * Play-week bounds in Europe/Amsterdam (Monday 00:00 → next Monday 00:00).
 */
import { parseAmsterdamTimestamp } from "@/lib/timezone";

function amsterdamParts(ms: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    weekday: get("weekday"),
  };
}

const WEEKDAY_TO_OFFSET: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Monday 00:00 Amsterdam of the play week containing `nowMs`. */
export function getPlayWeekStartMs(nowMs: number = Date.now()): number {
  const { year, month, day, weekday } = amsterdamParts(nowMs);
  const offset = WEEKDAY_TO_OFFSET[weekday] ?? 0;
  const noon = parseAmsterdamTimestamp(`${year}-${month}-${day}T12:00:00`);
  const mondayNoon = noon - offset * 24 * 60 * 60 * 1000;
  const mon = amsterdamParts(mondayNoon);
  return parseAmsterdamTimestamp(`${mon.year}-${mon.month}-${mon.day}T00:00:00`);
}

export function getPlayWeekEndMs(weekStartMs: number): number {
  return weekStartMs + 7 * 24 * 60 * 60 * 1000;
}

/** Default claim-window close: Wednesday 18:00 Amsterdam of that play week. */
export function getDefaultClaimWindowClosesAt(weekStartMs: number): number {
  const mon = amsterdamParts(weekStartMs);
  const wedMs =
    parseAmsterdamTimestamp(`${mon.year}-${mon.month}-${mon.day}T12:00:00`) +
    2 * 24 * 60 * 60 * 1000;
  const wed = amsterdamParts(wedMs);
  return parseAmsterdamTimestamp(`${wed.year}-${wed.month}-${wed.day}T18:00:00`);
}

export function getPlayWeekBounds(nowMs: number = Date.now()) {
  const weekStartMs = getPlayWeekStartMs(nowMs);
  return { weekStartMs, weekEndMs: getPlayWeekEndMs(weekStartMs) };
}

export function formatPlayWeekLabel(weekStartMs: number): string {
  const start = amsterdamParts(weekStartMs);
  const endMs = getPlayWeekEndMs(weekStartMs) - 1;
  const end = amsterdamParts(endMs);
  return `${Number(start.day)}-${Number(end.day)} ${end.month}`;
}
