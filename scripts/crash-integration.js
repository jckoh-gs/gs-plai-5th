import net from 'node:net';
import mqtt from 'mqtt';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {until,CSV} from './test-harness.js';
const broker=new URL(process.env.MQTT_URL||'mqtt://127.0.0.1:18883');
if(broker.protocol!=='mqtt:')throw Error('Crash proxy fixture requires local plaintext MQTT broker');
const dir=mkdtempSync(join(tmpdir(),'grid-crash-')),db=join(dir,'crash.sqlite'),prefix=`crash-${randomUUID()}`;
let child,port;const sockets=new Set(),received=[],seen=new Set();let unique=0;
const subscriber=await mqtt.connectAsync(broker.href,{clientId:`crash-receiver-${randomUUID()}`,reconnectPeriod:0});
subscriber.on('message',(topic,b)=>{const m=JSON.parse(b.toString());received.push(m);if(!seen.has(m.messageId)){seen.add(m.messageId);unique++;}});await subscriber.subscribeAsync(`${prefix}/rtu/+/telemetry`,{qos:1});
// Transparent MQTT framing proxy withholding only PUBACK, so broker receives real data
// while the RTU never sees confirmation. Other packets pass unchanged.
const proxy=net.createServer(down=>{sockets.add(down);const up=net.connect(Number(broker.port)||1883,broker.hostname);sockets.add(up);let buf=Buffer.alloc(0);down.pipe(up);up.on('data',chunk=>{buf=Buffer.concat([buf,chunk]);while(buf.length>=2){let length=0,mult=1,i=1,b;do{if(i>=buf.length)return;b=buf[i++];length+=(b&127)*mult;mult*=128;}while(b&128);if(buf.length<i+length)return;const packet=buf.subarray(0,i+length);buf=buf.subarray(i+length);if(packet[0]>>4!==4)down.write(packet);}});for(const socket of [down,up]){socket.on('error',()=>{});socket.on('close',()=>{sockets.delete(socket);down.destroy();up.destroy();});}});
await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));port=reserve.address().port;await new Promise(r=>reserve.close(r));
async function start(url){child=spawn(process.execPath,['server/index.js'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),API_TOKEN:'',DB_PATH:db,SEED_DEMO:'false',MQTT_URL:url,MQTT_PREFIX:prefix,MQTT_CLIENT_ID:`${prefix}-gateway`,TELEMETRY_SECONDS:'1'},stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);await until(async()=>{if(child.exitCode!==null)throw Error(output);try{return (await fetch(`http://127.0.0.1:${port}/api/health`)).ok;}catch{return false;}},'child healthy');}
async function stop(signal='SIGTERM'){if(!child||child.exitCode!==null)return;const c=child;await new Promise(r=>{c.once('exit',r);c.kill(signal);});}
try{
 await start(`mqtt://127.0.0.1:${proxy.address().port}`);
 const response=await fetch(`http://127.0.0.1:${port}/api/plants`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'PUBACK crash fixture',type:'wind',count:2,ratedKw:1000,csv:CSV})});assert.equal(response.status,201);
 await until(()=>received.length>0,'broker received telemetry while PUBACK withheld');const original=received[0];
 await stop('SIGKILL');
 const dbRead=new DatabaseSync(db,{readOnly:true});const row=dbRead.prepare('SELECT body,acked FROM outbox WHERE id=?').get(original.messageId);assert.equal(row.acked,null);assert.equal(row.body,JSON.stringify(original));dbRead.close();
 const uniqueBefore=unique;await start(broker.href);
 await until(()=>received.filter(m=>m.messageId===original.messageId).length>=2,'same message replay after hard crash');
 assert.equal(received.filter(m=>m.messageId===original.messageId).map(JSON.stringify).every(s=>s===JSON.stringify(original)),true);
 assert(unique<received.length,'VPP dedup filters replay');
 console.log(JSON.stringify({result:'PASS',suite:'hard-crash',evidence:{signal:'SIGKILL',pubackWithheld:true,brokerReceivedBeforeCrash:true,outboxUnacknowledgedAfterCrash:true,sameIdSequenceBodyAfterRestart:true,receiverDedup:true}},null,2));
}finally{await stop();for(const s of sockets)s.destroy();await new Promise(r=>proxy.close(r));await subscriber.endAsync(true);rmSync(dir,{recursive:true,force:true});}
