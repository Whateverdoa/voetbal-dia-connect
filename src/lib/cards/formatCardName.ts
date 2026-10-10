export type CardNameMode = "first" | "full";

/** First token of a display name, original casing. */
export function firstNameOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/).filter(Boolean)[0] ?? trimmed;
}

/** Compact first name for cards; full name reserved for later. */
export function formatCardName(name: string, mode: CardNameMode): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (mode === "full") return trimmed;
  return firstNameOf(trimmed).slice(0, 10).toUpperCase();
}

/** Pitch token: first name + shirt number, e.g. "Jan 7". */
export function formatFieldLabel(
  name: string,
  number: number | null | undefined
): string {
  const first = firstNameOf(name);
  if (!first) return number != null ? String(number) : "";
  if (number == null) return first;
  return `${first} ${number}`;
}

/** Split a full name so a narrow card can show two lines. */
export function cardNameLines(name: string, mode: CardNameMode): string[] {
  const formatted = formatCardName(name, mode);
  if (!formatted || mode === "first") return formatted ? [formatted] : [];
  const parts = formatted.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return [formatted];
  return [parts[0]!, parts.slice(1).join(" ")];
}
