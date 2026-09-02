/** Studio tabs on kleedkamer / presentatie. Internal id "kleedkamer" = Opstelling UI. */
export type StudioTab = "tactiek" | "kleedkamer" | "kaarten";

/** URL tab value for Opstelling (internal id remains "kleedkamer"). */
export function studioTabToUrlParam(tab: StudioTab): string {
  return tab === "kleedkamer" ? "opstelling" : tab;
}

export function parseStudioTab(
  value: string | null,
  fallback: StudioTab
): StudioTab {
  if (value === "opstelling" || value === "kleedkamer") {
    return "kleedkamer";
  }
  if (value === "tactiek" || value === "kaarten") {
    return value;
  }
  return fallback;
}
