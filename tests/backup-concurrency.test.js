import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,statSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {createSnapshotSource,createSnapshotWorkerSource} from '../scripts/remote-backup-helpers.mjs';

function fixture(t,megabytes=32){
 const dir=mkdtempSync(join(tmpdir(),'grid-isolated-backup-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const source=join(dir,'source.sqlite'),target=join(dir,'backup.sqlite');
 const db=new DatabaseSync(source);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE generation(a INTEGER,b INTEGER); INSERT INTO generation VALUES(0,0); CREATE TABLE data(id INTEGER PRIMARY KEY,payload BLOB); BEGIN');
 const add=db.prepare('INSERT INTO data(payload) VALUES(zeroblob(1048576))');for(let i=0;i<megabytes;i++)add.run();db.exec('COMMIT');db.close();
 return {dir,source,target};
}
function child(code,args,env={}){
 const p=spawn(process.execPath,['--input-type=module','-e',code,...args],{env:{...process.env,...env},stdio:['ignore','pipe','pipe','ipc']});
 let stdout='',stderr='';p.stdout.on('data',b=>{stdout+=b;});p.stderr.on('data',b=>{stderr+=b;});
 const exited=new Promise((resolve,reject)=>{p.once('error',reject);p.once('exit',(code,signal)=>resolve({code,signal,stdout,stderr}));});
 return {p,exited};
}
const writerSource=`
import {DatabaseSync} from 'node:sqlite';import {performance} from 'node:perf_hooks';
const db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA busy_timeout=100;PRAGMA synchronous=FULL');
let timer,count=0,maxCommitMs=0;
process.on('message',m=>{if(m==='go')timer=setInterval(()=>{const start=performance.now();db.exec('BEGIN IMMEDIATE;UPDATE generation SET a=a+1,b=b+1;COMMIT');count++;maxCommitMs=Math.max(maxCommitMs,performance.now()-start);},1);if(m==='stop'){clearInterval(timer);db.close();process.send({count,maxCommitMs});process.disconnect();}});
process.send({ready:true});`;

async function writer(t,source){
 const w=child(writerSource,[source]);t.after(()=>{if(w.p.exitCode===null&&w.p.signalCode===null)w.p.kill('SIGKILL');});
 await once(w.p,'message');return w;
}

test('fixed read snapshot remains atomic with independent continuous WAL writer, and writer commits continue',async t=>{
 const {source,target}=fixture(t,48),w=await writer(t,source);
 const backup=child(createSnapshotWorkerSource({rate:1}),[source,target,String(Date.now()+10000)]);
 let started=false,steps=0;
 backup.p.on('message',m=>{if(m.stage==='snapshot'){started=true;w.p.send('go');}steps=Math.max(steps,m.steps??0);});
 const result=await backup.exited;assert.equal(result.code,0,result.stderr);assert(started);assert(steps>100);
 const metricsPromise=once(w.p,'message');w.p.send('stop');const [metrics]=await metricsPromise;await w.exited;
 assert(metrics.count>0,'writer must commit during actual backup');assert(metrics.maxCommitMs<1000,'writer must not wait for full read transaction');
 const restored=new DatabaseSync(target,{readOnly:true});assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual({...restored.prepare('SELECT * FROM generation').get()},{a:0,b:0});restored.close();
 const current=new DatabaseSync(source);const row=current.prepare('SELECT * FROM generation').get();assert.equal(row.a,metrics.count);assert.equal(row.a,row.b);current.close();
 t.diagnostic(JSON.stringify({writerCommits:metrics.count,maxCommitMs:metrics.maxCommitMs,backupSteps:steps}));
});

test('mid-copy cooperative deadline finalizes backup, releases read transaction and leaves no published final',async t=>{
 const {source,target}=fixture(t,64);
 // Slow each actual copy step to make a real monotonic deadline expire mid-copy.
 const sourceCode=createSnapshotWorkerSource({rate:1}).replace('const start=performance.now(),allowance=', 'let start=performance.now(),allowance=').replace('const snapshotAt=Date.now();', 'start=performance.now();allowance=250;const snapshotAt=Date.now();').replace('steps++;totalPages=', 'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);steps++;totalPages=');
 const part=target+'.snapshot.part';writeFileSync(part,'',{mode:0o600,flag:'wx'});
 const b=child(sourceCode,[source,part,String(Date.now()+10000)]);let steps=0;b.p.on('message',m=>{steps=Math.max(steps,m.steps??0);});
 const result=await b.exited;assert.equal(result.code,1);assert(steps>0&&steps<100,'deadline must expire after copying starts');assert(!existsSync(target));assert.equal(statSync(part).mode&0o777,0o600);
 const db=new DatabaseSync(source);db.exec('PRAGMA busy_timeout=100;BEGIN IMMEDIATE;UPDATE generation SET a=a+1,b=b+1;COMMIT');const checkpoint=db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();assert.equal(checkpoint.busy,0);db.close();
});

test('supervisor terminates own worker blocked inside synchronous work; SIGTERM-resistant worker is killed and read lock released',async t=>{
 const {source,target}=fixture(t,1);
 const stalled=`import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(process.argv[1],{readOnly:true});db.exec('BEGIN');db.prepare('SELECT count(*) FROM sqlite_schema').get();process.on('SIGTERM',()=>{});process.send({stage:'verify',steps:1,totalPages:1,remainingPages:0,elapsedMs:0});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10000);`;
 const started=Date.now();const b=child(createSnapshotSource({maxRuntimeMs:800,terminationGraceMs:100,workerSource:stalled}),[target,String(Date.now()+5000)],{DB_PATH:source});
 const result=await b.exited;assert.equal(result.code,1);assert(Date.now()-started<2500);const report=JSON.parse(result.stdout);assert(report.workerExitConfirmed);assert(report.timedOut);assert(report.termSent);assert(report.killSent);assert(!existsSync(target));assert(existsSync(target+'.snapshot.part'));
 const db=new DatabaseSync(source);db.exec('UPDATE generation SET a=1,b=1');assert.equal(db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get().busy,0);db.close();
});

test('supervisor refuses verified-looking IPC without successful worker exit and preserves existing final',async t=>{
 const {source,target}=fixture(t,1);
 const fake=`process.send({stage:'verified',integrity:true,steps:1,totalPages:1,remainingPages:0,elapsedMs:0});process.exitCode=1;process.disconnect();`;
 const code=createSnapshotSource({maxRuntimeMs:1500,terminationGraceMs:100,workerSource:fake});
 const first=await child(code,[target,String(Date.now()+5000)],{DB_PATH:source}).exited;assert.equal(first.code,1);assert(!existsSync(target));
 writeFileSync(target,'known existing backup');const second=await child(code,[target,String(Date.now()+5000)],{DB_PATH:source}).exited;assert.equal(second.code,1);assert.equal(readFileSync(target,'utf8'),'known existing backup');
});

test('parent SIGTERM cancels its child, confirms exit and never publishes final',async t=>{
 const {source,target}=fixture(t,1);
 const stalled=`import {DatabaseSync} from 'node:sqlite';const db=new DatabaseSync(process.argv[1],{readOnly:true});db.exec('BEGIN');db.prepare('SELECT count(*) FROM sqlite_schema').get();process.on('SIGTERM',()=>{});process.send({stage:'verify',steps:1,totalPages:1,remainingPages:0,elapsedMs:0});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10000);`;
 const b=child(createSnapshotSource({maxRuntimeMs:5000,terminationGraceMs:100,workerSource:stalled}),[target,String(Date.now()+10000)],{DB_PATH:source});
 await once(b.p,'message');b.p.kill('SIGTERM');
 const result=await b.exited;assert.equal(result.code,1);const report=JSON.parse(result.stdout);assert(report.cancelled);assert(report.workerExitConfirmed);assert(report.killSent);assert(!existsSync(target));
 const db=new DatabaseSync(source);db.exec('UPDATE generation SET a=1,b=1');assert.equal(db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get().busy,0);db.close();
});

test('non-WAL database fails closed and leaves private unpublished partial',async t=>{
 const {source,target}=fixture(t,1);const db=new DatabaseSync(source);db.exec('PRAGMA journal_mode=DELETE');db.close();
 const result=await child(createSnapshotSource(),[target,String(Date.now()+5000)],{DB_PATH:source}).exited;
 assert.equal(result.code,1);assert(!existsSync(target));assert.equal(statSync(target+'.snapshot.part').mode&0o777,0o600);
});
