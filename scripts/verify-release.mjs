import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const file=process.argv[2]||'artifacts/releases/current.json';const manifest=JSON.parse(readFileSync(file));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');let checked=0;
for(const [path,expected] of Object.entries(manifest.source.hashes)){assert.equal(hash(path),expected,`Source hash mismatch: ${path}`);checked++;}
for(const entry of [...manifest.evidence,manifest.prd,manifest.acceptance]){assert.equal(hash(entry.path),entry.sha256,`Evidence hash mismatch: ${entry.path}`);checked++;}
let remoteImageMatched=false;
if(process.argv.includes('--remote')){const d=manifest.deployment;assert(d.appImage&&d.mqttImage&&d.sourceCommit,'Deployment release identity required');assert.equal(d.context,'charles-k3s');assert.equal(d.namespace,'gs-plai-5h');const live=JSON.parse(execFileSync('kubectl',['--context',d.context,'-n',d.namespace,'get','deployment',d.name||'grid','-o','json'],{encoding:'utf8'}));for(const [name,image] of [['app',d.appImage],['mqtt',d.mqttImage]])assert.equal(live.spec.template.spec.containers.find(c=>c.name===name)?.image,image,`Remote ${name} image mismatch`);assert.equal(live.status.readyReplicas,1);remoteImageMatched=true;}
console.log(JSON.stringify({result:'PASS',manifest:file,checkedHashes:checked,remoteImageMatched,scope:'File integrity and optional deployed identity only; acceptance, restore and media verdicts remain independent'}));
