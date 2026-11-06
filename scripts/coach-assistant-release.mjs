// Add only the assistant module to the running backend. Preserve the independently
// released referee trial, active schema, runtime, auth, cron jobs and node modules.
import assert from "node:assert/strict";
import { build } from "esbuild";
import { ConvexClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

export const target = "https://nautical-condor-5.convex.cloud";
const modulePath = "coachAssistant.js";

export function composeAssistantRelease(original, assistant) {
  assert.equal(assistant.path, modulePath);
  assert.equal(assistant.environment, "isolate");
  assert(original.modules.some(m => m.path === "schema.js"), "Active schema required");
  return [...original.modules.filter(m => m.path !== modulePath), assistant];
}

export function assertRetainedProduction(original, next) {
  assert.deepEqual(next.config, original.config);
  assert.equal(next.udfServerVersion, original.udfServerVersion);
  assert.equal(next.modules.length, original.modules.filter(m => m.path !== modulePath).length + 1);
  for (const module of original.modules) {
    if (module.path !== modulePath) assert.deepEqual(next.modules.find(m => m.path === module.path), module, `Changed existing module ${module.path}`);
  }
}

export async function releaseCoachAssistant({ adminKey, deploymentUrl, checkOnly = false }) {
  assert.equal(deploymentUrl, target, "Unexpected deployment target");
  assert(adminKey, "Production deployment authentication required");
  const post = async (api, body = {}) => {
    const response = await fetch(target + api, { method: "POST", headers: { Authorization: `Convex ${adminKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, adminKey }), signal: AbortSignal.timeout(90_000) });
    assert(response.ok, `Production release request failed (${api}, ${response.status})`);
    return response.json();
  };
  const client = new ConvexClient(target, { unsavedChangesWarning: false });
  client.setAdminAuth(adminKey);
  const readSchemas = () => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Schema inspection timed out")), 20_000);
    let unsubscribe;
    unsubscribe = client.onUpdate(makeFunctionReference("_system/frontend/getSchemas"), {}, value => { clearTimeout(timeout); unsubscribe?.(); resolve(value); }, reject);
  });
  try {
    const original = await post("/api/get_config");
    const hashes = await post("/api/get_config_hashes");
    assert.equal(hashes.nodeVersion ?? null, null, "Unexpected Node runtime; reconcile before release");
    assert.equal(hashes.nodeDependencies?.length ?? 0, 0, "External Node dependencies require a separate release review");
    const schemas = await readSchemas();
    assert(schemas.active && !schemas.inProgress, "Active schema required; another schema preparation must finish first");
    const result = await build({ entryPoints: ["convex/coachAssistant.ts"], bundle: true, write: false, format: "esm", platform: "browser", target: "esnext", metafile: true });
    const exports = Object.values(result.metafile.outputs)[0].exports.sort();
    assert.deepEqual(exports, ["previewRemaining", "save", "saveRemaining", "workspace"]);
    const assistant = { path: modulePath, source: result.outputFiles[0].text, environment: "isolate" };
    const modules = composeAssistantRelease(original, assistant);
    assertRetainedProduction(original, { ...original, modules });
    if (checkOnly) { console.log(`Assistant release preflight passed; ${original.modules.length} existing modules retained; no writes.`); return; }
    assert.deepEqual(await post("/api/get_config"), original, "Concurrent source change; aborting");
    // Prepare the exact already-active schema, never this checkout's older schema.
    const prepared = await post("/api/prepare_schema", { bundle: original.modules.find(m => m.path === "schema.js"), dryRun: false });
    assert(prepared.schemaId && (prepared.disabled?.length ?? 0) === 0, "Existing schema/index preservation failed");
    assert.deepEqual(await post("/api/get_config"), original, "Concurrent source change before commit");
    await post("/api/push_config", { config: original.config, modules, udfServerVersion: original.udfServerVersion,
      schemaId: prepared.schemaId, nodeDependencies: [], nodeVersion: null });
    const deployed = await post("/api/get_config");
    assertRetainedProduction(original, deployed);
    assert.equal(deployed.modules.find(m => m.path === modulePath)?.source, assistant.source);
    const after = await readSchemas();
    assert.deepEqual(JSON.parse(after.active), JSON.parse(schemas.active), "Active schema changed unexpectedly");
    console.log("Coachassistant deployed. All other production modules and the active schema are unchanged.");
  } finally { await client.close(); }
}
