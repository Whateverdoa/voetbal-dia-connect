/** Sportlink `weekoffset` pages for programma / uitslagen. */

export function programmaWeekOffsets(weeksForward: number): number[] {
  const offsets: number[] = [];
  for (let w = 0; w <= weeksForward; w++) offsets.push(w);
  return offsets;
}

/** Past programma weeks: Gestaakt / leftover Te spelen still live here. */
export function programmaPastWeekOffsets(weeksBack: number): number[] {
  const offsets: number[] = [];
  for (let w = -1; w >= -weeksBack; w--) offsets.push(w);
  return offsets;
}

/** Include current week (0): today's official scores live here, not on -1. */
export function uitslagenWeekOffsets(weeksBack: number): number[] {
  const offsets: number[] = [];
  for (let w = 0; w >= -weeksBack; w--) offsets.push(w);
  return offsets;
}
