import {verifiedAppPod} from './pod-identity.mjs';
import {readFileSync,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const file=process.argv[2]||'artifacts/releases/current.json';const manifest=JSON.parse(readFileSync(file));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const streamingHash=async p=>{const h=createHash('sha256');for await(const chunk of createReadStream(p))h.update(chunk);return h.digest('hex');};
const versionedHash=p=>process.argv.includes('--at-commit')?createHash('sha256').update(execFileSync('git',['show',`${manifest.source.commit}:${p}`],{maxBuffer:64*1024*1024})).digest('hex'):hash(p);let checked=0;
for(const [path,expected] of Object.entries({...manifest.source.hashes,...manifest.runtimeIdentity?.hashes})){assert.equal(versionedHash(path),expected,`Source hash mismatch: ${path}`);checked++;}
for(const entry of [...manifest.evidence,manifest.prd,manifest.acceptance]){assert.equal(versionedHash(entry.path),entry.sha256,`Evidence hash mismatch: ${entry.path}`);checked++;}
if(manifest.backup?.localPath&&manifest.backup?.sha256){assert.equal(await streamingHash(manifest.backup.localPath),manifest.backup.sha256,'Backup file hash mismatch');assert.equal(manifest.backup.appImage,manifest.deployment.appImage,'Backup and release image identity mismatch');checked++;}
let remoteImageMatched=false;
if(process.argv.includes('--remote')){const d=manifest.deployment;assert(d.appImage&&d.mqttImage&&d.sourceCommit,'Deployment release identity required');assert.equal(d.context,'charles-k3s');assert.equal(d.namespace,'gs-plai-5h');const live=JSON.parse(execFileSync('kubectl',['--context',d.context,'-n',d.namespace,'get','deployment',d.name||'grid','-o','json'],{encoding:'utf8'}));for(const [name,image] of [['app',d.appImage],['mqtt',d.mqttImage]])assert.equal(live.spec.template.spec.containers.find(c=>c.name===name)?.image,image,`Remote ${name} image mismatch`);assert.equal(live.status.readyReplicas,1);const pods=JSON.parse(execFileSync('kubectl',['--context',d.context,'-n',d.namespace,'get','pods','-l','app=grid','-o','json'],{encoding:'utf8'}));verifiedAppPod(pods,d.appImage);verifiedAppPod(pods,d.mqttImage,'mqtt');remoteImageMatched=true;}
console.log(JSON.stringify({result:'PASS',manifest:file,checkedHashes:checked,remoteImageMatched,scope:'File integrity and optional deployed identity only; acceptance, restore and media verdicts remain independent'}));
