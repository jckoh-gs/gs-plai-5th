import {harness,until} from './test-harness.js';
import {spawn} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';import assert from 'node:assert/strict';
const h=await harness(),dir=mkdtempSync(join(tmpdir(),'grid-security-')),file=join(dir,'report.json');
try{
 let output='';const child=spawn(process.execPath,['scripts/vpp-client.js','--dispatch'],{env:{...process.env,MQTT_URL:h.config.url,MQTT_PREFIX:h.prefix,RTU_ID:'fixture',TARGET_KW:'10',COMMAND_TIMEOUT_SECONDS:'3',API_TOKEN:'credential-security-fixture',VPP_REPORT_FILE:file},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
 const exit=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('security client timeout'));},12000);child.once('exit',code=>{clearTimeout(timer);resolve(code);});});
 const request=await until(()=>h.messages.find(m=>m.topic.endsWith('/fixture/setpoint'))?.body,'client dispatch');
 const topic=`${h.prefix}/rtu/fixture/ack`;
 for(const body of ['null','[]','{',JSON.stringify({rtuId:'other',commandId:request.commandId,status:'completed',actualKw:999}),JSON.stringify({rtuId:'fixture',commandId:request.commandId,status:'completed',actualKw:'fake'})])await h.client.publishAsync(topic,body,{qos:1});
 await h.client.publishAsync(topic,JSON.stringify({rtuId:'fixture',commandId:request.commandId,status:'accepted',reason:'credential-security-fixture',unexpected:'credential-security-fixture'}),{qos:1});
 await h.client.publishAsync(`${h.prefix}/rtu/fixture/command-status`,JSON.stringify({rtuId:'fixture',commandId:request.commandId,status:'completed',actualKw:10,errorKw:0}),{qos:1});
 assert.equal(await exit,0,output);const report=JSON.parse(readFileSync(file));assert.equal(report.actualKw,10);assert.equal(report.events.length,2);assert.equal(report.eventsTruncated,false);assert(!output.includes('credential-security-fixture'));assert(!JSON.stringify(report).includes('credential-security-fixture'));
 console.log(JSON.stringify({result:'PASS',suite:'client-security',cases:['null/array/malformed message containment','cross RTU and invalid numeric results ignored','observed valid result only','credentials omitted from report and logs']}));
}finally{await h.close();rmSync(dir,{recursive:true,force:true});}
