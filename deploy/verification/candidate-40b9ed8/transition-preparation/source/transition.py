import pathlib,json,hashlib,subprocess as s,datetime,time,os,shutil,argparse,copy
HERE=pathlib.Path(__file__).resolve().parent;ROOT=pathlib.Path.cwd();cfg=json.load(open(HERE/'config.json'));out=ROOT/cfg['candidate'];k=['kubectl','--context','charles-k3s','-n','gs-plai-5h']
def sha(b):return hashlib.sha256(b).hexdigest()
def stamp(t):return datetime.datetime.fromisoformat(t.replace('Z','+00:00')).timestamp()
def save(n,v):(out/n).write_text(json.dumps(v,indent=2)+'\n')
def transition_stop(run,now):
 freeze=stamp(run['freezeAt']);deadline=stamp(run['deadlineAt']);assert now<freeze,'Transition frozen; use separate final rollback procedure';assert now<deadline,'Original deadline expired';return min(now+210,freeze,deadline)
def valid_backup_age(verifiedAt,now):
 age=now-stamp(verifiedAt);assert 0<=age<1800,'Backup timestamp future or older than30min';return age
def capture_uncertain(getter,saver):
 try:saver('prepared-rollout/uncertain-pods.json',getter(['get','pods','-l','app=grid','-o','json']))
 except Exception as error:saver('prepared-rollout/uncertain-query-failure.json',{'queryFailure':True,'errorType':type(error).__name__,'note':'Best-effort query failed; original deployment error remains authoritative. No retry.'})
def checkpoint_guard(expectedHash):
 d=ROOT/cfg['firstHourDirectory'];index=d/'sha256.json';assert index.is_file(),'Actual first-hour checkpoint absent; no remote command started';assert sha(index.read_bytes())==expectedHash,'Checkpoint index hash mismatch';hashes=json.load(open(index));assert 'summary.json'in hashes and'resource-observation.json'in hashes
 for name,expected in hashes.items():
  f=(d/name).resolve();assert f.is_relative_to(d.resolve())and f.is_file();assert sha(f.read_bytes())==expected
 x=json.load(open(d/'summary.json'));assert x['runtimeCommit']==cfg['priorRuntimeCommit'];assert stamp(x['capturedAt'])>=stamp(cfg['notBefore'])
 for label in ['primary','supplementary']:assert x[label]['durationSeconds']>=3600 and stamp(x[label]['through'])>=stamp(cfg['notBefore'])
 r=json.load(open(d/'resource-observation.json'));assert all(c['ready']for c in r['containers']);assert next(c for c in r['containers']if c['name']=='app')['imageID']==cfg['priorImage'];return {'indexSha256':expectedHash,'capturedAt':x['capturedAt'],'runtimeCommit':x['runtimeCommit']}
def local_verify():
 v=json.load(open(out/'provenance.json'));assert v['sourceCommit']==cfg['runtimeCommit'];assert v['labels']['org.opencontainers.image.version']==cfg['productVersion'];assert '127.0.0.1:15050/grid@'+v['imageManifest']==cfg['newImage'];assert v['registryPushed'];assert json.load(open(out/'registry-push-proof.json'))['result']=='PASS'
 rendered=s.check_output(['node','scripts/render-deployment.mjs',cfg['newImage'],cfg['brokerImage'],'deploy/app.yaml'],timeout=10);assert rendered.count(cfg['newImage'].encode())==1 and rendered.count(cfg['brokerImage'].encode())==2;return rendered
parser=argparse.ArgumentParser();parser.add_argument('--prepare-check',action='store_true');parser.add_argument('--guard-check',action='store_true');parser.add_argument('--execute-after-root-release',action='store_true');parser.add_argument('--first-hour-index-sha256');parser.add_argument('--pre-backup');parser.add_argument('--pre-backup-metadata-sha256');args=parser.parse_args()
rendered=local_verify()
if args.prepare_check:
 save('transition-preparation/local-render-check.json',{'result':'PASS','scope':'local renderer only; zero kubectl calls','renderedSha256':sha(rendered),'exactAppOccurrences':1,'exactBrokerOccurrences':2});raise SystemExit(0)
proof=checkpoint_guard(args.first_hour_index_sha256)
if args.guard_check:print('checkpoint verified; zero remote commands');raise SystemExit(0)
assert args.execute_after_root_release,'Explicit root-release execution flag required';transition_stop(json.load(open('docs/operations/run.json')),time.time());assert time.time()>=stamp(cfg['notBefore']);m=pathlib.Path(args.pre_backup);assert sha(m.read_bytes())==args.pre_backup_metadata_sha256;backup=json.load(open(m));assert backup['result']=='PASS'and backup['appImage']==cfg['priorImage']and backup['sourceCommit']==cfg['priorRuntimeCommit'];assert backup['verifiedTransferPod']['uid']==cfg['priorPodUID'];valid_backup_age(backup['verifiedAt'],time.time());local=pathlib.Path(backup['localPath']);assert local.stat().st_size==backup['bytes'];h=hashlib.sha256()
with local.open('rb')as f:
 for b in iter(lambda:f.read(1048576),b''):h.update(b)
