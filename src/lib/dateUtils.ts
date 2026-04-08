export function formatDateTimeInput(timestamp?: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

/** Dutch short date for match schedule (e.g. za 12 apr.) */
export function formatMatchDateNl(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Dutch time for scheduled kickoff (24h, local timezone) */
export function formatMatchTimeNl(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
