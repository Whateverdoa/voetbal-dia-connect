export function cardDate(timestamp: number | null | undefined): string {
  return timestamp == null ? "—" : new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(timestamp);
}

export function cardError(error: unknown): string {
  return error instanceof Error ? error.message : "Dit is niet gelukt. Probeer opnieuw.";
}

export function amsterdamInputTime(timestamp: number): string {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(timestamp).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export const cardInputClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-dia-green";
export const cardButtonClass = "min-h-11 rounded-xl bg-dia-green px-4 py-2 font-semibold text-white hover:bg-dia-green-dark disabled:cursor-not-allowed disabled:opacity-50";
