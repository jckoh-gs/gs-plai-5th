import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {fixtureConfig}=createRequire(import.meta.url)('../scripts/check-command-list-freshness.cjs');
const base={GRID_FIXTURE_TARGET:'candidate',GRID_URL:'http://127.0.0.1:3111',GRID_CANDIDATE_VERSION:'1.7.0',EXPECTED_BUNDLE_SHA256:'a'.repeat(64),API_TOKEN_FILE:'artifacts/private/candidate-1.7/api-token',QA_DIRECTORY:'unused-test-output'};
test('command list observer requires exact target/version/digest/private path before I/O',()=>{
 assert.equal(fixtureConfig(base).actualOnly,false);
 for(const change of [{GRID_URL:'http://127.0.0.1:3104'},{GRID_URL:'http://user:pass@127.0.0.1:3111'},{GRID_URL:'https://example.test'},{GRID_CANDIDATE_VERSION:'1.6.0'},{EXPECTED_BUNDLE_SHA256:''},{API_TOKEN_FILE:'artifacts/private/../../secret'},{QA_DIRECTORY:''}])assert.throws(()=>fixtureConfig({...base,...change}));
});
test('remote observation forbids controlled faults unless explicit actual-only',()=>{
 for(const [mode,port]of [['main',3104],['isolated-restore',3105]]){const env={...base,GRID_FIXTURE_TARGET:mode,GRID_URL:'http://127.0.0.1:'+port};assert.throws(()=>fixtureConfig(env));assert.equal(fixtureConfig({...env,LIST_ACTUAL_ONLY:'1'}).actualOnly,true)}
});
test('list patch-version support retains exact versions and actual-only remote gates',()=>{
 for(const version of ['1.7.0','1.7.1']){
  assert.equal(fixtureConfig({...base,GRID_CANDIDATE_VERSION:version}).version,version);
  for(const [mode,port]of [['main',3104],['isolated-restore',3105]]){
   const env={...base,GRID_CANDIDATE_VERSION:version,GRID_FIXTURE_TARGET:mode,GRID_URL:'http://127.0.0.1:'+port};assert.throws(()=>fixtureConfig(env));assert.equal(fixtureConfig({...env,LIST_ACTUAL_ONLY:'1'}).version,version);
  }
  assert.throws(()=>fixtureConfig({...base,GRID_CANDIDATE_VERSION:version,GRID_URL:'http://127.0.0.1:3112'}));
 }
 for(const version of ['1.7.2','1.8.0','1.7.1-rc.1','1.7.1+build','1.7','v1.7.1'])assert.throws(()=>fixtureConfig({...base,GRID_CANDIDATE_VERSION:version}));
});
