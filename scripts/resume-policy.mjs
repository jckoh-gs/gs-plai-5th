export function resumeDecision({now,freezeAt,deadlineAt,clusterReachable,identityMatched,apiReady}){
  const freeze=Date.parse(freezeAt),deadline=Date.parse(deadlineAt);
  if(!Number.isFinite(now)||!Number.isFinite(freeze)||!Number.isFinite(deadline)||freeze>=deadline)throw Error('Invalid immutable run schedule');
  if(now>=deadline)return 'deadline-report-only';
  if(now>=freeze)return 'freeze-verify-stable-and-produce-media';
  if(!clusterReachable)return 'wait-for-connectivity';
  if(!identityMatched)return 'reconcile-deployment-before-any-write';
  if(!apiReady)return 'restore-local-connection';
  return 'resume-first-incomplete-checkpoint';
}
