import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

// No deployment URL argument is accepted. A fresh loopback-only database is mandatory.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iosRoot = path.resolve(root, '../../..');
const runDir = fs.mkdtempSync(path.join(root, '.artifacts/local-referee-e2e-'));
const binary = path.join(process.env.HOME, '.cache/convex/binaries/precompiled-2026-08-25-7cce8fb/convex-local-backend');
const native = process.argv.includes('--native');
const manifest = path.join(native ? iosRoot : runDir, '.artifacts/localhost-referee-e2e/manifest.json');
let ownsManifest = false;
if (native && !fs.existsSync(path.join(iosRoot, 'ios/JeugdvoetbalApp/JeugdvoetbalApp.xcodeproj'))) throw new Error('Native iOS project not found; run from the linked backend worktree.');
const cleanEnv = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
cleanEnv.DISABLE_BEACON = 'true';
const checks = [];
const blockers = [];
const reference = name => makeFunctionReference(name);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function freePort() { const s = net.createServer(); await new Promise((r,j) => s.once('error',j).listen(0,'127.0.0.1',r)); const p=s.address().port; await new Promise(r=>s.close(r)); return p; }
const port = await freePort();
let sitePort = await freePort();
while (sitePort === port) sitePort = await freePort();
const url = `http://127.0.0.1:${port}`;
const instance = 'local-referee-integration';
const secret = randomBytes(32).toString('hex');
const adminKey = execFileSync(binary, ['keygen','admin-key','--instance-name',instance,'--instance-secret',secret], {env:cleanEnv,encoding:'utf8'}).trim();
const log = fs.openSync(path.join(runDir,'backend.log'),'w');
const server = spawn(binary,['--interface','127.0.0.1','--port',String(port),'--site-proxy-port',String(sitePort),'--instance-name',instance,'--instance-secret',secret,'--disable-beacon','--local-storage',path.join(runDir,'storage'),path.join(runDir,'local.sqlite3')],{env:cleanEnv,stdio:['ignore',log,log]});
function run(command,args,cwd,logName) {
  return new Promise((resolve,reject) => { const fd=fs.openSync(path.join(runDir,logName),'w'); const child=spawn(command,args,{cwd,env:cleanEnv,stdio:['ignore',fd,fd]}); child.once('error',reject);child.once('exit',code=>{fs.closeSync(fd);code===0?resolve():reject(new Error(`${logName}: exit ${code}; inspect ${runDir}`));}); });
}
try {
  for(let n=0;;n++){try{await fetch(url+'/version');break;}catch{if(n>60)throw new Error('Local backend unavailable'); await sleep(250);}}
  const project = path.join(runDir,'project');fs.mkdirSync(project);
  fs.cpSync(path.join(root,'convex'),path.join(project,'convex'),{recursive:true,filter:p=>!p.endsWith('.test.ts')&&!['crons.ts','http.ts','auth.config.ts'].includes(path.basename(p))});
  fs.cpSync(path.join(root,'src/lib'),path.join(project,'src/lib'),{recursive:true,filter:p=>!p.endsWith('.test.ts')&&!p.endsWith('.test.tsx')});
  fs.symlinkSync(path.join(root,'node_modules'),path.join(project,'node_modules'),'dir');
  fs.writeFileSync(path.join(project,'package.json'),JSON.stringify({name:'local-referee-only',private:true,type:'module',dependencies:{convex:JSON.parse(fs.readFileSync(path.join(root,'node_modules/convex/package.json'))).version}}));
  fs.copyFileSync(path.join(root,'scripts/fixtures/local-referee-seed.ts.txt'),path.join(project,'convex/__localTestHarness.ts'));
  const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const jwk={...publicKey.export({format:'jwk'}),kid:'local-only',alg:'RS256',use:'sig'};
  const issuer='https://isolated-referee.test';
  const jwks='data:text/plain;charset=utf-8;base64,'+Buffer.from(JSON.stringify({keys:[jwk]})).toString('base64');
  fs.writeFileSync(path.join(project,'convex/auth.config.ts'),`export default ${JSON.stringify({providers:[{type:'customJwt',applicationID:'convex',issuer,jwks,algorithm:'RS256'}]})};\n`);
  const envFile=path.join(project,'local.env');fs.writeFileSync(envFile,`CONVEX_SELF_HOSTED_URL=${url}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${adminKey}\n`,{mode:0o600});
  console.log('Preparing fresh loopback-only Convex (no crons, no production config/data).');
  const cli=path.join(root,'node_modules/convex/bin/main.js');
  await run(process.execPath,[cli,'dev','--once','--env-file',envFile,'--typecheck','disable','--codegen','disable'],project,'push.log');
  for(const name of ['MOBILE_REFEREE_WRITES_ENABLED','WEB_REFEREE_PILOT_WRITES_ENABLED']) await run(process.execPath,[cli,'env','set',name,'true','--env-file',envFile],project,`env-${name}.log`);
  const admin=new ConvexHttpClient(url); admin.setAdminAuth(adminKey);
  const ids=await admin.mutation(reference('__localTestHarness:seed'),{});
  function jwt(subject,email,extra={}) { const now=Math.floor(Date.now()/1000);const head=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:'local-only'})).toString('base64url');const body=Buffer.from(JSON.stringify({iss:issuer,aud:'convex',sub:subject,email,email_verified:true,iat:now,exp:now+3600,...extra})).toString('base64url');const text=head+'.'+body;return text+'.'+sign('RSA-SHA256',Buffer.from(text),privateKey).toString('base64url'); }
  const refToken=jwt('local-referee','ref@localhost.test');
  function client(token) { const c=new ConvexHttpClient(url);c.setAuth(token);return c; }
  const ref=client(refToken), outsider=client(jwt('local-admin','admin@localhost.test')), coach=client(jwt('local-coach','coach@localhost.test'));
  const read=()=>ref.query(reference('mobileReferee:getMatch'),{matchId:ids.matchId});
  const inspect=()=>admin.query(reference('__localTestHarness:inspect'),{matchId:ids.matchId});
  const alter=(mode,fields={})=>admin.mutation(reference('__localTestHarness:alter'),{matchId:ids.matchId,mode,...fields});
  let serial=0;
  const args=async(action,c=ref)=>({matchId:ids.matchId,expectedVersion:(await c.query(reference('mobileReferee:getMatch'),{matchId:ids.matchId})).version,correlationId:`local-${++serial}`,action});
  const act=async(action,c=ref)=>c.mutation(reference('mobileReferee:command'),await args(action,c));
  async function check(name,fn){await fn();checks.push({name,status:'passed'});console.log(`PASS ${name}`);}
  await check('JWT issuer/audience/verification and scope fail closed',async()=>{
    await assert.rejects(client(jwt('local-referee','ref@localhost.test',{aud:'wrong'})).query(reference('mobileReferee:session'),{}));
    await assert.rejects(client(jwt('local-referee','ref@localhost.test',{email_verified:false})).query(reference('mobileReferee:session'),{}));
    await assert.rejects(ref.query(reference('mobileReferee:getMatch'),{matchId:ids.otherMatchId}),/PILOT_ACCESS_DENIED/);
  });
