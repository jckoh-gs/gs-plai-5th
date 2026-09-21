import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SNAPSHOT_SOURCE} from '../scripts/remote-backup-helpers.mjs';
const source=readFileSync(new URL('../scripts/remote-outbox-restart.mjs',import.meta.url),'utf8');
const body=source.split('const capturePendingBackup=async(podName)=>{')[1]?.split('\n};')[0];
assert(body,'outbox capture function must be present');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const create=(kubectl,remaining=()=>1000)=>new AsyncFunction('kubectl','remaining','pendingBackup','stopAt','SNAPSHOT_SOURCE','assert',`return async(podName)=>{${body}\n}`)(kubectl,remaining,'/data/pending-fixture.sqlite',1234567890000,SNAPSHOT_SOURCE,assert);
const good={result:'PASS',workerExitConfirmed:true,integrity:'ok',stage:'verified',snapshotAt:1234567800000};

test('outbox capture uses identical hardened source, exact verified pod and unchanged original deadline',async()=>{
 let args,timeout,checks=0;const capture=await create(async(a,t)=>{args=a;timeout=t;return JSON.stringify(good);},()=>{checks++;return 1000;});
 const result=await capture('grid-exact-verified-pod');
 assert.deepEqual(args,['exec','grid-exact-verified-pod','-c','app','--','node','--input-type=module','-e',SNAPSHOT_SOURCE,'/data/pending-fixture.sqlite','1234567890000']);
 assert.equal(timeout,90000);assert.equal(checks,2);assert.equal(result.timePolicy.supervisorMaxMs,80000);assert.equal(result.timePolicy.remoteCancellationGuaranteed,false);assert.equal(result.snapshotCreation,'new-supervised');
 assert(!source.includes('await backup(db,pendingBackup)'));assert(!source.includes("import{DatabaseSync,backup}"));
 assert(source.indexOf('await capturePendingBackup(snapshotPod.name)')<source.indexOf("await kubectl(['rollout','restart'"));
});

test('incomplete, unverified or failed snapshot cannot advance into restart proof',async()=>{
 for(const bad of [{...good,result:'INCOMPLETE'},{...good,workerExitConfirmed:false},{...good,integrity:'failed'},{...good,stage:'verify'},{...good,snapshotAt:null}]){
  const capture=await create(async()=>JSON.stringify(bad));await assert.rejects(capture('verified-pod'));
 }
 const capture=await create(async()=>{throw Error('kubectl timeout');});await assert.rejects(capture('verified-pod'),/timeout/);
 const expired=await create(async()=>{throw Error('should not launch');},()=>{throw Error('original deadline expired');});await assert.rejects(expired('verified-pod'),/original deadline expired/);
});
