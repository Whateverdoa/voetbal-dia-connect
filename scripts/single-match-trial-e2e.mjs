import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ConvexHttpClient,ConvexClient} from 'convex/browser';
import {buildTrialOverlay,changedTrialFiles,assertAdditiveTrialSchema,schemaJSON} from './trial-release-bundle.mjs';
import {makeFunctionReference as ref} from 'convex/server';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=fs.mkdtempSync(path.join(root,'.artifacts/trial-local-'));
const binary=path.join(process.env.HOME,'.cache/convex/binaries/precompiled-2026-08-25-7cce8fb/convex-local-backend');
const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));env.DISABLE_BEACON='true';
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const port=await freePort(),site=await freePort(),url=`http://127.0.0.1:${port}`,secret=randomBytes(32).toString('hex'),name='single-match-trial';
const key=execFileSync(binary,['keygen','admin-key','--instance-name',name,'--instance-secret',secret],{env,encoding:'utf8'}).trim();
const log=fs.openSync(path.join(dir,'server.log'),'w',0o600);
const server=spawn(binary,['--interface','127.0.0.1','--port',String(port),'--site-proxy-port',String(site),'--instance-name',name,'--instance-secret',secret,'--disable-beacon','--local-storage',path.join(dir,'storage'),path.join(dir,'db.sqlite3')],{env,stdio:['ignore',log,log]});
const checks=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
function run(args,cwd,logName){return new Promise((resolve,reject)=>{const fd=fs.openSync(path.join(dir,logName),'w',0o600);const p=spawn(process.execPath,args,{cwd,env,stdio:['ignore',fd,fd]});p.once('error',reject);p.once('exit',code=>{fs.closeSync(fd);code===0?resolve():reject(Error(`${logName} exit ${code}; ${dir}`));});});}
try {
  for(let n=0;;n++){try{await fetch(url+'/version');break;}catch{if(n>80)throw Error('Local start failed');await sleep(100);}}
  const project=path.join(dir,'project');fs.mkdirSync(project);
  fs.cpSync(path.join(root,'convex'),path.join(project,'convex'),{recursive:true,filter:p=>!p.endsWith('.test.ts')&&!['auth.config.ts','http.ts','crons.ts'].includes(path.basename(p))});
  fs.cpSync(path.join(root,'src/lib'),path.join(project,'src/lib'),{recursive:true,filter:p=>!p.endsWith('.test.ts')&&!p.endsWith('.test.tsx')});
  fs.symlinkSync(path.join(root,'node_modules'),path.join(project,'node_modules'),'dir');
  fs.writeFileSync(path.join(project,'package.json'),JSON.stringify({name:'single-match-local-only',private:true,type:'module',dependencies:{convex:JSON.parse(fs.readFileSync(path.join(root,'node_modules/convex/package.json'))).version}}));
  fs.copyFileSync(path.join(root,'scripts/fixtures/single-match-trial-fixture.ts.txt'),path.join(project,'convex/__trialFixture.ts'));
  const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const issuer='https://single-match-trial.invalid',jwk={...publicKey.export({format:'jwk'}),kid:'synthetic',alg:'RS256',use:'sig'};
  fs.writeFileSync(path.join(project,'convex/auth.config.ts'),'export default '+JSON.stringify({providers:[{type:'customJwt',applicationID:'convex',issuer,jwks:'data:text/plain;charset=utf-8;base64,'+Buffer.from(JSON.stringify({keys:[jwk]})).toString('base64'),algorithm:'RS256'}]})+';');
  const envFile=path.join(project,'local.env');fs.writeFileSync(envFile,`CONVEX_SELF_HOSTED_URL=${url}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${key}\n`,{mode:0o600});
  const cli=path.join(root,'node_modules/convex/bin/main.js');const push=log=>run([cli,'dev','--once','--env-file',envFile,'--typecheck','disable','--codegen','disable'],project,log);
  const newSchema=fs.readFileSync(path.join(project,'convex/schema.ts'),'utf8');
  fs.writeFileSync(path.join(project,'convex/schema.ts'),execFileSync('git',['show','8558608:convex/schema.ts'],{cwd:root,encoding:'utf8'}));
  await push('initial-push.log');const admin=new ConvexHttpClient(url);admin.setAdminAuth(key);
  const ids=await admin.mutation(ref('__trialFixture:seed'),{});
  for(const file of ['lib/singleMatchTrial.ts','refereeRegistration.ts']){const p=path.join(project,'convex',file);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replaceAll('jn7cw69dexmjjmg88jbwsxj4kx8gecgr',ids.matchId).replaceAll('mjtenhoonte@gmail.com','owner@trial.invalid'));}
  fs.writeFileSync(path.join(project,'convex/schema.ts'),newSchema);
  async function post(api,body={}) { const response=await fetch(url+api,{method:'POST',headers:{Authorization:'Convex '+key,'Content-Type':'application/json'},body:JSON.stringify({...body,adminKey:key})});if(!response.ok)throw Error(api+' '+response.status+' '+await response.text());return response.json(); }
  const prior=await post('/api/get_config');const overlay=await buildTrialOverlay(project,prior,changedTrialFiles(root));
  const system=new ConvexClient(url,{unsavedChangesWarning:false});system.setAdminAuth(key);
  const readSystem=(name,args={})=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Metadata timeout')),15000);let off;off=system.onUpdate(ref(name),args,value=>{clearTimeout(timer);off?.();resolve(value)},reject)});
  try {
    const schema=await readSystem('_system/frontend/getSchemas');assertAdditiveTrialSchema(JSON.parse(schema.active),await schemaJSON(overlay.find(m=>m.path==='schema.js')));
    const prepared=await post('/api/prepare_schema',{bundle:overlay.find(m=>m.path==='schema.js'),dryRun:false});assert(prepared.schemaId);await sleep(1500);
    const repeated=await post('/api/prepare_schema',{bundle:overlay.find(m=>m.path==='schema.js'),dryRun:false});assert.equal(repeated.schemaId,prepared.schemaId,'Exact preparation must be reused, not replaced');
    const modules=[...prior.modules.filter(m=>!overlay.some(o=>o.path===m.path)),...overlay];
    await post('/api/push_config',{config:prior.config,modules,udfServerVersion:prior.udfServerVersion,schemaId:prepared.schemaId,nodeDependencies:[],nodeVersion:null});
    const after=await post('/api/get_config');assert.deepEqual(after.config,prior.config);for(const m of prior.modules.filter(m=>!overlay.some(o=>o.path===m.path)))assert.deepEqual(after.modules.find(a=>a.path===m.path),m);
    checks.push('selective release adds only optional schema and preserves unrelated modules/auth');console.log('PASS selective release adds only optional schema and preserves unrelated modules/auth');
  }finally{await system.close();}
  await run([cli,'env','set','MOBILE_REFEREE_WRITES_ENABLED','true','--env-file',envFile],project,'enable-local.log');
  function actor(extra={}){const now=Math.floor(Date.now()/1000),h=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:'synthetic'})).toString('base64url'),b=Buffer.from(JSON.stringify({iss:issuer,aud:'convex',sub:'synthetic-owner',email:'owner@trial.invalid',email_verified:true,iat:now,exp:now+3600,...extra})).toString('base64url'),text=h+'.'+b;const c=new ConvexHttpClient(url);c.setAuth(text+'.'+sign('RSA-SHA256',Buffer.from(text),privateKey).toString('base64url'));return c;}
  const owner=actor(),other=actor({sub:'other',email:'admin@trial.invalid'});
  const inspect=()=>admin.query(ref('__trialFixture:inspect'),{}),patch=(id,patch)=>admin.mutation(ref('__trialFixture:patch'),{id,patch});
  const original=await inspect();const read=()=>owner.query(ref('mobileReferee:getMatch'),{matchId:ids.matchId});
  let serial=0;const args=async action=>({matchId:ids.matchId,expectedVersion:(await read()).version,correlationId:`synthetic-${++serial}`,actorSubject:'synthetic-owner',action});
  const act=async action=>owner.mutation(ref('mobileReferee:command'),await args(action));
  async function check(name,fn){await fn();const current=await inspect();assert.deepEqual(current.matches.find(m=>m._id===ids.otherId),original.matches.find(m=>m._id===ids.otherId),'Other match changed');assert.deepEqual(current.users,original.users,'User roles changed');assert.deepEqual(current.referees,original.referees,'Referee records changed');assert.deepEqual(current.coaches,original.coaches,'Coach records changed');checks.push(name);console.log('PASS '+name);}
  await check('closed before operator activation',async()=>{await assert.rejects(read(),/PILOT_ACCESS_DENIED/);await assert.rejects(owner.mutation(ref('refereeTrial:enroll'),{matchId:ids.matchId}),/OFFICIAL_REGISTRATOR_REQUIRED/);assert.deepEqual(await inspect(),original);});
  const expiresAt=Date.now()+3600000;
  await check('activation is internal, exact-match, bounded and non-destructive',async()=>{
    await assert.rejects(admin.mutation(ref('refereeTrial:activate'),{matchId:ids.otherId,expiresAt}),/PILOT_ACCESS_DENIED/);
    await assert.rejects(admin.mutation(ref('refereeTrial:activate'),{matchId:ids.matchId,expiresAt:Date.now()+25*3600000}),/PILOT_ACCESS_DENIED/);
    await assert.rejects(owner.mutation(ref('refereeTrial:activate'),{matchId:ids.matchId,expiresAt}));
    await admin.mutation(ref('refereeTrial:activate'),{matchId:ids.matchId,expiresAt});
    const s=await inspect(),m=s.matches.find(m=>m._id===ids.matchId);assert.equal(m.status,'scheduled');assert.equal(m.homeScore,0);assert(!m.startedAt);assert.equal(m.refereePolicy.safetyMarginMinutes,10);assert.equal(s.scopes.length,1);assert.equal(s.events.length,1);assert.equal(s.events[0].actorKind,'system');
    await assert.rejects(admin.mutation(ref('refereeTrial:activate'),{matchId:ids.matchId,expiresAt}),/TRIAL_REQUIRES_UNSTARTED_MATCH/);
  });
  await check('verified owner enrollment binds once; no account or match action',async()=>{
    await assert.rejects(other.mutation(ref('refereeTrial:enroll'),{matchId:ids.matchId}),/PILOT_ACCESS_DENIED/);
    await assert.rejects(actor({email_verified:false}).mutation(ref('refereeTrial:enroll'),{matchId:ids.matchId}),/AUTH_IDENTITY_INCOMPLETE/);
    await assert.rejects(owner.mutation(ref('refereeTrial:enroll'),{matchId:ids.otherId}),/PILOT_ACCESS_DENIED/);
    const result=await owner.mutation(ref('refereeTrial:enroll'),{matchId:ids.matchId});assert.equal(result.subject,'synthetic-owner');
    assert.deepEqual(await owner.mutation(ref('refereeTrial:enroll'),{matchId:ids.matchId}),result);
    await assert.rejects(actor({sub:'different-owner-subject'}).mutation(ref('refereeTrial:enroll'),{matchId:ids.matchId}),/PILOT_ACCESS_DENIED/);
    const s=await inspect();assert.equal(s.scopes.length,1);assert.equal(s.scopes[0].subject,'synthetic-owner');assert.equal(s.events.length,2);assert.equal(s.matches.find(m=>m._id===ids.matchId).status,'scheduled');
  });
  await check('API exposes only selected match and never accepts another match/account',async()=>{
    assert.equal((await owner.query(ref('mobileReferee:session'),{})).writesEnabled,true);
    const list=await owner.query(ref('mobileReferee:listMatches'),{});assert.deepEqual(list.matches.map(m=>m.matchId),[ids.matchId]);
    for(const endpoint of ['mobileReferee:getMatch','mobileReferee:timeline'])await assert.rejects(owner.query(ref(endpoint),{matchId:ids.otherId,...(endpoint.endsWith('timeline')?{paginationOpts:{numItems:30,cursor:null}}:{})}),/PILOT_ACCESS_DENIED/);
    await assert.rejects(other.query(ref('mobileReferee:session'),{}),/PILOT_ACCESS_DENIED/);
    await assert.rejects(owner.mutation(ref('mobileReferee:command'),{matchId:ids.otherId,expectedVersion:0,correlationId:'outside',action:{kind:'start'}}),/PILOT_ACCESS_DENIED/);
  });
  await check('all legacy official paths and facade are blocked for opted-in fixture',async()=>{
    for(const endpoint of ['matchActions:start','matchLifecycleActions:start','matchActions:pauseClock','clockActions:pauseClock','matchActions:removeLastGoal'])await assert.rejects(owner.mutation(ref(endpoint),{matchId:ids.matchId}),/nieuwe wedstrijdregistratie/);
  });
  let startArgs,startReceipt;
  await check('start, retries and changed-content conflict preserve anchors',async()=>{
    startArgs=await args({kind:'start'});startReceipt=await owner.mutation(ref('mobileReferee:command'),startArgs);assert.equal((await read()).status,'live');
    assert.deepEqual(await owner.mutation(ref('mobileReferee:command'),startArgs),startReceipt);await assert.rejects(act({kind:'start'}),/MATCH_ALREADY_STARTED/);
    const goal=await args({kind:'goal',team:'home'});await owner.mutation(ref('mobileReferee:command'),goal);await assert.rejects(owner.mutation(ref('mobileReferee:command'),{...goal,action:{kind:'goal',team:'away'}}),/CORRELATION_CONTENT_MISMATCH/);
  });
  await check('goals, selected players, opponent number and exact append-only correction',async()=>{
    await assert.rejects(act({kind:'goal',team:'away',scorerId:ids.players[0]}),/PLAYER_TEAM_SIDE_MISMATCH/);
    await assert.rejects(act({kind:'goal',team:'home',scorerId:ids.players[2]}),/PLAYER_NOT_AVAILABLE_FOR_MATCH/);
    const goal=await act({kind:'goal',team:'home'});await act({kind:'enrich_goal',eventId:goal.commandEventId,scorerId:ids.players[0]});await act({kind:'enrich_goal',eventId:goal.commandEventId,assistId:ids.players[1]});
    const away=await act({kind:'goal',team:'away'});await act({kind:'enrich_goal',eventId:away.commandEventId,scorerNumber:12});await act({kind:'correct_goal',eventId:away.commandEventId});
    const page=await owner.query(ref('mobileReferee:timeline'),{matchId:ids.matchId,paginationOpts:{numItems:100,cursor:null}});
    assert.equal(page.page.find(e=>e.id===goal.commandEventId).playerName,'Synthetic scorer');assert.equal(page.page.find(e=>e.id===goal.commandEventId).assistName,'Synthetic assist');assert.equal(page.page.find(e=>e.id===away.commandEventId).playerName,'Nr. 12');assert.equal(page.page.find(e=>e.id===away.commandEventId).corrected,true);
    const publicView=await new ConvexHttpClient(url).query(ref('matches:getByPublicCode'),{code:'2P23BS'});assert.equal(publicView.homeScore,(await read()).homeScore);assert.equal(publicView.awayScore,(await read()).awayScore);assert(!JSON.stringify(publicView).includes('synthetic-owner'));
  });
  await check('simultaneous commands have one winner; no lost score',async()=>{
    const before=await read(),a=await args({kind:'goal',team:'home'}),b={...a,correlationId:'race-other'};const results=await Promise.allSettled([owner.mutation(ref('mobileReferee:command'),a),owner.mutation(ref('mobileReferee:command'),b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await read()).homeScore,before.homeScore+1);
  });
  await check('pause/resume freezes elapsed and counts real interruption once',async()=>{await act({kind:'pause'});const a=await read();await sleep(200);assert.equal((await read()).clock.elapsedMs,a.clock.elapsedMs);await act({kind:'resume'});assert((await read()).clock.confirmedStoppageMs>=150);});
  await check('revoked assignment, disabled access/scope and expiry deny every retry',async()=>{
    const s=await inspect(),scope=s.scopes[0];for(const [id,change,restore]of[[ids.refereeId,{active:false},{active:true}],[ids.accessId,{active:false},{active:true}],[scope._id,{enabled:false},{enabled:true}],[scope._id,{expiresAt:Date.now()-1},{expiresAt}]]){await patch(id,change);await assert.rejects(owner.mutation(ref('mobileReferee:command'),startArgs));await patch(id,restore);}
  });
  await check('nine clock formats cap at exact boundary after 600 minutes; stale jobs cannot mutate',async()=>{
    for(const [periods,minutes]of[[2,30],[2,45],[4,15]])for(const margin of[0,10,30]){
      const m=(await inspect()).matches.find(m=>m._id===ids.matchId),now=Date.now();const policy={...m.refereePolicy,generation:m.refereePolicy.generation+1,elapsedMs:0,runningSince:now-600*60000,periodStartedElapsedMs:0,safetyMarginMinutes:margin,confirmedStoppageMs:0};delete policy.clockReviewReason;delete policy.stoppageStartedAt;delete policy.clockLimitAt;
      await patch(ids.matchId,{status:'live',currentQuarter:1,quarterCount:periods,regulationDurationMinutes:periods*minutes,refereePolicy:policy});const r=await read();assert.equal(r.clock.elapsedMs,(minutes+margin)*60000);assert.equal(r.clock.runningSince,null);
      const before=await inspect();await admin.mutation(ref('refereePolicy:guardClock'),{matchId:ids.matchId,generation:policy.generation-1});assert.deepEqual(await inspect(),before);
      await admin.mutation(ref('refereePolicy:guardClock'),{matchId:ids.matchId,generation:policy.generation});const audit=(await inspect()).events.at(-1);assert.equal(audit.timestamp,policy.runningSince+(minutes+margin)*60000);assert.equal(audit.actorKind,'system');assert.equal((await read()).clock.confirmedStoppageMs,0);
    }
  });
  await check('margin changes are absolute and next period gets a new anchor',async()=>{
    await act({kind:'end_period'});await act({kind:'start_period'});const start=await read();assert.equal(start.period,2);await act({kind:'set_safety_margin',safetyMarginMinutes:30});await act({kind:'set_safety_margin',safetyMarginMinutes:30});const after=await read();assert.equal(after.clock.clockLimitElapsedMs,after.clock.periodStartedElapsedMs+(after.periodMinutes+30)*60000);
  });
  await check('600-minute open pause needs explicit disposition and retains original timestamps',async()=>{
    const m=(await inspect()).matches.find(m=>m._id===ids.matchId);const started=Date.now()-600*60000;
    const policy={...m.refereePolicy,elapsedMs:12*60000,runningSince:null,periodStartedElapsedMs:0,stoppageStartedAt:started,confirmedStoppageMs:0,generation:m.refereePolicy.generation+1};delete policy.clockReviewReason;delete policy.clockLimitAt;
    await patch(ids.matchId,{currentQuarter:1,refereePolicy:policy});await assert.rejects(act({kind:'resume'}),/STOPPAGE_REVIEW_REQUIRED/);await act({kind:'resume',stoppageDisposition:'discard'});const after=await read();assert.equal(after.clock.confirmedStoppageMs,0);assert(after.clock.elapsedMs<12*60000+2000);assert.equal((await inspect()).events.at(-1).stoppageStartedAt,started);
  });
  await check('cards and incidents are auditable; finishing permits optional annotation',async()=>{
    await act({kind:'yellow_card',team:'away',reportedNumber:5});const card=await act({kind:'red_card',team:'home',playerId:ids.players[0]});await act({kind:'incident'});await act({kind:'finish'});
    await owner.mutation(ref('refereeTrial:enroll'),{matchId:ids.matchId});await act({kind:'annotate_event',eventId:card.commandEventId,note:'Synthetic after-match note'});assert.equal((await read()).status,'finished');assert.equal((await inspect()).players.find(p=>p.playerId===ids.players[0]).dismissed,true);
  });
  fs.writeFileSync(path.join(root,'.artifacts/single-match-trial-e2e-result.json'),JSON.stringify({status:'passed',checks,productionTouched:false,syntheticJWT:true,trialPinsSubstitutedOnlyInEphemeralCopy:true},null,2));console.log('ALL SINGLE-MATCH TRIAL CHECKS PASSED');
}catch(e){console.error('FAILED',e.message,'evidence',dir);process.exitCode=1;}finally{server.kill('SIGTERM');fs.closeSync(log);}
