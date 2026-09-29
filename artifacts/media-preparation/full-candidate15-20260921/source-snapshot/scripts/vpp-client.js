import mqtt from 'mqtt';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {connectionOptions} from '../server/transport.js';
import {safeText,readMessage} from './client-message.js';
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const env=process.env,dispatch=process.argv.includes('--dispatch'),reportFile=env.VPP_REPORT_FILE;
const rtu=env.RTU_ID,prefix=env.MQTT_PREFIX||'vpp';
let client,closing=false,guard,connectGuard,exit=0;
const seen=new Set();
const report={reportSchemaVersion:1,clientVersion:version,serverVersion:null,contractVersion:2,rtuId:rtu||null,commandId:dispatch?randomUUID():null,runId:null,startedAt:new Date().toISOString(),endedAt:null,requestedTargetKw:null,events:[],lastStatus:null,actualKw:null,errorKw:null,exitReason:null,exitCode:null,eventsTruncated:false,droppedEventCount:0};
function save(){if(!reportFile)return;const path=resolve(reportFile),temporary=resolve(dirname(path),`.grid-report-${randomUUID()}.tmp`);try{writeFileSync(temporary,JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});renameSync(temporary,path);}catch(e){try{unlinkSync(temporary);}catch{}throw e;}}
async function close(code,reason){
  if(closing)return;closing=true;clearTimeout(guard);clearTimeout(connectGuard);report.endedAt=new Date().toISOString();report.exitCode=code;report.exitReason=reason;
  try{save();}catch(e){code=1;console.error('Report save failed:',safeText(e.message,env));}
  exit=code;process.exitCode=code;
  if(client){await Promise.race([client.endAsync(true),new Promise(r=>setTimeout(r,1500).unref())]);}
}
async function main(){
  if(reportFile&&!dispatch)throw Error('VPP_REPORT_FILE is dispatch-only');
  if(!/^[A-Za-z0-9_/-]+$/.test(prefix)||prefix.startsWith('/')||prefix.endsWith('/'))throw Error('Invalid MQTT_PREFIX');
  if((dispatch&&!rtu)||(rtu&&!/^[A-Za-z0-9_-]+$/.test(rtu)))throw Error('RTU_ID is required for dispatch');
  const target=Number(env.TARGET_KW),timeout=Number(env.COMMAND_TIMEOUT_SECONDS||120),connectTimeout=Number(env.VPP_CONNECT_TIMEOUT_MS||10000);
  if(dispatch&&(!Number.isFinite(target)||target<0))throw Error('TARGET_KW must be a nonnegative number');
  if(!Number.isFinite(timeout)||timeout<1||timeout>3600)throw Error('COMMAND_TIMEOUT_SECONDS must be 1..3600');
  if(!Number.isInteger(connectTimeout)||connectTimeout<100||connectTimeout>60000)throw Error('VPP_CONNECT_TIMEOUT_MS must be 100..60000');
  report.requestedTargetKw=dispatch?target:null;
  client=mqtt.connect(env.MQTT_URL||'mqtt://127.0.0.1:1883',{...connectionOptions(`grid-vpp-client-${randomUUID()}`,env),reconnectPeriod:dispatch?0:1500,connectTimeout});
  client.on('error',()=>{console.error('MQTT connection failed');if(dispatch)void close(1,'connection_failed');});
  client.on('message',(topic,bytes,packet)=>{
    if(closing)return;
    const m=readMessage(topic,bytes,{prefix,rtu,retained:!!packet?.retain,env});if(!m)return;
    if(m.messageId){if(seen.has(m.messageId))return;seen.add(m.messageId);if(seen.size>10000)seen.delete(seen.values().next().value);}
    if(topic.endsWith('/telemetry'))console.log(JSON.stringify({topic,messageId:m.messageId,rtuId:m.rtuId,runId:m.runId,timestamp:m.timestamp,powerKw:m.powerKw,sampleCount:m.sampleCount}));
    else console.log(JSON.stringify({topic,...m}));
    if(dispatch&&['ack','command-status'].includes(m.kind)&&m.commandId===report.commandId){
      report.events.push({receivedAt:new Date().toISOString(),status:m.status,messageId:m.messageId||null,actualKw:m.actualKw??null,errorKw:m.errorKw??null,reason:m.reason??null});
      if(report.events.length>1000){report.events.shift();report.eventsTruncated=true;report.droppedEventCount++;}
      report.lastStatus=m.status;report.actualKw=m.actualKw??null;report.errorKw=m.errorKw??null;report.runId=m.runId??report.runId;report.serverVersion=m.serverVersion??report.serverVersion;
      if(['completed','failed','timed_out','expired','rejected','superseded','cancelled'].includes(m.status))void close(m.status==='completed'?0:1,`command_${m.status}`);
    }
  });
  connectGuard=setTimeout(()=>void close(1,'connection_timeout'),connectTimeout);
  await new Promise((resolveConnect,reject)=>{client.once('connect',resolveConnect);client.once('error',reject);client.once('end',()=>reject(Error('Client ended')));});
  clearTimeout(connectGuard);if(closing)return;
  // Subscription timeout is a distinct bound, never described as connection timeout.
  guard=setTimeout(()=>void close(1,'subscription_timeout'),10000);
  await client.subscribeAsync(['telemetry','ack','command-status','status'].map(t=>`${prefix}/rtu/${rtu||'+'}/${t}`),{qos:1});
  clearTimeout(guard);if(closing)return;
  if(dispatch){
    const request={schemaVersion:2,commandId:report.commandId,action:'set_target',targetKw:target,toleranceKw:1,timeoutSeconds:timeout,expiresAt:new Date(Date.now()+30000).toISOString(),priority:50};
    guard=setTimeout(()=>void close(1,'result_wait_timeout'),(timeout+45)*1000);
    await client.publishAsync(`${prefix}/rtu/${rtu}/setpoint`,JSON.stringify(request),{qos:1,retain:false});
    console.log('DISPATCHED',JSON.stringify(request));
  }else console.log('Monitoring simulated SCADA. Ctrl+C to stop.');
}
process.on('SIGINT',()=>void close(dispatch?1:0,'interrupted'));
process.on('SIGTERM',()=>void close(dispatch?1:0,'terminated'));
main().catch(async e=>{if(!closing){console.error(safeText(e.message,env));await close(1,client?'client_failed':'input_error');}});
