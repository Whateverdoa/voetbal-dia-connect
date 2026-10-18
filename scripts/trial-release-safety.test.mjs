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
