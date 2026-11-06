import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireCoachForMatch } from "./lib/userAccess";

const entry = v.object({ name: v.string(), at: v.number(), action: v.string() });
const summary = v.object({ creator: v.union(v.null(), entry), latest: v.union(v.null(), entry) });

export const get = query({
  args: { matchId: v.id("matches") },
  returns: v.union(v.null(), v.object({ lineup: summary, plan: summary,
    history: v.array(v.object({ id: v.string(), domain: v.union(v.literal("lineup"), v.literal("plan")), name: v.string(), at: v.number(), action: v.string() })) })),
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match) return null;
    await requireCoachForMatch(ctx, match);
    const summarize = async (domain: "lineup" | "plan") => {
      const first = await ctx.db.query("matchPlanAudit").withIndex("by_match_domain", (q) => q.eq("matchId", matchId).eq("domain", domain)).order("asc").first();
      const last = await ctx.db.query("matchPlanAudit").withIndex("by_match_domain", (q) => q.eq("matchId", matchId).eq("domain", domain)).order("desc").first();
      // Availability may be recorded before the first lineup is created. Only
      // claim a creator when tracking started before the lineup/plan existed.
      const creator = first && !first.existingBefore
        ? await ctx.db.query("matchPlanAudit").withIndex("by_match_domain_created", (q) => q.eq("matchId", matchId).eq("domain", domain).eq("created", true)).order("asc").first()
        : null;
      return { creator: creator ? { name: creator.actorName, at: creator.createdAt, action: creator.action } : null,
        latest: last ? { name: last.actorName, at: last.createdAt, action: last.action } : null };
    };
    const [lineup, plan, rows] = await Promise.all([summarize("lineup"), summarize("plan"),
      ctx.db.query("matchPlanAudit").withIndex("by_match", (q) => q.eq("matchId", matchId)).order("desc").take(20)]);
    return { lineup, plan, history: rows.map((row) => ({ id: String(row._id), domain: row.domain, name: row.actorName, at: row.createdAt, action: row.action })) };
  },
});
