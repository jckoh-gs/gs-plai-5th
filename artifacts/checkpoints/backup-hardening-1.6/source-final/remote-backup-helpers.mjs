import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execute = promisify(execFile);

export function backupBudget({deadlineAt, maxMs = 180000, now = Date.now} = {}) {
  const deadline = Date.parse(deadlineAt);
  if (!Number.isFinite(deadline) || !Number.isFinite(maxMs) || maxMs <= 0) throw new Error('Invalid backup deadline or budget');
  const startedAt = now();
  const stopAt = Math.min(deadline, startedAt + maxMs);
  const check = () => {
    const remaining = stopAt - now();
    if (remaining <= 0) throw new Error('Backup time budget expired; no PASS published');
    return remaining;
  };
  check();
  return {
    startedAt, stopAt, deadline, check,
    async exec(file, args, {stage, timeout = 20000, maxBuffer = 8 * 1024 * 1024} = {}) {
      if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('Invalid command timeout');
      const boundedTimeout = Math.max(1, Math.min(timeout, check()));
      try {
        const result = await execute(file, args, {timeout: boundedTimeout, killSignal: 'SIGKILL', maxBuffer});
        check();
        return result.stdout;
      } catch (error) {
        // Child stdout can contain encoded database bytes. Never include it in diagnostics.
        const reason = error.killed ? 'timeout_or_buffer_limit' : (Number.isInteger(error.code) ? `exit_${error.code}` : 'command_failed');
        throw new Error(`Backup ${stage || 'command'} failed: ${reason}; inspect the private operation journal`);
      }
    }
  };
}

// Read-only, fixed read snapshot: external WAL commits remain invisible until
// rollback. Source transaction is released before the destination integrity scan.
// The progress callback is synchronous: throwing finalizes Node's backup job.
export function createSnapshotWorkerSource({rate=100}={}) {
  if(!Number.isSafeInteger(rate)||rate<1||rate>10000)throw Error('Invalid backup rate');
  return `
import {DatabaseSync,backup} from 'node:sqlite';
import {performance} from 'node:perf_hooks';
const [source,part,stopText]=process.argv.slice(1),stopAt=Number(stopText);
const start=performance.now(),allowance=stopAt-Date.now();
const check=()=>{if(!Number.isFinite(allowance)||performance.now()-start>=allowance||Date.now()>=stopAt)throw Error('deadline');};
let db,transaction=false,steps=0,totalPages=0,remainingPages=0,lastProgress=-Infinity;
const send=(stage,extra={})=>{if(process.connected)process.send({stage,steps,totalPages,remainingPages,elapsedMs:Math.round(performance.now()-start),...extra});};
try{
  check();db=new DatabaseSync(source,{readOnly:true});
  if(db.prepare('PRAGMA journal_mode').get().journal_mode!=='wal')throw Error('WAL required');
  db.exec('BEGIN');transaction=true;
  db.prepare('SELECT count(*) AS n FROM sqlite_schema').get();
  const snapshotAt=Date.now();send('snapshot',{snapshotAt});
  try{
    totalPages=await backup(db,part,{rate:${rate},progress:p=>{
      steps++;totalPages=p.totalPages;remainingPages=p.remainingPages;
      if(performance.now()-lastProgress>=250){send('copy');lastProgress=performance.now();}
      check();
    }});
  }finally{if(transaction){db.exec('ROLLBACK');transaction=false;}db.close();db=undefined;}
  check();send('verify');
  const verify=new DatabaseSync(part,{readOnly:true});
  try{if(verify.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('integrity');}finally{verify.close();}
  check();remainingPages=0;send('verified',{snapshotAt,integrity:true});
}catch{
  try{if(db){if(transaction)db.exec('ROLLBACK');db.close();}}catch{}
  send('failed');process.exitCode=1;
}finally{if(process.connected)process.disconnect();}
`;
}
export const SNAPSHOT_WORKER_SOURCE=createSnapshotWorkerSource();

