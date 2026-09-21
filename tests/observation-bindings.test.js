import test from 'node:test';
import assert from 'node:assert/strict';
import {observationBindings} from '../scripts/observation-bindings.mjs';
import {resumeDecision} from '../scripts/resume-policy.mjs';

function fixture() {
  const current = {primary:{pid:101,handle:1,processIdentity:'primary start'},audit:{pid:102,handle:2,processIdentity:'audit start'},supervisor:{pid:103,handle:3,processIdentity:'supervisor start'}};
  return {run:{soak:{sessionId:'primary-session'}},ledger:{currentObservationProcesses:current,currentObservationHandles:{primary:1,audit:2,supervisor:3},supplementaryObservation:{...current.audit,sessionId:'audit-session',directory:'audit/current',startedAt:'2026-09-21T16:45:54Z'},supervisorDiagnosticUpgrade:{state:'verified-active1.7',currentPid:103,currentHandle:3,currentIdentity:'supervisor start'},previousObservations:[{handle:999,pid:999}]}};
}
test('consistent current metadata accepts historical ended records without treating them as active',()=>{
  const f=fixture();assert.equal(observationBindings(f.run,f.ledger).ok,true);
  assert.equal(observationBindings({},{}).ok,true);
});
test('stale supplementary session ownership is reported without mutating history or current records',()=>{
  const f=fixture();Object.assign(f.ledger.supplementaryObservation,{pid:999,handle:999,processIdentity:'old audit start'});const before=structuredClone(f);
  const result=observationBindings(f.run,f.ledger);assert.equal(result.ok,false);assert.equal(result.issues.length,3);assert.deepEqual(f,before);
});
test('reused audit PID with changed start identity is a mismatch',()=>{
  const f=fixture();f.ledger.supplementaryObservation.processIdentity='another start';assert.equal(observationBindings(f.run,f.ledger).ok,false);
});
test('stale supervisor ownership and duplicate handle field are independently reported',()=>{
  const f=fixture();f.ledger.supervisorDiagnosticUpgrade.currentHandle=99;f.ledger.currentObservationHandles.primary=99;
  const result=observationBindings(f.run,f.ledger);assert.equal(result.ok,false);assert.equal(result.issues.length,2);
});
test('incomplete current observation metadata fails closed once a soak exists',()=>{
  for(const change of [f=>delete f.ledger.currentObservationProcesses,f=>delete f.ledger.supplementaryObservation,f=>f.ledger.currentObservationProcesses.audit.pid=-1,f=>f.ledger.currentObservationProcesses.audit.handle=0,f=>f.ledger.supplementaryObservation.sessionId='',f=>f.ledger.supervisorDiagnosticUpgrade.state={secret:'never echo'}]){const f=fixture();change(f);const result=observationBindings(f.run,f.ledger);assert.equal(result.ok,false);assert.ok(!JSON.stringify(result).includes('never echo'));}
});
test('metadata reconciliation never overrides disconnection, deployment mismatch, freeze or deadline',()=>{
  const b={now:Date.parse('2026-09-21T17:00:00Z'),freezeAt:'2026-09-21T21:37:33Z',deadlineAt:'2026-09-21T22:07:33Z',clusterReachable:true,identityMatched:true,apiReady:true,observationBindingsMatched:false};
  assert.equal(resumeDecision(b),'reconcile-observation-ledger');
  assert.equal(resumeDecision({...b,clusterReachable:false}),'wait-for-connectivity');
  assert.equal(resumeDecision({...b,identityMatched:false}),'reconcile-deployment-before-any-write');
  assert.equal(resumeDecision({...b,apiReady:false}),'restore-local-connection');
  assert.equal(resumeDecision({...b,now:Date.parse(b.freezeAt)}),'freeze-verify-stable-and-produce-media');
  assert.equal(resumeDecision({...b,now:Date.parse(b.deadlineAt)}),'deadline-report-only');
});
