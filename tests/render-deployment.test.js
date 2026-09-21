import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {renderDeployment} from '../scripts/render-deployment.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,readdirSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';
const template=readFileSync(new URL('../deploy/app.yaml',import.meta.url),'utf8'),app='127.0.0.1:15050/grid@sha256:'+'a'.repeat(64),broker='127.0.0.1:15050/grid-mqtt@sha256:'+'b'.repeat(64);
test('pinned and placeholder templates replace exact app plus both broker slots',()=>{for(const input of [template,template.replace(/image: 127\.0\.0\.1:15050\/grid@sha256:[a-f0-9]{64}/,'image: GRID_IMAGE'),template.replaceAll('MQTT_IMAGE',broker)]){const out=renderDeployment(input,app,broker);assert.equal(out.split(app).length-1,1);assert.equal(out.split(broker).length-1,2);assert(!/GRID_IMAGE|MQTT_IMAGE/.test(out));}});
test('invalid digests and shell/sed/newline characters fail closed',()=>{for(const suffix of ['', 'a'.repeat(63),'A'.repeat(64),'a'.repeat(64)+'\n','a'.repeat(64)+'&x','a'.repeat(64)+'|x']){assert.throws(()=>renderDeployment(template,'127.0.0.1:15050/grid@sha256:'+suffix,broker));assert.throws(()=>renderDeployment(template,app,'127.0.0.1:15050/grid-mqtt@sha256:'+suffix));}});
test('missing duplicate wrong slots and ambiguous images fail closed',()=>{for(const t of [template.replace('- name: app','- name: other'),template.replace('- name: mqtt','- name: app'),template.replace('      containers:','      other:'),template.replace('          ports:', '          image: GRID_IMAGE\n          ports:'),template.replace('kind: Deployment','kind: StatefulSet'),template.replace('          image: MQTT_IMAGE','          image: attacker/image:latest')])assert.throws(()=>renderDeployment(t,app,broker));});

function wrapperFixture(){
 const dir=mkdtempSync(join(tmpdir(),'grid-deploy-wrapper-'));
 for(const sub of ['scripts','deploy','bin'])mkdirSync(join(dir,sub));
 for(const file of ['deploy-image.sh','render-deployment.mjs'])copyFileSync(new URL('../scripts/'+file,import.meta.url),join(dir,'scripts',file));
 writeFileSync(join(dir,'deploy/app.yaml'),template);
 const proof=join(dir,'calls.jsonl');
 writeFileSync(join(dir,'bin/kubectl'),`#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2);let record={args};
if(args.includes('apply')){const p=args[args.indexOf('-f')+1];record={...record,mode:fs.statSync(p).mode&511,body:fs.readFileSync(p,'utf8')}}
fs.appendFileSync(process.env.TEST_DEPLOY_PROOF,JSON.stringify(record)+'\\n');
if(process.env.TEST_DEPLOY_FAIL==='1')process.exit(9);
`,{mode:0o700});
 return {dir,proof,run:(image=app,fail=false)=>spawnSync('sh',[join(dir,'scripts/deploy-image.sh'),image,broker],{cwd:tmpdir(),encoding:'utf8',env:{...process.env,PATH:join(dir,'bin')+':'+process.env.PATH,TEST_DEPLOY_PROOF:proof,TEST_DEPLOY_FAIL:fail?'1':'0'}}),close:()=>rmSync(dir,{recursive:true,force:true})};
}
test('deployment wrapper supplies passed digests with private permissions and cleans successful render',()=>{const f=wrapperFixture();try{const r=f.run();assert.equal(r.status,0,r.stderr);const calls=readFileSync(f.proof,'utf8').trim().split('\n').map(JSON.parse);assert.equal(calls.length,2);assert.deepEqual(calls[0].args.slice(0,4),['--context','charles-k3s','apply','-f']);assert.equal(calls[0].mode,0o600);assert.equal(calls[0].body,renderDeployment(template,app,broker));assert(calls[1].args.includes('rollout'));assert.deepEqual(readdirSync(join(f.dir,'artifacts/private')),[])}finally{f.close()}});
test('invalid deployment image never reaches kubectl and cleans temporary output',()=>{const f=wrapperFixture();try{assert.notEqual(f.run('grid:latest').status,0);assert.equal(existsSync(f.proof),false);assert.deepEqual(readdirSync(join(f.dir,'artifacts/private')),[])}finally{f.close()}});
test('failed kubectl apply prevents rollout and removes private render',()=>{const f=wrapperFixture();try{assert.equal(f.run(app,true).status,9);assert.equal(readFileSync(f.proof,'utf8').trim().split('\n').length,1);assert.deepEqual(readdirSync(join(f.dir,'artifacts/private')),[])}finally{f.close()}});
