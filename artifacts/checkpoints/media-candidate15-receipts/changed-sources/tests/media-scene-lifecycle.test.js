import test from 'node:test';
import assert from 'node:assert/strict';
import plan from '../scripts/media/scene-plan.cjs';
const options={baseUrl:'http://127.0.0.1:3106',names:{wind:'wind observed',solar:'solar observed',hybrid:'owned unique hybrid',scenario:'owned scenario'},csvFile:'fixtures/hybrid.csv',mqtt:{url:'mqtt://127.0.0.1:1883'}};
test('lifecycle scene plan gates owned mutations and captures registration before controls',()=>{
 const lifecycle={journalPath:'/tmp/private-journal.json',registration:{name:options.names.hybrid,type:'hybrid',count:2,ratedKw:500,rampKwPerSec:25}};
 const c=plan({...options,rehearsal:false,lifecycle,preview:true,commandExport:true}),actions=c.scenes.flatMap(s=>s.actions);
 assert.deepEqual(c.lifecycle,lifecycle);
 const registration=actions.findIndex(a=>a.type==='register');assert.ok(registration>0);assert.equal(actions.filter(a=>a.type==='register').length,1);
 for(const [i,a] of actions.entries())if(a.requiresOwned)assert.ok(i>registration);
 for(const a of actions.filter(a=>a.type==='dispatch'||a.name==='장애 적용'||a.name==='모든 장애 해제'||a.name==='현재 상태 저장'||a.name==='출력 상한 적용'))assert.equal(a.requiresOwned,true);
 const restore=actions.find(a=>a.type==='restoreScenario');assert.equal(restore.scenarioName,options.names.scenario);assert.equal(restore.requiresOwned,true);
 const views=actions.filter(a=>a.selector?.includes('plant-card'));assert.ok(views.some(a=>a.selector.includes(options.names.wind)));assert.ok(views.some(a=>a.selector.includes(options.names.solar)));assert.ok(views.every(a=>!a.requiresOwned));
});
test('unspecified lifecycle preserves prior rehearsal registration and scenario action formats',()=>{
 const c=plan(options);assert.equal(c.lifecycle,undefined);const actions=c.scenes.flatMap(s=>s.actions);
 assert.equal(actions.find(a=>a.name==='RTU 등록 · 수집 시작').type,'click');assert.equal(actions.find(a=>a.selector?.startsWith('.scenario:')).type,'click');assert.ok(actions.every(a=>!a.requiresOwned));
});
test('actual registration request fingerprint must exactly match intent before response capture',()=>{
 const spec={name:'전용 데모',type:'hybrid',count:2,ratedKw:500,rampKwPerSec:25};
 assert.equal(plan.validateRegistrationRequest({...spec,csv:'timestamp,power_kw\n2026-01-01T00:00:00Z,500'},spec),true);
 for(const [key,value] of Object.entries({name:'다른 단지',type:'solar',count:3,ratedKw:501,rampKwPerSec:26}))assert.throws(()=>plan.validateRegistrationRequest({...spec,[key]:value},spec),/ownership intent/);
 for(const bad of [null,[],{}, {...spec,count:'2'}])assert.throws(()=>plan.validateRegistrationRequest(bad,spec),/ownership intent/);
});

import features from '../scripts/media/release-features.cjs';
test('receipt demonstration is exact1.5 gated and wide RTU metrics are never cropped',()=>{
 for(const version of ['1.4.0','1.5.0','1.5.1','1.6.0']){
  const c=plan({...options,...features(version)});
  const receipt=c.scenes[2].actions.filter(a=>a.name==='저장 상태 확인');
  assert.equal(receipt.length,version==='1.5.0'?1:0);
  assert.equal(c.scenes[3].zoom,undefined);
  assert.ok(c.scenes[1].zoom.scale>1);
  assert.equal(c.scenes[2].actions.some(a=>a.name==='rest-receipt-stored-status'),version==='1.5.0');
  assert.equal(c.scenes[4].actions.filter(a=>a.type==='dispatch').length,1);
 }
 const c=plan({...options,...features('1.5.0')});
 assert.match(c.scenes[2].narration,/명령 접수는 완료와 다릅니다/);
 assert.equal(c.scenes[2].actions.filter(a=>a.name==='출력 상한 적용').length,2);
});
