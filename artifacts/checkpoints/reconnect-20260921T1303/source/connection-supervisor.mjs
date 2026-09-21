import {readFileSync,writeFileSync,renameSync,mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {execFile,execFileSync,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import net from 'node:net';
const exec=promisify(execFile),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const CONTEXT='charles-k3s',NAMESPACE='gs-plai-5h';
export function processIdentity(pid){try{return execFileSync('ps',['-p',String(pid),'-o','lstart='],{encoding:'utf8',timeout:1000}).trim()||null;}catch{return null;}}
function alive(pid){try{process.kill(pid,0);return true;}catch(e){return e.code==='EPERM';}}
function atomic(path,data){const tmp=path+'.'+randomUUID()+'.tmp';writeFileSync(tmp,JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});renameSync(tmp,path);}
export function acquireLock(directory){
 mkdirSync(directory,{recursive:true,mode:0o700});const path=resolve(directory,'supervisor.lock'),owner={pid:process.pid,identity:processIdentity(process.pid),nonce:randomUUID()};if(!owner.identity)throw Error('process_identity_unavailable');
 for(let attempt=0;attempt<3;attempt++){
  try{mkdirSync(path,{mode:0o700});atomic(resolve(path,'owner.json'),owner);return()=>{try{if(JSON.parse(readFileSync(resolve(path,'owner.json'))).nonce===owner.nonce)rmSync(path,{recursive:true});}catch{}};}
  catch(e){if(e.code!=='EEXIST')throw e;let prior;try{prior=JSON.parse(readFileSync(resolve(path,'owner.json')));}catch{throw Error('singleton_lock_incomplete');}
   if(!Number.isInteger(prior.pid)||prior.pid<1||!prior.identity)throw Error('singleton_lock_invalid');
   const identity=processIdentity(prior.pid);if(alive(prior.pid)&&(!identity||identity===prior.identity))throw Error('supervisor_already_running');
   const reclaim=path+'.reclaim';try{mkdirSync(reclaim,{mode:0o700});}catch{throw Error('singleton_reclaim_busy');}try{let current;try{current=JSON.parse(readFileSync(resolve(path,'owner.json')));}catch(e){if(e.code==='ENOENT')continue;throw Error('singleton_lock_invalid');}const currentIdentity=processIdentity(current.pid);if(alive(current.pid)&&(!currentIdentity||currentIdentity===current.identity))throw Error('supervisor_already_running');const stale=path+'.stale.'+randomUUID();renameSync(path,stale);rmSync(stale,{recursive:true});}finally{rmSync(reclaim,{recursive:true});}
  }
 }throw Error('singleton_lock_busy');
}
export function portFree(port){return new Promise(resolveFree=>{const s=net.createServer();s.once('error',()=>resolveFree(false));s.listen(port,'127.0.0.1',()=>s.close(()=>resolveFree(true)));});}
function tcp(port,timeout){return new Promise(resolveTCP=>{const s=net.connect({host:'127.0.0.1',port});let done=false;const finish=v=>{if(done)return;done=true;s.destroy();resolveTCP(v);};s.setTimeout(timeout,()=>finish(false));s.once('error',()=>finish(false));s.once('connect',()=>finish(true));});}
function failure(code){const e=Error(code);e.code=code;return e;}
export class ConnectionSupervisor{
 constructor({runFile='docs/operations/run.json',tokenFile='artifacts/private/deploy/api-token',directory='artifacts/operations',kubectl='kubectl',ports={api:3104,mqtt:18884},baseDelay=1000,maxDelay=30000,healthyDelay=10000,timeout=5000,now=Date.now}={}){
  for(const p of Object.values(ports))if(!Number.isInteger(p)||p<1||p>65535)throw Error('invalid_port');
  Object.assign(this,{runFile,tokenFile,directory,kubectl,ports,baseDelay,maxDelay,healthyDelay,timeout,now});this.failures=0;this.child=null;this.closed=false;this.release=null;this.lastKey=null;this.pendingRun=null;this.verifiedImage=null;this.identity=processIdentity(process.pid);this.outageAt=null;this.hasBeenReady=false;this.reconnectedAt=null;this.forwardStartedAt=null;this.eventPath=resolve(directory,'events.jsonl');
 }
 start(){this.release=acquireLock(this.directory);return this;}
 readRun(){const r=JSON.parse(readFileSync(this.runFile,'utf8'));if(r.context!==CONTEXT||r.namespace!==NAMESPACE||r.deployment?.context!==CONTEXT||r.deployment?.namespace!==NAMESPACE||r.deployment?.name!=='grid')throw failure('run_target_mismatch');if(!/^127\.0\.0\.1:15050\/grid@sha256:[a-f0-9]{64}$/.test(r.deployment.appImage)||!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(r.deployment.productVersion))throw failure('run_expectation_invalid');const freeze=Date.parse(r.freezeAt),deadline=Date.parse(r.deadlineAt);if(!Number.isFinite(freeze)||!Number.isFinite(deadline)||freeze>deadline)throw failure('run_deadline_invalid');return {...r,freeze,deadline};}
 publish(state,reason,run,extra={}){const at=this.now();if(state==='ready')this.hasBeenReady=true;if(['disconnected','blocked'].includes(state)&&!this.outageAt)this.outageAt=new Date(at).toISOString();if(state==='ready'&&this.outageAt){this.lastOutageAt=this.outageAt;this.reconnectedAt=new Date(at).toISOString();this.outageAt=null;}const value={schemaVersion:1,at:new Date(at).toISOString(),pid:process.pid,processIdentity:this.identity,state,reason,outageAt:this.outageAt,lastOutageAt:this.lastOutageAt||null,reconnectedAt:this.reconnectedAt,readOnly:true,commandsAllowed:!!run&&at<run.freeze,context:CONTEXT,namespace:NAMESPACE,expectedImage:run?.deployment.appImage||null,expectedVersion:run?.deployment.productVersion||null,freezeAt:run?.freezeAt||null,deadlineAt:run?.deadlineAt||null,failures:this.failures,forwardOwned:!!this.child,...extra};atomic(resolve(this.directory,'status.json'),value);const key=JSON.stringify([state,reason,value.expectedImage,value.commandsAllowed]);if(key!==this.lastKey){writeFileSync(this.eventPath,JSON.stringify(value)+'\n',{flag:'a',mode:0o600});this.lastKey=key;}return value;}
 async verifyRemote(run){const args=['--context',CONTEXT,'--namespace',NAMESPACE,'--request-timeout=5s'];let deployment,pods;try{const results=await Promise.all([exec(this.kubectl,[...args,'get','deployment','grid','-o','json'],{timeout:this.timeout+1000,maxBuffer:2*1024*1024}),exec(this.kubectl,[...args,'get','pods','-l','app=grid','-o','json'],{timeout:this.timeout+1000,maxBuffer:2*1024*1024})]);deployment=JSON.parse(results[0].stdout);pods=JSON.parse(results[1].stdout);}catch{throw failure('kubernetes_unavailable');}
  const expected=run.deployment.appImage;if(deployment.spec?.template?.spec?.containers?.find(c=>c.name==='app')?.image!==expected)throw failure('remote_image_mismatch');const active=pods.items?.filter(p=>!p.metadata?.deletionTimestamp)||[];if(active.length!==1)throw failure('remote_not_ready');const app=active[0].status?.containerStatuses?.find(c=>c.name==='app');if(!app?.ready||!active[0].status.containerStatuses.every(c=>c.ready))throw failure('remote_not_ready');if(app.imageID!==expected)throw failure('remote_image_mismatch');this.verifiedImage=expected;return active[0].metadata.uid;
 }
 async verifyLocal(run){const base=`http://127.0.0.1:${this.ports.api}`;try{
  const get=async(path,headers={})=>{const r=await fetch(base+path,{headers,signal:AbortSignal.timeout(this.timeout),redirect:'error'});if(!r.ok)throw Error();return r.json();};
  const health=await get('/api/health'),config=await get('/api/config');if(health.status!=='ok'||health.version!==run.deployment.productVersion||!health.mqtt?.connected||config.version!==run.deployment.productVersion||config.authRequired!==true)throw Error();
  const token=readFileSync(this.tokenFile,'utf8').trim();if(token.length<24)throw Error();const state=await get('/api/state',{Authorization:`Bearer ${token}`});if(state.version!==run.deployment.productVersion||!Array.isArray(state.plants)||!state.gateway?.connected)throw Error();if(!await tcp(this.ports.mqtt,this.timeout))throw Error();return true;
 }catch{return false;}}
 async stopOwned(){const c=this.child;this.child=null;if(!c||c.exitCode!==null||c.signalCode!==null)return;c.kill('SIGTERM');await Promise.race([new Promise(r=>c.once('exit',r)),sleep(1000)]);if(c.exitCode===null&&c.signalCode===null)c.kill('SIGKILL');}
 spawnForward(){const c=spawn(this.kubectl,['--context',CONTEXT,'--namespace',NAMESPACE,'port-forward','--address=127.0.0.1','deployment/grid',`${this.ports.api}:3001`,`${this.ports.mqtt}:1883`],{stdio:'ignore'});this.child=c;this.forwardStartedAt=this.now();c.once('error',()=>{if(this.child===c)this.child=null;});c.once('exit',()=>{if(this.child===c)this.child=null;});}
 async tick(){let run;try{run=this.readRun();}catch{this.failures++;await this.stopOwned();if(!this.pendingRun||this.now()>=this.pendingRun.deadline)this.closed=true;return this.publish('blocked','invalid_run_configuration',this.pendingRun,{retryInMs:this.closed?0:this.delay()});}this.pendingRun=run;if(this.now()>=run.deadline){await this.stopOwned();this.closed=true;return this.publish('stopped','deadline_reached',run,{retryInMs:0});}
  try{const podUID=await this.verifyRemote(run);if(this.now()>=run.deadline){await this.stopOwned();this.closed=true;return this.publish('stopped','deadline_reached',run,{retryInMs:0});}const localReady=await this.verifyLocal(run);if(this.now()>=run.deadline){await this.stopOwned();this.closed=true;return this.publish('stopped','deadline_reached',run,{retryInMs:0});}if(localReady){this.failures=0;return this.publish('ready','verified',run,{podUID,retryInMs:this.healthyDelay});}
   if(this.hasBeenReady&&!this.outageAt)this.publish('disconnected','local_verification_failed',run,{podUID,retryInMs:this.delay()});
   if(this.child&&this.now()-this.forwardStartedAt<15000)return this.publish('connecting','forward_starting',run,{podUID,retryInMs:this.delay()});if(this.child)await this.stopOwned();const free=await Promise.all([portFree(this.ports.api),portFree(this.ports.mqtt)]);if(!free.every(Boolean))throw failure('ports_occupied_unverified');if(this.now()>=run.deadline){this.closed=true;return this.publish('stopped','deadline_reached',run,{retryInMs:0});}this.spawnForward();this.failures++;return this.publish('connecting','forward_started',run,{podUID,retryInMs:this.delay()});
  }catch(e){this.verifiedImage=null;await this.stopOwned();this.failures++;const reason=['kubernetes_unavailable','remote_image_mismatch','remote_not_ready','ports_occupied_unverified'].includes(e.code)?e.code:'verification_failed';return this.publish('disconnected',reason,run,{retryInMs:this.delay()});}
 }
 delay(){return Math.min(this.maxDelay,this.baseDelay*2**Math.min(Math.max(this.failures-1,0),16));}
 async stop(){this.closed=true;await this.stopOwned();this.release?.();this.release=null;}
 async run(){this.start();try{while(!this.closed){const state=await this.tick();if(this.closed)break;const remaining=this.pendingRun?this.pendingRun.deadline-this.now():state.retryInMs;const waitUntil=this.now()+Math.max(0,Math.min(state.retryInMs,remaining));while(!this.closed&&this.now()<waitUntil)await sleep(Math.min(1000,waitUntil-this.now()));
  }}finally{await this.stop();}}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const options={};for(let i=2;i<process.argv.length;i+=2){const key={'--run-file':'runFile','--token-file':'tokenFile','--directory':'directory'}[process.argv[i]];if(!key||!process.argv[i+1])throw Error('Usage: connection-supervisor.mjs [--run-file PATH] [--token-file PATH] [--directory PATH]');options[key]=process.argv[i+1];}
 const supervisor=new ConnectionSupervisor(options);for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{supervisor.closed=true;});supervisor.run().catch(()=>{console.error('Connection supervisor stopped: inspect local lock/configuration and status.');process.exitCode=1;});
}
