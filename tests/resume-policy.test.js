import test from 'node:test';
import assert from 'node:assert/strict';
import {resumeDecision} from '../scripts/resume-policy.mjs';
test('network recovery resumes from evidence while freeze and deadline remain authoritative',()=>{
 const base={now:Date.parse('2026-09-21T10:00:00Z'),freezeAt:'2026-09-21T21:37:33Z',deadlineAt:'2026-09-21T22:07:33Z',clusterReachable:true,identityMatched:true,apiReady:true};
 assert.equal(resumeDecision(base),'resume-first-incomplete-checkpoint');
 assert.equal(resumeDecision({...base,clusterReachable:false}),'wait-for-connectivity');
 assert.equal(resumeDecision({...base,identityMatched:false,apiReady:false}),'reconcile-deployment-before-any-write');
 assert.equal(resumeDecision({...base,apiReady:false}),'restore-local-connection');
 assert.equal(resumeDecision({...base,now:Date.parse(base.freezeAt),clusterReachable:false}),'freeze-verify-stable-and-produce-media');
 assert.equal(resumeDecision({...base,now:Date.parse(base.deadlineAt),clusterReachable:false}),'deadline-report-only');
 assert.throws(()=>resumeDecision({...base,freezeAt:'invalid'}),/schedule/);
});
