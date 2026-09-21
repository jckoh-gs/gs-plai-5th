import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlant,stepPlant,updateReplay,updateGenerator} from '../server/model.js';
test('provided 55-row wind TSV preserves voltage and proportional original-current estimate',()=>{
 const p=createPlant({name:'사용자 원문',type:'wind',count:1,ratedKw:1000,rampKwPerSec:1000,csv:readFileSync(new URL('./fixtures/user-wind-55.tsv',import.meta.url),'utf8')});
 assert.equal(p.dataset.rows.length,55);assert.equal(p.type,'wind');assert.equal(stepPlant(p).electrical.estimatedCurrentA,null);
 updateReplay(p,{seconds:8*3600});updateGenerator(p,p.generators[0].id,{limitPct:20});const frame=stepPlant(p);
 assert.equal(frame.powerKw,200);assert.equal(frame.electrical.voltage,380);assert.equal(frame.electrical.sourceCurrentA,350.88);assert.equal(frame.electrical.estimatedCurrentA,175.44);
});
test('hybrid combined total distributes by rated capacity without inferring fuel from power shape',()=>{
 const p=createPlant({name:'혼합 총출력',type:'hybrid',count:3,ratedKw:1000,rampKwPerSec:1000,csv:'timestamp,power_kw\n2026-01-01 00:00:00,1200\n2026-01-01 00:10:00,1200'});const frame=stepPlant(p);assert.equal(frame.powerKw,1200);assert.deepEqual(frame.generators.map(g=>g.powerKw),[400,400,400]);assert.deepEqual(frame.generators.map(g=>g.type),['wind','wind','solar']);
});
