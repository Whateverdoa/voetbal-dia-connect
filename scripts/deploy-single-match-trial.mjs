// Narrow operator release. Never loads project dotenv, prints credentials or accepts another target.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ConvexClient,ConvexHttpClient} from 'convex/browser';
import {makeFunctionReference as ref} from 'convex/server';
import {buildTrialOverlay,changedTrialFiles,schemaJSON,assertAdditiveTrialSchema,assertExactTrialPreparation} from './trial-release-bundle.mjs';
const root=process.cwd(),TARGET='https://nautical-condor-5.convex.cloud',MATCH='jn7cw69dexmjjmg88jbwsxj4kx8gecgr';
const apply=process.argv.includes('--apply-owner-approved-2p23bs-trial');
assert(apply||process.argv.includes('--check-only'),'An explicit release mode is required');
const canonical=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]))):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
assert.equal(JSON.parse(fs.readFileSync('.artifacts/single-match-trial-e2e-result.json')).status,'passed');
const out=fs.mkdtempSync('.artifacts/production-trial-');fs.chmodSync(out,0o700);
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2),{mode:0o600});
const {accessToken}=JSON.parse(fs.readFileSync(path.join(process.env.HOME,'.convex/config.json')));
const auth=await fetch('https://api.convex.dev/api/deployment/authorize_prod',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({deploymentName:'nautical-condor-5'}),signal:AbortSignal.timeout(20000)});assert(auth.ok,'Existing production management authorization is required');
const {adminKey,url}=await auth.json();assert.equal(url,TARGET);
async function post(api,body={}){const r=await fetch(TARGET+api,{method:'POST',headers:{Authorization:'Convex '+adminKey,'Content-Type':'application/json'},body:JSON.stringify({...body,adminKey}),signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(api+' returned '+r.status);return r.json();}
const system=new ConvexClient(TARGET,{unsavedChangesWarning:false});system.setAdminAuth(adminKey);
const admin=new ConvexHttpClient(TARGET);admin.setAdminAuth(adminKey);
const read=(name,args={})=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Read-only metadata timeout')),20000);let off;off=system.onUpdate(ref(name),args,v=>{clearTimeout(timer);off?.();resolve(v)},e=>{clearTimeout(timer);off?.();reject(e);});});
async function table(name){let cursor=null,result=[];for(let n=0;n<20;n++){const p=await read('_system/cli/tableData',{table:name,order:'asc',paginationOpts:{numItems:500,cursor}});result.push(...p.page);if(p.isDone)return result;cursor=p.continueCursor;}throw Error('Bounded metadata limit exceeded');}
const records=async()=>({matches:await table('matches'),userAccess:await table('userAccess'),referees:await table('referees'),coaches:await table('coaches')});
let codeCommitted=false,activated=false,flagChanged=false;
try{
  const original=await post('/api/get_config');
  const hashState=await post('/api/get_config_hashes');assert.equal(hashState.nodeVersion??null,null,'Preserve the existing runtime version');
  const expected=JSON.parse(fs.readFileSync('../iphone-trial-preflight/source.json'));
  assert.deepEqual(original,expected,'Unexpected concurrent production source change');
  const schema=await read('_system/frontend/getSchemas');assert(schema.active,'Active schema required');
  const beforeFunctions=await read('_system/cli/modules:apiSpec');
  const indexTables=JSON.parse(schema.active).tables.map(t=>t.tableName);
  const beforeIndexes={};for(const tableName of indexTables)beforeIndexes[tableName]=await read('_system/frontend/indexes',{tableName,tableNamespace:null});
  const before=await records(),match=before.matches.find(m=>m._id===MATCH);assert(match&&match.publicCode==='2P23BS');assert(!before.matches.some(m=>m.refereePolicy),'Existing policy must not be broadened accidentally');
  assert.equal(match.status,'scheduled');assert.equal(match.homeScore,0);assert.equal(match.awayScore,0);assert.equal(match.startedAt,undefined);
  const access=before.userAccess.find(a=>a.email==='mjtenhoonte@gmail.com');assert(access?.active&&access.roles.includes('referee')&&access.refereeId===match.refereeId);
  const assigned=before.referees.find(r=>r._id===match.refereeId);assert(assigned?.active&&assigned.email==='mjtenhoonte@gmail.com');
  const existingScopes=await table('mobilePilotScopes');assert.equal(existingScopes.length,0,'Existing pilot scope records require an explicit separate review');
  const gate=await read('_system/cli/queryEnvironmentVariables:get',{name:'MOBILE_REFEREE_WRITES_ENABLED'});assert(!gate||gate.value==='false','Global mobile gate is unexpectedly already enabled');
  const overlay=await buildTrialOverlay(root,original,changedTrialFiles(root));const nextSchema=await schemaJSON(overlay.find(m=>m.path==='schema.js'));
  assertAdditiveTrialSchema(JSON.parse(schema.active),nextSchema);
  if(schema.inProgress){
    assert(process.argv.includes('--reuse-exact-own-preview-preparation'),'Concurrent schema preparation detected');
    const provenance=JSON.parse(fs.readFileSync('.artifacts/preview-schema-provenance.json'));
    assert(provenance.target==='preview'&&provenance.automaticCodegenObserved&&provenance.exactSchemaMatch&&provenance.branch==='codex/2p23bs-iphone-trial','Known own-preview provenance required');
    assertExactTrialPreparation(JSON.parse(schema.inProgress),nextSchema);
  }
  save('previous-code-config.json',original);save('overlay-modules.json',overlay);save('schema-before.json',schema);
  save('preflight.json',{matchId:MATCH,status:match.status,score:[match.homeScore,match.awayScore],accountAndActiveAssignmentConfirmed:true,existingScopes:0,otherMatchesFingerprint:digest(before.matches.filter(m=>m._id!==MATCH)),rolesFingerprint:digest(before.userAccess),refereesFingerprint:digest(before.referees),coachesFingerprint:digest(before.coaches),modifiedModulePaths:overlay.map(m=>m.path),retainedModuleCount:original.modules.filter(m=>!overlay.some(o=>o.path===m.path)).length});
  console.log('PRECHECK PASSED: existing source, exact fixture/assignment, empty scopes, closed gate and additive schema verified.');
  if(!apply){console.log('CHECK ONLY; no source, schema, environment or data changes. Evidence '+out);process.exitCode=0;}
  else {
    const native=JSON.parse(fs.readFileSync('.artifacts/iphone-native-acceptance.json'));assert.equal(native.status,'passed');assert(native.unitPassing>=175&&native.adapterUIPassing===7&&native.loginGateUIPassing===1&&native.buildNumber===6);
    // No deployment can overwrite an intervening push.
    assert.deepEqual(await post('/api/get_config'),original);
    const prepared=await post('/api/prepare_schema',{bundle:overlay.find(m=>m.path==='schema.js'),dryRun:false});assert(prepared.schemaId);
    const additions=new Set(['mobilePilotScopes.by_subject','mobilePilotScopes.by_subject_and_match','matchEvents.by_match_and_target_and_type']);
    const removals=prepared.disabled??[];assert.equal(removals.length,0,'Never disable existing indexes');
    save('schema-preparation.json',prepared);
    for(let attempt=0;;attempt++){
      const scopes=await read('_system/frontend/indexes',{tableName:'mobilePilotScopes',tableNamespace:null}),events=await read('_system/frontend/indexes',{tableName:'matchEvents',tableNamespace:null});
      const pending=[...scopes.map(i=>({...i,table:'mobilePilotScopes'})),...events.map(i=>({...i,table:'matchEvents'}))].filter(i=>additions.has(i.table+'.'+i.name));
      if(pending.length===3&&pending.every(i=>['backfilled','done'].includes(i.backfill.state)))break;
      if(attempt>80)throw Error('New indexes not ready; mobile writes stay closed');await new Promise(r=>setTimeout(r,1000));
    }
    assert.deepEqual(await post('/api/get_config'),original,'Concurrent source changed before commit');
    await post('/api/push_config',{config:original.config,modules:[...original.modules.filter(m=>!overlay.some(o=>o.path===m.path)),...overlay],udfServerVersion:original.udfServerVersion,schemaId:prepared.schemaId,nodeDependencies:[],nodeVersion:null});codeCommitted=true;
    const afterCode=await post('/api/get_config');for(const m of original.modules.filter(m=>!overlay.some(o=>o.path===m.path)))assert.deepEqual(afterCode.modules.find(n=>n.path===m.path),m);
    for(const [tableName,indexes] of Object.entries(beforeIndexes)){
      const current=await read('_system/frontend/indexes',{tableName,tableNamespace:null});
      for(const index of indexes)assert.deepEqual(current.find(i=>i.name===index.name),index,'Changed pre-existing active index '+tableName+'.'+index.name);
    }
    const activeSchema=await read('_system/frontend/getSchemas');assert(!activeSchema.inProgress);assertAdditiveTrialSchema(JSON.parse(schema.active),JSON.parse(activeSchema.active));
    assert.deepEqual(afterCode.config,original.config);assert.equal(afterCode.udfServerVersion,original.udfServerVersion);
    const afterFunctions=await read('_system/cli/modules:apiSpec');for(const f of beforeFunctions){const n=afterFunctions.find(n=>n.identifier===f.identifier);assert(n,'Removed existing function '+f.identifier);for(const key of ['functionType','visibility','args'])assert.deepEqual(n[key],f[key],'Existing function contract changed '+f.identifier+'.'+key);}
    assert.deepEqual(await records(),before,'Code-only release changed record data');
    const expiresAt=Date.now()+24*60*60_000-60000;
    await admin.mutation(ref('refereeTrial:activate'),{matchId:MATCH,expiresAt});activated=true;
    const after=await records(),current=after.matches.find(m=>m._id===MATCH);
    assert.deepEqual(after.matches.filter(m=>m._id!==MATCH),before.matches.filter(m=>m._id!==MATCH));
    for(const key of ['userAccess','referees','coaches'])assert.deepEqual(after[key],before[key]);
    const{refereePolicy,...rest}=current;assert.deepEqual(rest,match);assert.equal(refereePolicy.elapsedMs,0);assert.equal(refereePolicy.runningSince,null);assert.equal(refereePolicy.safetyMarginMinutes,10);
    const scopes=await table('mobilePilotScopes');assert.equal(scopes.length,1);assert.equal(scopes[0].matchId,MATCH);assert.equal(scopes[0].subject,'pending-trial:mjtenhoonte@gmail.com');assert.equal(scopes[0].expiresAt,expiresAt);
    // The only exposed mobile module has immutable server match/account pins.
    // Existing web official routes are blocked for this policy; no web flag changes.
    await post('/api/update_environment_variables',{changes:[{name:'MOBILE_REFEREE_WRITES_ENABLED',value:'true'}]});flagChanged=true;
    const result={status:'passed',deployment:TARGET,matchId:MATCH,matchCode:'2P23BS',expiresAt,expiresAtISO:new Date(expiresAt).toISOString(),buildNumber:6,ownerSubjectBindingPending:true,trialReady:true,matchStarted:false,score:[current.homeScore,current.awayScore],otherMatchesUnchanged:true,rolesAndAssignmentsUnchanged:true,normalWebWritersBlockedForTrial:true,activeExistingIndexesPreserved:true,modifiedModules:overlay.map(m=>m.path)};
    save('result.json',result);console.log(JSON.stringify(result,null,2));console.log('Evidence '+out);
  }
}catch(e){
  if(codeCommitted||activated||flagChanged){try{await post('/api/update_environment_variables',{changes:[{name:'MOBILE_REFEREE_WRITES_ENABLED',value:'false'}]});}catch{}}
  save('failure.json',{message:e.message,codeCommitted,activated,mobileFlagWasChanged:flagChanged});console.error('STOPPED:',e.message,'codeCommitted=',codeCommitted,'activated=',activated,'evidence=',out);process.exitCode=1;
}finally{await system.close();}
