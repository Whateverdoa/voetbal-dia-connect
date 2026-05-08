/**
 * Build formation slots from a structure string like "1-5-2" or "1-4-2-3-1".
 * Sum of all segments must equal total players on field (8 or 11).
 */

export interface GeneratedSlot {
  id: number;
  x: number;
  y: number;
  position: string;
}

function yForRow(rowIndex: number, rowCount: number): number {
  if (rowCount <= 1) return 55;
  return 90 - (rowIndex / (rowCount - 1)) * 72;
}

function xPositions(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [50];
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const step = 100 / (count + 1);
    out.push(step * (i + 1));
  }
  return out;
}

function labelForSlot(
  rowIndex: number,
  rowCount: number,
  colIndex: number,
  colCount: number,
  globalId: number
): string {
  if (globalId === 0) return "GK";
  const isLastRow = rowIndex === rowCount - 1;
  const isFirstRow = rowIndex === 0;
  if (isLastRow) {
    if (colCount === 1) return "ST";
    if (colCount === 2) return colIndex === 0 ? "ST" : "CF";
    if (colIndex <= 1) return "LW";
    if (colIndex >= colCount - 2) return "RW";
    return "ST";
  }
  if (isFirstRow) {
    if (colCount >= 4) {
      if (colIndex === 0) return "LB";
      if (colIndex === colCount - 1) return "RB";
      return "CB";
    }
    return "CB";
  }
  if (rowIndex === 1 && rowCount >= 3) {
    if (colCount >= 3) {
      if (colIndex === 0) return "LM";
      if (colIndex === colCount - 1) return "RM";
      return "CM";
    }
    return "CM";
  }
  return "CM";
}

export function buildLinksFromRows(
  rowSizes: number[],
  slotIdsByRow: number[][]
): { from: number; to: number }[] {
  const links: { from: number; to: number }[] = [];
  for (let r = 0; r < rowSizes.length - 1; r += 1) {
    const cur = slotIdsByRow[r] ?? [];
    const next = slotIdsByRow[r + 1] ?? [];
    for (const a of cur) {
      for (const b of next) {
        links.push({ from: a, to: b });
      }
    }
  }
  return links;
}

export function generateFormationSlotsFromStructure(
  kind: "8v8" | "11v11",
  structure: string
): { slots: GeneratedSlot[]; links: { from: number; to: number }[] } {
  const total = kind === "8v8" ? 8 : 11;
  const parts = structure
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((s) => parseInt(s, 10));
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n) || n < 1)) {
    throw new Error("Gebruik cijfers gescheiden door streepjes, bijv. 1-5-2");
  }
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum !== total) {
    throw new Error(`Totaal moet ${total} zijn voor ${kind} (nu ${sum}).`);
  }

  const rowCount = parts.length;
  const slots: GeneratedSlot[] = [];
  const slotIdsByRow: number[][] = [];
  let id = 0;
  for (let row = 0; row < rowCount; row += 1) {
    const count = parts[row];
    const ys = yForRow(row, rowCount);
    const xs = xPositions(count);
    const rowIds: number[] = [];
    for (let c = 0; c < count; c += 1) {
      const pos = labelForSlot(row, rowCount, c, count, id);
      slots.push({
        id,
        x: Math.round(xs[c] ?? 50),
        y: Math.round(ys),
        position: pos,
      });
      rowIds.push(id);
      id += 1;
    }
    slotIdsByRow.push(rowIds);
  }

  const links = buildLinksFromRows(parts, slotIdsByRow);
  return { slots, links };
}
