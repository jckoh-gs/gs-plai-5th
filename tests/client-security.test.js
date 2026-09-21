import {test} from 'node:test';import assert from 'node:assert/strict';
import {readMessage,safeText} from '../scripts/client-message.js';
const options={prefix:'vpp',rtu:'a'},topic='vpp/rtu/a/ack';
const valid={rtuId:'a',commandId:'c',status:'completed',actualKw:10,errorKw:0};
const read=(body,extra={})=>readMessage(topic,Buffer.from(JSON.stringify(body)),{...options,...extra});
test('malformed, null, array, oversized, retained and cross-RTU statuses rejected',()=>{
 for(const value of [null,[],3,'x',{}, {...valid,rtuId:'b'}, {...valid,actualKw:'10'},{...valid,status:'fake'}])assert.equal(read(value),null);
 assert.equal(read(valid,{retained:true}),null);
 assert.equal(readMessage(topic,Buffer.from('{'),options),null);
 assert.equal(readMessage(topic,Buffer.alloc(120001),options),null);
 assert.equal(readMessage('vpp/rtu/b/ack',Buffer.from(JSON.stringify(valid)),options),null);
 assert.equal(read(valid).actualKw,10);
});
test('only allowlisted fields survive; raw credentials and controls are removed from reason',()=>{
 const env={MQTT_PASSWORD:'test-secret',API_TOKEN:'abcdef123456'};
 const m=read({...valid,reason:'mqtt://u:p@broker token=aaa test-secret abcdef123456\u001b[31m',password:'not-propagated',request:{token:'not-propagated'}},{env});
 assert.equal(m.password,undefined);assert.equal(m.request,undefined);
 assert(!m.reason.includes('test-secret'));assert(!m.reason.includes('abcdef123456'));assert(!m.reason.includes('u:p'));assert(!m.reason.includes('\u001b'));
 assert.equal(safeText('a'.repeat(10000),{},50).length,50);
});
test('RTU status preserves strict online booleans including retained online and offline',()=>{
 const readStatus=(body,extra={})=>readMessage('vpp/rtu/a/status',Buffer.from(JSON.stringify(body)),{...options,...extra});
 for(const retained of [false,true])for(const online of [false,true]){
  const result=readStatus({rtuId:'a',online},{retained});
  assert.equal(result.online,online);assert.equal(result.kind,'status');assert.equal(result.status,null);
 }
 for(const online of [null,0,1,'true','false',[],{}])assert.equal(readStatus({rtuId:'a',online},{retained:true}).online,null);
 assert.equal(readStatus({rtuId:'a'},{retained:true}).online,null);
 assert.equal(readStatus({rtuId:'b',online:true},{retained:true}),null);
 assert.equal(readMessage('vpp/rtu/b/status',Buffer.from(JSON.stringify({rtuId:'b',online:true})),options),null);
});
test('online cannot change ack or command-status interpretation or retained-message boundaries',()=>{
 for(const kind of ['ack','command-status']){
  const messageTopic=`vpp/rtu/a/${kind}`;
  const bytes=Buffer.from(JSON.stringify({...valid,online:true}));
  const result=readMessage(messageTopic,bytes,options);
  assert.equal(result.online,null);assert.equal(result.status,'completed');assert.equal(result.actualKw,10);assert.equal(result.errorKw,0);
  assert.equal(readMessage(messageTopic,bytes,{...options,retained:true}),null);
 }
 assert.equal(readMessage('vpp/rtu/a/telemetry',Buffer.from(JSON.stringify({rtuId:'a',online:true,powerKw:10})),options).online,null);
});
