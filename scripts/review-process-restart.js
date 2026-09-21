import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import net from 'node:net';
import {randomUUID} from 'node:crypto';
import mqtt from 'mqtt';
import {until,CSV} from './test-harness.js';
const dir=mkdtempSync(join(tmpdir(),'grid-process-review-')),prefix=`process-review-${randomUUID()}`,broker=process.env.MQTT_URL||'mqtt://127.0.0.1:18883';
const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
let child;const received=[],base=`http://127.0.0.1:${port}`;
const subscriber=await mqtt.connectAsync(broker,{clientId:`review-receiver-${randomUUID()}`,reconnectPeriod:0});
subscriber.on('message',(topic,bytes)=>{received.push({topic,body:JSON.parse(bytes.toString())});});await subscriber.subscribeAsync(`${prefix}/rtu/+/#`,{qos:1});
async function start(){child=spawn(process.execPath,['server/index.js'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),API_TOKEN:'',DB_PATH:join(dir,'test.sqlite'),MQTT_URL:broker,MQTT_PREFIX:prefix,MQTT_CLIENT_ID:`${prefix}-gateway`,SEED_DEMO:'false',TELEMETRY_SECONDS:'1'},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);await until(async()=>{if(child.exitCode!==null)throw Error(output);try{return(await fetch(base+'/api/health')).ok;}catch{return false;}},'child ready');return child.pid;}
async function stop(signal='SIGTERM'){if(child&&child.exitCode===null){const current=child;await new Promise(r=>{current.once('exit',r);current.kill(signal);});}}
async function api(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});assert(r.ok,await r.clone().text());return r.json();}
try{
 const firstPid=await start();const p=await api('/api/plants','POST',{name:'isolated process restart',type:'wind',count:2,ratedKw:1000,rampKwPerSec:1000,csv:CSV});
 const commandId=randomUUID();await api(`/api/plants/${p.id}/commands`,'POST',{schemaVersion:2,commandId,action:'set_target',targetKw:1800,timeoutSeconds:8});
 const executing=await until(()=>received.find(m=>m.body.commandId===commandId&&m.body.status==='executing')?.body,'actual executing status');
 const deadline=Date.parse(executing.deadlineAt);assert(deadline>Date.now());await stop('SIGKILL');
 const secondPid=await start();assert.notEqual(firstPid,secondPid);assert(Date.now()<deadline,'restart must precede original deadline');
 const restored=(await api(`/api/plants/${p.id}/commands`)).find(c=>c.commandId===commandId);assert.equal(restored.status,'executing');assert.equal(restored.deadlineAt,executing.deadlineAt);
 const timedOut=await until(()=>received.find(m=>m.body.commandId===commandId&&m.body.status==='timed_out')?.body,'restarted command timed_out',12000);
 assert.equal(timedOut.deadlineAt,executing.deadlineAt);assert(Date.parse(timedOut.updatedAt)>=deadline);assert(Date.parse(timedOut.updatedAt)<deadline+2500);
 const state=(await api('/api/state')).plants.find(x=>x.id===p.id);assert(state.generators.every(g=>g.on&&g.targetLimitKw===900),'timeout must preserve dispatched target');
 const stopId=randomUUID();await api(`/api/plants/${p.id}/commands`,'POST',{commandId:stopId,action:'stop'});await until(()=>received.find(m=>m.body.commandId===stopId&&m.body.status==='completed'),'explicit stop completes');
 const stopped=(await api('/api/state')).plants.find(x=>x.id===p.id);assert(stopped.generators.every(g=>!g.on&&g.powerKw===0));
 console.log(JSON.stringify({result:'PASS',suite:'actual-process-command-restart',firstPid,secondPid,signal:'SIGKILL',commandId,originalDeadline:executing.deadlineAt,restoredStatus:restored.status,timeoutObservedAt:timedOut.updatedAt,targetPreservedAfterTimeout:true,explicitStopCompleted:true,broker,prefix},null,2));
}finally{await stop();await subscriber.endAsync(true);rmSync(dir,{recursive:true,force:true});}