await check('read-only diagnosis confirms duty without policy or mobile scope activation',async()=>{
  const args={matchId:ids.diagnosticMatchId};
  const before=await admin.query(reference('__localTestHarness:inspect'),args);
  const result=await ref.query(reference('refereeRegistration:diagnose'),args);
  assert.equal(result.diagnosticVersion,1);assert.equal(result.readOnly,true);
  assert.equal(result.actorSubject,'local-referee');assert.equal(result.matchId,ids.diagnosticMatchId);
  assert.equal(result.isOfficialRegistrar,true);assert.equal(result.eligibleToControl,true);
  assert.equal(result.controller,'referee');assert.equal(result.policyActive,false);assert.equal(result.mobileScopeStatus,'missing');
  const adminResult=await outsider.query(reference('refereeRegistration:diagnose'),args);
  assert.equal(adminResult.isOfficialRegistrar,false);assert.equal(adminResult.eligibleToControl,false);
  const coachResult=await coach.query(reference('refereeRegistration:diagnose'),args);
  assert.equal(coachResult.isOfficialRegistrar,false);
  await assert.rejects(client(jwt('local-referee','ref@localhost.test',{email_verified:false})).query(reference('refereeRegistration:diagnose'),args),/AUTH_IDENTITY_INCOMPLETE/);
  await assert.rejects(ref.query(reference('mobileReferee:getMatch'),args),/PILOT_ACCESS_DENIED/);
  assert.deepEqual(await admin.query(reference('__localTestHarness:inspect'),args),before);
});
  let startArgs, startReceipt;
  await check('assigned referee only; unassigned admin cannot register',async()=>{
    await assert.rejects(act({kind:'start'},outsider),/OFFICIAL_REGISTRATOR_REQUIRED/);
    await assert.rejects(act({kind:'start'},coach),/OFFICIAL_REGISTRATOR_REQUIRED/);
    startArgs=await args({kind:'start'});startReceipt=await ref.mutation(reference('mobileReferee:command'),startArgs);
    assert.equal((await read()).status,'live');
    const playing=(await inspect()).players.filter(p=>p.onField);
    assert(playing.length>0);for(const player of playing){assert.equal(player.lastSubbedInAt,(await inspect()).match.startedAt);assert.equal(player.officialEnteredElapsedMs,0);}
  });
  await check('exact retry confirms same event; changed payload rejected',async()=>{
    assert.deepEqual(await ref.mutation(reference('mobileReferee:command'),startArgs),startReceipt);
    const key=await args({kind:'goal',team:'home'});await ref.mutation(reference('mobileReferee:command'),key);
    await assert.rejects(ref.mutation(reference('mobileReferee:command'),{...key,action:{kind:'goal',team:'away'}}),/CORRELATION_CONTENT_MISMATCH/);
  });
  await check('starting a live match cannot reset the anchor',async()=>{
    const before=(await inspect()).match.startedAt;await assert.rejects(act({kind:'start'}),/MATCH_ALREADY_STARTED/);assert.equal((await inspect()).match.startedAt,before);
  });
  await check('ordinary pauses freeze playing time and count interruption once',async()=>{
    await act({kind:'pause'});const before=await read();await sleep(200);const paused=await read();assert.equal(paused.clock.elapsedMs,before.clock.elapsedMs);
    await act({kind:'resume'});const after=await read();assert(after.clock.confirmedStoppageMs>=150);assert(after.clock.confirmedStoppageMs<5000);
  });
  await check('coach fallback only after explicit referee slot becomes empty',async()=>{
    await alter('unassign');await act({kind:'pause'},coach);await alter('assign');await assert.rejects(act({kind:'resume'},coach),/OFFICIAL_REGISTRATOR_REQUIRED/);await act({kind:'resume'});
  });
  await check('correct exact goal; append-only history and shared web/mobile score',async()=>{
    const goal=await act({kind:'goal',team:'away'});await act({kind:'correct_goal',eventId:goal.commandEventId});
    const db=await inspect();assert(db.events.some(e=>e._id===goal.commandEventId&&e.type==='goal'));assert(db.events.some(e=>e.targetEventId===goal.commandEventId&&e.type==='goal_correction'));
    const mobile=await read();const web=await ref.query(reference('refereeRegistration:getMatch'),{matchId:ids.matchId});assert.equal(mobile.homeScore,web.homeScore);assert.equal(mobile.awayScore,web.awayScore);
  });
  await check('roster side/availability and partial scorer/assist enrichment',async()=>{
    await assert.rejects(act({kind:'goal',team:'away',scorerId:ids.players[0]}),/PLAYER_TEAM_SIDE_MISMATCH/);
    await assert.rejects(act({kind:'goal',team:'home',scorerId:ids.players[2]}),/PLAYER_NOT_AVAILABLE_FOR_MATCH/);
    const goal=await act({kind:'goal',team:'home'});const before=await read();
    await act({kind:'enrich_goal',eventId:goal.commandEventId,scorerId:ids.players[0]});await act({kind:'enrich_goal',eventId:goal.commandEventId,assistId:ids.players[1]});
    const page=await ref.query(reference('mobileReferee:timeline'),{matchId:ids.matchId,paginationOpts:{numItems:100,cursor:null}});const e=page.page.find(e=>e.id===goal.commandEventId);assert.equal(e.playerName,'Synthetic scorer');assert.equal(e.assistName,'Synthetic assist');assert.equal((await read()).homeScore,before.homeScore);
    const opponent=await act({kind:'goal',team:'away'});await act({kind:'enrich_goal',eventId:opponent.commandEventId,scorerNumber:12});
    const updated=await ref.query(reference('mobileReferee:timeline'),{matchId:ids.matchId,paginationOpts:{numItems:100,cursor:null}});assert.equal(updated.page.find(e=>e.id===opponent.commandEventId).playerName,'Nr. 12');
  });
  await check('concurrent commands serialize with one winner and no lost score',async()=>{
    const before=await read();const a=await args({kind:'goal',team:'home'});const b={...a,correlationId:'race-other'};
    const results=await Promise.allSettled([ref.mutation(reference('mobileReferee:command'),a),ref.mutation(reference('mobileReferee:command'),b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(String(results.find(r=>r.status==='rejected').reason),/VERSION_CONFLICT/);assert.equal((await read()).homeScore,before.homeScore+1);
  });
  await check('revoked scope denies previously confirmed retries',async()=>{
    await alter('revoke');await assert.rejects(ref.mutation(reference('mobileReferee:command'),startArgs),/PILOT_ACCESS_DENIED/);await alter('restore');
  });
  await check('600-minute reopen, nine clock formats/margins and stale scheduler',async()=>{
    for(const [periods,minutes]of[[2,30],[2,45],[4,15]])for(const margin of[0,10,30]){
      await alter('cap',{periods,minutes,margin});const projected=await read();assert.equal(projected.clock.elapsedMs,(minutes+margin)*60000);assert.equal(projected.clock.runningSince,null);assert.equal(projected.clock.clockReviewReason,'period_limit');
      const db=await inspect();const generation=db.match.refereePolicy.generation;await admin.mutation(reference('refereePolicy:guardClock'),{matchId:ids.matchId,generation:generation-1});assert.equal((await inspect()).events.length,db.events.length);
      await admin.mutation(reference('refereePolicy:guardClock'),{matchId:ids.matchId,generation});const guarded=await inspect();assert.equal(guarded.match.refereePolicy.elapsedMs,(minutes+margin)*60000);const audit=guarded.events.at(-1);assert.equal(audit.actorKind,'system');assert(!audit.actorSubject);assert.equal(audit.timestamp,db.match.refereePolicy.runningSince+(minutes+margin)*60000);assert.equal(guarded.match.refereePolicy.stoppageStartedAt,undefined);assert.equal(guarded.match.refereePolicy.confirmedStoppageMs,0);for(const row of guarded.players.filter(p=>p.onField)){assert.equal(row.minutesPlayed,minutes+margin);assert.equal(row.officialEnteredElapsedMs,undefined);}
    }
  });
  await check('safety margin is absolute, repeated changes do not accumulate, next period resets anchor',async()=>{
    await alter('cap',{periods:2,minutes:30,margin:0});
    await act({kind:'set_safety_margin',safetyMarginMinutes:10});assert.equal((await read()).clock.clockLimitElapsedMs,40*60000);
    await act({kind:'set_safety_margin',safetyMarginMinutes:30});await act({kind:'set_safety_margin',safetyMarginMinutes:30});
    assert.equal((await read()).clock.clockLimitElapsedMs,60*60000);await act({kind:'resume'});
    await act({kind:'end_period'});await act({kind:'start_period'});
    const next=await read();assert.equal(next.period,2);assert.equal(next.clock.confirmedStoppageMs,0);
    assert(Math.abs(next.clock.elapsedMs-next.clock.periodStartedElapsedMs)<2000);
  });
  await check('600-minute paused reopen requires explicit decision and preserves open-pause audit',async()=>{
    for(const disposition of['discard','include']){
      await alter('long_pause');const before=await read();assert.equal(before.clock.elapsedMs,12*60000);assert.equal(before.clock.clockReviewReason,'long_stoppage');
      await assert.rejects(act({kind:'resume'}),/STOPPAGE_REVIEW_REQUIRED/);
      await act({kind:'resume',stoppageDisposition:disposition});const after=await read();
      assert.equal(after.clock.stoppageStartedAt,undefined);assert(after.clock.elapsedMs<12*60000+2000);
      if(disposition==='discard')assert.equal(after.clock.confirmedStoppageMs,0);else assert(after.clock.confirmedStoppageMs>=600*60000);
      const audit=(await inspect()).events.at(-1);assert.equal(audit.stoppageDisposition,disposition);assert(audit.observedStoppageMs>=600*60000);
      assert.equal(audit.stoppageStartedAt,before.clock.stoppageStartedAt);
    }
  });
  await check('legacy Sportlink import cannot overwrite the opted-in match',async()=>{
    const before=(await inspect()).match;
    const result=await outsider.mutation(reference('import/sportlinkUpsert:upsertBySportlinkCode'),{teamSlug:'localhost-only',sportlinkWedstrijdcode:'LOCAL_ONLY_LINK',opponent:'Should not change',isHome:false,scheduledAt:Date.now(),finished:true,homeScore:99,awayScore:99,dryRun:false});
    assert.equal(result.action,'skipped_referee_policy');assert.deepEqual((await inspect()).match,before);
  });
  const beforeRed=await inspect();
  const redArgs=await args({kind:'red_card',team:'home',playerId:ids.players[0]});
  const red=await ref.mutation(reference('mobileReferee:command'),redArgs);
  assert.deepEqual(await ref.mutation(reference('mobileReferee:command'),redArgs),red);
  const sentOff=(await inspect()).players.find(p=>p.playerId===ids.players[0]);
  assert.equal(sentOff.onField,false);assert.equal(sentOff.dismissed,true);assert.equal(sentOff.lastSubbedInAt,undefined);assert.equal(sentOff.officialEnteredElapsedMs,undefined);assert.equal(sentOff.fieldSlotIndex,undefined);
  const prior=beforeRed.players.find(p=>p.playerId===ids.players[0]);
  const redEvent=(await inspect()).events.find(e=>e._id===red.commandEventId);
  const expected=(prior.minutesPlayed??0)+(prior.officialEnteredElapsedMs===undefined?0:Math.max(0,redEvent.matchMs-prior.officialEnteredElapsedMs)/60000);
  assert(Math.abs(sentOff.minutesPlayed-expected)<1e-10);
  assert.equal((await inspect()).events.filter(e=>e.type==='red_card'&&e.playerId===ids.players[0]).length,1);
  await assert.rejects(act({kind:'red_card',team:'home',playerId:ids.players[0]}),/PLAYER_ALREADY_DISMISSED/);
  checks.push({name:'red card closes the selected player interval and prevents repeated dismissal',status:'passed'});
  fs.mkdirSync(path.dirname(manifest),{recursive:true});fs.writeFileSync(manifest,JSON.stringify({url,token:refToken,subject:'local-referee',matchId:ids.nativeMatchId,otherMatchId:ids.otherMatchId,playerId:ids.players[0]},null,2),{mode:0o600,flag:'wx'});ownsManifest=true;
  console.log(`Local server checks passed (${checks.length}). Manifest ready for native transport tests.`);
  if(native){
    const projectPath=path.join(iosRoot,'ios/JeugdvoetbalApp/JeugdvoetbalApp.xcodeproj');
    await run('xcodebuild',['test','-project',projectPath,'-scheme','JeugdvoetbalApp','-configuration','Debug','-destination','id=D4DE156A-B2BD-4DBA-9D09-50E6CE05485E','-derivedDataPath',path.join(iosRoot,'.artifacts/pr-ios/derived-data'),'-clonedSourcePackagesDirPath','/Volumes/Crucial X9/PROJECTS/Jeugdvoetbal-app/.artifacts/dia-ref-dark-derived-data/SourcePackages','-disableAutomaticPackageResolution','-only-testing:JeugdvoetbalAppTests/LocalRefereeTransportTests','CODE_SIGNING_ALLOWED=NO'],iosRoot,'native.log');
    const nativeLog=fs.readFileSync(path.join(runDir,'native.log'),'utf8');
    assert.match(nativeLog,/Test Case.*LocalRefereeTransportTests.*passed/);
    assert.doesNotMatch(nativeLog,/Test Case.*LocalRefereeTransportTests.*skipped/);
    checks.push({name:'Swift real URLSession to local Convex with signed synthetic JWT',status:'passed'});
  }
  fs.writeFileSync(path.join(runDir,'result.json'),JSON.stringify({status:blockers.length?'blocked':'passed',transport:'real local Convex HTTP',syntheticIdentity:true,productionTouched:false,checks,blockers},null,2));
  for(const blocker of blockers) console.log(`BLOCKED ${blocker.name}: ${blocker.actual}`);
  if(blockers.length) process.exitCode=2;
  console.log(`RESULT ${path.join(runDir,'result.json')}`);
}catch(error){fs.writeFileSync(path.join(runDir,'result.json'),JSON.stringify({status:'failed',message:error.message,checks},null,2));console.error(error.message);process.exitCode=1;}
finally{if(ownsManifest)fs.rmSync(manifest,{force:true});server.kill('SIGTERM');fs.closeSync(log);}