assert h.hexdigest()==backup['sha256'];stop=transition_stop(json.load(open('docs/operations/run.json')),time.time());assert stop>time.time();assert not(out/'prepared-rollout').exists(),'Prior transition evidence exists; inspect before retry';(out/'prepared-rollout').mkdir()
def run(a,limit=20):return s.check_output(k+a,timeout=min(limit,max(.1,stop-time.time())))
def get(a):return json.loads(run(a))
before=get(['get','deployment','grid','-o','json']);pods=get(['get','pods','-l','app=grid','-o','json']);assert len(pods['items'])==1;pod=pods['items'][0];assert pod['metadata']['uid']==cfg['priorPodUID'];assert all(c['ready']for c in pod['status']['containerStatuses']);assert next(c for c in pod['status']['containerStatuses']if c['name']=='app')['imageID']==cfg['priorImage'];assert next(c for c in before['spec']['template']['spec']['containers']if c['name']=='app')['image']==cfg['priorImage'];assert next(c for c in before['spec']['template']['spec']['containers']if c['name']=='mqtt')['image']==cfg['brokerImage']
baseline=json.load(open(cfg['baseline']));
def projection(a,t):
 if isinstance(t,dict):return {k:projection(a[k],v)for k,v in t.items()}
 if isinstance(t,list)and t and isinstance(t[0],dict)and'id'in t[0]:
  assert isinstance(a,list)and len(a)==len(t),'Canonical list length differs'
  actualIds=[x['id']for x in a];expectedIds=[x['id']for x in t]
  assert len(set(actualIds))==len(actualIds)and len(set(expectedIds))==len(expectedIds),'Duplicate canonical ID'
  assert set(actualIds)==set(expectedIds),'Canonical ID set differs'
  return[projection(next(x for x in a if x['id']==v['id']),v)for v in t]
 return a
code="const get=async p=>{const r=await fetch('http://127.0.0.1:3001'+p,{signal:AbortSignal.timeout(5000),redirect:'error',headers:{Authorization:'Bearer '+process.env.API_TOKEN}});if(!r.ok)throw Error('HTTP');return r.json()};console.log(JSON.stringify({state:await get('/api/state'),scenarios:await get('/api/scenarios')}));"
def data(podName):
 x=json.loads(run(['exec',podName,'-c','app','--','node','--input-type=module','-e',code]));assert len(x['state']['plants'])==5;plants=projection(x['state']['plants'],baseline['plants']);scenes=projection(x['scenarios'],baseline['scenarios']);assert plants==baseline['plants']and scenes==baseline['scenarios'];return {'version':x['state']['version'],'plants':plants,'scenarios':scenes}
b=data(pod['metadata']['name']);assert b['version']=='1.7.0';save('prepared-rollout/before.json',before);save('prepared-rollout/before-pods.json',pods);save('prepared-rollout/before-canonical.json',b);save('prepared-rollout/preconditions.json',{'checkpoint':proof,'backupMetadata':str(m),'backupMetadataSha256':args.pre_backup_metadata_sha256,'backupSha256':backup['sha256']})
env={**os.environ,'PATH':str(HERE/'bin')+os.pathsep+os.environ['PATH'],'TRANSITION_REAL_KUBECTL':shutil.which('kubectl'),'TRANSITION_STOP_AT':str(stop)}
try:
 with(out/'prepared-rollout/deploy.log').open('wb')as f:r=s.run(['sh','scripts/deploy-image.sh',cfg['newImage'],cfg['brokerImage']],env=env,stdout=f,stderr=s.STDOUT,timeout=max(.1,stop-time.time()))
 assert r.returncode==0,'Deployment uncertain; inspect actual state before repeat'
except Exception:
 capture_uncertain(get,save);raise
new=get(['get','deployment','grid','-o','json']);pods=get(['get','pods','-l','app=grid','-o','json']);assert len(pods['items'])==1;pod=pods['items'][0];assert pod['metadata']['uid']!=cfg['priorPodUID'];assert all(c['ready']for c in pod['status']['containerStatuses']);assert next(c for c in pod['status']['containerStatuses']if c['name']=='app')['imageID']==cfg['newImage'];expected=copy.deepcopy(before['spec']);next(c for c in expected['template']['spec']['containers']if c['name']=='app')['image']=cfg['newImage'];assert new['spec']==expected,'Unexpected deployment spec change';after=data(pod['metadata']['name']);assert after['version']==cfg['productVersion'];save('prepared-rollout/after-canonical.json',after);save('prepared-rollout/after.json',new);save('prepared-rollout/after-pods.json',pods)
guideCode="import{createHash}from'node:crypto';const r=await fetch('http://127.0.0.1:3001/api/guide',{signal:AbortSignal.timeout(5000),redirect:'error',headers:{Authorization:'Bearer '+process.env.API_TOKEN}});if(!r.ok)throw Error('guide HTTP');const b=Buffer.from(await r.arrayBuffer()),t=b.toString();console.log(JSON.stringify({status:r.status,sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length,strictBooleanText:t.includes('boolean `online`')&&t.includes('online: null')&&t.includes('false')}));"
g=json.loads(run(['exec',pod['metadata']['name'],'-c','app','--','node','--input-type=module','-e',guideCode]));assert g['sha256']==sha(pathlib.Path('artifacts/private/build-40b9ed8/docs/protocol.md').read_bytes())and g['strictBooleanText'];save('prepared-rollout/served-guide.json',g);save('prepared-rollout/proof.json',{'result':'PASS','pod':pod['metadata']['name'],'uid':pod['metadata']['uid'],'image':cfg['newImage'],'onlyAppImageChanged':True,'canonicalBeforeAfterPreserved':True,'servedGuideStrictBooleanVerified':True,'noOwnPortForward':True})
