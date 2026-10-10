import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export const customFormationValidator = v.union(
  v.null(),
  v.object({
    name: v.string(),
    kind: v.union(v.literal("8v8"), v.literal("11v11")),
    slots: v.array(
      v.object({
        id: v.number(),
        x: v.number(),
        y: v.number(),
        position: v.string(),
      })
    ),
    links: v.optional(
      v.array(v.object({ from: v.number(), to: v.number() }))
    ),
  })
);

export type PresentationCustomFormation = {
  name: string;
  kind: "8v8" | "11v11";
  slots: { id: number; x: number; y: number; position: string }[];
  links?: { from: number; to: number }[];
};

/** Public payload so TV/kiosk can draw a custom team template. */
export async function loadCustomFormationForMatch(
  ctx: QueryCtx,
  match: Doc<"matches">
): Promise<PresentationCustomFormation | null> {
  if (!match.customFormationTemplateId) return null;
  const template = await ctx.db.get(match.customFormationTemplateId);
  if (!template || !template.active || template.teamId !== match.teamId) {
    return null;
  }
  return {
    name: template.name,
    kind: template.kind,
    slots: template.slots,
    links: template.links,
  };
}
