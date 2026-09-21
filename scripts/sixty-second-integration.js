import assert from 'node:assert/strict';
import {harness,until} from './test-harness.js';
const h=await harness({telemetrySeconds:60});
try{
 const p=await h.add();
 const list=()=>h.messages.filter(m=>m.body.rtuId===p.id&&m.topic.endsWith('/telemetry'));
 await until(()=>list().length>=2,'two actual 60-second transmission windows',135000);
 const complete=list()[1].body;assert.equal(complete.sampleCount,60);assert.equal(complete.samples.length,60);
 for(let i=1;i<complete.samples.length;i++)assert.equal(complete.samples[i].simulationSeconds-complete.samples[i-1].simulationSeconds,1);
 console.log(JSON.stringify({result:'PASS',suite:'60-second-real-time',initialSampleCount:list()[0].body.sampleCount,completeWindowSamples:complete.sampleCount,first:complete.samples[0].timestamp,last:complete.samples.at(-1).timestamp,telemetrySeconds:60,virtualSpeed:1},null,2));
}finally{await h.close();}
