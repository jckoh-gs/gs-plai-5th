import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import mqtt from 'mqtt';
const base=process.env.REMOTE_API||'http://127.0.0.1:3104';
const token=readFileSync('artifacts/private/deploy/api-token','utf8').trim();
const api=async(path,method='GET',body,expected=200)=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(15000),redirect:'error',method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;};
const until=async(fn,label,ms=20000)=>{const end=Date.now()+ms;while(Date.now()<end){const v=await fn();if(v)return v;await new Promise(r=>setTimeout(r,200));}throw Error(`Timeout ${label}`);};
const c=await mqtt.connectAsync(process.env.REMOTE_MQTT||'mqtt://127.0.0.1:18884',{username:'vpp-client',password:readFileSync('artifacts/private/deploy/client-password','utf8').trim(),clientId:`remote-proof-${randomUUID()}`,reconnectPeriod:0,connectTimeout:5000});
let plant;
try {
 const messages=[];c.on('message',(topic,b)=>{try{messages.push({topic,body:JSON.parse(b.toString()),bytes:b.length});}catch{}});
 await c.subscribeAsync('vpp/rtu/+/#',{qos:1});
 plant=process.env.REMOTE_PLANT_ID?(await api('/api/state')).plants.find(p=>p.id===process.env.REMOTE_PLANT_ID):await api('/api/plants','POST',{name:'k3s 검증 단지',type:'wind',csv:'timestamp,power_kw,voltage,current_a\n2026-01-01 00:00:00,1000,380,100\n2026-01-01 00:10:00,1000,380,100',count:2,ratedKw:1000,rampKwPerSec:1000},201);
 assert(plant,'Requested test RTU must exist');
 const req={schemaVersion:2,commandId:randomUUID(),action:'set_target',targetKw:125,expiresAt:new Date(Date.now()+25000).toISOString(),timeoutSeconds:15};
 await new Promise(r=>setTimeout(r,1500));
 await c.publishAsync(`vpp/rtu/${plant.id}/setpoint`,JSON.stringify(req),{qos:1});
 const done=await until(()=>messages.find(m=>m.body.commandId===req.commandId&&m.body.status==='completed'),'actual125');
 for(const status of ['accepted','executing','completed'])assert(messages.some(m=>m.body.commandId===req.commandId&&m.body.status===status));
 assert.equal(done.body.actualKw,125);assert.equal(done.body.errorKw,0);
 const frame=await until(()=>messages.find(m=>m.topic===`vpp/rtu/${plant.id}/telemetry`),'remote60secondtelemetry',75000);
 assert.equal(frame.body.scada.generators.length,2);assert.equal(frame.body.sampleCount,frame.body.samples.length);assert(frame.bytes<=120000);
 await c.publishAsync(`vpp/rtu/${plant.id}/setpoint`,JSON.stringify(req),{qos:1});await until(()=>messages.find(m=>m.body.commandId===req.commandId&&m.body.duplicate),'dedup');
 const result={result:'PASS',checkedAt:new Date().toISOString(),base,plantId:plant.id,commandId:req.commandId,actualKw:done.body.actualKw,errorKw:done.body.errorKw,states:['accepted','executing','completed'],actualAuthenticatedMQTT:true,duplicate:true,sampleCount:frame.body.sampleCount,telemetryBytes:frame.bytes};
 writeFileSync(process.env.REMOTE_EVIDENCE_FILE||'deploy/verification/remote-integration.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await c.endAsync(true);}
