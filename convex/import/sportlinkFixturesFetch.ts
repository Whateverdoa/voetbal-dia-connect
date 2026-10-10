/**
 * Fetch Sportlink programma + uitslagen and stage into `wedstrijden`.
 *
 * Env: SPORTLINK_CLIENT_ID (required), SPORTLINK_BASE_URL (optional).
 */
import { action, internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  mergeSportlinkFixtures,
  type RawSportlinkFixture,
  type SportlinkWedstrijdDoc,
} from "./sportlinkFixturesMapper";
import {
  programmaPastWeekOffsets,
  programmaWeekOffsets,
  uitslagenWeekOffsets,
} from "./sportlinkWeekOffsets";

const DEFAULT_BASE = "https://data.sportlink.com";
const BATCH_SIZE = 100;
const PROGRAMMA_WEEKS_FORWARD = 12;
const PROGRAMMA_WEEKS_BACK = 2;
const UITSLAGEN_WEEKS_BACK = 20;

export type SportlinkImportSummary = {
  source: "sportlink";
  totalFromApi: number;
  totalMapped: number;
  totalCreated: number;
  totalSkipped: number;
  batchCount: number;
  programmaPages: number;
  uitslagenPages: number;
};

function sportlinkConfig(): { clientId: string; baseUrl: string } {
  const clientId = process.env.SPORTLINK_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("SPORTLINK_CLIENT_ID ontbreekt");
  }
  const baseUrl = (
    process.env.SPORTLINK_BASE_URL?.trim() || DEFAULT_BASE
  ).replace(/\/$/, "");
  return { clientId, baseUrl };
}

async function fetchArticle(
  baseUrl: string,
  clientId: string,
  article: "programma" | "uitslagen",
  weekoffset: number,
): Promise<RawSportlinkFixture[]> {
  const url = new URL(`${baseUrl}/${article}`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("aantalregels", "200");
  url.searchParams.set("aantaldagen", article === "programma" ? "14" : "60");
  url.searchParams.set("weekoffset", String(weekoffset));
  url.searchParams.set("eigenwedstrijden", "JA");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Sportlink ${article} fout: ${res.status} ${res.statusText}`);
  }
  const payload: unknown = await res.json();
  if (!Array.isArray(payload)) {
    throw new Error(`Sportlink ${article}: onverwacht antwoord`);
  }
  return payload as RawSportlinkFixture[];
}

async function collectAllFixtures(
  baseUrl: string,
  clientId: string,
): Promise<{
  rows: RawSportlinkFixture[];
  programmaPages: number;
  uitslagenPages: number;
}> {
  const rows: RawSportlinkFixture[] = [];
  let programmaPages = 0;
  let uitslagenPages = 0;
  let emptyUitslagenStreak = 0;

  for (const w of programmaWeekOffsets(PROGRAMMA_WEEKS_FORWARD)) {
    const page = await fetchArticle(baseUrl, clientId, "programma", w);
    programmaPages++;
    rows.push(...page);
    if (page.length === 0) break;
  }

  for (const w of programmaPastWeekOffsets(PROGRAMMA_WEEKS_BACK)) {
    const page = await fetchArticle(baseUrl, clientId, "programma", w);
    programmaPages++;
    rows.push(...page);
  }

  for (const w of uitslagenWeekOffsets(UITSLAGEN_WEEKS_BACK)) {
    const page = await fetchArticle(baseUrl, clientId, "uitslagen", w);
    uitslagenPages++;
    rows.push(...page);
    if (page.length === 0) {
      emptyUitslagenStreak++;
      if (emptyUitslagenStreak >= 3) break;
    } else {
      emptyUitslagenStreak = 0;
    }
  }

  return { rows, programmaPages, uitslagenPages };
}

async function runSportlinkImport(ctx: ActionCtx): Promise<SportlinkImportSummary> {
  const { clientId, baseUrl } = sportlinkConfig();
  const { rows, programmaPages, uitslagenPages } = await collectAllFixtures(
    baseUrl,
    clientId,
  );

  const merged = mergeSportlinkFixtures(rows);
  const mapped: SportlinkWedstrijdDoc[] = Array.from(merged.values());

  await ctx.runMutation(internal.import.importWedstrijden.clearWedstrijden, {});

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
    source: "sportlink",
    totalFromApi: rows.length,
    totalMapped: mapped.length,
    totalCreated,
    totalSkipped,
    batchCount: Math.ceil(mapped.length / BATCH_SIZE) || 0,
    programmaPages,
    uitslagenPages,
  };
}

/** Manual: npx convex run import/sportlinkFixturesFetch:fetchAndImport */
export const fetchAndImport = action({
  args: {},
  handler: async (ctx) => runSportlinkImport(ctx),
});

export const fetchAndImportInternal = internalAction({
  args: {},
  handler: async (ctx) => runSportlinkImport(ctx),
});