// The remote parent survives a blocked synchronous worker operation. It signals
// only its own ChildProcess; neither host kubectl termination nor arbitrary remote
// SIGKILL/shutdown guarantees this supervisor gets a chance to run.
export function createSnapshotSource({maxRuntimeMs=80000,terminationGraceMs=1000,workerSource=SNAPSHOT_WORKER_SOURCE}={}) {
  if(!Number.isFinite(maxRuntimeMs)||maxRuntimeMs<=0||maxRuntimeMs>80000||!Number.isFinite(terminationGraceMs)||terminationGraceMs<=0)throw Error('Invalid snapshot supervisor budget');
  return `
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {openSync,closeSync,existsSync,chmodSync,linkSync,unlinkSync,lstatSync} from 'node:fs';
const target=process.argv[1],requestedStop=Number(process.argv[2]),source=process.env.DB_PATH;
const started=performance.now(),allowance=Math.min(${maxRuntimeMs},requestedStop-Date.now());
const grace=Math.min(${terminationGraceMs},Math.max(1,allowance/4));
const workerMs=allowance-2*grace,workerStop=Date.now()+workerMs-Math.min(250,workerMs/10);
const check=()=>{if(!Number.isFinite(allowance)||performance.now()-started>=allowance||Date.now()>=requestedStop)throw Error('deadline');};
let child,termTimer,killTimer,finalTimer,verified=false,timedOut=false,exitConfirmed=false,termSent=false,killSent=false,cancelled=false;
let progress={stage:'starting',steps:0,totalPages:0,remainingPages:0,elapsedMs:0};
const part=target+'.snapshot.part';
const alive=()=>child&&!exitConfirmed&&child.exitCode===null&&child.signalCode===null;
const unconfirmed=()=>{
  console.log(JSON.stringify({result:'INCOMPLETE',workerExitConfirmed:exitConfirmed,timedOut:true,cancelled,termSent,killSent,stage:'cleanup-unconfirmed',elapsedMs:Math.round(performance.now()-started)}));process.exit(1);
};
const cancel=()=>{
  cancelled=true;
  if(alive())termSent=child.kill('SIGTERM')||termSent;
  clearTimeout(termTimer);clearTimeout(killTimer);clearTimeout(finalTimer);
  killTimer=setTimeout(()=>{if(alive())killSent=child.kill('SIGKILL')||killSent;},grace);
  finalTimer=setTimeout(unconfirmed,Math.max(1,Math.min(2*grace,allowance-(performance.now()-started))));
};
process.on('SIGTERM',cancel);process.on('SIGINT',cancel);
try{
  check();if(workerMs<=0)throw Error('deadline');process.umask(0o077);
  if(existsSync(target))throw Error('existing');closeSync(openSync(part,'wx',0o600));
  child=spawn(process.execPath,['--input-type=module','-e',${JSON.stringify(workerSource)},source,part,String(workerStop)],{stdio:['ignore','ignore','ignore','ipc']});
  finalTimer=setTimeout(unconfirmed,Math.max(1,allowance-(performance.now()-started)));
  child.on('message',m=>{
    if(!m||!['snapshot','copy','verify','verified','failed'].includes(m.stage))return;
    progress={stage:m.stage,steps:Number.isSafeInteger(m.steps)?m.steps:0,totalPages:Number.isSafeInteger(m.totalPages)?m.totalPages:0,remainingPages:Number.isSafeInteger(m.remainingPages)?m.remainingPages:0,elapsedMs:Number.isSafeInteger(m.elapsedMs)?m.elapsedMs:0};
    if(Number.isSafeInteger(m.snapshotAt))progress.snapshotAt=m.snapshotAt;
    if(m.stage==='verified'&&m.integrity===true)verified=true;
    if(process.connected)process.send({stage:progress.stage});
  });
  termTimer=setTimeout(()=>{timedOut=true;if(!exitConfirmed&&child.exitCode===null&&child.signalCode===null)termSent=child.kill('SIGTERM');},workerMs);
  killTimer=setTimeout(()=>{timedOut=true;if(!exitConfirmed&&child.exitCode===null&&child.signalCode===null)killSent=child.kill('SIGKILL');},workerMs+grace);
  const result=await new Promise((resolve,reject)=>{child.on('error',()=>{if(!child.pid)reject(Error('spawn failed'));});child.once('exit',(code,signal)=>{exitConfirmed=true;resolve({code,signal});});});
  clearTimeout(termTimer);clearTimeout(killTimer);
  check();if(cancelled||timedOut||result.code!==0||!verified)throw Error('incomplete');
  if(!lstatSync(part).isFile())throw Error('invalid output');
  chmodSync(part,0o600);check();linkSync(part,target);unlinkSync(part);
  console.log(JSON.stringify({result:'PASS',workerExitConfirmed:exitConfirmed,integrity:'ok',...progress,elapsedMs:Math.round(performance.now()-started)}));
}catch{
  console.log(JSON.stringify({result:'INCOMPLETE',workerExitConfirmed:exitConfirmed,timedOut,cancelled,termSent,killSent,...progress,elapsedMs:Math.round(performance.now()-started)}));
  process.exitCode=1;
}finally{clearTimeout(termTimer);clearTimeout(killTimer);clearTimeout(finalTimer);process.off('SIGTERM',cancel);process.off('SIGINT',cancel);}
`;
}
export const SNAPSHOT_SOURCE=createSnapshotSource();

export const METADATA_SOURCE = `
import {DatabaseSync} from 'node:sqlite';
import {createReadStream,createWriteStream,statSync,renameSync} from 'node:fs';
import {createGzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
const p=process.argv[1],stopAt=Number(process.argv[2]),compressed=process.argv[3];
const check=()=>{if(!Number.isFinite(stopAt)||Date.now()>=stopAt)throw Error('Metadata deadline expired');};
check();
const db=new DatabaseSync(p,{readOnly:true});
try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Remote integrity failed');}finally{db.close();}
check();
const digest=async path=>{const h=createHash('sha256');for await(const chunk of createReadStream(path)){check();h.update(chunk);}return h.digest('hex');};
const signal=AbortSignal.timeout(Math.max(1,stopAt-Date.now()));
await pipeline(createReadStream(p),createGzip(),createWriteStream(compressed+'.part',{mode:0o600,flags:'wx'}),{signal});
check();renameSync(compressed+'.part',compressed);
console.log(JSON.stringify({bytes:statSync(p).size,sha256:await digest(p),compressedBytes:statSync(compressed).size,compressedSha256:await digest(compressed),capturedAt:statSync(p).mtime.toISOString(),peakRssBytes:process.resourceUsage().maxRSS*1024}));
`;

export const CHUNK_SOURCE = `
import {openSync,readSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
const f=openSync(process.argv[1]),b=Buffer.alloc(Number(process.argv[3]));
const n=readSync(f,b,0,b.length,Number(process.argv[2]));closeSync(f);
const data=b.subarray(0,n),text=JSON.stringify({bytes:n,sha256:createHash('sha256').update(data).digest('hex'),base64:data.toString('base64')})+String.fromCharCode(10);
await new Promise((resolve,reject)=>process.stdout.write(text,e=>e?reject(e):resolve()));
`;
