import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import deadlines from '../scripts/media/media-deadline.cjs';
test('remaining time caps child work and rejects late receipts without extending original deadline',()=>{
 let now=1000;const run={freezeAt:new Date(500).toISOString(),deadlineAt:new Date(2000).toISOString()};const b=deadlines.budget({run,now:()=>now,deadline:999999});assert.equal(b.remaining(5000),1000);now=2000;assert.throws(b.check,/expired/);assert.throws(()=>b.remaining(),/expired/);
});
test('hung synchronous tool is killed within remaining budget',()=>{
 const b=deadlines.budget({rehearsal:true,rehearsalBudgetMs:120});const start=Date.now();assert.throws(()=>b.exec(process.execPath,['-e','setInterval(()=>{},1000)']),/ETIMEDOUT|SIGKILL/);assert.ok(Date.now()-start<2000);
});
test('watchdog kills blocked worker and its owned subprocess group',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grid-deadline-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const helper=path.resolve('scripts/media/media-deadline.cjs'),script=path.join(dir,'worker.cjs'),runFile=path.join(dir,'run.json'),pidFile=path.join(dir,'child.pid');fs.writeFileSync(runFile,'{}');
 fs.writeFileSync(script,`const d=require(${JSON.stringify(helper)});if(d.supervise(__filename,{runPath:${JSON.stringify(runFile)},rehearsalBudgetMs:350})){const c=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',detached:true});require('node:fs').writeFileSync(${JSON.stringify(pidFile)},String(c.pid));while(true){}}`);
 const result=spawnSync(process.execPath,[script,'--rehearsal'],{encoding:'utf8',timeout:3000});assert.equal(result.status,124);assert.match(result.stderr,/deadline reached/);const pid=Number(fs.readFileSync(pidFile));let alive=false;try{process.kill(pid,0);alive=true;}catch{}assert.equal(alive,false,'owned subprocess must be killed');
});
test('normal rehearsal tool succeeds inside finite budget',()=>{const b=deadlines.budget({rehearsal:true,rehearsalBudgetMs:2000});assert.equal(b.exec(process.execPath,['-e','process.stdout.write("ok")'],{encoding:'utf8'}),'ok');b.check();});
test('reaped or reused worker and changed descendant identities are never signalled',()=>{
 const worker={pid:10,ppid:1,birth:'original',command:'worker'},owned={pid:11,ppid:10,birth:'child',command:'tool'};let signals=[];
 const signal=pid=>signals.push(pid);
 deadlines.cleanupOwned({worker,reaped:true,snapshot:()=>{throw Error('must not inspect');},signal});assert.deepEqual(signals,[]);
 deadlines.cleanupOwned({worker,snapshot:()=>[{...worker,birth:'reused'},owned],signal});assert.deepEqual(signals,[]);
 let reads=0;deadlines.cleanupOwned({worker,snapshot:()=>++reads===1?[worker,owned]:[worker,{...owned,birth:'unrelated-reused'}],signal});assert.deepEqual(signals,[10]);
 signals=[];deadlines.cleanupOwned({worker,snapshot:()=>[worker,owned,{pid:99,ppid:1,birth:'other',command:'other'}],signal});assert.deepEqual(signals,[11,10]);
});
test('normal supervisor exit leaves unrelated live process alone',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'grid-normal-exit-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const script=path.join(dir,'worker.cjs'),runFile=path.join(dir,'run.json');fs.writeFileSync(runFile,'{}');fs.writeFileSync(script,`const d=require(${JSON.stringify(path.resolve('scripts/media/media-deadline.cjs'))});if(d.supervise(__filename,{runPath:${JSON.stringify(runFile)},rehearsalBudgetMs:1000}))process.exit(0);`);
 const result=spawnSync(process.execPath,[script,'--rehearsal'],{timeout:3000});assert.equal(result.status,0);assert.doesNotThrow(()=>process.kill(process.pid,0));
});
test('final recorder reserve stops work early without extending deadline or shortening rehearsal',()=>{
 const run={freezeAt:new Date(0).toISOString(),deadlineAt:new Date(200000).toISOString()};
 const reserved=deadlines.budget({run,now:()=>1000,finalReserveMs:90000});assert.equal(reserved.deadline,110000);assert.equal(reserved.remaining(999999),109000);
 const rehearsal=deadlines.budget({run,rehearsal:true,now:()=>1000,finalReserveMs:90000});assert.equal(rehearsal.deadline,901000);
 const normal=deadlines.budget({run,now:()=>1000});assert.equal(normal.deadline,200000);
 assert.throws(()=>deadlines.budget({run,finalReserveMs:-1}),/reserve/);
});
