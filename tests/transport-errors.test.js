import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Store} from '../server/store.js';
import {Transport} from '../server/transport.js';
class Client extends EventEmitter {
 constructor(){super();this.connected=true;this.sent=[];}
 subscribe(topics,options,cb){cb();}
 publish(topic,body,options,cb){this.sent.push({topic,cb});}
 end(force,cb){this.connected=false;cb?.();}
}
const wait=()=>new Promise(resolve=>setTimeout(resolve,20));
function fixture(){
 const store=new Store(':memory:');const clients=[];
 const plants=new Map([['a',{id:'a',faults:{},faultRngState:42,replay:{}}]]);
 const transport=new Transport(store,{submit(){throw Error('password=do-not-leak');}},plants,{env:{},telemetrySeconds:3600,connect(){const c=new Client();clients.push(c);return c;}});
 transport.start();store.enqueue('a','telemetry',{sampleCount:1});
 return {store,transport,clients,device:transport.devices.get('a'),async close(){for(const c of clients)c.connected=false;await transport.stop();store.close();}};
}
test('storage failure during pump keeps row retryable and other event errors never escape',async()=>{
 const f=fixture();try {
  const original=f.store.attempt;f.store.attempt=()=>{throw Error('storage unavailable');};
  assert.doesNotThrow(()=>f.transport.pump());assert.equal(f.device.inflight,null);assert.ok(f.store.pending('a'));
  assert.doesNotThrow(()=>f.device.client.emit('message','vpp/rtu/a/command',Buffer.from('{}'),{}));
  const save=f.store.saveMetrics;f.store.saveMetrics=()=>{throw Error('storage unavailable');};
  f.store.audit=()=>{throw Error('audit also unavailable');};
  assert.doesNotThrow(()=>f.device.client.emit('error',Error('secret')));
  assert.equal(f.device.metrics.lastError,'Transport operation failed; queued data retained');
  f.store.saveMetrics=save;f.store.attempt=original;f.device.retryAt=0;f.transport.pump();await wait();
  f.device.client.sent.find(x=>x.topic.endsWith('/telemetry')).cb();assert.equal(f.store.pending('a'),null);
 }finally{await f.close();}
});
test('delayed storage failure and PUBACK ack failure retain original queue row for retry',async()=>{
 const f=fixture();try {
  const body=f.store.pending('a').body;const save=f.store.savePlant;
  f.store.savePlant=()=>{throw Error('disk full');};f.transport.pump();await wait();
  assert.equal(f.device.inflight,null);assert.equal(f.store.pending('a').body,body);
  f.store.savePlant=save;f.device.retryAt=0;f.transport.pump();await wait();
  const ack=f.store.ack;f.store.ack=()=>{throw Error('disk full');};
  assert.doesNotThrow(()=>f.device.client.sent.find(x=>x.topic.endsWith('/telemetry')).cb());
  assert.equal(f.store.pending('a').body,body);assert.equal(f.device.metrics.telemetryConfirmed,0);
  f.store.ack=ack;f.device.retryAt=0;f.transport.pump();await wait();
  f.device.client.sent.filter(x=>x.topic.endsWith('/telemetry')).at(-1).cb();assert.equal(f.store.pending('a'),null);
 }finally{await f.close();}
});
