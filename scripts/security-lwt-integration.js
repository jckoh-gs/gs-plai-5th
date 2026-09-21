import {harness,until} from './test-harness.js';
import mqtt from 'mqtt';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const h=await harness();let observer;
try{
 const p=await h.add(),other=await h.add();
 await until(()=>h.messages.some(m=>m.topic===`${h.prefix}/rtu/${p.id}/status`&&m.body.online===true),'online');
 const d=h.runtime.transport.devices.get(p.id);d.client.options.reconnectPeriod=0;d.client.stream.destroy();
 await until(()=>h.messages.some(m=>m.topic===`${h.prefix}/rtu/${p.id}/status`&&m.body.online===false),'device LWT');
 assert.equal(h.runtime.transport.metrics(other.id).connected,true);
 observer=await mqtt.connectAsync(h.config.url,{clientId:'security-lwt-'+randomUUID(),reconnectPeriod:0});
 const retained=[];observer.on('message',(topic,bytes,packet)=>retained.push({topic,body:JSON.parse(bytes.toString()),retain:packet.retain}));
 await observer.subscribeAsync(`${h.prefix}/rtu/${p.id}/status`,{qos:1});await until(()=>retained.length,'retained device LWT');assert.equal(retained[0].retain,true);assert.deepEqual(retained[0].body,{rtuId:p.id,online:false});
 const gateway=h.runtime.transport.gatewayClient;gateway.options.reconnectPeriod=0;gateway.stream.destroy();
 await observer.subscribeAsync(`${h.prefix}/gateway/status`,{qos:1});await until(()=>retained.some(m=>m.topic===`${h.prefix}/gateway/status`&&m.body.online===false),'gateway LWT');
 assert.equal(h.runtime.transport.metrics(other.id).connected,true);
 console.log(JSON.stringify({result:'PASS',suite:'security-lwt',checks:['unexpected RTU disconnect publishes offline','late subscriber receives retained offline state','other RTU stays connected','gateway unexpected disconnect publishes offline']},null,2));
}finally{if(observer)await observer.endAsync(true);await h.close();}
