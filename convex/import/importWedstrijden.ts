/**
 * Import VoetbalAssist wedstrijden into Convex (insert-only on voetbalassist_id).
 *
 * Usage (no extra secrets needed, uses existing CONVEX_DEPLOYMENT):
 *   npx convex run import/importWedstrijden:fetchAndImport
 *
 * Fetches directly from the VoetbalAssist API server-side, maps the
 * response, and inserts in batches. Idempotent on voetbalassist_id.
 */
import {
  action,
  internalAction,
  internalMutation,
  type ActionCtx,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import {
  mapRawToWedstrijd,
  type RawWedstrijd,
  type WedstrijdDoc,
} from "./wedstrijdenMapper";

const VOETBALASSIST_URL =
  "https://site-api.voetbalassi.st/DIA/front/programmaenuitslagen/PostWedstrijden";

const WEDSTRIJD_V = v.object({
  voetbalassist_id: v.number(),
  datum: v.string(),
  tijd: v.string(),
  datum_ms: v.number(),
  thuisteam: v.string(),
  uitteam: v.string(),
  thuis_goals: v.optional(v.number()),
  uit_goals: v.optional(v.number()),
  status: v.string(),
  type: v.string(),
  categorie: v.string(),
  leeftijd: v.number(),
  dia_team: v.string(),
  veld: v.string(),
  scheidsrechter: v.string(),
  thuisteamLogo: v.optional(v.string()),
  uitteamLogo: v.optional(v.string()),
});

const BATCH_SIZE = 100;

export const clearWedstrijden = internalMutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("wedstrijden").collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    return { deleted: docs.length };
  },
});

export const importWedstrijdenBatch = internalMutation({
  args: {
    wedstrijden: v.array(WEDSTRIJD_V),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let skipped = 0;
    for (const w of args.wedstrijden) {
      const existing = await ctx.db
        .query("wedstrijden")
        .withIndex("by_voetbalassist_id", (q) =>
          q.eq("voetbalassist_id", w.voetbalassist_id),
        )
        .unique();
      if (existing) {
        skipped++;
        continue;
      }
      await ctx.db.insert("wedstrijden", w);
      created++;
    }
    return { created, skipped };
  },
});

async function runVoetbalAssistImport(ctx: ActionCtx) {
  await ctx.runMutation(internal.import.importWedstrijden.clearWedstrijden, {});

  const now = new Date().toISOString();
  const payload = {
    clubWedstrijdenStandaardSorterenOp: "team",
    datumBeginSeizoen: "2025-07-01T00:00:00",
    datumEindeSeizoen: "2026-07-01T00:00:00",
    datumTot: "2026-07-01T00:00:00",
    datumVan: "2025-07-01T00:00:00",
    klantAfkorting: "DIA",
    lang: "nl",
    programmaEnUitslagenType: 2,
    vandaag: now,
  };

  const res = await fetch(VOETBALASSIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      Accept: "application/json, text/plain, */*",
      Origin: "https://www.rkvvdia.nl",
      Referer: "https://www.rkvvdia.nl/",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`VoetbalAssist API fout: ${res.status} ${res.statusText}`);
  }

  const rawData: RawWedstrijd[] = await res.json();
  if (!Array.isArray(rawData)) {
    throw new Error("Onverwacht API-antwoord: geen array");
  }

  const mapped: WedstrijdDoc[] = [];
  for (const raw of rawData) {
    const doc = mapRawToWedstrijd(raw);
    if (doc) mapped.push(doc);
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const chunk = mapped.slice(i, i + BATCH_SIZE);
    const result = await ctx.runMutation(
      internal.import.importWedstrijden.importWedstrijdenBatch,
      { wedstrijden: chunk },
    );
    totalCreated += result.created;
    totalSkipped += result.skipped;
  }

  return {
    totalFromApi: rawData.length,
    totalMapped: mapped.length,
    totalCreated,
    totalSkipped,
    batchCount: Math.ceil(mapped.length / BATCH_SIZE),
  };
}

/**
 * Fetch all DIA wedstrijden from VoetbalAssist API and import them.
 * Run with: npx convex run import/importWedstrijden:fetchAndImport
 */
export const fetchAndImport = action({
  args: {},
  handler: async (ctx) => runVoetbalAssistImport(ctx),
});

/** Cron / internal pipeline entry (same behavior as public fetchAndImport). */
export const fetchAndImportInternal = internalAction({
  args: {},
  handler: async (ctx) => runVoetbalAssistImport(ctx),
});
