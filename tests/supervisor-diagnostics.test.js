import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ConnectionSupervisor} from '../scripts/connection-supervisor.mjs';
const secret='diagnostic-fixture-only-secret-not-production';
async function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'supervisor-diagnostics-')),directory=join(dir,'evidence'),tokenFile=join(dir,'credential');mkdirSync(directory);writeFileSync(tokenFile,secret);
 let change=null;const seen=[];
 const api=http.createServer((q,r)=>{
  seen.push(q.url);let value=q.url==='/api/health'?{status:'ok',version:'1.3.0',mqtt:{connected:true}}:q.url==='/api/config'?{version:'1.3.0',authRequired:true}:{version:'1.3.0',plants:[],gateway:{connected:true}};
  if(q.url==='/api/state')assert.equal(q.headers.authorization,'Bearer '+secret);
  if(change?.route===q.url){
   if(change.kind==='timeout')return;
   if(change.kind==='body-reset'){r.writeHead(200,{'Content-Type':'application/json'});r.write('{"sensitive":"'+secret);setTimeout(()=>r.destroy(),10);return;}
   if(change.kind==='status'){r.writeHead(503,{'Content-Type':'text/plain'});r.end(secret);return;}
   if(change.kind==='json'){r.end(secret+'not-json');return;}
   value=change.value;
  }
  r.setHeader('Content-Type','application/json');r.end(JSON.stringify(value));
 });
 const mqtt=net.createServer(s=>s.end());await new Promise(r=>api.listen(0,'127.0.0.1',r));await new Promise(r=>mqtt.listen(0,'127.0.0.1',r));
 const supervisor=new ConnectionSupervisor({directory,tokenFile,ports:{api:api.address().port,mqtt:mqtt.address().port},timeout:1000});
 const run={freeze:Date.now()+10000,deployment:{productVersion:'1.3.0'}};
 return{dir,directory,supervisor,run,seen,tokenFile,set:x=>change=x,async stopMqtt(){await new Promise(r=>mqtt.close(r));},async stopApi(){api.closeAllConnections();await new Promise(r=>api.close(r));},async close(){api.closeAllConnections();if(api.listening)await new Promise(r=>api.close(r));if(mqtt.listening)await new Promise(r=>mqtt.close(r));rmSync(dir,{recursive:true,force:true});}};
}
function assertSafe(f){
 f.supervisor.publish('disconnected','local_verification_failed',f.run);
 for(const name of ['status.json','events.jsonl']){const text=readFileSync(join(f.directory,name),'utf8');assert(!text.includes(secret));assert(!text.includes(f.tokenFile));assert(!text.includes('Bearer'));assert(!text.includes('not-json'));}
 const d=f.supervisor.lastLocalVerification;assert(Number.isFinite(d.durationMs)&&d.durationMs>=0);assert(Number.isFinite(Date.parse(d.checkedAt)));
 assert(Object.keys(d).every(k=>['checkedAt','result','phase','kind','durationMs','httpStatus'].includes(k)));
}
test('successful local proof records bounded categories and normal read sequence',async()=>{const f=await fixture();try{assert.equal(await f.supervisor.verifyLocal(f.run),true);assert.equal(f.supervisor.lastLocalVerification.kind,'verified');assert.equal(f.supervisor.lastLocalVerification.phase,'complete');assert.equal(f.supervisor.lastLocalVerification.result,'passed');assert.deepEqual(f.seen,['/api/health','/api/config','/api/state']);assertSafe(f);}finally{await f.close();}});
for(const c of [
 {route:'/api/health',value:{status:'bad',secret},phase:'health',kind:'health_not_ok'},
 {route:'/api/health',value:{status:'ok',version:'other',mqtt:{connected:true}},phase:'health',kind:'version_mismatch'},
 {route:'/api/health',value:{status:'ok',version:'1.3.0',mqtt:{connected:false}},phase:'health',kind:'broker_disconnected'},
 {route:'/api/config',value:{version:'other',authRequired:true},phase:'config',kind:'version_mismatch'},
 {route:'/api/config',value:{version:'1.3.0',authRequired:false},phase:'config',kind:'authentication_not_required'},
 {route:'/api/state',value:{version:'other',plants:[],gateway:{connected:true}},phase:'state',kind:'version_mismatch'},
 {route:'/api/state',value:{version:'1.3.0',plants:null,gateway:{connected:true}},phase:'state',kind:'invalid_state'},
 {route:'/api/state',value:{version:'1.3.0',plants:[],gateway:{connected:false}},phase:'state',kind:'broker_disconnected'},
 {route:'/api/state',kind:'status',expected:'http_status',phase:'state'},
 {route:'/api/config',kind:'json',expected:'invalid_json',phase:'config'},
 {route:'/api/state',kind:'timeout',expected:'timeout',phase:'state'}
])test('local diagnosis '+c.phase+' '+(c.expected||c.kind)+' does not publish raw data',async()=>{const f=await fixture();try{f.set(c);assert.equal(await f.supervisor.verifyLocal(f.run),false);const d=f.supervisor.lastLocalVerification;assert.equal(d.phase,c.phase);assert.equal(d.kind,c.expected||c.kind);assert.equal(d.result,'failed');if(c.kind==='status')assert.equal(d.httpStatus,503);assertSafe(f);}finally{await f.close();}});
test('interrupted HTTP response body is a transport failure, not invalid JSON',async()=>{const f=await fixture();try{f.set({route:'/api/state',kind:'body-reset'});assert.equal(await f.supervisor.verifyLocal(f.run),false);assert.equal(f.supervisor.lastLocalVerification.phase,'state');assert(['connection_closed','connection_reset','request_failed'].includes(f.supervisor.lastLocalVerification.kind));assertSafe(f);}finally{await f.close();}});
test('credential, TCP and HTTP listener failures have distinct sanitized phases',async()=>{const f=await fixture();try{rmSync(f.tokenFile);assert.equal(await f.supervisor.verifyLocal(f.run),false);assert.equal(f.supervisor.lastLocalVerification.kind,'credential_unavailable');assert.equal(f.supervisor.lastLocalVerification.phase,'credential_file');assertSafe(f);writeFileSync(f.tokenFile,'short');assert.equal(await f.supervisor.verifyLocal(f.run),false);assert.equal(f.supervisor.lastLocalVerification.kind,'credential_invalid');writeFileSync(f.tokenFile,secret);await f.stopMqtt();assert.equal(await f.supervisor.verifyLocal(f.run),false);assert.equal(f.supervisor.lastLocalVerification.kind,'tcp_unreachable');assert.equal(f.supervisor.lastLocalVerification.phase,'mqtt_tcp');await f.stopApi();assert.equal(await f.supervisor.verifyLocal(f.run),false);assert(['connection_refused','connection_reset','connection_closed'].includes(f.supervisor.lastLocalVerification.kind));assert.equal(f.supervisor.lastLocalVerification.phase,'health');const unused=net.createServer();await new Promise(r=>unused.listen(0,'127.0.0.1',r));f.supervisor.ports.api=unused.address().port;await new Promise(r=>unused.close(r));assert.equal(await f.supervisor.verifyLocal(f.run),false);assert.equal(f.supervisor.lastLocalVerification.kind,'connection_refused');assertSafe(f);}finally{await f.close();}});
test('changed failure category is recorded while equivalent repeated failures stay deduplicated',async()=>{const f=await fixture();try{f.set({route:'/api/config',kind:'json'});await f.supervisor.verifyLocal(f.run);assertSafe(f);await f.supervisor.verifyLocal(f.run);assertSafe(f);let events=readFileSync(join(f.directory,'events.jsonl'),'utf8').trim().split('\n');assert.equal(events.length,1);f.set({route:'/api/state',kind:'status'});await f.supervisor.verifyLocal(f.run);assertSafe(f);events=readFileSync(join(f.directory,'events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert.equal(events.length,2);assert.equal(events[0].lastLocalVerification.kind,'invalid_json');assert.equal(events[1].lastLocalVerification.kind,'http_status');f.set(null);assert.equal(await f.supervisor.verifyLocal(f.run),true);assert.equal(f.supervisor.lastLocalVerification.kind,'verified');assert.equal(f.supervisor.lastLocalVerification.httpStatus,undefined);}finally{await f.close();}});
