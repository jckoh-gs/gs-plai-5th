import test from 'node:test';
import assert from 'node:assert/strict';
import{mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,existsSync,statSync}from'node:fs';
import{tmpdir}from'node:os';import{join,resolve}from'node:path';import{execFileSync,spawnSync}from'node:child_process';import{createHash}from'node:crypto';import{pathToFileURL}from'node:url';
const helper=resolve('scripts/verify-software-delivery.mjs'),approved='git@github.com:jckoh-gs/gs-plai-5th.git',sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(options={}){
 const dir=mkdtempSync(join(tmpdir(),'delivery-review-')),root=join(dir,'repo'),bare=join(dir,'remote.git');mkdirSync(root);const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:['ignore','pipe','pipe']}).toString().trim();
 const put=(p,b)=>{mkdirSync(join(root,p,'..'),{recursive:true});writeFileSync(join(root,p),b)};
 git('init','-b','main');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
 const data={'package.json':JSON.stringify({version:'1.7.1'}),'package-lock.json':JSON.stringify({version:'1.7.1',packages:{'':{version:'1.7.1'}}}),'samples/wind.csv':'wind','samples/solar.csv':'solar','samples/hybrid.csv':'hybrid','Dockerfile':'FROM scratch','vite.config.js':'export default {}','docs/protocol.md':'protocol','scripts/vpp-client.js':'client','scripts/client-message.js':'parser','server/app.js':'server','web/app.js':'web','README.md':'README','.env.example':'PORT=3101','docker-compose.yml':'services: {}','mosquitto/mosquitto.conf':'listener 1883'};
 for(const[p,b]of Object.entries(data))put(p,b);git('add','.');git('commit','-m','historical runtime');const runtime=git('rev-parse','HEAD');
 put('scripts/ops.mjs','operational source');if(!options.noTests)put('tests/review.test.js','test');
 if(options.sourceDivergence)put('server/app.js','changed source');
 if(options.symlink){rmSync(join(root,'scripts/ops.mjs'));symlinkSync('../README.md',join(root,'scripts/ops.mjs'))}
 git('add','.');git('commit','-m','historical source');const source=git('rev-parse','HEAD');
 const hashes=c=>Object.fromEntries(git('ls-tree','-r','--name-only',c).split('\n').map(p=>[p,sha(execFileSync('git',['show',c+':'+p],{cwd:root}))]));
 const sourceHashes=hashes(source);for(const p of ['README.md','.env.example','docker-compose.yml','mosquitto/mosquitto.conf'])delete sourceHashes[p];
 const runtimeHashes=hashes(runtime);for(const p of ['README.md','.env.example','docker-compose.yml','mosquitto/mosquitto.conf'])delete runtimeHashes[p];
 const manifest={productVersion:'1.7.1',source:{commit:source,hashes:sourceHashes},runtimeIdentity:{commit:runtime,hashes:runtimeHashes},deployment:{sourceCommit:runtime}};options.mutate?.(manifest);
 const manifestPath='artifacts/releases/checkpoint-1.7.1.json';put(manifestPath,JSON.stringify(manifest));git('add','.');git('commit','-m','later checkpoint');const checkpoint=git('rev-parse','HEAD');git('tag','-a','stable-v1.7.1','-m','release');git('tag','-a','stable-runtime-v1.7.1-fixture',options.wrongRuntimeTag?source:runtime,'-m','runtime');
 if(options.mainDivergence){put('server/app.js','different main runtime');git('add','.');git('commit','-m','invalid later runtime')}
 if(options.manifestDivergence){put(manifestPath,JSON.stringify({...manifest,extra:'different advertised manifest'}));git('add','.');git('commit','-m','changed main manifest');put(manifestPath,JSON.stringify(manifest))}
 if(options.unrelatedMain){git('checkout','--orphan','unrelated');git('rm','-rf','.');put('unrelated.txt','otherhistory');git('add','.');git('commit','-m','unrelated');git('branch','-f','main','HEAD');git('checkout','main');put(manifestPath,JSON.stringify(manifest))}
 execFileSync('git',['init','--bare',bare],{stdio:'pipe'});git('push',bare,'main','--tags');git('remote','add','origin',options.unapproved?'git@example.invalid:other/repo.git':approved);
 if(options.missingRemoteTag)execFileSync('git',['--git-dir',bare,'update-ref','-d','refs/tags/stable-runtime-v1.7.1-fixture'],{stdio:'pipe'});
 const shim=join(dir,'ssh-fixture.sh');writeFileSync(shim,`#!/bin/sh\nexec git upload-pack '${bare}'\n`,{mode:0o700});
 const env={...process.env,GIT_SSH_COMMAND:`sh '${shim}'`,GIT_SSH_VARIANT:'ssh',GIT_TERMINAL_PROMPT:'0'};
 put('docs/operations/run.json',JSON.stringify({deadlineAt:new Date(Date.now()+60000).toISOString()}));mkdirSync(join(root,'evidence'));return{dir,root,bare,git,put,env,manifest,manifestPath,runtime,source,checkpoint,cleanup:()=>rmSync(dir,{recursive:true,force:true})};
}
function check(f,extra={}){
 const call={root:f.root,manifestPath:f.manifestPath,checkpointTag:'stable-v1.7.1',runtimeTag:'stable-runtime-v1.7.1-fixture',deadlineAt:new Date(Date.now()+60000).toISOString(),...extra};
 const code=`import{verifySoftwareDelivery}from ${JSON.stringify(pathToFileURL(helper).href)};try{console.log(JSON.stringify(verifySoftwareDelivery(JSON.parse(process.argv[1]))))}catch(e){console.log(JSON.stringify({error:e.message}));process.exitCode=1}`;
 const r=spawnSync(process.execPath,['--input-type=module','-e',code,JSON.stringify(call)],{cwd:f.root,env:f.env,encoding:'utf8',timeout:12000});assert(!r.error,String(r.error));return{status:r.status,data:JSON.parse(r.stdout)};
}
function negative(name,opts,code,extra){test(name,()=>{const f=fixture(opts);try{const r=check(f,extra);assert.equal(r.status,1);assert.equal(r.data.error,code)}finally{f.cleanup()}})}
test('historical Git source/runtime and real annotated local-bare advertisement pass without completion claim',()=>{const f=fixture();try{const r=check(f);assert.equal(r.status,0,JSON.stringify(r.data));assert.equal(r.data.completionClaim,false);assert.equal(r.data.remoteMutationsPerformed,false);assert.equal(r.data.remote.origin,approved);assert.equal(r.data.sourceCommit,f.source);assert.notEqual(f.source,f.runtime);assert.notEqual(f.checkpoint,f.source);assert.equal(r.data.counts.samplesAtSource,3);assert.equal(r.data.counts.testsAtSource,1);assert.equal(r.data.supplementalFiles.length,4);assert.equal(f.git('remote','get-url','origin'),approved)}finally{f.cleanup()}});
negative('omitted scripts inventory cannot pass',{mutate:m=>delete m.source.hashes['scripts/ops.mjs']},'source-tree-inventory-incomplete');
negative('omitted tests inventory cannot pass',{mutate:m=>delete m.source.hashes['tests/review.test.js']},'source-tree-inventory-incomplete');
negative('mismatched Git blob rejects',{mutate:m=>m.source.hashes['scripts/ops.mjs']='0'.repeat(64)},'git-blob-hash-mismatch');
negative('source symlink is not regular delivery',{symlink:true},'nonregular-or-missing-file');
negative('unsafe inventory traversal rejects',{mutate:m=>m.source.hashes['../secret']='0'.repeat(64)},'unsafe-inventory-path');
negative('source runtime byte divergence rejects',{sourceDivergence:true},'source-runtime-divergence');
negative('runtime annotated tag must bind exact runtime',{wrongRuntimeTag:true},'runtime-tag-mismatch');
negative('main ancestry must include historical commits',{unrelatedMain:true},'git-read-failed-or-deadline');
negative('changed main manifest rejects',{manifestDivergence:true},'advertised-manifest-mismatch');
negative('main runtime change cannot claim historical runtime',{mainDivergence:true},'main-runtime-divergence');
negative('missing advertised annotated runtime tag rejects',{missingRemoteTag:true},'missing-advertised-ref');
negative('unapproved origin rejects before transport',{unapproved:true},'unapproved-origin');
negative('original deadline expiration refuses',{},'deadline-expired',{deadlineAt:'2000-01-01T00:00:00Z'});

