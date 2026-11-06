import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import ts from 'typescript';
import {build} from 'esbuild';
import {ConvexClient} from 'convex/browser';
import {makeFunctionReference} from 'convex/server';
import {auditTargets} from './match-plan-audit-targets.mjs';
const target='https://nautical-condor-5.convex.cloud';
const marker='// DIA_PLAN_AUDIT_V1';

export function instrumentAuditSource(source, entries) {
  if(source.startsWith(marker)) return source;
  const ast=ts.createSourceFile('active.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const edits=[];const found=[];
  for(const statement of ast.statements){
    if(!ts.isVariableStatement(statement))continue;
    for(const decl of statement.declarationList.declarations){
      const name=decl.name.getText(ast);if(!entries[name])continue;
      assert(decl.initializer&&ts.isCallExpression(decl.initializer),`Expected registration: ${name}`);
      const obj=decl.initializer.arguments[0];assert(obj&&ts.isObjectLiteralExpression(obj));
      const handler=obj.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(ast)==='handler');
      assert(handler&&ts.isArrowFunction(handler.initializer),`Expected handler: ${name}`);
      const fn=handler.initializer;assert.equal(fn.parameters.length,2);
      if(ts.isCallExpression(fn.body)&&/^(diaAuditChange|auditPlanChange)\d*$/.test(fn.body.expression.getText(ast))){found.push(name);continue;}
      const [ctx,args]=fn.parameters.map(p=>p.name.getText(ast));assert(/^[\w$]+$/.test(ctx)&&/^[\w$]+$/.test(args));
      const [domain,action,ownTeamOnly=false]=entries[name];
      const wrapper=`async (${ctx}, ${args}) => diaAuditChange(${ctx}, ${args}, ${JSON.stringify(domain)}, ${JSON.stringify(action)}, async () => ${fn.body.getText(ast)}, ${ownTeamOnly})`;
      edits.push([fn.getStart(ast),fn.end,wrapper]);found.push(name);
    }
  }
  assert.deepEqual(found.sort(),Object.keys(entries).sort(),'Missing mutation; reconcile active source before release');
  let result=source;for(const [a,b,text] of edits.sort((a,b)=>b[0]-a[0]))result=result.slice(0,a)+text+result.slice(b);
  return marker+'\nimport {auditPlanChange as diaAuditChange} from "./convex/lib/matchPlanAudit.ts";\n'+result;
}

