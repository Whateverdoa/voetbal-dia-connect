import type { CardKind } from "./fc27";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function parts(timestamp: number) {
  const values = Object.fromEntries(formatter.formatToParts(timestamp).map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second) };
}

/** Resolve local calendar time without assuming every day has 24 hours. */
export function amsterdamLocalToUtc(local: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(local)) return NaN;
  const wall = Date.parse(`${local}Z`);
  if (!Number.isFinite(wall)) return NaN;
  const normalized = new Date(wall).toISOString().slice(0, local.length);
  if (normalized !== local) return NaN;
  let guess = wall;
  const seen: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p = parts(guess);
    const represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const next = wall - (represented - guess);
    if (next === guess) return guess;
    if (seen.includes(next)) return Math.max(next, guess); // Spring gap: advance to the valid time.
    seen.push(guess);
    guess = next;
  }
  return guess;
}

export function cardPeriodKey(timestamp: number, kind: CardKind): string {
  const p = parts(timestamp);
  if (kind === "month") return `${p.year}-${String(p.month).padStart(2, "0")}`;
  const calendar = new Date(Date.UTC(p.year, p.month - 1, p.day));
  calendar.setUTCDate(calendar.getUTCDate() - ((calendar.getUTCDay() + 6) % 7));
  return calendar.toISOString().slice(0, 10);
}

export function cardAwardExpiresAt(publishedAt: number, kind: CardKind): number {
  const p = parts(publishedAt);
  const calendar = new Date(Date.UTC(p.year, p.month - 1, p.day));
  if (kind === "week") calendar.setUTCDate(calendar.getUTCDate() + 7);
  else {
    calendar.setUTCDate(1);
    calendar.setUTCMonth(calendar.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(calendar.getUTCFullYear(), calendar.getUTCMonth() + 1, 0)).getUTCDate();
    calendar.setUTCDate(Math.min(p.day, lastDay));
  }
  const date = calendar.toISOString().slice(0, 10);
  const time = [p.hour, p.minute, p.second].map((n) => String(n).padStart(2, "0")).join(":");
  return amsterdamLocalToUtc(`${date}T${time}`) + (publishedAt % 1000);
}
