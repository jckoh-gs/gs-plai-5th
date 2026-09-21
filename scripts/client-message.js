import {redact} from '../server/config.js';
const statuses=new Set(['accepted','executing','completed','failed','timed_out','expired','rejected','superseded','cancelled']);
export function safeText(value,env={},limit=512){
 if(typeof value!=='string')return null;
 let text=value;
 for(const [name,secret] of Object.entries(env))if(/TOKEN|PASSWORD|AUTH_KEY|SECRET/i.test(name)&&typeof secret==='string'&&secret.length)text=text.split(secret).join('[redacted]');
 return redact(text).replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').slice(0,limit);
}
export function readMessage(topic,bytes,{prefix,rtu,retained=false,env={}}){
 if(bytes.length>120000||!topic.startsWith(`${prefix}/rtu/`))return null;
 const parts=topic.slice(`${prefix}/rtu/`.length).split('/');if(parts.length!==2)return null;
 const [id,kind]=parts;if(!/^[A-Za-z0-9_-]+$/.test(id)||rtu&&id!==rtu||!['telemetry','ack','command-status','status'].includes(kind))return null;
 let m;try{m=JSON.parse(bytes.toString());}catch{return null;}
 if(!m||typeof m!=='object'||Array.isArray(m)||m.rtuId!==id)return null;
 const numeric=value=>value===null||value===undefined||typeof value==='number'&&Number.isFinite(value);
 if(['ack','command-status'].includes(kind)){
  if(retained||!statuses.has(m.status)||typeof m.commandId!=='string'||m.commandId.length>128||!numeric(m.actualKw)||!numeric(m.errorKw))return null;
 }
 for(const field of ['messageId','runId','serverVersion'])if(m[field]!==undefined&&m[field]!==null&&(typeof m[field]!=='string'||m[field].length>128))return null;
 return {kind,topic,rtuId:id,messageId:safeText(m.messageId,env,128),runId:safeText(m.runId,env,128),serverVersion:safeText(m.serverVersion,env,128),commandId:safeText(m.commandId,env,128),status:statuses.has(m.status)?m.status:null,actualKw:typeof m.actualKw==='number'&&Number.isFinite(m.actualKw)?m.actualKw:null,errorKw:typeof m.errorKw==='number'&&Number.isFinite(m.errorKw)?m.errorKw:null,reason:safeText(m.reason,env),timestamp:safeText(m.timestamp,env,64),powerKw:typeof m.powerKw==='number'&&Number.isFinite(m.powerKw)?m.powerKw:null,sampleCount:Number.isInteger(m.sampleCount)?m.sampleCount:null};
}
