import {verifiedAppPod} from './pod-identity.mjs';
import {readFileSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
async function main(){
const remote=process.argv.includes('--remote');
let stopAt=Infinity;
if(remote){const run=JSON.parse(readFileSync('docs/operations/run.json'));const deadline=Date.parse(run.deadlineAt);if(!Number.isFinite(deadline))throw Error('Invalid release verification deadline');stopAt=Math.min(deadline,Date.now()+60000);}
const remaining=()=>{const n=stopAt-Date.now();if(n<=0)throw Error('Release verification deadline expired');return n;};remaining();
const remoteRead=args=>{const timeout=Math.min(20000,remaining());try{const text=execFileSync('kubectl',args,{encoding:'utf8',timeout,killSignal:'SIGKILL',maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']});remaining();return JSON.parse(text);}catch{throw Error('Remote release verification failed or timed out; no PASS published');}};
const file=process.argv[2]||'artifacts/releases/current.json';const manifest=JSON.parse(readFileSync(file));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const streamingHash=async p=>{const h=createHash('sha256');for await(const chunk of createReadStream(p)){remaining();h.update(chunk);}return h.digest('hex');};
const versionedHash=p=>process.argv.includes('--at-commit')?createHash('sha256').update(execFileSync('git',['show',`${manifest.source.commit}:${p}`],{maxBuffer:64*1024*1024})).digest('hex'):hash(p);let checked=0;
for(const [path,expected] of Object.entries({...manifest.source.hashes,...manifest.runtimeIdentity?.hashes})){assert.equal(versionedHash(path),expected,`Source hash mismatch: ${path}`);checked++;}
for(const entry of [...manifest.evidence,manifest.prd,manifest.acceptance]){assert.equal(versionedHash(entry.path),entry.sha256,`Evidence hash mismatch: ${entry.path}`);checked++;}
if(manifest.backup?.localPath&&manifest.backup?.sha256){assert.equal(await streamingHash(manifest.backup.localPath),manifest.backup.sha256,'Backup file hash mismatch');assert.equal(manifest.backup.appImage,manifest.deployment.appImage,'Backup and release image identity mismatch');checked++;}
let remoteImageMatched=false;
if(process.argv.includes('--remote')){const d=manifest.deployment;assert(d.appImage&&d.mqttImage&&d.sourceCommit,'Deployment release identity required');assert.equal(d.context,'charles-k3s');assert.equal(d.namespace,'gs-plai-5h');const live=remoteRead(['--context',d.context,'-n',d.namespace,'get','deployment',d.name||'grid','-o','json']);for(const [name,image] of [['app',d.appImage],['mqtt',d.mqttImage]])assert.equal(live.spec.template.spec.containers.find(c=>c.name===name)?.image,image,`Remote ${name} image mismatch`);assert.equal(live.status.readyReplicas,1);const pods=remoteRead(['--context',d.context,'-n',d.namespace,'get','pods','-l','app=grid','-o','json']);verifiedAppPod(pods,d.appImage);verifiedAppPod(pods,d.mqttImage,'mqtt');remoteImageMatched=true;}
remaining();console.log(JSON.stringify({result:'PASS',manifest:file,checkedHashes:checked,remoteImageMatched,scope:'File integrity and optional deployed identity only; acceptance, restore and media verdicts remain independent'}));
}
main().catch(()=>{console.error('Release verification failed, deadline expired, or remote check timed out; no PASS published. Inspect the selected manifest and connectivity before retry.');process.exitCode=1;});
