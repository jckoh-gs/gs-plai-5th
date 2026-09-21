import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {EventEmitter} from 'node:events';
import {Store} from '../server/store.js';import {Transport} from '../server/transport.js';
test('per-device identity/auth overrides are separate from common defaults and LWT topics are exact',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'grid-device-security-'));const path=join(dir,'devices.json');
 for(const name of ['common-ca','device-ca','device-cert','device-key'])writeFileSync(join(dir,name),name+'-fixture');
 writeFileSync(path,JSON.stringify({a:{MQTT_CLIENT_ID:'dedicated-a',MQTT_USERNAME:'device-a-user',MQTT_PASSWORD:'device-a-secret',MQTT_CA:join(dir,'device-ca'),MQTT_CERT:join(dir,'device-cert'),MQTT_KEY:join(dir,'device-key')}}));
 const store=new Store(':memory:');const clients=[];const plants=new Map(['a','b'].map(id=>[id,{id,faults:{},replay:{}}]));
 class Client extends EventEmitter{constructor(options){super();this.options=options;this.connected=false;}end(force,cb){cb?.();}}
 const transport=new Transport(store,null,plants,{env:{MQTT_DEVICE_CONFIG:path,MQTT_CLIENT_ID:'common',MQTT_USERNAME:'common-user',MQTT_PASSWORD:'common-secret',MQTT_CA:join(dir,'common-ca')},prefix:'isolated/security',connect:(url,o)=>{const c=new Client(o);clients.push(c);return c;},telemetrySeconds:3600});
 try {
  transport.start();const a=transport.devices.get('a').client.options,b=transport.devices.get('b').client.options;
  assert.equal(a.clientId,'dedicated-a');assert.equal(a.username,'device-a-user');assert.equal(a.password,'device-a-secret');assert.equal(b.clientId,'common-b');assert.equal(b.password,'common-secret');assert.equal(a.rejectUnauthorized,true);assert.equal(a.ca.toString(),'device-ca-fixture');assert.equal(a.cert.toString(),'device-cert-fixture');assert.equal(a.key.toString(),'device-key-fixture');assert.equal(b.ca.toString(),'common-ca-fixture');
  assert.equal(a.will.topic,'isolated/security/rtu/a/status');assert.equal(a.will.qos,1);assert.equal(a.will.retain,true);assert.deepEqual(JSON.parse(a.will.payload),{rtuId:'a',online:false});
  assert.equal(clients[0].options.will.topic,'isolated/security/gateway/status');assert.deepEqual(JSON.parse(clients[0].options.will.payload),{online:false});
  const publicData=JSON.stringify([transport.metrics('a'),transport.metrics('b'),transport.gateway()]);assert(!publicData.includes('device-a-secret'));assert(!publicData.includes('common-secret'));
 }finally{await transport.stop();store.close();rmSync(dir,{recursive:true,force:true});}
});
