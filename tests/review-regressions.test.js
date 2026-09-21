import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createPlant, parseCSV} from '../server/model.js';
import {createRuntime} from '../server/index.js';

const csv='timestamp,power_kw\n2026-01-01 00:00,100\n2026-01-01 00:10,200';
test('independent review: generated sample files accepted by production parser',()=>{
 const dir=mkdtempSync(join(tmpdir(),'grid-review-'));
 try {execFileSync(process.execPath,[resolve('scripts/generate-samples.js')],{cwd:dir});
  for(const type of ['wind','solar','hybrid']) {const parsed=parseCSV(readFileSync(join(dir,'samples',type+'.csv'),'utf8'),{type}); assert.equal(parsed.rows.length,144);assert.equal(Date.parse(parsed.rows.at(-1).timestamp)-Date.parse(parsed.rows[0].timestamp),143*600000);}
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('independent review: delayed KMA HTTP result cannot overwrite newer manual edit or station',async()=>{
 const originalFetch=globalThis.fetch, oldKey=process.env.KMA_AUTH_KEY;
 process.env.KMA_AUTH_KEY='review-fixture-key';
 const runtime=createRuntime({dbPath:':memory:',token:'review-token',env:{},seedDemo:false,telemetrySeconds:3600});
 // Transport is not started: these HTTP-only tests do not claim MQTT coverage.
 runtime.transport.sync=()=>{};
 const server=await new Promise(resolve=>{const s=runtime.app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base=`http://127.0.0.1:${server.address().port}`;
 const api=async(path,method,body)=>{const response=await originalFetch(base+path,{method,headers:{Authorization:'Bearer review-token','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(response.status,200);return response.json();};
 try {for(const change of ['manual','station']) {
  const plant=createPlant({name:'review',type:'wind',count:1,csv,station:100});runtime.plants.set(plant.id,plant);runtime.store.savePlant(plant);
  let release,started;const fetching=new Promise(r=>started=r);
  globalThis.fetch=()=>{started();return new Promise(r=>release=r);};
  const pending=api(`/api/plants/${plant.id}/weather/refresh`,'POST');await fetching;
  if(change==='manual')await api(`/api/plants/${plant.id}/weather`,'PATCH',{wind_speed_ms:3});
  else await api(`/api/plants/${plant.id}/station`,'PATCH',{station:101});
  const before=structuredClone(runtime.plants.get(plant.id));
  const kst=new Date(Date.now()+9*3600000).toISOString().slice(0,16).replace(/[-T:]/g,'');
  release({ok:true,text:async()=>`${kst} 100 24 8 0 0 0 0 0 0 0 22`});await pending;
  assert.deepEqual(runtime.plants.get(plant.id),before);
  assert.deepEqual(runtime.store.loadPlants().find(p=>p.id===plant.id),before);
 }}finally{globalThis.fetch=originalFetch;if(oldKey===undefined)delete process.env.KMA_AUTH_KEY;else process.env.KMA_AUTH_KEY=oldKey;await new Promise(r=>server.close(r));await runtime.stop();}
});
