#!/usr/bin/env python3
"""Create isolated recovery proof from the immutable, consistent remote backup."""
import argparse,json,subprocess,copy,re,time
from datetime import datetime
p=argparse.ArgumentParser();p.add_argument('--image',required=True);p.add_argument('--name',default='grid-restore');p.add_argument('--backup',default='pre-security-79c996f.sqlite');p.add_argument('--expected-sha256');p.add_argument('--run-file',default='docs/operations/run.json');a=p.parse_args()
if not re.fullmatch(r'grid-restore(?:-[a-z0-9]+)*',a.name) or len(a.name)>40:raise SystemExit('Invalid isolated recovery name')
if '/' in a.backup or '..' in a.backup:raise SystemExit('Backup must be a basename on grid-data PVC')
if not a.image.startswith('127.0.0.1:15050/grid@sha256:'):raise SystemExit('Immutable app image required')
if a.expected_sha256 and not re.fullmatch(r'[a-f0-9]{64}',a.expected_sha256):raise SystemExit('Expected SHA256 must be 64 lowercase hex characters')
try:
 with open(a.run_file) as f:run=json.load(f)
 deadline=datetime.fromisoformat(run['deadlineAt'].replace('Z','+00:00'))
 if deadline.tzinfo is None:raise ValueError()
 deadline=deadline.timestamp()
 if deadline<=time.time():raise ValueError()
except (OSError,ValueError,KeyError,TypeError):raise SystemExit('Missing, invalid or expired run deadline; no cluster operation started')
stop=time.monotonic()+min(210,deadline-time.time())
k=['kubectl','--context','charles-k3s','-n','gs-plai-5h']
def command(args,stage,limit,payload=None):
 remaining=min(stop-time.monotonic(),deadline-time.time())
 if remaining<=0:raise SystemExit('Restore budget expired; inspect existing deployment before any retry')
 try:
  result=subprocess.run(k+args,input=payload,text=True,capture_output=True,check=True,timeout=min(limit,remaining))
 except subprocess.TimeoutExpired:
  raise SystemExit('Restore '+stage+' timed out. Remote application is not proven cancelled; inspect deployment '+a.name+' before retry. Do not retry with a new name.')
 except (subprocess.CalledProcessError,OSError):
  raise SystemExit('Restore '+stage+' failed; inspect deployment '+a.name+' before retry. Raw command output suppressed.')
 if min(stop-time.monotonic(),deadline-time.time())<=0:raise SystemExit('Restore budget expired after '+stage+'; inspect existing deployment before any retry')
 return result.stdout
try:live=json.loads(command(['get','deployment','grid','-o','json'],'discovery',20))
except (ValueError,TypeError):raise SystemExit('Invalid deployment response; raw output suppressed')

spec=copy.deepcopy(live['spec']);spec['selector']['matchLabels']={'app':a.name};spec['template']['metadata']={'labels':{'app':a.name}};pod=spec['template']['spec']
for c in pod['containers']:
 if c['name']=='app':c['image']=a.image;c['env'].append({'name':'SEED_DEMO','value':'false'})
for v in pod['volumes']:
 if v['name']=='data':v['persistentVolumeClaim']['claimName']=a.name+'-data'
 if v['name']=='mqtt-data':v['persistentVolumeClaim']['claimName']=a.name+'-mqtt-data'
pod['volumes'].append({'name':'backup-source','persistentVolumeClaim':{'claimName':'grid-data','readOnly':True}})
code="""import{copyFileSync,existsSync,chmodSync,createReadStream}from'node:fs';
import{createHash}from'node:crypto';import{DatabaseSync}from'node:sqlite';
const source=process.argv[1],dest='/restore/lab.sqlite',expected=process.argv[2];
const hash=async path=>{const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');};
const sourceSha256=await hash(source);if(expected&&sourceSha256!==expected)throw Error('Source snapshot SHA256 mismatch');
const existed=existsSync(dest);if(!existed){copyFileSync(source,dest);chmodSync(dest,0o600);}
const destinationSha256=await hash(dest);if(expected&&destinationSha256!==expected)throw Error('Destination snapshot SHA256 mismatch');
const db=new DatabaseSync(dest,{readOnly:true});try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Restored database integrity failed');}finally{db.close();}
console.log(JSON.stringify({result:'PASS',sourceSnapshot:source,sourceSha256,destinationSha256,expectedSha256:expected||null,exactSnapshotVerified:!!expected,existingDestination:existed,integrity:'ok'}));"""

pod['initContainers']=[{'name':'restore-database','image':a.image,'command':['node','--input-type=module','-e',code,'/backup/'+a.backup,a.expected_sha256 or ''],'securityContext':{'allowPrivilegeEscalation':False,'readOnlyRootFilesystem':True,'capabilities':{'drop':['ALL']}},'resources':{'requests':{'cpu':'50m','memory':'64Mi'},'limits':{'cpu':'1','memory':'256Mi'}},'volumeMounts':[{'name':'backup-source','mountPath':'/backup','readOnly':True},{'name':'data','mountPath':'/restore'}]}]
items=[]
for name,size in [(a.name+'-data','5Gi'),(a.name+'-mqtt-data','1Gi')]:items.append({'apiVersion':'v1','kind':'PersistentVolumeClaim','metadata':{'name':name,'namespace':'gs-plai-5h'},'spec':{'accessModes':['ReadWriteOnce'],'storageClassName':'local-path','resources':{'requests':{'storage':size}}}})
items.append({'apiVersion':'apps/v1','kind':'Deployment','metadata':{'name':a.name,'namespace':'gs-plai-5h'},'spec':spec})
items.append({'apiVersion':'networking.k8s.io/v1','kind':'NetworkPolicy','metadata':{'name':a.name+'-private','namespace':'gs-plai-5h'},'spec':{'podSelector':{'matchLabels':{'app':a.name}},'policyTypes':['Ingress'],'ingress':[]}})
manifest={'apiVersion':'v1','kind':'List','items':items}
command(['apply','-f','-'],'apply',30,json.dumps(manifest))
command(['rollout','status','deployment/'+a.name,'--timeout=180s'],'rollout',180)
print(json.dumps({'result':'PASS','deployment':a.name,'stage':'rollout','deadlineAt':run['deadlineAt']}))
