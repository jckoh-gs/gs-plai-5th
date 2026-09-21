import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewDataset} from '../server/dataset-preview.js';
import {createPlant,sampleAt} from '../server/model.js';
import {createRuntime} from '../server/index.js';

const csv = 'timestamp,power_kw\n2026-01-01 00:00:00,100\n2026-01-01 00:10:00,200';
test('preview agrees with registration units, interpolation and time zones',()=>{
  for (const [unit,semantics,interpolation,multiplier] of [['kw','sample','linear',1],['kw','mean','hold',1],['kwh','sample','hold',6],['kwh','mean','hold',6]]) {
    const input={csv,type:'wind',unit,semantics}, preview=previewDataset(input);
    const plant=createPlant({...input,name:'preview parity'});
    assert.equal(preview.interpolation,interpolation);
    assert.equal(preview.minPowerKw,100*multiplier);assert.equal(preview.maxPowerKw,200*multiplier);
    assert.equal(sampleAt(plant.dataset,300).power_kw,(interpolation==='linear'?150:100)*multiplier);
    assert.equal(preview.start.utc,'2025-12-31T15:00:00.000Z');
    assert.equal(preview.start.kst,'2026-01-01T00:00:00.000+09:00');
    assert.equal(preview.end.utc,plant.dataset.rows.at(-1).timestamp);
    for(const [index,row] of preview.rows.entries())assert.equal(row.totalPowerKw,plant.dataset.rows[index].power_kw);
  }
  assert.equal(previewDataset({csv:csv.replace(',100',',10').replace(',200',',10'),type:'solar',unit:'kwh'}).minPowerKw,60);
});
test('preview bounds output and preserves TSV electrical fields without emitting unknown CSV columns',()=>{
  const input=readFileSync(new URL('./fixtures/user-wind-55.tsv',import.meta.url),'utf8');
  const p=previewDataset({csv:input,type:'wind'});
  assert.equal(p.rowCount,55);assert.equal(p.rows.length,3);assert.equal(p.rows[0].voltage,380);
  assert.equal(p.intervalSeconds,600);assert(!JSON.stringify(p).includes(input));
  const unknown=previewDataset({type:'wind',csv:csv.replace('power_kw','power_kw,unknown').replace(',100',',100,<script>').replace(',200',',200,secret')});
  assert(!JSON.stringify(unknown).includes('script'));assert(!JSON.stringify(unknown).includes('secret'));
});
test('hybrid preview follows combined-total precedence and split sum exactly',()=>{
  const split='timestamp,wind_power_kw,solar_power_kw\n2026-01-01 00:00:00,10,20\n2026-01-01 00:10:00,30,40';
  const p=previewDataset({csv:split,type:'hybrid',unit:'kwh'});
  assert.equal(p.powerSource,'wind_plus_solar');assert.equal(p.minPowerKw,180);assert.equal(p.maxPowerKw,420);
  assert.equal(p.rows[0].wind_power_kw,60);assert.equal(p.rows[0].solar_power_kw,120);
  const combined=previewDataset({csv:split.replace('solar_power_kw','solar_power_kw,power_kw').replace(',10,20',',10,20,5').replace(',30,40',',30,40,8'),type:'hybrid'});
  assert.equal(combined.powerSource,'power_kw');assert.equal(combined.minPowerKw,5);assert.equal(combined.maxPowerKw,8);
});
test('preview uses existing row validation and rejects invalid request shapes',()=>{
  assert.throws(()=>previewDataset({csv:csv.replace(',200',',NaN'),type:'wind'}),/행 3/);
  assert.throws(()=>previewDataset({csv:csv.replace('00:10:00','00:11:00'),type:'wind'}),/600초/);
  for(const value of [null,[],{}, {csv,type:'invalid'}])assert.throws(()=>previewDataset(value));
});
test('authenticated preview has no database, controller, RTU or transport side effects',async()=>{
  const config={dbPath:':memory:',seedDemo:false,host:'127.0.0.1',port:0,token:'preview-test-token-abcdefghijkl',url:'mqtt://127.0.0.1:1',prefix:'preview-test',telemetrySeconds:60,retentionDays:30};
  const runtime=createRuntime(config);runtime.transport.start=()=>{};runtime.transport.stop=async()=>{};
  const server=await runtime.start(),base=`http://127.0.0.1:${server.address().port}`;
  try {
    const before=runtime.store.db.prepare('SELECT total_changes() AS n').get().n;
    runtime.transport.sync=()=>{throw Error('preview must not sync transport');};
    const request=(body,auth=true)=>fetch(`${base}/api/datasets/preview`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${config.token}`}:{})},body:JSON.stringify(body)});
    assert.equal((await request({csv,type:'wind'},false)).status,401);
    const good=await request({csv,type:'wind'});assert.equal(good.status,200);assert.equal((await good.json()).rowCount,2);
    assert.equal((await request({csv:'bad',type:'wind'})).status,400);
    assert.equal((await request({csv:'x'.repeat(20*1024*1024),type:'wind'})).status,413);
    assert.equal(runtime.store.db.prepare('SELECT total_changes() AS n').get().n,before);
    assert.equal(runtime.plants.size,0);assert.equal(runtime.store.loadCommands().length,0);
    assert.equal(runtime.store.db.prepare('SELECT count(*) AS n FROM outbox').get().n,0);
  } finally {await runtime.stop();}
});
