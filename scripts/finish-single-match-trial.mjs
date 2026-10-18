// Finish an already verified code release. This script cannot change code, schema or indexes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ConvexClient,ConvexHttpClient} from 'convex/browser';
import {makeFunctionReference as ref} from 'convex/server';
assert(process.argv.includes('--activate-verified-2p23bs-only'),'Explicit owner-approved activation required');
const TARGET='https://nautical-condor-5.convex.cloud',MATCH='jn7cw69dexmjjmg88jbwsxj4kx8gecgr',release='.artifacts/production-trial-0n6OiO';
const readJSON=p=>JSON.parse(fs.readFileSync(p));
const original=readJSON(release+'/previous-code-config.json'),overlay=readJSON(release+'/overlay-modules.json');
const schemaBefore=readJSON(release+'/schema-before.json'),preflight=readJSON(release+'/preflight.json'),failure=readJSON(release+'/failure.json');
assert(failure.codeCommitted&&!failure.activated&&failure.message.startsWith('Changed pre-existing active index matchEvents.by_match_and_target_and_type'));
assert.equal(readJSON('.artifacts/index-transition-readonly-proof.json').oldActiveSchemaHadTargetIndex,false);
assert.equal(readJSON('.artifacts/iphone-native-acceptance.json').status,'passed');assert.equal(readJSON('.artifacts/single-match-trial-e2e-result.json').status,'passed');
const canonical=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]))):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const out=fs.mkdtempSync('.artifacts/verified-trial-activation-');fs.chmodSync(out,0o700);
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2),{mode:0o600});
const{accessToken}=readJSON(path.join(process.env.HOME,'.convex/config.json'));
const authorization=await fetch('https://api.convex.dev/api/deployment/authorize_prod',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({deploymentName:'nautical-condor-5'}),signal:AbortSignal.timeout(20000)});assert(authorization.ok);
const{adminKey,url}=await authorization.json();assert.equal(url,TARGET);
// Only code inspection and the existing mobile kill switch are permitted.
async function post(api,body={}){assert(['/api/get_config','/api/get_config_hashes','/api/update_environment_variables'].includes(api));const r=await fetch(TARGET+api,{method:'POST',headers:{Authorization:'Convex '+adminKey,'Content-Type':'application/json'},body:JSON.stringify({...body,adminKey}),signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(api+' returned '+r.status);const text=await r.text();return text?JSON.parse(text):null;}
const system=new ConvexClient(TARGET,{unsavedChangesWarning:false});system.setAdminAuth(adminKey);
const admin=new ConvexHttpClient(TARGET);admin.setAdminAuth(adminKey);
const read=(name,args={})=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Metadata read timed out')),20000);let off;off=system.onUpdate(ref(name),args,v=>{clearTimeout(timer);off?.();resolve(v)},e=>{clearTimeout(timer);off?.();reject(e);});});
async function table(table){let result=[],cursor=null;for(let n=0;n<20;n++){const p=await read('_system/cli/tableData',{table,order:'asc',paginationOpts:{numItems:500,cursor}});result.push(...p.page);if(p.isDone)return result;cursor=p.continueCursor;}throw Error('Bounded read limit');}
async function records(){return{matches:await table('matches'),userAccess:await table('userAccess'),referees:await table('referees'),coaches:await table('coaches')}}
let activated=false,flagAttempted=false;
try{
  const expected=[...original.modules.filter(m=>!overlay.some(n=>n.path===m.path)),...overlay];
  const verifyCode=async()=>{const current=await post('/api/get_config');assert.deepEqual(current.config,original.config);assert.equal(current.udfServerVersion,original.udfServerVersion);assert.equal(current.modules.length,expected.length);for(const m of expected){const actual=current.modules.find(n=>n.path===m.path);assert(actual,'Missing module '+m.path);assert.equal(actual.source,m.source,'Concurrent code change '+m.path);assert.equal(actual.environment,m.environment);assert.equal(actual.sourceMap??null,m.sourceMap??null);}assert.equal((await post('/api/get_config_hashes')).nodeVersion??null,null);};
  await verifyCode();
  const schema=await read('_system/frontend/getSchemas');assert(!schema.inProgress,'Do not replace another preparation');assert.equal(schema.active,schemaBefore.inProgress,'Active schema must be the exact already reviewed preparation');
  const old=JSON.parse(schemaBefore.active),active=JSON.parse(schema.active);let oldIndexCount=0;
  for(const oldTable of old.tables){const actual=await read('_system/frontend/indexes',{tableName:oldTable.tableName,tableNamespace:null});for(const index of oldTable.indexes){const now=actual.find(i=>i.name===index.indexDescriptor);assert(now,'Missing old active index');assert.deepEqual(now.fields.filter(f=>f!=='_creationTime'),index.fields.filter(f=>f!=='_creationTime'));assert.equal(now.backfill.state,'done');oldIndexCount++;}}
  for(const[tableName,names]of[['mobilePilotScopes',['by_subject','by_subject_and_match']],['matchEvents',['by_match_and_target_and_type']]]){const indexes=await read('_system/frontend/indexes',{tableName,tableNamespace:null});for(const name of names)assert.equal(indexes.find(i=>i.name===name)?.backfill.state,'done','New approved index must remain active');}
  const before=await records(),match=before.matches.find(m=>m._id===MATCH);assert(match&&match.publicCode==='2P23BS');assert.equal(match.status,'scheduled');assert.equal(match.homeScore,0);assert.equal(match.awayScore,0);assert.equal(match.startedAt,undefined);assert(!before.matches.some(m=>m.refereePolicy));
  assert.equal(hash(before.matches.filter(m=>m._id!==MATCH)),preflight.otherMatchesFingerprint);assert.equal(hash(before.userAccess),preflight.rolesFingerprint);assert.equal(hash(before.referees),preflight.refereesFingerprint);assert.equal(hash(before.coaches),preflight.coachesFingerprint);
  assert.equal((await table('mobilePilotScopes')).length,0);
  const gate=await read('_system/cli/queryEnvironmentVariables:get',{name:'MOBILE_REFEREE_WRITES_ENABLED'});assert(gate?.value==='false','Writes must still be closed');
  save('read-only-verification.json',{status:'passed',exactDeployedModuleSources:true,exactApprovedActiveSchema:true,oldActiveIndexesVerified:oldIndexCount,allThreeNewIndexesActiveAndPreserved:true,rolesAssignmentsAndOtherMatchesUnchanged:true,noCodeSchemaOrIndexOperation:true});
  // Only the previously tested, internally pinned activation is called.
  await verifyCode();const expiresAt=Date.now()+24*60*60_000-60000;
  await admin.mutation(ref('refereeTrial:activate'),{matchId:MATCH,expiresAt});activated=true;
  const after=await records(),current=after.matches.find(m=>m._id===MATCH);const{refereePolicy,...unchanged}=current;assert.deepEqual(unchanged,match);assert.equal(refereePolicy.elapsedMs,0);assert.equal(refereePolicy.runningSince,null);assert.equal(refereePolicy.safetyMarginMinutes,10);
  assert.deepEqual(after.matches.filter(m=>m._id!==MATCH),before.matches.filter(m=>m._id!==MATCH));for(const k of['userAccess','referees','coaches'])assert.deepEqual(after[k],before[k]);
  const scopes=await table('mobilePilotScopes');assert.equal(scopes.length,1);assert.equal(scopes[0].matchId,MATCH);assert.equal(scopes[0].subject,'pending-trial:mjtenhoonte@gmail.com');assert.equal(scopes[0].expiresAt,expiresAt);assert(scopes[0].enabled&&scopes[0].writesEnabled);
  flagAttempted=true;await post('/api/update_environment_variables',{changes:[{name:'MOBILE_REFEREE_WRITES_ENABLED',value:'true'}]});assert.equal((await read('_system/cli/queryEnvironmentVariables:get',{name:'MOBILE_REFEREE_WRITES_ENABLED'})).value,'true');
  const result={status:'passed',matchCode:'2P23BS',matchId:MATCH,expiresAt,expiresAtISO:new Date(expiresAt).toISOString(),buildNumber:6,trialReady:true,subjectBindingPending:true,matchStarted:false,score:[0,0],otherMatchesUnchanged:true,rolesAndAssignmentsUnchanged:true,oldActiveIndexesVerified:oldIndexCount,allThreeNewIndexesPreserved:true,noCodeSchemaOrIndexOperation:true};save('result.json',result);console.log(JSON.stringify(result,null,2));console.log('Evidence '+out);
}catch(e){let writesClosed=!flagAttempted;if(flagAttempted){try{await post('/api/update_environment_variables',{changes:[{name:'MOBILE_REFEREE_WRITES_ENABLED',value:'false'}]});writesClosed=true;}catch{writesClosed=false;}}save('failure.json',{message:e.message,activated,writesClosed});console.error('STOPPED',e.message,'activated=',activated,'writesClosed=',writesClosed,'evidence=',out);process.exitCode=1;}finally{await system.close()}
