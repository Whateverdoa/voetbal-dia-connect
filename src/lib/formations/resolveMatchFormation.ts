import type { Formation } from "./types";
import { getFormation } from "./index";

export type CustomFormationPayload = {
  name: string;
  kind: "8v8" | "11v11";
  slots: Formation["slots"];
  links?: { from: number; to: number }[];
};

/**
 * Returns pitch formation: custom template takes precedence over preset formationId.
 */
export function resolveMatchFormation(
  formationId: string | undefined,
  custom: CustomFormationPayload | null | undefined
): Formation | undefined {
  if (custom && custom.slots.length > 0) {
    const links: [number, number][] =
      custom.links?.map((l) => [l.from, l.to]) ?? [];
    return { name: custom.name, slots: custom.slots, links };
  }
  return getFormation(formationId);
}