export function addAuditTableSource(source) {
  const ast=ts.createSourceFile('schema.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const exp=ast.statements.find(s=>ts.isExportDeclaration(s)&&s.exportClause&&ts.isNamedExports(s.exportClause)&&s.exportClause.elements.some(e=>e.name.text==='default'));
  assert(exp&&exp.exportClause&&ts.isNamedExports(exp.exportClause),'Expected active schema default export');
  const entry=exp.exportClause.elements.find(e=>e.name.text==='default');const name=entry.propertyName?.text;assert(name);
  return 'import {matchPlanAuditTable as diaAuditTable} from "./convex/lib/matchPlanAuditSchema.ts";\n'+source.slice(0,exp.getStart(ast))+`${name}.tables.matchPlanAudit = diaAuditTable;\n`+source.slice(exp.getStart(ast));
}
const bundle=async (contents)=>{
 const result=await build({stdin:{contents,resolveDir:process.cwd(),sourcefile:'active.js'},bundle:true,write:false,format:'esm',platform:'browser',target:'esnext',metafile:true});
 return {source:result.outputFiles[0].text,exports:Object.values(result.metafile.outputs)[0].exports.sort()};
};
async function schemaValue(source){const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));return JSON.parse(module.default.export());}
export function assertReleaseSource(actual, expected) {
 const {modules:actualModules,...actualConfig}=actual;
 const {modules:expectedModules,...expectedConfig}=expected;
 assert.deepEqual(actualConfig,expectedConfig,'Deployment configuration changed');
 assert.equal(actualModules.length,expectedModules.length,'Module count differs');
 const byPath=new Map(actualModules.map(item=>[item.path,item]));
 assert.equal(byPath.size,actualModules.length,'Duplicate module path');
 for(const item of expectedModules) {
  // Convex returns modules sorted by path, including newly added modules.
  const found=byPath.get(item.path);
  assert(found,`Missing deployed module: ${item.path}`);
  assert(isDeepStrictEqual(found,item),`Deployed module differs: ${item.path}`);
 }
}
export async function composePlanAuditRelease(original){
 const modules=[...original.modules];const changed=[];
 for(const [name,entries]of Object.entries(auditTargets)){
  const index=modules.findIndex(m=>m.path===name+'.js');assert(index>=0,`Missing module ${name}`);
  const before=modules[index];
  if(before.source.startsWith(marker))continue;
  const result=await bundle(instrumentAuditSource(before.source,entries));
  const old=await bundle(before.source);assert.deepEqual(result.exports,old.exports,`Export changes in ${name}`);
  modules[index]={...before,source:marker+'\n'+result.source};changed.push(before.path);
 }
 const originalSchema=modules.find(m=>m.path==='schema.js');assert(originalSchema);
 const schemaResult=await bundle(addAuditTableSource(originalSchema.source));
 const beforeSchema=await schemaValue(originalSchema.source);const nextSchema=await schemaValue(schemaResult.source);
 assert.deepEqual(nextSchema.tables.filter(t=>t.tableName!=='matchPlanAudit'),beforeSchema.tables.filter(t=>t.tableName!=='matchPlanAudit'),'Existing schema changed');
 assert.equal(nextSchema.tables.filter(t=>t.tableName==='matchPlanAudit').length,1);
 if(beforeSchema.tables.some(t=>t.tableName==='matchPlanAudit'))assert.deepEqual(nextSchema.tables.find(t=>t.tableName==='matchPlanAudit'),beforeSchema.tables.find(t=>t.tableName==='matchPlanAudit'),'Existing audit table differs');
 modules[modules.indexOf(originalSchema)]={...originalSchema,source:schemaResult.source};changed.push('schema.js');
 const audit=await build({entryPoints:['convex/matchPlanAudit.ts'],bundle:true,write:false,format:'esm',platform:'browser',target:'esnext'});
 const index=modules.findIndex(m=>m.path==='matchPlanAudit.js');const item={path:'matchPlanAudit.js',source:audit.outputFiles[0].text,environment:'isolate'};
 if(index>=0)modules[index]=item;else modules.push(item);changed.push('matchPlanAudit.js');
 for(const item of original.modules)if(!changed.includes(item.path))assert.deepEqual(modules.find(m=>m.path===item.path),item);
 return {modules,changed};
}
export async function releasePlanAudit({adminKey,deploymentUrl,checkOnly=false}){
 assert.equal(deploymentUrl,target);assert(adminKey);
 const post=async(api,body={})=>{const response=await fetch(target+api,{method:'POST',headers:{Authorization:'Convex '+adminKey,'Content-Type':'application/json'},body:JSON.stringify({...body,adminKey}),signal:AbortSignal.timeout(90000)});assert(response.ok,`${api}: ${response.status}`);return response.json();};
 const client=new ConvexClient(target,{unsavedChangesWarning:false});client.setAdminAuth(adminKey);
 const readSchemas=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Schema read timeout')),20000);let off;off=client.onUpdate(makeFunctionReference('_system/frontend/getSchemas'),{},v=>{clearTimeout(timer);off?.();resolve(v);},reject);});
 try{
 const original=await post('/api/get_config');const hashes=await post('/api/get_config_hashes');
 assert.equal(hashes.nodeVersion??null,null);assert.equal(hashes.nodeDependencies?.length??0,0);
 const schemas=await readSchemas();assert(schemas.active&&!schemas.inProgress);
 const next=await composePlanAuditRelease(original);
 if(checkOnly){console.log(`Audit preflight passed: ${next.changed.length} explicitly selected modules; all other source and tables retained. No writes.`);return;}
 assert.deepEqual(await post('/api/get_config'),original,'Concurrent source change');
 const prepared=await post('/api/prepare_schema',{bundle:next.modules.find(m=>m.path==='schema.js'),dryRun:false});
 assert(prepared.schemaId&&(prepared.disabled?.length??0)===0,'Schema/index preservation failed');
 assert.deepEqual(await post('/api/get_config'),original,'Concurrent source change before commit');
 await post('/api/push_config',{config:original.config,modules:next.modules,udfServerVersion:original.udfServerVersion,schemaId:prepared.schemaId,nodeDependencies:[],nodeVersion:null});
 const deployed=await post('/api/get_config');assertReleaseSource(deployed,{...original,modules:next.modules});
 const after=await readSchemas();const active=JSON.parse(after.active);const previous=JSON.parse(schemas.active);
 assert.deepEqual(active.tables.filter(t=>t.tableName!=='matchPlanAudit'),previous.tables.filter(t=>t.tableName!=='matchPlanAudit'));
 assert(active.tables.some(t=>t.tableName==='matchPlanAudit'));
 console.log('Plan attribution deployed. Existing mutation logic, other modules and existing tables retained. No match records changed.');
 }finally{await client.close();}
}
