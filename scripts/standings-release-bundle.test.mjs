import { test } from "node:test";
import assert from "node:assert/strict";
import { assertStandingsSchema, assertStandingsCrons, cronDefinitions } from "./standings-release-bundle.mjs";

const field = (optional = false) => ({ optional, fieldType: { type: "string" } });
const table = tableName => ({
  tableName, documentType: {type: "object", value: {existing: field()}},
  indexes: [{indexDescriptor: "by_existing", fields: ["existing"]}],
  searchIndexes: [], vectorIndexes: [],
});
function schemas() {
  const before = {schemaValidation: true, tables: [table("standings"), table("standingsPollState"), table("mobilePilotScopes")]};
  before.tables[2].documentType.value.preserveTrialField = field(true);
  const after = structuredClone(before);
  after.tables[0].documentType.value.lastContentChangedAt = field(true);
  for (const name of ["attempts", "lastSlot", "lastAttemptAt", "leaseUntil", "lastOutcome", "lastCompletedAt", "lastSuccessfulPollAt", "failedPouleCount"]) {
    after.tables[1].documentType.value[name] = field(true);
  }
  return {before, after};
}

test("accepts approved optional fields while preserving unpublished trial fields", () => {
  const {before, after} = schemas();
  assertStandingsSchema(before, after);
});

test("rejects deletion or retyping of an existing standings field", () => {
  for (const change of [fields => delete fields.existing, fields => { fields.existing.fieldType.type = "number"; }]) {
    const {before, after} = schemas();
    change(after.tables[0].documentType.value);
    assert.throws(() => assertStandingsSchema(before, after));
  }
});

test("rejects unrelated schema and index changes", () => {
  for (const change of [
    schema => schema.tables.pop(),
    schema => { delete schema.tables[2].documentType.value.preserveTrialField; },
    schema => { schema.tables[0].indexes = []; },
    schema => { schema.tables[0].indexes[0].fields = ["different"]; },
  ]) {
    const {before, after} = schemas();
    change(after);
    assert.throws(() => assertStandingsSchema(before, after));
  }
});

test("rejects unapproved additions and required new fields", () => {
  for (const change of [
    fields => { fields.surprise = field(true); },
    fields => { fields.lastContentChangedAt.optional = false; },
  ]) {
    const {before, after} = schemas();
    change(after.tables[0].documentType.value);
    assert.throws(() => assertStandingsSchema(before, after));
  }
});

const job = (name, udfPath, cronExpr, udfArgs = {}) => ({
  name, cronSpec: {udfPath, udfArgs, cronSchedule: {type: "cron", cronExpr}},
});
function cronFixtures() {
  const previous = [
    job("sportlink-standings-midweek", "import/sportlinkStandingsFetch.js:syncStandings", "0 20 * * 3"),
    job("sportlink-standings-weekend-poll", "import/sportlinkStandingsFetch.js:syncStandingsWeekendPoll", "*/15 10-20 * * 6,0"),
    job("unrelated-existing-job", "refereeNotifications.js:createWindowClosingReminders", "0 12 * * *"),
  ];
  const next = cronDefinitions(previous);
  next["sportlink-standings-midweek"].name = "import/sportlinkStandingsFetch:syncStandingsWeekendPoll";
  next["sportlink-standings-monday"] = {
    name: "import/sportlinkStandingsFetch:syncStandingsWeekendPoll", args: [{}],
    schedule: {type: "cron", cron: "0 10 * * 1"},
  };
  return {previous, next};
}

test("accepts only the approved standings cron changes", () => {
  const {previous, next} = cronFixtures();
  assertStandingsCrons(previous, next);
});

test("rejects changes to other scheduled jobs", () => {
  const {previous, next} = cronFixtures();
  next["unrelated-existing-job"].schedule.cron = "* * * * *";
  assert.throws(() => assertStandingsCrons(previous, next));
});

test("decodes binary arguments from the actual Convex cron query", () => {
  const args = new TextEncoder().encode('[{"keep":true}]').buffer;
  const definitions = cronDefinitions([job("existing", "task.js:run", "0 12 * * *", args)]);
  assert.deepEqual(definitions.existing.args, [{keep: true}]);
});
