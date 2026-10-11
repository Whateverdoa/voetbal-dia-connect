import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { upsertUserAccess } from "../lib/userAccess";

/** CLI-only synthetic fixture. Intentionally restricted to the isolated review backend. */
export const apply = internalMutation({
  args: { coachEmails: v.array(v.string()) },
  returns: v.object({ teamId: v.id("teams"), teamSlug: v.string(), created: v.boolean() }),
  handler: async (ctx, { coachEmails }) => {
    if (process.env.DIA_TEST_MODE !== "true" || process.env.CONVEX_SITE_URL !== "https://sincere-spider-515.convex.site") {
      throw new Error("Alleen toegestaan op de afzonderlijke FC27-testbackend");
    }
    const emails = [...new Set(coachEmails.map((email) => email.trim().toLowerCase()))];
    if (!emails.length || emails.some((email) => !email.includes("@"))) throw new Error("Een geldig testcoachaccount is vereist");
    const teamSlug = "fc27-test";
    const existing = await ctx.db.query("teams").withIndex("by_slug_only", (q) => q.eq("slug", teamSlug)).unique();
    if (existing) return { teamId: existing._id, teamSlug, created: false };
    const now = Date.now();
    const clubId = await ctx.db.insert("clubs", { name: "DIA Testomgeving", slug: "dia", createdAt: now });
    const teamId = await ctx.db.insert("teams", { clubId, name: "FC27 Testteam", slug: teamSlug, isSelectionTeam: true, active: true, createdAt: now });
    for (const email of emails) {
      const coachId = await ctx.db.insert("coaches", { name: "Testcoach", email, teamIds: [teamId], createdAt: now });
      await upsertUserAccess(ctx, { email, roles: ["coach"], coachId, active: true, source: "coach_sync" });
    }
    for (const [index, name] of ["Sam", "Noor", "Milan", "Yara", "Alex", "Robin"].entries()) {
      const playerId = await ctx.db.insert("players", {
        teamId, name: `${name} Voorbeeld`, number: index + 7, active: true, positionPrimary: "CM", createdAt: now,
        photoUrl: index % 2 === 0 ? "/cards/review-portrait.svg" : undefined,
        fcRatings: index === 5 ? { snl: 80, sch: 78 } : { snl: 80, sch: 78 + index, pas: 82, dri: 81, vrd: 77, fys: 80 },
        playStyleIds: ["dribbler", "tireless"],
      });
      for (const consentType of ["photo", "gamification", "public_display"] as const) {
        await ctx.db.insert("playerConsents", {
          playerId, teamId, consentType, status: consentType === "photo" && index % 2 !== 0 ? "revoked" : "granted",
          documentVersion: "synthetic-review-only", token: `review-${playerId}-${consentType}`,
          createdAt: now, updatedAt: now,
        });
      }
    }
    return { teamId, teamSlug, created: true };
  },
});
