// Cross-check resume metadata only. Matching records do not prove process liveness.
export function observationBindings(run, ledger) {
  const issues = [];
  const current = ledger.currentObservationProcesses;
  if (!run.soak && !current) return {ok:true, issues, scope:'No observation metadata recorded'};
  const same = (value, expected) => expected !== undefined && value === expected;
  for (const role of ['primary', 'audit', 'supervisor']) {
    const process = current?.[role];
    if (!process || !Number.isInteger(process.pid) || process.pid <= 0 || !Number.isInteger(process.handle) || process.handle <= 0 || typeof process.processIdentity !== 'string' || !process.processIdentity.trim()) {
      issues.push(`currentObservationProcesses.${role}: incomplete process identity`);
      continue;
    }
    if (!same(ledger.currentObservationHandles?.[role], process.handle)) issues.push(`currentObservationHandles.${role}: handle mismatch`);
  }
  const audit = ledger.supplementaryObservation;
  for (const field of ['pid', 'handle', 'processIdentity']) {
    if (!same(audit?.[field], current?.audit?.[field])) issues.push(`supplementaryObservation.${field}: current audit mismatch`);
  }
  for (const field of ['sessionId', 'directory', 'startedAt']) {
    if (typeof audit?.[field] !== 'string' || !audit[field].trim()) issues.push(`supplementaryObservation.${field}: missing`);
  }
  const supervisor = ledger.supervisorDiagnosticUpgrade;
  if (supervisor && typeof supervisor.state !== 'string') issues.push('supervisorDiagnosticUpgrade.state: invalid');
  if (typeof supervisor?.state === 'string' && supervisor.state.startsWith('verified-active')) {
    for (const [field, target] of [['currentPid','pid'], ['currentHandle','handle'], ['currentIdentity','processIdentity']]) {
      if (!same(supervisor[field], current?.supervisor?.[target])) issues.push(`supervisorDiagnosticUpgrade.${field}: current supervisor mismatch`);
    }
  }
  return {ok:issues.length === 0, issues, scope:'Metadata consistency only; verify actual PID/start identity and observation files before acting'};
}
