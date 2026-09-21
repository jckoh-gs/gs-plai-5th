import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import mqtt from 'mqtt';
import {createRuntime} from '../server/index.js';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function until(fn,label,ms=10000){const end=Date.now()+ms;while(Date.now()<end){const x=await fn();if(x)return x;await sleep(100);}throw Error(`Timeout: ${label}`);}
export const CSV='timestamp,power_kw,voltage,current_a\n2026-01-01 00:00:00,1000,380,100\n2026-01-01 00:10:00,1000,380,100';
export async function harness(overrides={}){
 const dir=mkdtempSync(join(tmpdir(),'grid-integration-')),prefix=`test-${randomUUID()}`;
 const config={host:'127.0.0.1',port:0,token:'',dbPath:join(dir,'test.sqlite'),url:process.env.MQTT_URL||'mqtt://127.0.0.1:18883',prefix,telemetrySeconds:1,retentionDays:30,seedDemo:false,env:{...process.env,MQTT_CLIENT_ID:`test-gateway-${randomUUID()}`},...overrides};
 let runtime,base;const messages=[];
 const client=await mqtt.connectAsync(config.url,{clientId:`test-vpp-${randomUUID()}`,reconnectPeriod:0,connectTimeout:5000});
 client.on('error',()=>{});client.on('message',(topic,b)=>{try{messages.push({topic,body:JSON.parse(b.toString()),bytes:b.length});}catch{}});
 await client.subscribeAsync(`${prefix}/rtu/+/#`,{qos:1});
 const start=async()=>{runtime=createRuntime(config);const server=await runtime.start();base=`http://127.0.0.1:${server.address().port}`;};await start();
 const api=async(path,method='GET',body,expected=200)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;};
 const add=async(extra={})=>{const p=await api('/api/plants','POST',{name:'격리 시험 단지',type:'wind',csv:CSV,count:2,ratedKw:1000,rampKwPerSec:1000,...extra},201);await until(()=>runtime.transport.metrics(p.id).connected,'RTU connected');return p;};
 const command=async(id,body={})=>{const request={schemaVersion:2,commandId:randomUUID(),action:'set_target',targetKw:125,expiresAt:new Date(Date.now()+15000).toISOString(),timeoutSeconds:5,...body};await client.publishAsync(`${prefix}/rtu/${id}/setpoint`,JSON.stringify(request),{qos:1,retain:false});return request;};
 const status=(commandId,status)=>messages.find(m=>m.body.commandId===commandId&&m.body.status===status)?.body;
 const close=async()=>{await runtime.stop();await client.endAsync(true);rmSync(dir,{recursive:true,force:true});};
 return {api,add,command,status,messages,client,prefix,config,get base(){return base;},get runtime(){return runtime;},restart:async()=>{await runtime.stop();await start();},close};
}
