import test from 'node:test';import assert from 'node:assert/strict';
import {createCommandReceipts,commandObservation,requestCommandJson,COMMAND_STATUSES} from '../web/command-receipts.js';
const plant={id:'A',name:'Plant A'},deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}},tick=()=>new Promise(r=>setImmediate(r));
const observed=(id,status='accepted',extra={})=>({commandId:id,plantId:'A',action:'set_target',source:'REST',status,updatedAt:'2026-09-21T00:00:00Z',...extra});
const factory=request=>{let id=0;return createCommandReceipts({request,uuid:()=>String(++id)})};
test('observation requires exact original command identity, action, REST and known status',()=>{
 const receipt={commandId:'1',plantId:'A',action:'set_target'};for(const status of COMMAND_STATUSES)assert.equal(commandObservation(receipt,observed('1',status)).status,status);
 for(const change of [{commandId:'2'},{plantId:'B'},{action:'stop'},{source:'MQTT'},{status:'success'}])assert.equal(commandObservation(receipt,observed('1','accepted',change)),null);
 assert.equal(commandObservation(receipt,null),null);assert.equal(commandObservation(receipt,[]),null);
 const reason=commandObservation(receipt,observed('1','rejected',{reason:'token-secret <script>text</script>\n'+'x'.repeat(400)}),['token-secret']).reason;assert(!reason.includes('token-secret'));assert(reason.includes('<script>'));assert(reason.length<=300);assert(!reason.includes('\n'));
});
test('synchronous perRTU POST guard survives callers and releases before following state GET',async()=>{
 const postA=deferred(),postB=deferred(),state=deferred(),calls=[];const store=factory((path,method,body)=>{calls.push({path,method,body});if(method==='POST')return path.includes('/A/')?postA.promise:postB.promise;return state.promise});
 const a=store.send(plant,{action:'set_target'});assert.equal(await store.send(plant,{action:'stop'}),null);const b=store.send({id:'B',name:'B'},{action:'stop'});assert(store.isPending('A'));assert(store.isPending('B'));assert.equal(calls.filter(c=>c.method==='POST').length,2);
 postA.resolve(observed('1'));await tick();assert(!store.isPending('A'));assert(store.isPending('B'));assert.equal(store.list('A')[0].status,'accepted');const a2=store.send(plant,{action:'set_target'});await tick();assert.equal(calls.filter(c=>c.method==='POST').length,3);
 postB.resolve(observed('2','accepted',{plantId:'B',action:'stop'}));state.resolve({plants:[]});await Promise.all([a,b,a2]);assert.equal(store.list('B')[0].plantName,'B');assert.equal(store.list('A')[0].commandId,'3');assert.equal(store.list('A')[1].status,'accepted');
});
test('confirmed POST survives state failure; failed POST stays unconfirmed without retry',async()=>{
 let posts=0;const store=factory((path,method,body)=>{if(method==='POST'){posts++;return Promise.resolve(observed(body.commandId,'expired'))}return Promise.reject(Error('raw private response'))});await store.send(plant,{action:'set_target'});assert.equal(store.list('A')[0].status,'expired');assert(store.list('A')[0].confirmed);assert.match(store.list('A')[0].refreshWarning,/갱신 실패/);assert.equal(posts,1);
 const lost=factory((path,method)=>method==='POST'?Promise.reject(Error('raw private response')):Promise.resolve({}));await lost.send(plant,{action:'set_target'});assert.equal(lost.list('A')[0].commandId,'1');assert.equal(lost.list('A')[0].confirmed,false);assert(!JSON.stringify(lost.list('A')).includes('raw private'));
});
test('explicit recheck is single in-flight, preserves confirmed on missing/error and rejects regression',async()=>{
 let next=deferred(),gets=0;const store=factory((path,method,body)=>method==='POST'?Promise.resolve(observed(body.commandId,'executing')):path==='/state'?Promise.resolve({}):(gets++,next.promise));await store.send(plant,{action:'set_target'});
 const check=store.recheck('A','1');await store.recheck('A','1');assert.equal(gets,1);next.resolve([]);await check;assert.equal(store.list('A')[0].status,'executing');assert.match(store.list('A')[0].checkWarning,/미접수라는 뜻은 아닙니다/);
 next=deferred();const failed=store.recheck('A','1');next.reject(Error('secret'));await failed;assert(store.list('A')[0].confirmed);
 next=deferred();const stale=store.recheck('A','1');next.resolve([observed('1','accepted',{updatedAt:'2026-09-22T00:00:00Z'})]);await stale;assert.equal(store.list('A')[0].status,'executing');
 next=deferred();const done=store.recheck('A','1');next.resolve([observed('1','completed',{updatedAt:'2026-09-22T00:00:00Z'})]);await done;assert.equal(store.list('A')[0].status,'completed');
});
test('lost response resolves only by matching stored ID, never another row; last20 preserves uncertainty',async()=>{
 let rows=[];const store=factory((path,method,body)=>method==='POST'?(body.commandId==='1'?Promise.reject(Error()):Promise.resolve(observed(body.commandId))):path==='/state'?Promise.resolve({}):Promise.resolve(rows));await store.send(plant,{action:'set_target'});rows=[observed('different')];await store.recheck('A','1');assert(!store.list('A')[0].confirmed);for(let n=0;n<19;n++)await store.send(plant,{action:'set_target'});assert.equal(store.list('A').length,20);assert.equal(store.list('A').at(-1).commandId,'1');assert(!store.list('A').at(-1).confirmed);rows=[observed('1','completed')];await store.recheck('A','1');assert(store.list('A').at(-1).confirmed);
});
test('late recheck does not resurrect evicted receipt or overwrite anotherRTU',async()=>{
 const held=deferred();const store=factory((path,method,body)=>method==='POST'?Promise.resolve(observed(body.commandId)):path==='/state'?Promise.resolve({}):held.promise);await store.send(plant,{action:'set_target'});const pending=store.recheck('A','1');for(let n=0;n<20;n++)await store.send(plant,{action:'set_target'});held.resolve([observed('1','completed')]);await pending;assert.equal(store.list('A').length,20);assert(!store.list('A').some(r=>r.commandId==='1'));assert.deepEqual(store.list('B'),[]);
});
test('late state refresh cannot replace a newer refresh and cannot erase rechecked status',async()=>{
 const first=deferred(),second=deferred(),states=[];let id=0,gets=0;const store=createCommandReceipts({uuid:()=>String(++id),onState:s=>states.push(s),request:(path,method,body)=>method==='POST'?Promise.resolve(observed(body.commandId)):path==='/state'?(++gets===1?first.promise:second.promise):Promise.resolve([observed('1','completed')])});const a=store.send(plant,{action:'set_target'});await tick();const b=store.send(plant,{action:'set_target'});await tick();await store.recheck('A','1');second.resolve({newer:true});await b;first.reject(Error());await a;assert.deepEqual(states,[{newer:true}]);assert.equal(store.list('A')[1].status,'completed');assert(store.list('A')[1].refreshWarning);
});
test('15s production request boundary includes stalled response body, HTTP ignores body,401auth preserved',async()=>{
 let aborted=false;await assert.rejects(requestCommandJson('/x','GET',undefined,{timeoutMs:15,fetcher:async(_,options)=>{options.signal.addEventListener('abort',()=>aborted=true);return {ok:true,status:200,json:()=>new Promise(()=>{})}}}),e=>e.receiptKind==='timeout');assert(aborted);
 let auth=0,read=false;await assert.rejects(requestCommandJson('/x','POST',{}, {onAuth:()=>auth++,fetcher:async()=>({ok:false,status:401,json:()=>{read=true;throw Error('secret')}})}),e=>e.message==='HTTP 401');assert.equal(auth,1);assert.equal(read,false);
 await assert.rejects(requestCommandJson('/x','GET',undefined,{fetcher:async()=>({ok:true,json:()=>{throw Error('secret body')}})}),e=>e.receiptKind==='parse'&&!e.message.includes('secret'));
});
