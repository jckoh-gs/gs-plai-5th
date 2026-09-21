// Evidence reconciler for actual native-CUA browser actions in UI agent round 2.
// This script does not automate UI interactions or claim screenshots were saved.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const base = process.env.FLOW_BASE || 'http://127.0.0.1:3103';
  const token = process.env.FLOW_TOKEN;
  if (!token) throw Error('FLOW_TOKEN required (synthetic fixture credential only)');
  const id = '1198d24d-8257-4d8b-baa9-169461b827e6';
  const r = await fetch(base + '/api/state', { headers: { Authorization: 'Bearer ' + token } });
  assert.equal(r.status, 200);
  const state = await r.json();
  const p = state.plants.find(p => p.id === id);
  assert(p, 'dedicated CUA test RTU exists');
  assert.equal(state.plants.some(p => p.name === 'Invalid QA should not exist'), false);
  assert.deepEqual(p.faults, {offline:false,latencyMs:0,dropPct:0,sensorFreeze:false,scadaReject:false,actuatorStuck:false});
  assert.equal(p.replay.speed, 5); assert.equal(p.replay.seed,777); assert.equal(p.replay.paused,false); assert.equal(p.replay.freezeLiveWeather,true);
  assert.equal(p.mode,'weather'); assert.equal(p.weather.wind_direction_deg,241);
  const wind=p.generators.find(g=>g.type==='wind'),solar=p.generators.find(g=>g.type==='solar');
  assert.deepEqual([wind.ratedKw,wind.rampKwPerSec,wind.startupDelaySeconds,wind.cutInMs,wind.ratedWindMs,wind.cutOutMs],[1001,101,1,2,13,26]);
  assert.deepEqual(wind.windCurve,[[2,0],[8,.4],[13,1]]);assert.equal(solar.solarEfficiency,.8);assert.equal(solar.temperatureCoefficient,-.003);assert.equal(p.irradianceDataset,null);
  const exported=JSON.parse(fs.readFileSync('/Users/charleskoh/Downloads/Round2 UI export proof.json','utf8'));
  assert.equal(exported.schemaVersion,1);assert.equal(exported.name,'Round2 UI export proof');assert(exported.snapshot);
  const csv=fs.readFileSync('/Users/charleskoh/Downloads/wind.csv','utf8');assert(csv.startsWith('timestamp,power_kw,'));
  const result={timestamp:new Date().toISOString(),base,rtuId:id,method:'Actual native Chrome via cua_repl; this script reconciles API and downloaded files after those actions',browserObserved:['Synthetic fixture token login -> live dashboard','All six faults applied: offline/sensorFreeze/scadaReject/actuatorStuck=true,latencyMs120,dropPct15; server state independently read','All faults reset through UI','Replay speed5,seed777,freeze=true,pause and resume','Wind numeric fields and custom curve saved','Solar efficiency0.8 and temperature coefficient-0.003 saved','Irradiance CSV2 rows registered then cleared','Weather mode selected and applied; wind direction241','Keyboard CSV seek601 persisted','Hybrid camera drag and wheel zoom visibly changed camera, solar cells now face initial camera','Selected fixture preserved dashboard→lab','Invalid CSV source row3 power_kw error visible; no partial plant created','wind.csv browser download completed and content verified','Scenario JSON browser download completed; schemaVersion1 and snapshot verified'],assertions:'PASS',screenshotsSaved:false,screenshotLimitation:'Documented CUA API produced inline screenshot bytes; no filesystem-save API. Visual captures were inspected inline.',remaining:['Individual fault behavioral outcomes are server integration scope; browser only applied all fields and reset','Pure solar scene observed round1; round2 hybrid cells/orbit inspected','No exhaustive keyboard focus traversal or narrow viewport performed in this round; parent browser-check records separate checks','No remote k3s browser verification in this round']};
  fs.mkdirSync('artifacts/checkpoints/browser-flows',{recursive:true});fs.writeFileSync('artifacts/checkpoints/browser-flows/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({assertions:'PASS',evidence:'artifacts/checkpoints/browser-flows/result.json'}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
