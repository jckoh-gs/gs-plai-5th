export const canonicalize=x=>JSON.stringify(sort(x));
function sort(x){if(Array.isArray(x))return x.map(sort);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])]));return x;}
const active=c=>['accepted','executing'].includes(c.status);
const iso=t=>new Date(t).toISOString();
function number(v,min,max,name){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`${name} must be ${min}..${max}`);return v;}
export class Controller {
 constructor(store,plants,{onEvent=()=>{}}={}){this.store=store;this.plants=plants;this.onEvent=onEvent;this.commands=new Map(store.loadCommands().map(c=>[c.commandId,c]));}
 atomic(fn){const before=new Map(this.commands);this.store.onRollback(()=>{this.commands=before;});try{return this.store.transaction(fn);}catch(e){this.commands=before;throw e;}}
 emit(c,topic='command-status',persist=true){if(persist){this.store.saveCommand(c);this.commands.set(c.commandId,c);}this.store.commandEvent(c);this.store.enqueue(c.plantId,topic,c);this.onEvent(c);return c;}
 submit(plantId,request,source='REST',options={}){const now=options.now??Date.now();const p=this.plants.get(plantId);if(!p)throw Error('Unknown RTU');const base={commandId:typeof request?.commandId==='string'?request.commandId:null,plantId,source,action:request?.action??null,updatedAt:iso(now),actualKw:null,errorKw:null,reason:null};const reject=reason=>{const c={...base,status:'rejected',reason};this.atomic(()=>this.emit(c,'ack',false));return c;};
 if(options.retained)return reject('Retained control delivery is forbidden');
 if(!request||typeof request!=='object'||Array.isArray(request))return reject('Command must be a JSON object');
 if(typeof request.commandId!=='string'||!request.commandId.trim()||request.commandId.length>128)return reject('commandId must contain 1..128 characters');
 if(options.setpoint&&request.action!=='set_target')return reject('setpoint requires set_target');
 const canonical=canonicalize(request);const prior=this.commands.get(request.commandId);
 if(prior){if(prior.plantId!==plantId||prior.canonical!==canonical)return reject('commandId conflicts with existing request or RTU');const c={...prior,duplicate:true};this.atomic(()=>this.emit(c,'ack',false));return c;}
 let c;try{
  if(request.schemaVersion!==undefined&&request.schemaVersion!==2)throw Error('schemaVersion must be 2');
  if(!['set_target','set_limit','start','stop'].includes(request.action))throw Error('Unsupported action');
  if(options.setpoint&&request.action!=='set_target')throw Error('setpoint requires set_target');
  const gs=request.generatorId===undefined?p.generators:p.generators.filter(g=>g.id===request.generatorId);if(!gs.length)throw Error('Unknown generator');
  const rated=gs.reduce((s,g)=>s+g.ratedKw,0);const toleranceKw=number(request.toleranceKw??1,.01,10000,'toleranceKw');const timeoutSeconds=number(request.timeoutSeconds??120,1,3600,'timeoutSeconds');const priority=number(request.priority??50,0,100,'priority');
  if(request.action==='set_target')number(request.targetKw,0,rated,'targetKw');if(request.action==='set_limit')number(request.limitPct,0,100,'limitPct');
  const expires= request.expiresAt===undefined?now+30000:Date.parse(request.expiresAt);if(!Number.isFinite(expires)||request.expiresAt!==undefined&&typeof request.expiresAt!=='string')throw Error('expiresAt must be an ISO timestamp');
  c={...base,request:structuredClone(request),canonical,runId:p.runId,status:expires<=now?'expired':'accepted',acceptedAt:iso(now),expiresAt:iso(expires),timeoutSeconds,toleranceKw,priority,targets:gs.map(g=>({id:g.id,targetKw:request.action==='set_target'?request.targetKw*g.ratedKw/rated:request.action==='stop'?0:null}))};
  if(c.status==='accepted'&&[...this.commands.values()].some(old=>active(old)&&old.plantId===plantId&&old.priority>priority&&old.targets.some(t=>gs.some(g=>g.id===t.id))))throw Error('Higher priority active command overlaps targets');
 }catch(e){c={...base,request:structuredClone(request),canonical,status:'rejected',reason:e.message};}
 this.atomic(()=>{if(c.status==='accepted')for(const old of this.commands.values())if(active(old)&&old.plantId===plantId&&old.targets.some(t=>c.targets.some(x=>x.id===t.id)))this.emit({...old,status:'superseded',reason:`Replaced by ${c.commandId}`,updatedAt:iso(now)});this.emit(c,c.status==='expired'?'command-status':'ack');});return c;
 }
 tick(now=Date.now()){for(const existing of [...this.commands.values()]){if(!active(existing))continue;const p=this.plants.get(existing.plantId);if(!p)continue;const c=structuredClone(existing);const gs=c.targets.map(t=>p.generators.find(g=>g.id===t.id));if(gs.some(g=>!g)){this.cancelPlant(p.id,'Generator removed');continue;}
  if(c.status==='accepted'){
   if(now>=Date.parse(c.expiresAt)){c.status='expired';c.reason='Expired before SCADA dispatch';}
   else if(p.faults.offline||now<Date.parse(c.acceptedAt)+(p.faults.latencyMs||0))continue;
   else if(p.faults.scadaReject){c.status='failed';c.reason='SCADA rejected command';}
   else {
    const clone=structuredClone(p);const targets=clone.generators.filter(g=>gs.some(x=>x.id===g.id));for(const g of targets){if(c.action==='stop'){g.on=false;g.startupRemaining=0;}if(c.action==='set_limit'){g.limitPct=c.request.limitPct;g.targetLimitKw=null;}if(['start','set_target'].includes(c.action)){if(!g.on)g.startupRemaining=g.startupDelaySeconds||0;g.on=true;}if(c.action==='set_target'){g.targetLimitKw=c.targets.find(t=>t.id===g.id).targetKw;g.limitPct=100;}}
    c.status='executing';c.dispatchedAt=iso(now);c.dispatchedSimulationSeconds=p.simulationSeconds??null;c.deadlineAt=iso(now+c.timeoutSeconds*1000);c.scadaSignal={operation:c.action,adapter:'in-process-virtual-scada',targets:targets.map(g=>({id:g.id,on:g.on,limitPct:g.limitPct,targetLimitKw:g.targetLimitKw}))};c.updatedAt=iso(now);
    this.atomic(()=>{this.store.savePlant(clone);this.emit(c);});Object.assign(p,clone);continue;
   }
  }else{
   const desired=gs.map((g,i)=>c.action==='set_target'?c.targets[i].targetKw:c.action==='stop'?0:g.on?Math.min(g.availableKw,g.ratedKw*g.limitPct/100,g.targetLimitKw??Infinity):0);
   c.actualKw=gs.reduce((s,g)=>s+g.powerKw,0);c.errorKw=c.actualKw-desired.reduce((s,x)=>s+x,0);c.targets=c.targets.map((t,i)=>({...t,targetKw:desired[i]}));
   if(now>=Date.parse(c.deadlineAt)){c.status='timed_out';c.reason='No valid target feedback before execution deadline';}
   else if(!p.faults.sensorFreeze&&(c.dispatchedSimulationSeconds===null||p.simulationSeconds>c.dispatchedSimulationSeconds)&&gs.every((g,i)=>!(g.startupRemaining>0)&&Math.abs(g.powerKw-desired[i])<=c.toleranceKw)&&Math.abs(c.errorKw)<=c.toleranceKw)c.status='completed';
   else {this.store.saveCommand(c);this.commands.set(c.commandId,c);continue;}
  }
  c.updatedAt=iso(now);this.atomic(()=>this.emit(c));
 }}
 cancelPlant(id,reason='Model changed'){this.atomic(()=>{for(const c of this.commands.values())if(c.plantId===id&&active(c))this.emit({...c,status:'cancelled',reason,updatedAt:iso(Date.now())});});}
 list(id){return [...this.commands.values()].filter(c=>c.plantId===id).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,200);}
}
