import mqtt from 'mqtt';
import {readFileSync,writeFileSync} from 'node:fs';
const url=process.env.MQTT_URL||'mqtt://127.0.0.1:18884';
const results={checkedAt:new Date().toISOString(),url,checks:[]};
await new Promise((resolve,reject)=>{
 const c=mqtt.connect(url,{reconnectPeriod:0,connectTimeout:5000});
 const t=setTimeout(()=>{c.end(true);reject(Error('Anonymous connection check timed out'));},7000);
 c.once('connect',()=>{clearTimeout(t);c.end(true);reject(Error('Anonymous MQTT accepted'));});
 c.once('error',e=>{clearTimeout(t);c.end(true);if(/authorized|authorised/i.test(e.message)){results.checks.push({name:'anonymous denied',passed:true});resolve();}else reject(e);});
});
const c=mqtt.connect(url,{username:'vpp-client',password:readFileSync('artifacts/private/deploy/client-password','utf8').trim(),reconnectPeriod:0,connectTimeout:5000,protocolVersion:5});
try{
 await new Promise((resolve,reject)=>{c.once('connect',resolve);c.once('error',reject);});
 await c.subscribeAsync('vpp/#',{qos:1});
 const seen=[];c.on('message',(topic,payload)=>seen.push(topic));
 const admin=mqtt.connect(url,{username:'grid',password:readFileSync('artifacts/private/deploy/mqtt-password','utf8').trim(),reconnectPeriod:0,connectTimeout:5000,protocolVersion:5});
 try{
  await new Promise((resolve,reject)=>{admin.once('connect',resolve);admin.once('error',reject);});
  const marker=Date.now().toString();const allowed=`vpp/rtu/security-${marker}/telemetry`;const forbidden=`vpp/private/security-${marker}`;
  const received=new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Allowed telemetry not received')),5000);c.on('message',topic=>{if(topic===allowed){clearTimeout(t);resolve();}});});
  await admin.publishAsync(forbidden,'{}',{qos:1});
  await admin.publishAsync(allowed,'{}',{qos:1});
  await received;
  if(seen.includes(forbidden))throw Error('Forbidden topic delivered to external client');
  results.checks.push({name:'external client forbidden message denied despite wildcard subscription',passed:true});
  results.checks.push({name:'external client telemetry delivered',passed:true});
 }finally{await admin.endAsync();}
}finally{await c.endAsync();}
writeFileSync('deploy/verification/mqtt-access.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
