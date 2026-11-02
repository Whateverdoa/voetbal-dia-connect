import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertExactTrialPreparation} from './trial-release-bundle.mjs';
const schema={schemaValidation:true,tables:[{tableName:'matches',indexes:[{indexDescriptor:'by_code',fields:['publicCode']}],documentType:{type:'object',value:{publicCode:{optional:false,fieldType:{type:'string'}}}}}]};
test('package installation cannot prepare or deploy a remote Convex schema',()=>{
  const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));
  for(const hook of ['preinstall','install','postinstall','prepare'])assert(!pkg.scripts?.[hook],`Unexpected automatic lifecycle hook ${hook}`);
  assert(!JSON.parse(fs.readFileSync(new URL('../package-lock.json',import.meta.url))).packages[''].hasInstallScript);
});
test('exact pending schema accepts only implicit backend representation differences',()=>{
  const pending=structuredClone(schema);pending.tables[0].indexes[0].fields.push('_creationTime');pending.tables[0].stagedDocumentType=null;pending.tables[0].stagedDbIndexes=[];
  assertExactTrialPreparation(pending,schema);
});
for(const mutation of ['table','field','index','required'])test(`unrelated pending ${mutation} change is refused`,()=>{
  const pending=structuredClone(schema);
  if(mutation==='table')pending.tables.push({...pending.tables[0],tableName:'unexpected'});
  if(mutation==='field')pending.tables[0].documentType.value.unexpected={optional:true,fieldType:{type:'string'}};
  if(mutation==='index')pending.tables[0].indexes[0].fields=['unexpected'];
  if(mutation==='required')pending.tables[0].documentType.value.publicCode.optional=true;
  assert.throws(()=>assertExactTrialPreparation(pending,schema));
});

test('reviewed timing audit is additive, optional and rejects unrelated schema changes',async()=>{
  const {build}=await import('esbuild');
  const {schemaJSON,assertAdditiveTrialSchema}=await import('./trial-release-bundle.mjs');
  const {fileURLToPath}=await import('node:url');
  const result=await build({entryPoints:[fileURLToPath(new URL('../convex/schema.ts',import.meta.url))],bundle:true,write:false,format:'esm',platform:'browser'});
  const after=await schemaJSON({source:result.outputFiles[0].text});
  const before=structuredClone(after);
  before.tables=before.tables.filter(t=>t.tableName!=='mobilePilotScopes');
  const additions={matches:['refereePolicy'],matchPlayers:['officialEnteredElapsedMs','dismissed'],matchCommandDedupes:['actorSubject','fingerprint','commandEventId','commandVersion'],matchEvents:['actorKind','actorSubject','observedElapsedMs','observedStoppageMs','effectiveAt','stoppageStartedAt','stoppageDisposition','timingChanges']};
  for(const table of before.tables){for(const field of additions[table.tableName]??[])delete table.documentType.value[field];if(table.tableName==='matchEvents')table.indexes=table.indexes.filter(i=>i.indexDescriptor!=='by_match_and_target_and_type');}
  assertAdditiveTrialSchema(before,after);
  for(const kind of ['required','shape','unrelated','index']){
    const changed=structuredClone(after),table=changed.tables.find(t=>t.tableName==='matchEvents');
    if(kind==='required')table.documentType.value.timingChanges.optional=false;
    if(kind==='shape')table.documentType.value.timingChanges.fieldType.value.secretNote={optional:true,fieldType:{type:'string'}};
    if(kind==='unrelated')table.documentType.value.unreviewed={optional:true,fieldType:{type:'string'}};
    if(kind==='index')table.indexes[0].fields=['unreviewed'];
    assert.throws(()=>assertAdditiveTrialSchema(before,changed),kind);
  }
});
test('historical remote deployment tools fail before reading credentials on the new trial',()=>{
  for(const name of ['deploy-single-match-trial.mjs','finish-single-match-trial.mjs']){
    const source=fs.readFileSync(new URL(name,import.meta.url),'utf8');
    assert(source.indexOf('Historical 2P23BS')<source.indexOf('accessToken'));
    assert(source.includes("includes('jn7cw69dexmjjmg88jbwsxj4kx8gecgr')"));
  }
});
