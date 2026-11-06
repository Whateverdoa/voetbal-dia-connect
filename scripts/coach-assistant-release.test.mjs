import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { composeAssistantRelease, assertRetainedProduction } from "./coach-assistant-release.mjs";
const base = { config: { functions: "convex/" }, udfServerVersion: "1.44.0", modules: [
  { path: "schema.js", source: "active schema", environment: "isolate" },
  { path: "mobileReferee.js", source: "protected", environment: "isolate" },
  { path: "auth.config.js", source: "auth", environment: "isolate" },
  { path: "crons.js", source: "schedule", environment: "isolate" },
  { path: "refereeEmailActions.js", source: "node action", environment: "node" },
] };
const assistant = { path: "coachAssistant.js", source: "new assistant", environment: "isolate" };
test("only the assistant can be added or replaced", () => {
  const modules = composeAssistantRelease(base, assistant);
  assertRetainedProduction(base, { ...base, modules });
  const updated = composeAssistantRelease({ ...base, modules }, { ...assistant, source: "updated" });
  assert.equal(updated.length, modules.length);
  assert.deepEqual(updated.filter(m => m.path !== assistant.path), base.modules);
  assert.throws(() => composeAssistantRelease(base, { ...assistant, path: "schema.js" }));
});
for (const path of ["schema.js", "mobileReferee.js", "auth.config.js", "crons.js", "refereeEmailActions.js"]) {
  test(`fails closed when existing ${path} is changed or removed`, () => {
    const next = { ...base, modules: composeAssistantRelease(base, assistant) };
    assert.throws(() => assertRetainedProduction(base, { ...next, modules: next.modules.map(m => m.path === path ? { ...m, source: "changed" } : m) }));
    assert.throws(() => assertRetainedProduction(base, { ...next, modules: next.modules.filter(m => m.path !== path) }));
  });
}
test("package install never prepares a production schema", () => {
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url)));
  for (const hook of ["preinstall", "install", "postinstall", "prepare"]) assert(!pkg.scripts[hook]);
  assert(!JSON.parse(fs.readFileSync(new URL("../package-lock.json", import.meta.url))).packages[""].hasInstallScript);
});
