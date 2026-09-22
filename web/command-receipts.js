import {commandId} from './browser-compat.js';
export const COMMAND_STATUSES=Object.freeze(['accepted','executing','completed','rejected','expired','failed','timed_out','superseded','cancelled']);
const terminal=status=>COMMAND_STATUSES.includes(status)&&!['accepted','executing'].includes(status);
const fault=kind=>Object.assign(new Error(({timeout:'응답 대기 15초가 지났습니다.',network:'응답을 확인하지 못했습니다.',parse:'응답 형식을 확인하지 못했습니다.'})[kind]||kind),{receiptKind:kind});
export async function requestCommandJson(path,method='GET',body,{fetcher=fetch,getToken=()=>'',onAuth=()=>{},timeoutMs=15000}={}){
 const controller=new AbortController();let timer;
 const work=(async()=>{const token=getToken();const response=await fetcher('/api'+path,{method,signal:controller.signal,redirect:'error',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});if(response.status===401)onAuth();if(!response.ok)throw fault('HTTP '+response.status);try{return await response.json()}catch{throw fault('parse')}})();
 try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fault('timeout'))},timeoutMs)})])}catch(e){throw e.receiptKind?e:fault('network')}finally{clearTimeout(timer)}
}
export function commandObservation(receipt,value,secrets=[]){
 if(!value||Array.isArray(value)||value.commandId!==receipt.commandId||value.plantId!==receipt.plantId||value.action!==receipt.action||value.source!=='REST'||!COMMAND_STATUSES.includes(value.status))return null;
 const normalize=text=>text.replace(/[\u0000-\u001f\u007f]/g,'');let reason=normalize(typeof value.reason==='string'?value.reason:'');reason=reason.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s/]*@[^\s]*/gi,'[redacted-url]');for(const secret of secrets){const normalized=typeof secret==='string'?normalize(secret):'';if(normalized)reason=reason.split(normalized).join('[redacted]')}reason=reason.slice(0,300);
 return {status:value.status,reason,updatedAt:typeof value.updatedAt==='string'&&Number.isFinite(Date.parse(value.updatedAt))?value.updatedAt:null};
}
export function createCommandReceipts({request,uuid=commandId,onChange=()=>{},onState=()=>{},secrets=()=>[],now=()=>Date.now()}){
 const records=new Map(),pending=new Set(),checks=new Map();let stateGeneration=0;
 const list=id=>records.get(id)||[];
 const find=(id,commandId)=>list(id).find(r=>r.commandId===commandId);
 const patch=(id,commandId,change)=>{if(!find(id,commandId))return;records.set(id,list(id).map(r=>r.commandId===commandId?{...r,...change}:r));onChange()};
 const update=(receipt,observation)=>{const current=find(receipt.plantId,receipt.commandId);if(!current)return false;
  if(current.confirmed&&((current.updatedAt&&observation.updatedAt&&Date.parse(observation.updatedAt)<Date.parse(current.updatedAt))||(terminal(current.status)&&observation.status!==current.status)||(current.status==='executing'&&observation.status==='accepted')))return false;
  patch(receipt.plantId,receipt.commandId,{...observation,confirmed:true,problem:null});return true;
 };
 async function send(plant,payload){
  if(pending.has(plant.id))return null;
  const commandId=uuid(),body={...structuredClone(payload),commandId},receipt={commandId,plantId:plant.id,plantName:plant.name,action:body.action,generatorId:body.generatorId||null,sentAt:new Date(now()).toISOString(),pending:true,confirmed:false,status:null,reason:'',checking:false};
  pending.add(plant.id);records.set(plant.id,[receipt,...list(plant.id)].slice(0,20));onChange();
  try{const value=await request('/plants/'+plant.id+'/commands','POST',body),observation=commandObservation(receipt,value,secrets());if(observation)update(receipt,observation);else patch(plant.id,commandId,{problem:'응답 식별자 또는 상태가 일치하지 않습니다. 접수 여부 확인이 필요합니다.'})}
  catch(e){patch(plant.id,commandId,{problem:(e.receiptKind||'응답 유실')+' · 접수 여부 확인이 필요합니다.'})}
  finally{pending.delete(plant.id);patch(plant.id,commandId,{pending:false})}
  const generation=++stateGeneration;
  try{const state=await request('/state');if(generation===stateGeneration)onState(state);patch(plant.id,commandId,{refreshWarning:null})}
  catch{patch(plant.id,commandId,{refreshWarning:'화면 갱신 실패 · 위 명령 확인 상태는 유지됩니다.'})}
  return find(plant.id,commandId)||null;
 }
 async function recheck(plantId,commandId){
  const receipt=find(plantId,commandId);if(!receipt||receipt.pending||checks.has(commandId))return;
  const version=Symbol();checks.set(commandId,version);patch(plantId,commandId,{checking:true,checkWarning:null});
  try{const rows=await request('/plants/'+plantId+'/commands');if(checks.get(commandId)!==version)return;
   const row=Array.isArray(rows)?rows.find(r=>r?.commandId===commandId):null,observation=commandObservation(receipt,row,secrets());
   if(observation){if(!update(receipt,observation))patch(plantId,commandId,{checkWarning:'이전 관측보다 오래되거나 되돌아가는 응답은 적용하지 않았습니다.'})}
   else patch(plantId,commandId,{checkWarning:'최근 200개 저장 목록에서 일치하는 상태를 확인하지 못했습니다. 미접수라는 뜻은 아닙니다.'});
  }catch{if(checks.get(commandId)===version)patch(plantId,commandId,{checkWarning:'저장 상태 조회 실패 · 이전 확인 상태를 유지합니다. 접수 여부를 단정할 수 없습니다.'})}
  finally{if(checks.get(commandId)===version){checks.delete(commandId);patch(plantId,commandId,{checking:false})}}
 }
 return {list,isPending:id=>pending.has(id),send,recheck};
}
