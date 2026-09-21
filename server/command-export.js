import {parseTimestamp} from './model.js';

const actions=new Set(['set_target','set_limit','start','stop']);
const sources=new Set(['REST','MQTT']);
const statuses=new Set(['accepted','executing','completed','failed','timed_out','expired','rejected','superseded','cancelled']);
const finite=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
function timestamp(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return null;
  try{parseTimestamp(value.replace(/\.\d{1,3}(?=Z|[+-])/ ,''));return new Date(value).toISOString();}catch{return null;}
}
function secretValues(config){
  const values=new Set();
  // Do not overlay environments: a test/device override must not hide a host secret.
  for(const env of [process.env,config.env||{}])for(const [key,value] of Object.entries(env)){
    if(typeof value!=='string'||!value)continue;
    if(/TOKEN|PASSWORD|AUTH_KEY|SECRET/i.test(key))values.add(value);
    if(/URL/i.test(key))try{const url=new URL(value);if(url.password){values.add(url.password);values.add(decodeURIComponent(url.password));}}catch{}
  }
  if(typeof config.token==='string'&&config.token)values.add(config.token);
  if(typeof config.url==='string')try{const url=new URL(config.url);if(url.password){values.add(url.password);values.add(decodeURIComponent(url.password));}}catch{}
  return [...values].sort((a,b)=>b.length-a.length);
}
function identifier(value,secrets){
  if(typeof value!=='string')return {value:null,redacted:false};
  let text=value.replace(/[\u0000-\u001f\u007f-\u009f]/g,'');
  // Remove the whole credential-bearing URL before replacing its password substring.
  text=text.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s/]*@[^\s]*/gi,'[redacted-url]');
  for(const secret of secrets)text=text.split(secret).join('[redacted]');
  text=text.replace(/(authKey|token|password)=([^\s&]+)/gi,'$1=[redacted]').slice(0,128);
  return {value:text,redacted:text!==value};
}
export function exportCommandStates({plantId,commands,productVersion,config={},now=new Date()}){
  const secrets=secretValues(config);
  const rows=commands.slice(0,20).map(command=>{
    const id=identifier(command.commandId,secrets);
    const targets=command.targets;
    const sum=Array.isArray(targets)&&targets.length&&targets.every(t=>finite(t?.targetKw)!==null)?targets.reduce((n,t)=>n+t.targetKw,0):null;
    return {
      commandId:id.value,commandIdRedacted:id.redacted,
      runId:typeof command.runId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(command.runId)?command.runId:null,
      action:actions.has(command.action)?command.action:null,source:sources.has(command.source)?command.source:null,status:statuses.has(command.status)?command.status:null,
      acceptedAt:timestamp(command.acceptedAt),dispatchedAt:timestamp(command.dispatchedAt),deadlineAt:timestamp(command.deadlineAt),expiresAt:timestamp(command.expiresAt),updatedAt:timestamp(command.updatedAt),
      targetKw:finite(sum),actualKw:finite(command.actualKw),errorKw:finite(command.errorKw),
    };
  });
  return {schemaVersion:1,productVersion,contractVersion:2,exportedAt:now.toISOString(),plantId,scope:'recent-command-snapshots',limit:20,
    redaction:{policy:'known-secrets-credential-urls-controls-length',redactedCommandIds:rows.filter(row=>row.commandIdRedacted).length,identifiersForReplay:false,unknownPersonalDataMayRemain:true},commands:rows};
}
