// Preserve the deployed backend, including unpublished modules, in a narrow release.
import assert from "node:assert/strict";
import path from "node:path";
import { build } from "esbuild";

export const standingsModulePaths = [
  "crons.js", "import/sportlinkStandingsFetch.js", "import/standingsWrite.js",
  "schemaFragments.js", "standings.js", "lib/standingsPolling.js", "schema.js",
];

export function normalizedSchema(value, key = "") {
  if (Array.isArray(value)) {
    const items = value.map(v => normalizedSchema(v));
    if (key === "tables") items.sort((a, b) => a.tableName.localeCompare(b.tableName));
    if (key === "indexes") items.sort((a, b) => a.indexDescriptor.localeCompare(b.indexDescriptor));
    return items;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().flatMap(key => {
      const field = value[key];
      if (key === "stagedDocumentType" && field == null) return [];
      if (key.startsWith("staged") && Array.isArray(field) && !field.length) return [];
      return [[key, key === "fields" && Array.isArray(field)
        ? field.filter((f, i) => f !== "_creationTime" || i !== field.length - 1)
        : normalizedSchema(field, key)]];
    }));
  }
  return value;
}

export async function exportedJson(module) {
  const imported = await import("data:text/javascript;base64," + Buffer.from(module.source).toString("base64"));
  return JSON.parse(imported.default.export());
}

export function assertStandingsSchema(before, after) {
  const previous = normalizedSchema(before), next = normalizedSchema(after);
  const additions = {
    standings: ["lastContentChangedAt"],
    standingsPollState: ["attempts", "lastSlot", "lastAttemptAt", "leaseUntil", "lastOutcome", "lastCompletedAt", "lastSuccessfulPollAt", "failedPouleCount"],
  };
  const stripped = structuredClone(next);
  for (const [tableName, fields] of Object.entries(additions)) {
    const table = stripped.tables.find(t => t.tableName === tableName);
    const old = previous.tables.find(t => t.tableName === tableName);
    assert(table && old, "Missing standings table");
    for (const field of fields) {
      assert.equal(table.documentType.value[field]?.optional, true, "New fields must be optional");
      if (!(field in old.documentType.value)) delete table.documentType.value[field];
    }
  }
  assert.deepEqual(stripped, previous, "Unexpected schema/index change outside approved optional fields");
}

export function cronDefinitions(jobs) {
  return Object.fromEntries(jobs.map(job => [job.name, {
    name: job.cronSpec.udfPath.replace(/\.js:/, ":"),
    args: job.cronSpec.udfArgs instanceof ArrayBuffer
      ? JSON.parse(Buffer.from(job.cronSpec.udfArgs).toString("utf8"))
      : [job.cronSpec.udfArgs],
    schedule: {type: "cron", cron: job.cronSpec.cronSchedule.cronExpr},
  }]));
}

export function assertStandingsCrons(previous, next) {
  const expected = cronDefinitions(previous);
  expected["sportlink-standings-midweek"].name = "import/sportlinkStandingsFetch:syncStandingsWeekendPoll";
  expected["sportlink-standings-monday"] = {
    name: "import/sportlinkStandingsFetch:syncStandingsWeekendPoll", args: [{}],
    schedule: {type: "cron", cron: "0 10 * * 1"},
  };
  for (const entry of Object.values(expected)) {
    if (entry.schedule.cronExpr) {
      entry.schedule = {type: "cron", cron: entry.schedule.cronExpr};
    }
  }
  assert.deepEqual(next, expected, "Unexpected cron changes");
}

export async function buildStandingsOverlay(root, original, schema, crons) {
  const overlay = [];
  for (const modulePath of standingsModulePaths) {
    const previous = original.modules.find(m => m.path === modulePath);
    const options = {
      bundle: true, write: false, format: "esm", platform: "browser",
      target: "esnext", absWorkingDir: root, metafile: true,
    };
    if (modulePath === "schema.js") {
      assert(previous, "Deployed schema required");
      options.stdin = {
        contents: 'import schema from "deployed-schema"; import {standingsTable,standingsPollStateTable} from "./convex/schemaFragments.ts"; schema.tables.standings=standingsTable; schema.tables.standingsPollState=standingsPollStateTable; export default schema;',
        resolveDir: root, loader: "ts",
      };
      options.plugins = [{name: "preserve-schema", setup(build) {
        build.onResolve({filter: /^deployed-schema$/}, () => ({path: "schema", namespace: "deployed"}));
        build.onLoad({filter: /.*/, namespace: "deployed"}, () => ({contents: previous.source, loader: "js"}));
      }}];
    } else {
      options.entryPoints = [path.join(root, "convex", modulePath.replace(/\.js$/, ".ts"))];
    }
    const result = await build(options);
    if (previous) {
      const old = await build({stdin: {contents: previous.source, loader: "js"}, write: false, format: "esm", metafile: true});
      const newExports = Object.values(result.metafile.outputs)[0].exports;
      for (const name of Object.values(old.metafile.outputs)[0].exports) {
        assert(newExports.includes(name), "Removed existing export: " + modulePath + ":" + name);
      }
    }
    overlay.push({path: modulePath, source: result.outputFiles[0].text, sourceMap: null, environment: "isolate"});
  }
  const nextSchema = await exportedJson(overlay.find(m => m.path === "schema.js"));
  assertStandingsSchema(schema, nextSchema);
  assertStandingsCrons(crons, await exportedJson(overlay.find(m => m.path === "crons.js")));
  return overlay;
}
