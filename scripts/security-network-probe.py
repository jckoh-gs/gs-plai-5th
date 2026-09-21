#!/usr/bin/env python3
import subprocess,json,time,uuid,datetime,pathlib
base=['kubectl','--context','charles-k3s','-n','gs-plai-5h'];name='grid-security-probe-'+uuid.uuid4().hex[:8]
def call(*args,input=None):return subprocess.check_output(base+list(args),input=input,text=True,stderr=subprocess.STDOUT)
service=json.loads(call('get','service','grid','-o','json'));ip=service['spec']['clusterIP'];url='http://'+ip+':3001/api/health'
local=json.loads(call('exec','deployment/grid','-c','mqtt','--','wget','-q','-O','-','http://127.0.0.1:3001/api/health'));assert local['status']=='ok'
image='127.0.0.1:15050/grid-mqtt@sha256:a75b570829c431d0423c4faee4696c3b3758784c6e817a9abe7d7cc5382b179c'
code='if wget -q -T 3 -O /dev/null '+url+'; then echo UNEXPECTED_ACCESS; exit 1; else echo EXPECTED_DENIAL; fi'
pod={'apiVersion':'v1','kind':'Pod','metadata':{'name':name,'labels':{'app':'grid-security-probe'}},'spec':{'restartPolicy':'Never','automountServiceAccountToken':False,'nodeSelector':{'kubernetes.io/hostname':'charleskoh-nucbox-g3'},'securityContext':{'runAsUser':1000,'runAsGroup':1000,'seccompProfile':{'type':'RuntimeDefault'}},'containers':[{'name':'probe','image':image,'command':['sh','-c',code],'securityContext':{'allowPrivilegeEscalation':False,'readOnlyRootFilesystem':True,'capabilities':{'drop':['ALL']}},'resources':{'requests':{'cpu':'10m','memory':'16Mi'},'limits':{'cpu':'100m','memory':'32Mi'}}}]}}
try:
 call('apply','-f','-',input=json.dumps(pod))
 for _ in range(60):
  state=json.loads(call('get','pod',name,'-o','json'));phase=state['status']['phase']
  if phase in ['Succeeded','Failed']:break
  time.sleep(.5)
 logs=call('logs',name);assert phase=='Succeeded' and 'EXPECTED_DENIAL' in logs,logs
 evidence={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'backendLoopbackHealth':'ok','serviceIP':ip,'sameNamespaceUnlabelledProbe':'access denied','probePhase':phase,'output':logs.strip(),'policy':json.loads(call('get','networkpolicy','grid-private','-o','json'))['spec'],'scope':'Observed denied access while backend healthy; no temporary allow rule applied.'}
 pathlib.Path('docs/security/evidence/network-policy-probe.json').write_text(json.dumps(evidence,indent=2)+'\n');print('NETWORK_POLICY_PROBE_PASS')
finally:
 subprocess.run(base+['delete','pod',name,'--ignore-not-found','--wait=false'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
