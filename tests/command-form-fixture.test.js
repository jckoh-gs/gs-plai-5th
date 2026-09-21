import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {fixtureConfig}=createRequire(import.meta.url)('../scripts/browser-command-form.cjs');
const hash='a'.repeat(64);
test('original1.4 browser fixture remains tied to its known local API and bundle',()=>{
 const c=fixtureConfig({});assert.equal(c.base,'http://127.0.0.1:3107');assert.equal(c.version,'1.4.0');assert.equal(c.prefix,'candidate14');assert.equal(c.expectedBundleHash,'37a5224ba233be5966d02ac96fc91c7eddc0adad70e8d4783df6b5b4068d5bce');
});
test('new1.5 browser fixture requires an explicit reviewed bundle before any writes',()=>{
 for(const expected of [undefined,'','bad','A'.repeat(64)])assert.throws(()=>fixtureConfig({GRID_CANDIDATE_VERSION:'1.5.0',EXPECTED_BUNDLE_SHA256:expected}),/bundle SHA256/);
 const c=fixtureConfig({GRID_CANDIDATE_VERSION:'1.5.0',EXPECTED_BUNDLE_SHA256:hash});assert.equal(c.base,'http://127.0.0.1:3109');assert.equal(c.prefix,'candidate15');assert.match(c.tokenFile,/candidate-1\.5/);
});
test('all fixture modes refuse primary and mismatched endpoints',()=>{
 for(const version of ['1.4.0','1.5.0'])for(const mode of ['local','isolated-restore'])for(const url of ['http://127.0.0.1:3104','https://127.0.0.1:3105','http://localhost:3109','http://127.0.0.1:3109/path'])assert.throws(()=>fixtureConfig({GRID_CANDIDATE_VERSION:version,GRID_FIXTURE_TARGET:mode,EXPECTED_BUNDLE_SHA256:hash,GRID_URL:url}),/mismatch/);
 assert.throws(()=>fixtureConfig({GRID_CANDIDATE_VERSION:'1.5.0',EXPECTED_BUNDLE_SHA256:hash,GRID_URL:'http://127.0.0.1:3107'}),/mismatch/);
});
test('restore mode uses isolated ports and remote credentials with explicit candidate identity',()=>{
 const c=fixtureConfig({GRID_CANDIDATE_VERSION:'1.5.0',GRID_FIXTURE_TARGET:'isolated-restore',EXPECTED_BUNDLE_SHA256:hash});assert.equal(c.base,'http://127.0.0.1:3105');assert.equal(c.mqttUrl,'mqtt://127.0.0.1:18885');assert.equal(c.prefix,'vpp');assert.equal(c.mqttUsername,'vpp-client');assert.equal(c.version,'1.5.0');
});
test('unreviewed product or target modes fail closed',()=>{
 for(const version of ['1.5.1','1.5.0-rc.1','1.6.0'])assert.throws(()=>fixtureConfig({GRID_CANDIDATE_VERSION:version,EXPECTED_BUNDLE_SHA256:hash}),/Unreviewed/);
 assert.throws(()=>fixtureConfig({GRID_FIXTURE_TARGET:'main'}),/Unknown/);
});
