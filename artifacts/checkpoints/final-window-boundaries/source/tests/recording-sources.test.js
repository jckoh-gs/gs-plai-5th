import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import preserve from '../scripts/media/recording-sources.cjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'grid-media-sources-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(p,b)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),b);};
 for(const p of preserve.codeFiles)put(p,`source fixture ${p}\n`);
 put('artifacts/private/token','fixture-credential-value');put('input.csv','timestamp,power_kw\n2026-09-21T00:00:00Z,125\n');put('release.json',JSON.stringify({source:{commit:'a'.repeat(40)}}));
 const config={releaseManifest:'release.json',baseUrl:'http://localhost:3103',tokenFile:'artifacts/private/token',mqtt:{url:'mqtt://localhost:1883'},scenes:[{actions:[{type:'upload',file:'input.csv'}]}]};
 const run=()=>{put('config.json',JSON.stringify(config,null,2)+'\n');return preserve({root,configPath:'config.json',out:'output'});};return {root,put,config,run};
}
test('preserves exact config, release, all source files including itself, and upload hashes',t=>{
 const f=fixture(t),r=f.run();assert.equal(r.credentialsIncluded,false);assert.equal(r.files.length,preserve.codeFiles.length+1);
 assert.ok(r.files.some(x=>x.source==='scripts/media/recording-sources.cjs'));
 assert.deepEqual(fs.readFileSync(path.join(f.root,'config.json')),fs.readFileSync(path.join(f.root,'output/source/recording-config.original.json')));
 assert.deepEqual(fs.readFileSync(path.join(f.root,'release.json')),fs.readFileSync(path.join(f.root,'output/source/release-manifest.json')));
 for(const item of r.files){const bytes=fs.readFileSync(path.join(f.root,'output',item.path));assert.equal(sha(bytes),item.sha256);assert.deepEqual(bytes,fs.readFileSync(path.join(f.root,item.source)));}
 assert.equal(r.recordingConfigSha256,sha(fs.readFileSync(path.join(f.root,'config.json'))));assert.throws(f.run,/EEXIST/);
});
for(const mode of ['config-secret','http-credentials','mqtt-credentials','private-upload','private-symlink','credential-outside-private','upload-secret'])test(`rejects ${mode} before creating output`,t=>{
 const f=fixture(t);
 if(mode==='config-secret')f.config.title='fixture-credential-value';
 if(mode==='http-credentials')f.config.baseUrl='http://user:password@localhost:3103';
 if(mode==='mqtt-credentials')f.config.mqtt.url='mqtt://user:password@localhost:1883';
 if(mode==='private-upload')f.config.scenes[0].actions[0].file='artifacts/private/token';
 if(mode==='private-symlink'){fs.symlinkSync(path.join(f.root,'artifacts/private/token'),path.join(f.root,'innocent.csv'));f.config.scenes[0].actions[0].file='innocent.csv';}
 if(mode==='credential-outside-private'){f.put('external-token','another-fixture-value');f.config.tokenFile='external-token';f.config.scenes[0].actions[0].file='external-token';}
 if(mode==='upload-secret')f.put('input.csv','fixture-credential-value');
 assert.throws(f.run,/credential|Credentials/);assert.equal(fs.existsSync(path.join(f.root,'output')),false);
});
