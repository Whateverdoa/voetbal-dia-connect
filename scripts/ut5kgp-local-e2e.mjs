// Disposable synthetic UT5KGP only. Never reads remote credentials or production data.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference as ref } from 'convex/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = fs.mkdtempSync(path.join(root, '.artifacts/ut5kgp-local-'));
fs.chmodSync(dir, 0o700);
const env = Object.fromEntries(['PATH','HOME','TMPDIR','LANG'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
env.DISABLE_BEACON = 'true';
const binary = path.join(env.HOME, '.cache/convex/binaries/precompiled-2026-08-25-7cce8fb/convex-local-backend');
async function port() { const s = net.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; }
const backendPort = await port(), sitePort = await port(), webPort = await port();
const url = `http://127.0.0.1:${backendPort}`, secret = randomBytes(32).toString('hex');
const key = execFileSync(binary, ['keygen','admin-key','--instance-name','ut5kgp-local','--instance-secret',secret], {env, encoding:'utf8'}).trim();
const log = fs.openSync(path.join(dir, 'backend.log'), 'w', 0o600);
const backend = spawn(binary, ['--interface','127.0.0.1','--port',String(backendPort),'--site-proxy-port',String(sitePort),'--instance-name','ut5kgp-local','--instance-secret',secret,'--disable-beacon','--local-storage',path.join(dir,'storage'),path.join(dir,'db.sqlite3')], {env, stdio:['ignore',log,log]});
let web, manifestFile;
async function run(binary, args, cwd, name) {
  const fd = fs.openSync(path.join(dir, name), 'w', 0o600);
  try { await new Promise((resolve, reject) => { const p = spawn(binary, args, {cwd, env, stdio:['ignore',fd,fd]}); p.once('error', reject); p.once('exit', code => code === 0 ? resolve() : reject(Error(`${name} failed; inspect ${dir}`))); }); }
  finally { fs.closeSync(fd); }
}
try {
  for (let i = 0;;i++) { try { await fetch(url + '/version'); break; } catch { if (i > 100) throw Error('Local backend unavailable'); await new Promise(r => setTimeout(r,100)); } }
  const project = path.join(dir, 'project'); fs.mkdirSync(project);
  fs.cpSync(path.join(root, 'convex'), path.join(project, 'convex'), {recursive:true, filter:p => !p.endsWith('.test.ts') && !['auth.config.ts','http.ts','crons.ts'].includes(path.basename(p))});
  fs.cpSync(path.join(root, 'src/lib'), path.join(project, 'src/lib'), {recursive:true, filter:p => !/\.test\.tsx?$/.test(p)});
  fs.symlinkSync(path.join(root,'node_modules'),path.join(project,'node_modules'),'dir');
  fs.writeFileSync(path.join(project,'package.json'),JSON.stringify({name:'ut5kgp-local-only',private:true,type:'module',dependencies:{convex:JSON.parse(fs.readFileSync(path.join(root,'node_modules/convex/package.json'))).version}}));
  let fixture = fs.readFileSync(path.join(root,'scripts/fixtures/single-match-trial-fixture.ts.txt'),'utf8');
  fixture = fixture.replace('return { matchId,', `await ctx.db.insert('substitutionPlans',{matchId,sequence:1,playerOutId:players[0],playerInId:players[1],status:'pending',createdAt:now,updatedAt:now});\n  return { matchId,`)
    .replace('matches: await ctx.db.query', "plans: await ctx.db.query('substitutionPlans').take(10), matches: await ctx.db.query");
  fs.writeFileSync(path.join(project,'convex/__trialFixture.ts'),fixture);
  const {publicKey,privateKey} = generateKeyPairSync('rsa',{modulusLength:2048});
  const issuer = 'https://ut5kgp-local.invalid';
  const jwk = {...publicKey.export({format:'jwk'}),kid:'local',alg:'RS256',use:'sig'};
  fs.writeFileSync(path.join(project,'convex/auth.config.ts'),'export default '+JSON.stringify({providers:[{type:'customJwt',applicationID:'convex',issuer,jwks:'data:text/plain;charset=utf-8;base64,'+Buffer.from(JSON.stringify({keys:[jwk]})).toString('base64'),algorithm:'RS256'}]})+';');
  const envFile = path.join(project,'local.env');
  fs.writeFileSync(envFile,`CONVEX_SELF_HOSTED_URL=${url}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${key}\n`,{mode:0o600});
  const cli = path.join(root,'node_modules/convex/bin/main.js');
  const push = name => run(process.execPath,[cli,'dev','--once','--env-file',envFile,'--typecheck','disable','--codegen','disable'],project,name);
  await push('seed-push.log');
  const admin = new ConvexHttpClient(url); admin.setAdminAuth(key);
  const ids = await admin.mutation(ref('__trialFixture:seed'),{});
  const before = await admin.query(ref('__trialFixture:inspect'),{});
  for (const f of ['lib/singleMatchTrial.ts','refereeRegistration.ts']) {
    const location = path.join(project,'convex',f);
    fs.writeFileSync(location,fs.readFileSync(location,'utf8').replaceAll('jn75fpd7q5gm8e5byn6ced8vg18hcegm',ids.matchId).replaceAll('mjtenhoonte@gmail.com','owner@trial.invalid'));
  }
  await push('trial-push.log');
  await run(process.execPath,[cli,'env','set','MOBILE_REFEREE_WRITES_ENABLED','true','--env-file',envFile],project,'local-flag.log');
  const encode = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now()/1000);
  const unsigned = encode({alg:'RS256',kid:'local',typ:'JWT'})+'.'+encode({iss:issuer,aud:'convex',sub:'synthetic-owner',email:'owner@trial.invalid',email_verified:true,iat:now,exp:now+3600});
  const token = unsigned+'.'+sign('RSA-SHA256',Buffer.from(unsigned),privateKey).toString('base64url');
  const owner = new ConvexHttpClient(url); owner.setAuth(token);
  await admin.mutation(ref('refereeTrial:activate'),{matchId:ids.matchId,expiresAt:Date.now()+3600000});
  await owner.mutation(ref('refereeTrial:enroll'),{matchId:ids.matchId});
  const manifest = {url,token,subject:'synthetic-owner',matchId:ids.matchId,otherMatchId:ids.otherId,playerId:ids.players[0],publicCode:'UT5KGP',localOnly:true};
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest),{mode:0o600});
  const harness = path.join(dir,'web'); fs.mkdirSync(harness);
  fs.writeFileSync(path.join(harness,'index.html'),'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
  fs.writeFileSync(path.join(harness,'main.tsx'),`import React from 'react'; import {createRoot} from 'react-dom/client';
import {ConvexReactClient,ConvexProvider,useQuery} from 'convex/react';import {makeFunctionReference} from 'convex/server';
import {RefereeMatchConsole} from '${path.join(root,'src/components/referee/RefereeMatchConsole.tsx')}';
import {MatchClock} from '${path.join(root,'src/components/match/MatchClock.tsx')}';
import {TimelineSection} from '${path.join(root,'src/components/live/TimelineSection.tsx')}';
import '${path.join(root,'src/app/globals.css')}';
const auth=new ConvexReactClient(${JSON.stringify(url)});auth.setAuth(async()=>${JSON.stringify(token)});const anonymous=new ConvexReactClient(${JSON.stringify(url)});
function Reader({control=false}){const m=useQuery(makeFunctionReference('matches:getByPublicCode'),{code:'UT5KGP'});if(!m)return <p>Laden</p>;return control?<RefereeMatchConsole matchId={${JSON.stringify(ids.matchId)}} refereeClock={m.refereeClock} status={m.status} currentQuarter={m.currentQuarter} quarterCount={m.quarterCount} homeScore={m.homeScore} awayScore={m.awayScore} homeName="Synthetic" awayName="Synthetic" homeLogoUrl={null} awayLogoUrl={null} diaTeamSide="home" diaPlayers={[]}/>:<section aria-label="Publieke website"><h2>UT5KGP · Publieke website</h2><p data-testid="public-score">{m.homeScore}–{m.awayScore}</p><div className="bg-black p-4 text-white"><MatchClock refereeClock={m.refereeClock} status={m.status} currentQuarter={m.currentQuarter} quarterCount={m.quarterCount} regulationDurationMinutes={60}/></div><TimelineSection events={m.events} teamName="Synthetic" opponentName="Synthetic" isScheduled={m.status==='scheduled'}/></section>;}
createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-5xl space-y-6 p-4"><h1>LOKALE UT5KGP · GEEN DIA LIVE</h1><ConvexProvider client={auth}><Reader control/></ConvexProvider><ConvexProvider client={anonymous}><Reader/></ConvexProvider></main>);`);
  web = await createServer({configFile:false,root:harness,plugins:[react()],resolve:{alias:{'@/convex':path.join(root,'convex'),'@':path.join(root,'src')}},css:{postcss:path.join(root,'postcss.config.mjs')},server:{host:'127.0.0.1',port:webPort,strictPort:true,fs:{allow:[root]}},optimizeDeps:{include:['react','react-dom/client','convex/react']}});
  await web.listen();
  console.log(`LOCAL_WEB http://127.0.0.1:${webPort} (synthetic UT5KGP)`);
  console.log(`LOCAL_EVIDENCE ${dir}`);
  fs.writeFileSync(path.join(root,'.artifacts/ut5kgp-local-session.json'),JSON.stringify({webURL:`http://127.0.0.1:${webPort}`,evidence:dir}),{mode:0o600});
  const nativeArg = process.argv.indexOf('--native');
  if (nativeArg !== -1) {
    const iosRoot = path.resolve(process.argv[nativeArg+1]);
    assert(fs.existsSync(path.join(iosRoot,'ios/JeugdvoetbalApp/JeugdvoetbalApp.xcodeproj')),'Pass the iOS review worktree');
    // The browser control starts this same local fixture before the native phase.
    console.log('Waiting for local web Start wedstrijd before native phase');
    for(let i=0;;i++){const m=await owner.query(ref('mobileReferee:getMatch'),{matchId:ids.matchId});if(m.status==='live')break;if(i>1200)throw Error('Local browser start timeout');await new Promise(r=>setTimeout(r,500));}
    const destination = path.join(iosRoot,'.artifacts/local-ut5kgp'); fs.mkdirSync(destination,{recursive:true,mode:0o700});
    manifestFile=path.join(destination,'manifest.json');assert(!fs.existsSync(manifestFile),'Do not overwrite an existing native harness');fs.writeFileSync(manifestFile,JSON.stringify(manifest),{mode:0o600});
    await run('/usr/bin/xcodebuild',['test','-project','ios/JeugdvoetbalApp/JeugdvoetbalApp.xcodeproj','-scheme','JeugdvoetbalApp','-destination','platform=iOS Simulator,id=D4DE156A-B2BD-4DBA-9D09-50E6CE05485E','-derivedDataPath','.artifacts/pr-derived','-clonedSourcePackagesDirPath',path.join(env.HOME,'.codex/worktrees/ios-dia-ref-pr/Jeugdvoetbal-app/.artifacts/incident-derived/SourcePackages'),'-only-testing:JeugdvoetbalAppTests/LocalRefereeTransportTests/testUT5KGPNativeAndWebsiteShareClockScoreIncidentAndAddedTime','CODE_SIGNING_ALLOWED=NO','ARCHS=arm64','ONLY_ACTIVE_ARCH=YES'],iosRoot,'native-integration.log');
    if(process.argv.includes('--roundtrip')) {
      console.log('Waiting for web extra-time choice 90 before the native roundtrip');
      for(let i=0;;i++){const m=await owner.query(ref('mobileReferee:getMatch'),{matchId:ids.matchId});if(m.interruptionTiming?.chosenSeconds['1']===90)break;if(i>1200)throw Error('Web extra-time choice timeout');await new Promise(r=>setTimeout(r,500));}
      fs.writeFileSync(manifestFile,JSON.stringify({...manifest,expectedChosenSeconds:90}),{mode:0o600});
      await run('/usr/bin/xcodebuild',['test','-project','ios/JeugdvoetbalApp/JeugdvoetbalApp.xcodeproj','-scheme','JeugdvoetbalApp','-destination','platform=iOS Simulator,id=D4DE156A-B2BD-4DBA-9D09-50E6CE05485E','-derivedDataPath','.artifacts/pr-derived','-clonedSourcePackagesDirPath',path.join(env.HOME,'.codex/worktrees/ios-dia-ref-pr/Jeugdvoetbal-app/.artifacts/incident-derived/SourcePackages'),'-only-testing:JeugdvoetbalAppTests/LocalRefereeTransportTests/testUT5KGPNativeAndWebsiteShareClockScoreIncidentAndAddedTime','CODE_SIGNING_ALLOWED=NO','ARCHS=arm64','ONLY_ACTIVE_ARCH=YES'],iosRoot,'native-roundtrip.log');
    }
    const after=await admin.query(ref('__trialFixture:inspect'),{});
    assert.deepEqual(after.matches.find(m=>m._id===ids.otherId),before.matches.find(m=>m._id===ids.otherId));
    for(const field of ['plans','users','referees','coaches'])assert.deepEqual(after[field],before[field],`${field} changed`);
    const pub=await new ConvexHttpClient(url).query(ref('matches:getByPublicCode'),{code:'UT5KGP'});
    assert.equal(pub.homeScore,0);assert.equal(pub.awayScore,0);assert(!JSON.stringify(pub).includes('PRIVATE'));
    assert(pub.events.some(e=>e.type==='goal'&&e.corrected));assert(pub.events.some(e=>e.type==='incident'&&e.incidentCategory==='Blessure'));
    assert.equal(pub.refereeClock.interruptionTiming[0].chosenSeconds,60);
    fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({localOnly:true,productionTouched:false,publicCode:'UT5KGP',native:true,webChoiceRoundtrip:process.argv.includes('--roundtrip'),score:'0-0',privateNotesAbsent:true,substitutionPlanUnchanged:true,otherMatchUnchanged:true,checks:['web start to native read','native goal/card/incident/timing/correction to public website','same clock anchors','exact-match client fence','unchanged plans/roles/other match']},null,2));
    console.log('PASS real native transport + public website; plan and other match intact');
  }
  if(process.argv.includes('--serve')) await new Promise(resolve=>process.once('SIGTERM',resolve));
} finally { if(manifestFile)fs.rmSync(manifestFile,{force:true});await web?.close();backend.kill('SIGTERM');fs.closeSync(log); }
