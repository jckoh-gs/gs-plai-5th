// Isolated real-broker proof for the shipped read-only VPP monitor.
import {harness,until} from './test-harness.js';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const h=await harness();let child,exit,ended=false;const seen=[];let buffered='';
try {
  const plant=await h.add(),other=await h.add();
  await until(()=>h.messages.some(m=>m.topic===`${h.prefix}/rtu/${plant.id}/status`&&m.body.online===true),'published online');
  child=spawn(process.execPath,['scripts/vpp-client.js'],{
    env:{...process.env,MQTT_URL:h.config.url,MQTT_PREFIX:h.prefix,RTU_ID:plant.id,VPP_REPORT_FILE:'',VPP_CONNECT_TIMEOUT_MS:'5000'},
    stdio:['ignore','pipe','pipe'],
  });
  exit=new Promise(resolve=>{child.once('exit',(code,signal)=>{ended=true;resolve({code,signal})});child.once('error',()=>{ended=true;resolve({code:null,signal:'spawn-error'})})});
  child.stdout.on('data',bytes=>{
    buffered+=bytes.toString();if(buffered.length>128000){child.kill('SIGKILL');return;}
    let end;while((end=buffered.indexOf('\n'))>=0){const line=buffered.slice(0,end);buffered=buffered.slice(end+1);try{const value=JSON.parse(line);if(value.kind==='status')seen.push(value);}catch{}}
  });
  child.stderr.resume();
  const online=await until(()=>seen.find(m=>m.rtuId===plant.id&&m.online===true),'monitor retained online',12000);
  assert.equal(online.status,null);assert.equal(online.kind,'status');
  const device=h.runtime.transport.devices.get(plant.id);
  device.client.options.reconnectPeriod=0;
  device.client.stream.destroy();
  await until(()=>h.messages.some(m=>m.topic===`${h.prefix}/rtu/${plant.id}/status`&&m.body.online===false),'actual RTU LWT');
  const offline=await until(()=>seen.find(m=>m.rtuId===plant.id&&m.online===false),'monitor actual LWT',12000);
  assert.equal(offline.status,null);assert.equal(offline.timestamp,null);
  assert.equal(h.runtime.transport.metrics(other.id).connected,true);
  assert(seen.every(m=>m.rtuId===plant.id));
  assert.equal(h.messages.filter(m=>/\/(?:setpoint|command)$/.test(m.topic)).length,0);
  child.kill('SIGTERM');
  const terminal=await Promise.race([exit,new Promise(resolve=>{const timer=setTimeout(()=>resolve(null),3000);timer.unref()})]);
  assert.deepEqual(terminal,{code:0,signal:null});
  console.log(JSON.stringify({result:'PASS',suite:'client-status-monitor',scope:'Isolated localhost broker/runtime/tempDB and unique topic prefix; no remote writes',checks:['late monitor sees retained online true','actual unexpected RTU disconnect produces offline false through LWT','command status remains separate and missing LWT timestamp stays null','other RTU stays connected and monitor remains RTU scoped','read-only monitor publishes no commands','monitor SIGTERM exits zero'],observed:[online,offline],terminal},null,2));
} finally {
  if(child&&!ended){child.kill('SIGTERM');await Promise.race([exit,new Promise(resolve=>setTimeout(resolve,2000))]);if(!ended){child.kill('SIGKILL');await exit;}}
  await h.close();
  // Retained status topics belong to the isolated harness prefix; no live RTUs are touched.
}
