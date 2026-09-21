import assert from 'node:assert/strict';import http from 'node:http';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomUUID} from 'node:crypto';
import {createRuntime} from '../server/index.js';import {createPlant} from '../server/model.js';
const dir=mkdtempSync(join(tmpdir(),'grid-sse-demo-'));const config={host:'127.0.0.1',port:0,token:'',dbPath:join(dir,'slow.sqlite'),seedDemo:false,env:{},telemetrySeconds:60,retentionDays:30};
let runtime=createRuntime(config),server,request,response;let sseResponse,writes=0;
try{
 const plant=createPlant({name:'100 generator slow reader',type:'wind',count:100,ratedKw:1000,csv:'timestamp,power_kw\n2026-01-01 00:00,1000\n2026-01-01 00:10,2000'});runtime.plants.set(plant.id,plant);runtime.store.savePlant(plant);
 server=await new Promise(r=>{const s=runtime.app.listen(0,'127.0.0.1',()=>r(s));});
 const count=()=>runtime.store.db.prepare('SELECT count(*) n FROM scada_frames').get().n;
 for(let i=0;i<20;i++)runtime.tick();assert.equal(count(),20);const quietFrames=count();
 server.prependListener('request',(req,res)=>{if(req.url==='/api/events'){sseResponse=res;const write=res.write.bind(res);res.write=(...args)=>{writes++;return write(...args);};}});
 response=await new Promise((resolve,reject)=>{request=http.get(`http://127.0.0.1:${server.address().port}/api/events`,res=>{res.pause();res.socket.pause();resolve(res);});request.on('error',reject);});assert.equal(response.statusCode,200);
 let ticks=0,blocked=false;for(;ticks<300;ticks++){runtime.tick();await new Promise(r=>setImmediate(r));if(sseResponse.writableNeedDrain){blocked=true;ticks++;break;}}
 assert(blocked,'Real paused HTTP socket must reach server backpressure');const before=count(),beforeWrites=writes;let skipped=0;
 for(let i=0;i<20;i++){const n=writes;runtime.tick();if(writes===n)skipped++;}
 assert.equal(count()-before,20);assert.equal(skipped,20);assert.equal(writes,beforeWrites);assert.equal(count(),quietFrames+ticks+20);assert.equal(runtime.plants.get(plant.id).simulationSeconds,count());
 const frames=runtime.store.db.prepare('SELECT body FROM scada_frames ORDER BY id').all().map(x=>JSON.parse(x.body));for(let i=1;i<frames.length;i++)assert.equal(frames[i].simulationSeconds-frames[i-1].simulationSeconds,1);
 console.log(JSON.stringify({result:'PASS',suite:'slow-real-SSE',generators:100,quietTicks:20,quietFrames,fillTicks:ticks,actualWritableNeedDrain:true,blockedTicks:20,skippedSnapshots:skipped,persistedFramesDuringBackpressure:20,continuousSimulationSeconds:true,scope:'Bounded explicit engine ticks with actual paused TCP client; not sustained realtime throughput benchmark'}));
}finally{response?.destroy();request?.destroy();if(server)await new Promise(r=>server.close(r));await runtime.stop();}
try{
 const cfg={...config,dbPath:join(dir,'demo.sqlite'),seedDemo:true,url:process.env.MQTT_URL||'mqtt://127.0.0.1:18883',prefix:'demo-review-'+randomUUID()};runtime=createRuntime(cfg);await runtime.start();
 const original=runtime.store.loadPlants().map(p=>({id:p.id,type:p.type,dataset:p.dataset})).sort((a,b)=>a.id.localeCompare(b.id));assert.equal(original.length,3);assert.deepEqual(original.map(p=>p.type).sort(),['hybrid','solar','wind']);await runtime.stop();
 runtime=createRuntime(cfg);await runtime.start();const after=runtime.store.loadPlants().map(p=>({id:p.id,type:p.type,dataset:p.dataset})).sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(after,original);assert.equal(runtime.store.db.prepare('SELECT count(*) n FROM plants').get().n,3);
 console.log(JSON.stringify({result:'PASS',suite:'demo-real-runtime-restart',firstPlants:3,secondPlants:3,originalIDsPreserved:true,allDatasetsDeepEqual:true,types:['hybrid','solar','wind']}));
}finally{await runtime.stop();rmSync(dir,{recursive:true,force:true});}
