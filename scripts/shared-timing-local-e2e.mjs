// Local backend only: deliberately no production credential/config access.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn, execFileSync} from 'node:child_process';
import {generateKeyPairSync, randomBytes, sign} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ConvexHttpClient} from 'convex/browser';
import {makeFunctionReference as ref} from 'convex/server';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=fs.mkdtempSync(path.join(root,'.artifacts/shared-timing-local-'));
const binary=path.join(process.env.HOME,'.cache/convex/binaries/precompiled-2026-08-25-7cce8fb/convex-local-backend');
const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));env.DISABLE_BEACON='true';
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const serverPort=await port(),site=await port(),url=`http://127.0.0.1:${serverPort}`,secret=randomBytes(32).toString('hex');
assert.equal(new URL(url).hostname,'127.0.0.1');
const key=execFileSync(binary,['keygen','admin-key','--instance-name','shared-timing','--instance-secret',secret],{env,encoding:'utf8'}).trim();
const fd=fs.openSync(path.join(dir,'backend.log'),'w',0o600);
const server=spawn(binary,['--interface','127.0.0.1','--port',String(serverPort),'--site-proxy-port',String(site),'--instance-name','shared-timing','--instance-secret',secret,'--disable-beacon','--local-storage',path.join(dir,'storage'),path.join(dir,'db.sqlite3')],{env,stdio:['ignore',fd,fd]});
const cli=path.join(root,'node_modules/convex/bin/main.js');
async function run(args,cwd,log){const fd=fs.openSync(path.join(dir,log),'w',0o600);try { await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[cli,...args],{cwd,env,stdio:['ignore',fd,fd]});p.once('error',reject);p.once('exit',c=>c===0?resolve():reject(Error(`${log} failed; inspect ${dir}`)));}); } finally {fs.closeSync(fd);}}
const checks=[];
try {
  for(let i=0;;i++){try{await fetch(url+'/version');break;}catch{if(i>100)throw Error('Local backend did not start');await new Promise(r=>setTimeout(r,100));}}
  const project=path.join(dir,'project');fs.mkdirSync(project);
  fs.cpSync(path.join(root,'convex'),path.join(project,'convex'),{recursive:true,filter:p=>!p.endsWith('.test.ts')&&!['auth.config.ts','http.ts','crons.ts'].includes(path.basename(p))});
  fs.cpSync(path.join(root,'src/lib'),path.join(project,'src/lib'),{recursive:true,filter:p=>!p.endsWith('.test.ts')&&!p.endsWith('.test.tsx')});
  fs.symlinkSync(path.join(root,'node_modules'),path.join(project,'node_modules'),'dir');
  fs.writeFileSync(path.join(project,'package.json'),JSON.stringify({name:'local-shared-timing',private:true,type:'module',dependencies:{convex:JSON.parse(fs.readFileSync(path.join(root,'node_modules/convex/package.json'))).version}}));
  const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const issuer='https://shared-timing.invalid',jwk={...publicKey.export({format:'jwk'}),kid:'local',alg:'RS256',use:'sig'};
  fs.writeFileSync(path.join(project,'convex/auth.config.ts'),'export default '+JSON.stringify({providers:[{type:'customJwt',applicationID:'convex',issuer,jwks:'data:text/plain;charset=utf-8;base64,'+Buffer.from(JSON.stringify({keys:[jwk]})).toString('base64'),algorithm:'RS256'}]})+';');
  fs.writeFileSync(path.join(project,'convex/__sharedTimingFixture.ts'),`import {mutation,query} from './_generated/server'; import {v} from 'convex/values';
import {executeRefereeRegistration} from './lib/refereeRegistration';
import {refereeCommandArgs,refereeCommandResult} from './lib/refereeRegistrationContract';
import {readRefereeDetail,refereeDetailValidator} from './lib/refereeMatchRead';
import {pilotIdentity,officialDutyEligibility} from './lib/mobilePilotAccess';
export const command=mutation({args:refereeCommandArgs,returns:refereeCommandResult,handler:executeRefereeRegistration});
export const getMatch=query({args:{matchId:v.id('matches')},returns:refereeDetailValidator,handler:async(ctx,args)=>{
const actor=await pilotIdentity(ctx),match=(await ctx.db.get(args.matchId))!;
return readRefereeDetail(ctx,{subject:actor.subject,match,team:(await ctx.db.get(match.teamId))!,...await officialDutyEligibility(ctx,match,actor.access)},true,Date.now()+3600000);}});
export const seed=mutation({args:{},returns:v.id('matches'),handler:async ctx=>{
const clubId=await ctx.db.insert('clubs',{name:'Local only',slug:'local-only',createdAt:1});
const teamId=await ctx.db.insert('teams',{clubId,name:'Sandbox',slug:'sandbox',createdAt:1});
const refereeId=await ctx.db.insert('referees',{name:'Local ref',active:true,createdAt:1});
await ctx.db.insert('userAccess',{email:'local@example.test',roles:['referee'],refereeId,active:true,source:'admin_manual',lastSyncedAt:1,createdAt:1,updatedAt:1});
const matchId=await ctx.db.insert('matches',{teamId,refereeId,publicCode:'LOCAL',opponent:'Synthetic',isHome:true,status:'live',currentQuarter:1,quarterCount:2,homeScore:2,awayScore:1,showLineup:false,createdAt:1,refereePolicy:{version:1,generation:1,commandVersion:0,elapsedMs:20000,runningSince:null,periodStartedElapsedMs:0,safetyMarginMinutes:10,confirmedStoppageMs:0}});
await ctx.db.insert('matchEvents',{matchId,type:'incident',quarter:1,timestamp:1,createdAt:1,note:'Blessure: PRIVATE'});return matchId;}});
export const revoke=mutation({args:{matchId:v.id('matches')},returns:v.null(),handler:async(ctx,args)=>{await ctx.db.patch(args.matchId,{refereeId:undefined});return null;}});`);
  const envFile=path.join(project,'local.env');fs.writeFileSync(envFile,`CONVEX_SELF_HOSTED_URL=${url}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${key}\n`,{mode:0o600});
  await run(['dev','--once','--env-file',envFile,'--typecheck','disable','--codegen','disable'],project,'push.log');checks.push('Full schema and functions compile and push to a fresh localhost backend');
  const admin=new ConvexHttpClient(url);admin.setAdminAuth(key);const matchId=await admin.mutation(ref('__sharedTimingFixture:seed'),{});
  const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const now=Math.floor(Date.now()/1000);
  const unsigned=encode({alg:'RS256',kid:'local',typ:'JWT'})+'.'+encode({iss:issuer,aud:'convex',sub:'local-ref',email:'local@example.test',email_verified:true,iat:now,exp:now+600});
  const owner=new ConvexHttpClient(url);owner.setAuth(unsigned+'.'+sign('RSA-SHA256',Buffer.from(unsigned),privateKey).toString('base64url'));
  const spectator=new ConvexHttpClient(url);
  const timing={measurements:[{id:'12345678-1234-1234-1234-123456789abc',period:1,kind:'incident',startedElapsedMs:0,endedElapsedMs:20000,included:true}],chosenSeconds:{'1':20}};
  const args={matchId,expectedVersion:0,correlationId:'local-timing',action:{kind:'sync_interruption_timing',timing}};
  const receipt=await owner.mutation(ref('__sharedTimingFixture:command'),args);assert.deepEqual(await owner.mutation(ref('__sharedTimingFixture:command'),args),receipt);checks.push('Synthetic real JWT, transactional command and identical retry receipt');
  const detail=await owner.query(ref('__sharedTimingFixture:getMatch'),{matchId});assert.deepEqual(detail.interruptionTiming,timing);assert.equal(detail.clock.elapsedMs,20000);assert.equal(detail.homeScore,2);assert.equal(detail.clock.runningSince,null);
  const pub=await spectator.query(ref('matches:getByPublicCode'),{code:'LOCAL'});assert.equal(pub.refereeClock.interruptionTiming[0].chosenSeconds,20);assert.equal(pub.events[0].incidentCategory,'Blessure');assert(!JSON.stringify(pub).includes('PRIVATE'));checks.push('Same confirmed timing on authenticated mobile and anonymous website; private notes absent');
  const concurrent=await Promise.allSettled([0,10].map((seconds,i)=>owner.mutation(ref('__sharedTimingFixture:command'),{...args,expectedVersion:1,correlationId:'concurrent-'+i,action:{kind:'sync_interruption_timing',timing:{...timing,chosenSeconds:{'1':seconds}}}})));
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);checks.push('Concurrent version conflict permits only one absolute extra-time choice');
  await admin.mutation(ref('__sharedTimingFixture:revoke'),{matchId});await assert.rejects(()=>owner.mutation(ref('__sharedTimingFixture:command'),args));checks.push('Revoked registration rights deny even a previously confirmed retry');
  fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({localOnly:true,checks},null,2));console.log(JSON.stringify({localOnly:true,checks,evidence:dir},null,2));
  if (process.argv.includes('--serve')) {
    fs.writeFileSync(path.join(root,'.artifacts/shared-timing-preview-backend.json'),JSON.stringify({url,evidence:dir}));
    console.log('Local preview backend ready at '+url);
    await new Promise(resolve=>process.once('SIGTERM',resolve));
  }
} finally {server.kill('SIGTERM');fs.closeSync(fd);}
