import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const harness=readFileSync(new URL('./local-referee-e2e.mjs',import.meta.url),'utf8');
const seed=readFileSync(new URL('./fixtures/local-referee-seed.ts.txt',import.meta.url),'utf8');
test('server and URL are always fresh loopback with telemetry disabled',()=>{
  assert.match(harness,/const url = `http:\/\/127\.0\.0\.1:/);
  assert.match(harness,/\['--interface','127\.0\.0\.1'/);
  assert.match(harness,/'--disable-beacon'/);
  assert.match(harness,/fs\.mkdtempSync/);
  assert.doesNotMatch(harness,/convex\.cloud|nautical-condor|2P23BS|CONVEX_DEPLOY_KEY|\.\.\.process\.env/);
});
test('only local self-hosted credentials enter the copied project; crons excluded',()=>{
  assert.match(harness,/CONVEX_SELF_HOSTED_URL=\$\{url\}/);
  assert.match(harness,/\['crons.ts','http.ts','auth.config.ts'\]/);
  assert.match(harness,/path.join\(project,'convex\/auth.config.ts'\)/);
  assert.equal(existsSync(new URL('../convex/__localTestHarness.ts',import.meta.url)),false);
  assert.doesNotMatch(seed,/convex\.cloud|2P23BS|mjtenhoonte|jn7cw69/);
});
test('native verification cannot turn a skipped/missing test into a passed result',()=>{
  assert.match(harness,/assert\.match\(nativeLog,/);
  assert.match(harness,/assert\.doesNotMatch\(nativeLog,/);
  assert.match(harness,/finally\{if\(ownsManifest\)fs\.rmSync\(manifest,\{force:true\}\);server.kill/);
});
