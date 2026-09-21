import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import mqtt from 'mqtt';
const dir=mkdtempSync(join(tmpdir(),'grid-report-wait-')),file=join(dir,'result.json'),prefix=`wait-${randomUUID()}`,id=randomUUID(),url=process.env.MQTT_URL||'mqtt://127.0.0.1:18883';
const observer=await mqtt.connectAsync(url,{clientId:randomUUID(),reconnectPeriod:0});let received=0;
await observer.subscribeAsync(`${prefix}/rtu/${id}/setpoint`,{qos:1});observer.on('message',()=>received++);
try{
 const start=Date.now();const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/vpp-client.js','--dispatch'],{env:{...process.env,MQTT_URL:url,MQTT_PREFIX:prefix,RTU_ID:id,TARGET_KW:'10',COMMAND_TIMEOUT_SECONDS:'1',VPP_REPORT_FILE:file},stdio:'ignore'});const guard=setTimeout(()=>{child.kill('SIGKILL');reject(Error('Unbounded result wait'));},60000);child.once('exit',c=>{clearTimeout(guard);resolve(c);});});
 const elapsed=Date.now()-start,result=JSON.parse(readFileSync(file));assert.equal(code,1);assert.equal(received,1);assert.equal(result.exitReason,'result_wait_timeout');assert.equal(result.lastStatus,null);assert.equal(result.actualKw,null);assert.equal(result.events.length,0);assert(elapsed>=45000&&elapsed<60000);
 console.log(JSON.stringify({result:'PASS',suite:'client-result-wait-timeout',elapsedMs:elapsed,commandPublications:received,exitReason:result.exitReason,observedCommandStatus:null},null,2));
}finally{await observer.endAsync(true);rmSync(dir,{recursive:true,force:true});}
