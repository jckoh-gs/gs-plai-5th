import test from 'node:test';import assert from 'node:assert/strict';import{createRequire}from'node:module';const req=createRequire(import.meta.url);
for(const file of ['browser-command-form.cjs','browser-command-receipts.cjs'])test(file+' exactpatchversion keeps isolated targets and main rejection',()=>{
 const {fixtureConfig}=req('../scripts/'+file),env={GRID_FIXTURE_TARGET:'isolated-restore',GRID_CANDIDATE_VERSION:'1.7.1',GRID_URL:'http://127.0.0.1:3105',EXPECTED_BUNDLE_SHA256:'a'.repeat(64),API_TOKEN_FILE:'artifacts/private/deploy/api-token'};
 assert.equal(fixtureConfig(env).version,'1.7.1');assert.equal(fixtureConfig({...env,GRID_CANDIDATE_VERSION:'1.7.0'}).version,'1.7.0');assert.equal(fixtureConfig({...env,GRID_FIXTURE_TARGET:'local',GRID_URL:'http://127.0.0.1:3111'}).version,'1.7.1');
 for(const version of ['1.7.2','1.7.1-rc.1','1.7.1+build','1.8.0'])assert.throws(()=>fixtureConfig({...env,GRID_CANDIDATE_VERSION:version}));
 for(const url of ['http://127.0.0.1:3104','http://example.test:3105','http://user:secret@127.0.0.1:3105'])assert.throws(()=>fixtureConfig({...env,GRID_URL:url}));assert.throws(()=>fixtureConfig({...env,EXPECTED_BUNDLE_SHA256:'A'.repeat(64)}));
});
