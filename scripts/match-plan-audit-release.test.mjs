import assert from 'node:assert/strict';
import test from 'node:test';
import {instrumentAuditSource,addAuditTableSource} from './match-plan-audit-release.mjs';
const source=`const mutation = x => x;
var change = mutation({args:{matchId:"id"},returns:"ok",handler:async(ctx,args)=>{if(!ctx.authorized)throw Error("denied");ctx.changed=args.value;return "result";}});
export { change };`;
const targets={change:['lineup','Veldbezetting gewijzigd']};
test('wraps only the handler and retains auth, validators, return value and other code',async()=>{
 const wrapped=instrumentAuditSource(source,targets);
 assert(wrapped.includes('args:{matchId:"id"},returns:"ok"'));
 const executable=wrapped.replace(/import \{auditPlanChange as diaAuditChange\}[^;]+;/,'const diaAuditChange=async(ctx,args,domain,action,handler)=>{const result=await handler();ctx.audit={domain,action};return result;};');
 const {change}=await import('data:text/javascript;base64,'+Buffer.from(executable).toString('base64'));
 const allowed={authorized:true};assert.equal(await change.handler(allowed,{value:42}),'result');assert.equal(allowed.changed,42);assert.equal(allowed.audit.domain,'lineup');
 const denied={authorized:false};await assert.rejects(change.handler(denied,{value:99}),/denied/);assert.equal(denied.audit,undefined);assert.equal(denied.changed,undefined);
});
test('rejects a missing mutation instead of silently skipping attribution',()=>{
 assert.throws(()=>instrumentAuditSource(source,{missing:['plan','Change']}),/Missing mutation/);
});
test('does not wrap an already instrumented production module twice',()=>{
 const once=instrumentAuditSource(source,targets);assert.equal(instrumentAuditSource(once,targets),once);
});
test('does not wrap an existing source-level audit call twice',()=>{
 const already='var change=mutation({handler:async(ctx,args)=>auditPlanChange(ctx,args,"lineup","Change",async()=>{})});export {change};';
 const next=instrumentAuditSource(already,targets);assert.equal((next.match(/=>auditPlanChange\(/g)||[]).length,1);assert(!next.includes('=> diaAuditChange('));
});
test('extends the active schema without substituting the checkout schema',()=>{
 const old='var custom={tables:{nativeReferee:"keep",matches:"keep"}}; export {custom as default};';
 const next=addAuditTableSource(old);assert(next.includes('nativeReferee:"keep",matches:"keep"'));assert(next.includes('custom.tables.matchPlanAudit = diaAuditTable;'));
});
