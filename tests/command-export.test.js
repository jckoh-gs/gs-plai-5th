import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRuntime} from '../server/index.js';
import {createPlant,stepPlant} from '../server/model.js';
import {exportCommandStates} from '../server/command-export.js';

const input={name:'export fixture',type:'wind',count:2,ratedKw:1000,rampKwPerSec:1000,csv:'timestamp,power_kw\n2026-01-01 00:00:00,1000\n2026-01-01 00:10:00,1000'};
const config={dbPath:':memory:',seedDemo:false,host:'127.0.0.1',port:0,token:'export-functional-token',url:'mqtt://127.0.0.1:1',prefix:'export-test',telemetrySeconds:60,retentionDays:30};
test('control characters cannot split a credential URL to bypass export redaction',()=>{
 const data=exportCommandStates({plantId:'fixture',productVersion:'1.2.0',commands:[{commandId:'mqtt://user:\nunknown-password@host'}]});
 assert.equal(data.commands[0].commandId,'[redacted-url]');assert.equal(data.commands[0].commandIdRedacted,true);
});
test('export target and observed values preserve real accepted, executing and completed command semantics',()=>{
 const r=createRuntime(config),p=createPlant(input);r.plants.set(p.id,p);r.store.savePlant(p);
 const exportOne=c=>exportCommandStates({plantId:p.id,commands:[c],productVersion:'1.2.0',config}).commands[0];
 let now=Date.now();
 try{
  for(const action of ['start','set_limit','stop','set_target']){
   const request={commandId:randomUUID(),action,targetKw:125,limitPct:20,timeoutSeconds:10};
   const c=r.controller.submit(p.id,request,'REST',{now});const initial=exportOne(c);
   assert.equal(initial.targetKw,action==='stop'?0:action==='set_target'?125:null);assert.equal(initial.actualKw,null);assert.equal(initial.errorKw,null);
   r.controller.tick(now+1);stepPlant(p);r.controller.tick(now+1001);const done=r.controller.commands.get(c.commandId);
   assert.equal(done.status,'completed');const row=exportOne(done);assert.equal(row.targetKw,done.targets.reduce((n,t)=>n+t.targetKw,0));assert.equal(row.actualKw,done.actualKw);assert.equal(row.errorKw,done.errorKw);assert.equal(row.runId,p.runId);now+=2000;
  }
 }finally{r.store.close();}
});
test('HTTP export has latest20 only, original run IDs, RTU isolation and no persistent or control side effects',async()=>{
 const r=createRuntime(config);r.transport.start=()=>{};r.transport.stop=async()=>{};const server=await r.start();
 try{
  const p=createPlant(input),other=createPlant({...input,name:'other'});r.plants.set(p.id,p);r.plants.set(other.id,other);r.store.savePlant(p);r.store.savePlant(other);
  const now=Date.now(),oldRunId=p.runId;
  for(let n=0;n<25;n++)r.controller.submit(p.id,{commandId:`test-${String(n).padStart(2,'0')}`,action:'set_target',targetKw:125,expiresAt:new Date(now-10000).toISOString()},'REST',{now:now+n});
  p.runId=randomUUID();r.store.savePlant(p);
  const invalid=r.controller.submit(p.id,{commandId:'invalid-action',action:'invalid'},'MQTT',{now:now+30});assert.equal(invalid.runId,undefined);
  r.controller.submit(other.id,{commandId:'other-rtu-only',action:'stop'},'REST',{now:now+50});
  const before=r.store.db.prepare('SELECT total_changes() AS n').get().n,commands=JSON.stringify([...r.controller.commands]),plants=JSON.stringify([...r.plants]);
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/plants/${p.id}/commands/export`,{headers:{Authorization:`Bearer ${config.token}`}});assert.equal(response.status,200);
  assert.match(response.headers.get('content-disposition'),/^attachment; filename="command-states-/);assert.equal(response.headers.get('cache-control'),'no-store');
  const result=await response.json();assert.equal(result.commands.length,20);assert.equal(result.plantId,p.id);assert.equal(result.commands[0].commandId,'invalid-action');assert.equal(result.commands[0].runId,null);assert.equal(result.commands[0].action,null);
  assert.deepEqual(result.commands.slice(1).map(c=>c.commandId),Array.from({length:19},(_,n)=>`test-${String(24-n).padStart(2,'0')}`));assert(result.commands.slice(1).every(c=>c.runId===oldRunId&&c.status==='expired'));
  assert(!JSON.stringify(result).includes('other-rtu-only'));assert(!Object.hasOwn(result,'runId'));
  assert.equal(r.store.db.prepare('SELECT total_changes() AS n').get().n,before);assert.equal(JSON.stringify([...r.controller.commands]),commands);assert.equal(JSON.stringify([...r.plants]),plants);
  const empty=createPlant({...input,name:'empty'});r.plants.set(empty.id,empty);r.store.savePlant(empty);
  const get=id=>fetch(`http://127.0.0.1:${server.address().port}/api/plants/${id}/commands/export`,{headers:{Authorization:`Bearer ${config.token}`}});
  assert.deepEqual((await (await get(empty.id)).json()).commands,[]);assert.equal((await get(randomUUID())).status,404);
 }finally{await r.stop();}
});
