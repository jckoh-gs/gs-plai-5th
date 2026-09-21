import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime} from '../server/index.js';
import {previewDataset} from '../server/dataset-preview.js';
import {createPlant} from '../server/model.js';
const csv='timestamp,power_kw,wind_speed_ms,unknown\n2026-01-01 00:00,100,8,PRIVATE_MARKER\n2026-01-01 00:10,200,9,PRIVATE_MARKER\n2026-01-01 00:20,300,10,PRIVATE_MARKER\n2026-01-01 00:30,999,11,PRIVATE_MARKER';
test('independent preview: summaries scan beyond display rows; hidden invalid row is rejected by preview and registration',()=>{
 for(const type of ['wind','solar','hybrid'])for(const unit of ['kw','kwh'])for(const semantics of ['sample','mean']){
  const input={csv,type,unit,semantics},summary=previewDataset(input),plant=createPlant({...input,name:'independent parity',count:2});
  assert.equal(summary.rows.length,3);assert.equal(summary.rowCount,4);assert.equal(summary.maxPowerKw,999*(unit==='kwh'?6:1));assert.equal(summary.end.utc,plant.dataset.rows[3].timestamp);assert.equal(summary.interpolation,plant.dataset.interpolation);
  const allowed=new Set(['timestamp','power_kw','wind_speed_ms','totalPowerKw','timestampKst']);for(const row of summary.rows)assert(Object.keys(row).every(k=>allowed.has(k)));assert(!JSON.stringify(summary).includes('PRIVATE_MARKER'));
  for(const invalid of [csv.replace(',999,',',NaN,'),csv.replace('00:30','00:31')]){assert.throws(()=>previewDataset({...input,csv:invalid}),/행 5/);assert.throws(()=>createPlant({...input,name:'invalid',csv:invalid,count:2}),/행 5/);}
 }
});
test('independent preview HTTP: existing model and every persistent table unchanged, no MQTT connection path invoked',async()=>{
 const runtime=createRuntime({dbPath:':memory:',token:'review-preview-auth',seedDemo:false,env:{}});
 const plant=createPlant({name:'existing model',type:'wind',csv});runtime.plants.set(plant.id,plant);runtime.store.savePlant(plant);
 runtime.transport.sync=()=>{throw Error('Unexpected MQTT sync');};runtime.transport.connect=()=>{throw Error('Unexpected MQTT connect');};
 const server=await new Promise(r=>{const s=runtime.app.listen(0,'127.0.0.1',()=>r(s));});
 const tables=runtime.store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(x=>x.name);const snapshot=()=>Object.fromEntries(tables.map(name=>[name,runtime.store.db.prepare(`SELECT * FROM ${name}`).all()]));
 const before=snapshot(),beforePlant=structuredClone(plant),beforeChanges=runtime.store.db.prepare('SELECT total_changes() AS n').get().n;
 try{for(const [input,auth,status] of [[{csv,type:'wind'},false,401],[{csv,type:'wind'},true,200],[{csv:csv.replace(',999,',',NaN,'),type:'wind'},true,400]]){
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/datasets/preview`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer review-preview-auth'}:{})},body:JSON.stringify(input)});assert.equal(response.status,status);await response.json();
 }
 assert.deepEqual(snapshot(),before);assert.deepEqual(runtime.plants.get(plant.id),beforePlant);assert.equal(runtime.store.db.prepare('SELECT total_changes() AS n').get().n,beforeChanges);assert.equal(runtime.transport.devices.size,0);
 }finally{await new Promise(r=>server.close(r));await runtime.stop();}
});
