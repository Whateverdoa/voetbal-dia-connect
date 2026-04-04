/**
 * Total playing time (excl. halftime breaks) and quarter count validation.
 */
export const DEFAULT_REGULATION_MINUTES = 60;

export function resolveRegulationMinutes(doc: {
  regulationDurationMinutes?: number;
}): number {
  const m = doc.regulationDurationMinutes;
  if (m == null || !Number.isFinite(m)) return DEFAULT_REGULATION_MINUTES;
  return m;
}

export function assertValidMatchTiming(
  quarterCount: number,
  regulationMinutes: number
): void {
  if (quarterCount !== 2 && quarterCount !== 4) {
    throw new Error("Aantal periodes moet 2 of 4 zijn");
  }
  if (
    !Number.isFinite(regulationMinutes) ||
    regulationMinutes < 30 ||
    regulationMinutes > 120
  ) {
    throw new Error("Totale speeltijd moet tussen 30 en 120 minuten zijn");
  }
  if (regulationMinutes % quarterCount !== 0) {
    throw new Error(
      "Totale speeltijd moet gelijk verdeeld kunnen worden over de periodes"
    );
  }
}
