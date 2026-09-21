import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const bind=createRequire(import.meta.url)('../scripts/media/release-binding.cjs');
function fixture(){
 const deployment={appImage:'127.0.0.1:15050/grid@sha256:'+'a'.repeat(64),sourceCommit:'b'.repeat(40),context:'charles-k3s',namespace:'gs-plai-5h',productVersion:'1.2.0',uiTunnel:'http://127.0.0.1:3104',mqttTunnel:'mqtt://127.0.0.1:18884'};
 const run={runId:'fixture-run',freezeAt:'2026-09-21T21:37:33Z',deadlineAt:'2026-09-21T22:07:33Z',deployment};
 const manifest={runId:run.runId,source:{commit:'c'.repeat(40)},runtimeIdentity:{commit:deployment.sourceCommit},deployment:{...deployment},productVersion:'1.2.0'};
 return {run,manifest,config:{baseUrl:deployment.uiTunnel,mqtt:{url:deployment.mqttTunnel},approvedReleaseCommit:manifest.source.commit,approvedImageDigest:'sha256:'+'a'.repeat(64)},now:Date.parse('2026-09-21T21:40:00Z')};
}
test('final media binds approved content digest, run, runtime and frozen window',()=>{
 const f=fixture();assert.equal(bind(f.config,f.manifest,f.run,f.now).runtimeCommit,'b'.repeat(40));
 f.config.approvedImageDigest=f.manifest.deployment.appImage;assert.equal(bind(f.config,f.manifest,f.run,f.now).imageDigest,'sha256:'+'a'.repeat(64));
});
test('syntactically valid but different image digest is rejected',()=>{
 const f=fixture();f.config.approvedImageDigest='sha256:'+'d'.repeat(64);assert.throws(()=>bind(f.config,f.manifest,f.run,f.now),/digest differs/);
});
test('mismatched release/run/runtime/version and invalid or expired schedule fail closed',()=>{
 for(const change of [f=>f.config.approvedReleaseCommit='d'.repeat(40),f=>f.manifest.runId='different',f=>f.run.deployment.sourceCommit='d'.repeat(40),f=>f.run.deployment.productVersion='1.1.0',f=>f.config.baseUrl='http://127.0.0.1:3103',f=>f.config.mqtt.url='mqtt://127.0.0.1:18883',f=>f.run.freezeAt='invalid',f=>f.now=Date.parse(f.run.freezeAt)-1,f=>f.now=Date.parse(f.run.deadlineAt)+1]){
  const f=fixture();change(f);assert.throws(()=>bind(f.config,f.manifest,f.run,f.now));
 }
});
