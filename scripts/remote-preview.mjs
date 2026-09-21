import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const base=process.env.REMOTE_API||'http://127.0.0.1:3104',token=readFileSync('artifacts/private/deploy/api-token','utf8').trim();
async function request(path,body,auth=true,raw=false){return fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:raw?body:JSON.stringify(body)});}
const before=await (await request('/api/state')).json();assert.equal(before.version,process.env.EXPECTED_VERSION||'1.1.0');
const csv='timestamp,wind_power_kw,solar_power_kw\n2026-01-01 00:00:00,10,20\n2026-01-01 00:10:00,30,40';
const body={type:'hybrid',unit:'kwh',csv};
assert.equal((await request('/api/datasets/preview',body,false)).status,401);
const response=await request('/api/datasets/preview',body);assert.equal(response.status,200);const data=await response.json();
assert.equal(data.minPowerKw,180);assert.equal(data.maxPowerKw,420);assert.equal(data.interpolation,'hold');assert.equal(data.powerSource,'wind_plus_solar');assert.equal(data.rows.length,2);assert.equal(data.start.utc,'2025-12-31T15:00:00.000Z');assert.equal(data.start.kst,'2026-01-01T00:00:00.000+09:00');
for(const invalid of [{csv:'timestamp,power_kw\n2026-01-01 00:00:00,sensitive-preview-marker"oops',type:'wind'},'sensitive-preview-marker']) {
 const r=await request('/api/datasets/preview',invalid,true,typeof invalid==='string');assert.equal(r.status,400);const text=await r.text();assert(!text.includes('sensitive'));assert(!text.includes(token));
}
const after=await (await request('/api/state')).json();assert.deepEqual(after.plants.map(p=>p.id),before.plants.map(p=>p.id));
const report={result:'PASS',checkedAt:new Date().toISOString(),base,version:after.version,authenticated:true,unauthenticatedRejected:true,hybridKwh180To420:true,kstUtc:true,noNewRTU:true,parserAndJsonErrorsDoNotEchoRawInput:true,preview:data};
writeFileSync(process.env.REMOTE_EVIDENCE_FILE||'deploy/verification/preview-1.1.0-api.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