test('manifest symlink refuses before reading payload',()=>{const f=fixture();try{const file=join(f.root,f.manifestPath);rmSync(file);symlinkSync('../../README.md',file);assert.equal(check(f).data.error,'manifest-symlink')}finally{f.cleanup()}});
test('CLI preserves existing result bytes and writes new success privately with false completion',()=>{const f=fixture();try{const output='evidence/result.json',args=[helper,'--manifest',f.manifestPath,'--checkpoint-tag','stable-v1.7.1','--runtime-tag','stable-runtime-v1.7.1-fixture','--output',output];f.put(output,'original immutable receipt');const failed=spawnSync(process.execPath,args,{cwd:f.root,env:f.env,encoding:'utf8',timeout:12000});assert.equal(failed.status,1);assert.equal(readFileSync(join(f.root,output),'utf8'),'original immutable receipt');assert.match(failed.stderr,/SOFTWARE_DELIVERY_INCOMPLETE/);assert(!failed.stderr.includes(f.root));const success=spawnSync(process.execPath,[...args.slice(0,-1),'evidence/new.json'],{cwd:f.root,env:f.env,encoding:'utf8',timeout:12000});assert.equal(success.status,0,success.stderr);assert.equal(statSync(join(f.root,'evidence/new.json')).mode&0o777,0o600);const saved=JSON.parse(readFileSync(join(f.root,'evidence/new.json')));assert.equal(saved.completionClaim,false);assert.equal(saved.result,'SOFTWARE_GIT_CHECKS_RECORDED');assert.equal(saved.requiresSuccessfulExitReceipt,true);const receipt=JSON.parse(success.stdout);assert.equal(receipt.result,'SOFTWARE_GIT_DELIVERY_CHECKS_PASSED');assert.equal(receipt.outputSha256,sha(readFileSync(join(f.root,'evidence/new.json'))))}finally{f.cleanup()}});

negative('entire absent test suite must not satisfy required software delivery',{noTests:true},'required-tests-inventory-empty');
test('deadline crossing during final fsync must not leave a success receipt',()=>{const f=fixture();try{
 const preload=join(f.dir,'late-clock.mjs');writeFileSync(preload,"import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';const original=fs.fsyncSync;fs.fsyncSync=function(...args){const r=original.apply(this,args);const old=Date.now;Date.now=()=>old()+120000;return r};syncBuiltinESMExports();");
 const output='evidence/late.json',r=spawnSync(process.execPath,['--import',preload,helper,'--manifest',f.manifestPath,'--checkpoint-tag','stable-v1.7.1','--runtime-tag','stable-runtime-v1.7.1-fixture','--output',output],{cwd:f.root,env:f.env,encoding:'utf8',timeout:12000});assert.equal(r.status,1);const report=existsSync(join(f.root,output))?JSON.parse(readFileSync(join(f.root,output))):null;assert.notEqual(report?.result,'SOFTWARE_GIT_DELIVERY_CHECKS_PASSED','nonzero late-deadline command left a falsely successful artifact');
}finally{f.cleanup()}});
