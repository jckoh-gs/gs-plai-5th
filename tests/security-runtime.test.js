import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime} from '../server/index.js';
const config={dbPath:':memory:',seedDemo:false,host:'127.0.0.1',port:0,token:'test-token-only-abcdefghijkl',url:'mqtt://127.0.0.1:1',prefix:'security-test',telemetrySeconds:60,retentionDays:30};
test('runtime keeps tick/prune/shutdown alive when audit and storage both fail',async t=>{
 const intervals=[];const native=globalThis.setInterval;
 t.mock.method(globalThis,'setInterval',(fn,ms)=>{intervals.push({fn,ms});return native(()=>{},3600000);});
 t.mock.method(console,'error',()=>{});
 const runtime=createRuntime(config);runtime.transport.start=()=>{};runtime.transport.stop=async()=>{};
 const server=await runtime.start();
 try {
  runtime.store.audit=()=>{throw Error('secret storage error');};
  runtime.controller.tick=()=>{throw Error('disk full');};
  assert.doesNotThrow(()=>runtime.tick());
  runtime.store.prune=()=>{throw Error('disk full');};
  assert.doesNotThrow(()=>intervals.find(x=>x.ms===3600000).fn());
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
  assert.equal(response.status,200);assert.equal((await response.json()).status,'ok');
 }finally{await runtime.stop();}
 assert.equal(server.listening,false);
});
test('shutdown closes HTTP and SQLite even if transport stop rejects',async()=>{
 const runtime=createRuntime(config);runtime.transport.start=()=>{};runtime.transport.stop=async()=>{throw Error('transport stop failure');};
 const server=await runtime.start();
 await assert.rejects(runtime.stop(),/transport stop failure/);
 assert.equal(server.listening,false);assert.throws(()=>runtime.store.events(),/closed|not open/i);
});
test('unauthenticated health/config contain no configured credentials; protected state requires token',async()=>{
 const runtime=createRuntime(config);runtime.transport.start=()=>{};runtime.transport.stop=async()=>{};const server=await runtime.start();
 try {
  const base=`http://127.0.0.1:${server.address().port}`;
  const health=await (await fetch(`${base}/api/health`)).text();assert(!health.includes(config.token));assert(!health.includes(config.url));
  const response=await fetch(`${base}/api/state`);assert.equal(response.status,401);
  const allowed=await fetch(`${base}/api/state`,{headers:{Authorization:`Bearer ${config.token}`}});assert.equal(allowed.status,200);
 }finally{await runtime.stop();}
});
