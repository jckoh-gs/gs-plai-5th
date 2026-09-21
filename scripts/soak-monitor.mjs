// Read-only operational soak observer; gaps/restarts are reported, never hidden.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import mqtt from 'mqtt';
import {randomUUID} from 'node:crypto';
const run=JSON.parse(readFileSync('docs/operations/run.json'));
const stopAt=process.env.SOAK_SECONDS?Date.now()+Number(process.env.SOAK_SECONDS)*1000:Date.parse(run.freezeAt);
const token=readFileSync('artifacts/private/deploy/api-token','utf8').trim();
const out=process.env.SOAK_DIRECTORY||'artifacts/soak';mkdirSync(out,{recursive:true});
const sessionId=randomUUID(),startedAt=new Date().toISOString(),seen=new Set();
let messages=0,duplicates=0,invalid=0,maxPayloadBytes=0,connectionErrors=0,apiErrors=0,polls=0,lastMessageAt=null,previousPoll=null,maxGapMs=0,stopping=false;
const client=mqtt.connect(process.env.SOAK_MQTT||'mqtt://127.0.0.1:18884',{username:'vpp-client',password:readFileSync('artifacts/private/deploy/client-password','utf8').trim(),clientId:`soak-${sessionId}`,reconnectPeriod:1500,connectTimeout:10000});
client.on('error',()=>connectionErrors++);client.on('connect',()=>client.subscribe('vpp/rtu/+/telemetry',{qos:1}));
client.on('message',(topic,b)=>{messages++;maxPayloadBytes=Math.max(maxPayloadBytes,b.length);lastMessageAt=new Date().toISOString();try{const x=JSON.parse(b);if(b.length>120000||x.schemaVersion!==2||!x.messageId||x.sampleCount!==x.samples?.length||!Array.isArray(x.scada?.generators))invalid++;if(seen.has(x.messageId))duplicates++;else{seen.add(x.messageId);if(seen.size>10000)seen.delete(seen.values().next().value);}}catch{invalid++;}});
const snapshot=(extra={})=>({sessionId,startedAt,checkedAt:new Date().toISOString(),plannedStopAt:new Date(stopAt).toISOString(),polls,messages,duplicates,invalid,maxPayloadBytes,lastMessageAt,connectionErrors,apiErrors,maxGapMs,dedupWindowLimit:10000,...extra});
async function poll(){const now=Date.now();if(previousPoll)maxGapMs=Math.max(maxGapMs,now-previousPoll);previousPoll=now;polls++;let detail;try{const r=await fetch((process.env.SOAK_API||'http://127.0.0.1:3104')+'/api/state',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('API status');const state=await r.json();detail={apiReady:true,plants:state.plants.length,rssBytes:state.gateway.rssBytes,health:state.plants.map(p=>({id:p.id,health:p.metrics.health,pending:p.metrics.pendingMessages,generated:p.metrics.generatedSamples,confirmed:p.metrics.telemetryConfirmed}))};}catch{apiErrors++;detail={apiReady:false,error:'State unavailable; inspect tunnel and deployment'};}const value=snapshot(detail);writeFileSync(out+'/latest.json',JSON.stringify(value,null,2)+'\n');appendFileSync(out+'/observations.jsonl',JSON.stringify(value)+'\n');}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;});
try{while(!stopping&&Date.now()<stopAt){await poll();await new Promise(r=>setTimeout(r,Math.min(10000,Math.max(0,stopAt-Date.now()))));}}finally{await client.endAsync(true);const result=snapshot({endedAt:new Date().toISOString(),endReason:stopping?'signal':'planned_stop'});writeFileSync(out+'/session-'+sessionId+'.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}
