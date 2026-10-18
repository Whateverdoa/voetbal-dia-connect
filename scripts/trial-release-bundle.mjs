import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';

export async function buildTrialOverlay(sourceRoot, original, changedFiles) {
  const changed=new Set(changedFiles.filter(p=>p.startsWith('convex/')&&!p.endsWith('.test.ts')).map(p=>path.resolve(sourceRoot,p)));
  const output=[];
  const candidates=[...new Set([...original.modules.map(m=>m.path), 'mobileReferee.js','mobilePilotScopes.js','refereePolicy.js','refereeTrial.js'])];
  for(const modulePath of candidates){
    const file=path.join(sourceRoot,'convex',modulePath.replace(/\.js$/,'.ts'));
    if(!fs.existsSync(file))continue;
    const old=original.modules.find(m=>m.path===modulePath);
    const result=await build({entryPoints:[file],bundle:true,write:false,format:'esm',platform:old?.environment==='node'?'node':'browser',target:'esnext',metafile:true,absWorkingDir:sourceRoot});
    const inputs=Object.keys(result.metafile.inputs).map(p=>path.resolve(sourceRoot,p));
    if(old&&!inputs.some(p=>changed.has(p)))continue;
    const exports=Object.values(result.metafile.outputs)[0].exports.sort();
    if(old){
      const parsed=await build({stdin:{contents:old.source,sourcefile:modulePath,loader:'js'},bundle:false,write:false,format:'esm',metafile:true});
      const oldExports=Object.values(parsed.metafile.outputs)[0].exports.sort();
      for(const name of oldExports)assert(exports.includes(name),`Removed export ${modulePath}:${name}`);
    }
    output.push({path:modulePath,source:result.outputFiles[0].text,environment:old?.environment??'isolate'});
  }
  for(const name of ['schema.js','mobileReferee.js','refereeTrial.js','refereePolicy.js','matchActions.js'])assert(output.some(m=>m.path===name),'Required guarded module missing: '+name);
  return output;
}
export function changedTrialFiles(root){
  const tracked=execFileSync('git',['diff','8558608','--name-only','--','convex'],{cwd:root,encoding:'utf8'}).trim().split('\n');
  const added=execFileSync('git',['ls-files','--others','--exclude-standard','convex'],{cwd:root,encoding:'utf8'}).trim().split('\n');
  return [...new Set([...tracked,...added])].filter(Boolean);
}
export async function schemaJSON(module){
  const imported=await import('data:text/javascript;base64,'+Buffer.from(module.source).toString('base64'));
  return JSON.parse(imported.default.export());
}
export function assertAdditiveTrialSchema(before,after){
  assert.equal(after.schemaValidation,before.schemaValidation);
  const fieldAdditions={matches:['refereePolicy'],matchPlayers:['officialEnteredElapsedMs','dismissed'],matchCommandDedupes:['actorSubject','fingerprint','commandEventId','commandVersion'],matchEvents:['actorKind','actorSubject','observedElapsedMs','observedStoppageMs','effectiveAt','stoppageStartedAt','stoppageDisposition']};
  assert.deepEqual(after.tables.filter(t=>!before.tables.some(b=>b.tableName===t.tableName)).map(t=>t.tableName),['mobilePilotScopes']);
  for(const old of before.tables){
    const next=after.tables.find(t=>t.tableName===old.tableName);assert(next,'Removed table '+old.tableName);
    for(const key of ['searchIndexes','vectorIndexes','stagedDbIndexes','stagedSearchIndexes','stagedVectorIndexes','stagedDocumentType'])assert.deepEqual(next[key] ?? null,old[key] ?? null,'Changed existing schema metadata '+old.tableName+'.'+key);
    const normalizedIndex = idx => idx && ({...idx, fields: idx.fields.filter((f, i) => f !== "_creationTime" || i !== idx.fields.length - 1)});
    for(const idx of old.indexes)assert.deepEqual(normalizedIndex(next.indexes.find(i=>i.indexDescriptor===idx.indexDescriptor)),normalizedIndex(idx),'Changed existing index');
    const added=next.indexes.filter(i=>!old.indexes.some(o=>o.indexDescriptor===i.indexDescriptor));
    assert.deepEqual(added.map(i=>i.indexDescriptor),old.tableName==='matchEvents'?['by_match_and_target_and_type']:[]);
    const oldFields=old.documentType.value,newFields=next.documentType.value;
    assert.deepEqual(Object.keys(newFields).filter(k=>!(k in oldFields)).sort(),(fieldAdditions[old.tableName]??[]).sort(),'Unexpected new fields on '+old.tableName);
    for(const [key,value]of Object.entries(oldFields)){
      if(old.tableName==='matchEvents'&&key==='type'){
        assert.equal(newFields[key].fieldType.type,'union');
        for(const v of value.fieldType.value)assert(newFields[key].fieldType.value.some(n=>JSON.stringify(n)===JSON.stringify(v)),'Removed old event type');
      }else assert.deepEqual(newFields[key],value,'Changed old field '+old.tableName+'.'+key);
    }
    for(const key of fieldAdditions[old.tableName]??[])assert.equal(newFields[key].optional,true,'New field not optional');
  }
}

// The backend adds implicit creation-time index keys and sorts table definitions.
// Ignore only those representational differences, never a real field/index change.
export function normalizedTrialSchema(value, key = '') {
  if (Array.isArray(value)) {
    const items = value.map(v => normalizedTrialSchema(v));
    if (key === 'tables') items.sort((a,b) => a.tableName.localeCompare(b.tableName));
    if (key === 'indexes') items.sort((a,b) => a.indexDescriptor.localeCompare(b.indexDescriptor));
    return items;
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      const field = value[key];
      if (key === 'stagedDocumentType' && field == null) continue;
      if (key.startsWith('staged') && Array.isArray(field) && field.length === 0) continue;
      result[key] = key === 'fields' && Array.isArray(field)
        ? field.filter((f,i) => f !== '_creationTime' || i !== field.length - 1)
        : normalizedTrialSchema(field, key);
    }
    return result;
  }
  return value;
}
export function assertExactTrialPreparation(pending, expected) {
  assert.deepEqual(normalizedTrialSchema(pending), normalizedTrialSchema(expected),
    'Pending schema is not the exact approved trial; refuse to replace or adopt it');
}
