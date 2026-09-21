import test from 'node:test';import assert from 'node:assert/strict';
import {validateCommandForm,commandFields} from '../web/command-form.js';
const now=Date.parse('2026-09-21T13:30:00Z'),base={targetKw:0,toleranceKw:1,timeoutSeconds:120,validSeconds:30,priority:50};
test('server numeric boundaries and fractional values remain exact',()=>{
 for(const [key,valid,invalid] of [['toleranceKw',[.01,10000,.123],[0,10001]],['timeoutSeconds',[1,3600,1.25],[0,3601]],['priority',[0,100,50.5],[-1,101]]]){
  for(const value of valid){const form={...base,[key]:value},before=structuredClone(form);assert.ok(validateCommandForm(form,now).expiresAt);assert.deepEqual(form,before);}
  for(const value of invalid)assert.equal(validateCommandForm({...base,[key]:value},now).error.field,key);
 }
});
test('empty and nonfinite inputs never become silent defaults or valid commands',()=>{
 for(const {key} of commandFields)for(const value of ['',null,undefined,NaN,Infinity,-Infinity])assert.equal(validateCommandForm({...base,[key]:value},now).error.field,key);
});
test('zero and fractional expiry use one supplied clock without business duration cap',()=>{
 assert.equal(validateCommandForm({...base,validSeconds:0},now).expiresAt,new Date(now).toISOString());
 assert.equal(validateCommandForm({...base,validSeconds:.25},now).expiresAt,new Date(now+250).toISOString());
 assert.ok(validateCommandForm({...base,validSeconds:365*86400*100},now).expiresAt);
 assert.equal(commandFields.find(f=>f.key==='validSeconds').max,undefined);
});
test('overflow and valid Date extended year yield field errors rather than exceptions',()=>{
 for(const value of [1e20,Number.MAX_VALUE,(Date.parse('+010000-01-01T00:00:00.000Z')-now)/1000]){let result;assert.doesNotThrow(()=>result=validateCommandForm({...base,validSeconds:value},now));assert.equal(result.error.field,'validSeconds');}
});
test('target0 and availability-exceeding targets are not clamped; server still decides rated limit',()=>{
 for(const targetKw of [0,.125,900,1000000]){const form={...base,targetKw};assert.ok(validateCommandForm(form,now).expiresAt);assert.equal(form.targetKw,targetKw);}
 assert.equal(validateCommandForm({...base,targetKw:-1},now).error.field,'targetKw');
});
