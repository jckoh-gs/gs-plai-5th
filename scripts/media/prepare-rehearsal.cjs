// Creates only dedicated local rehearsal RTUs. Never uses remote deployment ports.
const fs=require('node:fs');
(async()=>{
const url='http://127.0.0.1:3101',stamp=Date.now(),ids={};
const csv='timestamp,power_kw,wind_speed_ms,wind_direction_deg,irradiance_wm2,voltage,current_a\n2026-01-01T00:00:00Z,500,10,220,900,22000,13.12\n2026-01-01T00:10:00Z,500,10,240,900,22000,13.12';
fs.writeFileSync('artifacts/media-preparation/demo-synthetic.csv',csv);
for(const type of ['wind','solar']){const r=await fetch(url+'/api/plants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:`미디어 리허설 ${type} ${stamp}`,type,count:2,ratedKw:500,rampKwPerSec:250,csv})});if(!r.ok)throw Error(await r.text());const p=await r.json();ids[type]=p.id;}
const c=require('./scene-plan.cjs')({baseUrl:url,mqtt:{url:'mqtt://127.0.0.1:18883',prefix:'vpp'},names:{wind:`미디어 리허설 wind ${stamp}`,solar:`미디어 리허설 solar ${stamp}`,hybrid:`미디어 리허설 복합 ${stamp}`,scenario:`미디어 리허설 저장 ${stamp}`},csvFile:'artifacts/media-preparation/demo-synthetic.csv',rehearsal:true});
fs.writeFileSync('artifacts/media-preparation/full-rehearsal-config.json',JSON.stringify(c,null,2));fs.writeFileSync('artifacts/media-preparation/rehearsal-fixtures.json',JSON.stringify({ids,stamp,note:'Dedicated local RTUs only. Other existing plants are preserved.'},null,2));console.log(JSON.stringify({localOnly:true,fixtures:ids,config:'artifacts/media-preparation/full-rehearsal-config.json'}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
