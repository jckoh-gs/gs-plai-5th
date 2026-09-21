import express from 'express';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Store} from './store.js';
import {Controller} from './control.js';
import {Transport} from './transport.js';
import {createPlant,publicPlant,stepPlant,updateGenerator,updateReplay,updateWeather,updateFaults,parseIrradianceCSV} from './model.js';
import {refreshWeather} from './weather.js';
import {readConfig,authorized,redact} from './config.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {version}=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
export function createRuntime(config=readConfig()) {
  const store=new Store(config.dbPath), plants=new Map(store.loadPlants().map(p=>[p.id,p]));
  const controller=new Controller(store,plants);
  const transport=new Transport(store,controller,plants,config);
  const app=express(), streams=new Set(), timers=[];
  let closing=false,server;
  const safeAudit=(level,message)=>{try{store.audit(level,message);}catch{console.error('Audit persistence unavailable');}};
  app.disable('x-powered-by');
  app.use((req,res,next)=>{
    res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"});
    if(req.path.startsWith('/api'))res.set('Cache-Control','no-store');
    next();
  });
  app.get('/api/health',(req,res)=>res.json({status:closing?'stopping':'ok',version,mqtt:transport.gateway()}));
  app.get('/api/config',(req,res)=>res.json({authRequired:Boolean(config.token),version}));
  app.use('/api',(req,res,next)=>{
    if(!authorized(req.headers.authorization,config.token))return res.status(401).json({error:'관리 토큰 인증이 필요합니다.'});
    if(!config.token) {
      // Prevent drive-by browser requests and DNS rebinding against an unauthenticated local API.
      const host=req.headers.host?.split(':')[0];
      if(!['127.0.0.1','localhost','['].includes(host))return res.status(403).json({error:'Local API Host is not allowed'});
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&!/^http:\/\/(127\.0\.0\.1|localhost):5173$/.test(req.headers.origin))return res.status(403).json({error:'Cross-origin API access denied'});
    }
    next();
  });
  app.use(express.json({limit:'20mb',strict:true}));
  const getPlant=id=>{const p=plants.get(id);if(!p){const e=Error('RTU를 찾을 수 없습니다.');e.status=404;throw e;}return p;};
  const publishPlant=p=>{const m=transport.metrics(p.id);return {...publicPlant(p),metrics:m,rtuMetrics:m,connection:{connected:m.connected,clientId:m.clientId},outbox:store.queueStats(p.id),controlRuns:controller.list(p.id).slice(0,20)};};
  const state=()=>({version,contractVersion:2,mqtt:transport.gateway(),gateway:transport.gateway(),plants:[...plants.values()].map(publishPlant),events:store.events()});
  const mutate=(id,fn,{cancel=false,audit}={})=>{
    const p=structuredClone(getPlant(id));fn(p);
    store.transaction(()=>{if(cancel)controller.cancelPlant(id,'모델 설정 변경');store.savePlant(p);if(audit)store.audit('INFO',audit);});
    plants.set(id,p);transport.sync();return p;
  };
  function seed(){
    if(plants.size||!config.seedDemo)return;
    const definitions=[['wind','대관령 바람 정원',6,3000,37.69,128.75,100],['solar','신안 햇빛 정원',8,500,34.83,126.10,165],['hybrid','제주 에너지 정원',8,1500,33.36,126.26,185]];
    store.transaction(()=>{for(const [type,name,count,ratedKw,lat,lon,station] of definitions){const p=createPlant({type,name,count,ratedKw,lat,lon,station,csv:readFileSync(resolve(root,`samples/${type}.csv`),'utf8')});store.savePlant(p);plants.set(p.id,p);}store.audit('INFO','합성 CSV 데모 단지 3개 생성');});
  }
  async function weather(id,explicit=false){
    const signature=p=>JSON.stringify([p.runId,p.station,p.mode,p.weather,p.weatherSource,p.replay.freezeLiveWeather]);
    const original=getPlant(id), before=signature(original),copy=structuredClone(original);await refreshWeather(copy,{explicit});
    const p=getPlant(id);
    // Configuration changes and scenario restore while an observation is in flight win.
    if(signature(p)!==before)return publishPlant(p);
    for(const k of ['weather','weatherSource','weatherObservedAt','weatherError','mode'])if(copy[k]!==undefined)p[k]=copy[k];
    if(explicit)p.replay.freezeLiveWeather=false;
    store.savePlant(p);return publishPlant(p);
  }
  app.get('/api/state',(req,res)=>res.json(state()));
  app.get('/api/events',(req,res)=>{
    res.set({'Content-Type':'text/event-stream','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();
    res.write(`data: ${JSON.stringify(state())}\n\n`);streams.add(res);req.on('close',()=>streams.delete(res));
  });
  app.post('/api/plants',(req,res)=>{const p=createPlant(req.body);store.transaction(()=>{store.savePlant(p);store.audit('INFO',`RTU 등록: ${p.name}`);});plants.set(p.id,p);transport.sync();res.status(201).json(publishPlant(p));void weather(p.id).catch(()=>{});});
  app.post('/api/plants/:id/commands',(req,res)=>{getPlant(req.params.id);const started=Date.now(),result=controller.submit(req.params.id,req.body,'REST');transport.recordCommand(result,started);res.json(result);});
  app.get('/api/plants/:id/commands',(req,res)=>{getPlant(req.params.id);res.json(controller.list(req.params.id));});
  app.patch('/api/plants/:id/weather',(req,res)=>res.json(publishPlant(mutate(req.params.id,p=>updateWeather(p,req.body)))));
  app.post('/api/plants/:id/weather/refresh',async(req,res)=>res.json(await weather(req.params.id,true)));
  app.post('/api/plants/:id/replay',(req,res)=>res.json(publishPlant(mutate(req.params.id,p=>updateReplay(p,req.body)))));
  app.patch('/api/plants/:id/faults',(req,res)=>res.json(publishPlant(mutate(req.params.id,p=>updateFaults(p,req.body),{audit:`RTU ${req.params.id} 장애 설정 변경`}))));
  app.patch('/api/plants/:id/generators/:generatorId',(req,res)=>res.json(publishPlant(mutate(req.params.id,p=>updateGenerator(p,req.params.generatorId,req.body),{cancel:true,audit:`RTU ${req.params.id} 발전기 모델 변경`}))));
  app.patch('/api/plants/:id/station',(req,res)=>res.json(publishPlant(mutate(req.params.id,p=>{const n=req.body.station;if(!Number.isInteger(n)||n<1||n>9999)throw Error('station: 1~9999 정수');p.station=n;p.weatherObservedAt=null;p.weatherError=null;}))));
  app.post('/api/plants/:id/irradiance',(req,res)=>{const p=mutate(req.params.id,p=>{if(req.body.csv!==null&&typeof req.body.csv!=='string')throw Error('csv: 문자열 또는 null');p.irradianceDataset=req.body.csv===null?null:parseIrradianceCSV(req.body.csv);});res.json({rows:p.irradianceDataset?.rows.length||0});});
  app.get('/api/plants/:id/samples',(req,res)=>{getPlant(req.params.id);res.json(store.samples(req.params.id));});
  app.get('/api/plants/:id/scada',(req,res)=>{getPlant(req.params.id);res.json(store.frames(req.params.id));});
  app.get('/api/scenarios',(req,res)=>res.json(store.scenarios().map(({snapshot,...s})=>s)));
  app.post('/api/scenarios',(req,res)=>{
    const {plantId}=req.body,name=req.body.name?.trim();if(typeof name!=='string'||name.length<1||name.length>80)throw Error('시나리오 이름: 1~80자');
    const snapshot=structuredClone(getPlant(plantId));snapshot.history=[];delete snapshot.telemetryBuffer;
    const s={id:randomUUID(),name,plantId,createdAt:new Date().toISOString(),snapshot};store.saveScenario(s);store.audit('INFO',`시나리오 저장: ${name}`);res.status(201).json({id:s.id,name:s.name});
  });
  const getScenario=id=>{const s=store.getScenario(id);if(!s){const e=Error('시나리오를 찾을 수 없습니다.');e.status=404;throw e;}return s;};
  app.post('/api/scenarios/:id/run',(req,res)=>{
    const s=getScenario(req.params.id);getPlant(s.plantId);const p=structuredClone(s.snapshot);p.id=s.plantId;p.runId=randomUUID();p.history=[];p.replay.freezeLiveWeather=true;
    store.transaction(()=>{controller.cancelPlant(p.id,'시나리오 복원');store.savePlant(p);store.audit('INFO',`시나리오 복원: ${s.name}`);});plants.set(p.id,p);transport.sync();res.json(publishPlant(p));
  });
  app.get('/api/scenarios/:id/export',(req,res)=>{const s=getScenario(req.params.id);res.attachment(`scenario-${s.id}.json`).json({schemaVersion:1,name:s.name,snapshot:s.snapshot});});
  const sample=(req,res)=>{const type=req.params.type?.replace(/\.csv$/,'');if(!['wind','solar','hybrid'].includes(type))return res.status(404).json({error:'샘플 없음'});res.download(resolve(root,`samples/${type}.csv`));};
  app.get('/api/samples/:type',sample);app.get('/samples/:type',sample);
  app.get('/api/guide',(req,res)=>res.download(resolve(root,'docs/protocol.md')));
  app.use('/api',(req,res)=>res.status(404).json({error:'API 경로 없음'}));
  if(existsSync(resolve(root,'dist')))app.use(express.static(resolve(root,'dist'),{index:'index.html'}));
  app.use((error,req,res,next)=>{if(res.headersSent)return next(error);const status=error.status||400;res.status(status).json({error:status===413?'요청 크기는 20MB 이하여야 합니다.':redact(error.message)});});
  function tick(){
    if(closing)return;
    try {
      controller.tick();
      for(const [id,original] of plants){
        if(original.replay.paused)continue;
        const p=structuredClone(original),frames=[];
        store.transaction(()=>{for(let n=0;n<p.replay.speed;n++){const frame=stepPlant(p);if(!p.faults.sensorFreeze){store.addFrame(p,frame);frames.push(frame);}}store.savePlant(p);});
        plants.set(id,p);for(const frame of frames)transport.collected(id,frame);
      }
      controller.tick();
      if(streams.size){const message=`data: ${JSON.stringify(state())}\n\n`;for(const res of streams)if(!res.writableNeedDrain)res.write(message);}
    } catch(e){safeAudit('ERROR','엔진 저장 주기 실패; 영속 저장소 상태 확인 필요');}
  }
  async function start(){seed();transport.start();server=await new Promise((resolveServer,reject)=>{const s=app.listen(config.port,config.host,()=>resolveServer(s));s.once('error',reject);});timers.push(setInterval(tick,1000),setInterval(()=>{try{store.prune(config.retentionDays);}catch{safeAudit('ERROR','보존기간 정리 실패');}},3600000),setInterval(()=>{for(const p of plants.values())if(!p.replay.freezeLiveWeather)void weather(p.id).catch(()=>{});},1800000));for(const p of plants.values())void weather(p.id).catch(()=>{});safeAudit('INFO',`GRID ${version} 시작`);return server;}
  async function stop(){if(closing)return;closing=true;timers.forEach(clearInterval);for(const res of streams)res.end();streams.clear();try{await transport.stop();}finally{if(server)await new Promise(r=>server.close(r));safeAudit('INFO','정상 종료');store.close();}}
  return {app,store,plants,controller,transport,start,stop,tick,state};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{const runtime=createRuntime();await runtime.start();console.log(`GRID listening on ${readConfig().host}:${readConfig().port}`);let stopped=false;const shutdown=async()=>{if(stopped)return;stopped=true;await runtime.stop();};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);}catch(e){console.error(redact(e.message));process.exitCode=1;}
}
