import pathlib,json,subprocess as s,time,datetime,urllib.request,os,hashlib,shutil
p=pathlib.Path('deploy/verification/final-restore-20260921');k=['kubectl','--context','charles-k3s','-n','gs-plai-5h'];uid='75f4bc7a-0c4d-4cff-8ce2-cea68fd43cbc';podname='grid-69d8766f7-zmfq8';metadata='deploy/verification/final-backup-20260921.json';old='/data/stable-6d165d1-20260921T153417228Z.sqlite'
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def save(n,v):(p/n).write_text(json.dumps(v,indent=2)+'\n')
def pods():
 pod=json.loads(s.check_output(k+['get','pod',podname,'-o','json'],timeout=10));assert pod['metadata']['uid']==uid
 return {'uid':uid,'containers':[{q:c[q]for q in ['name','ready','restartCount','imageID']}for c in pod['status']['containerStatuses']]}
def remote(target):
 code="import{readFileSync,readdirSync,statSync,existsSync,statfsSync}from'node:fs';import{createHash}from'node:crypto';const target=process.argv[1],old=process.argv[2];const disk=statfsSync('/data');const processes=readdirSync('/proc').filter(x=>/^\\d+$/.test(x)).flatMap(pid=>{try{const a=readFileSync('/proc/'+pid+'/cmdline','utf8').split('\\0');if(!a.includes(target)&&!a.includes(old))return[];const i=a.indexOf('-e'),code=a[i+1]||'';if(code.includes('const processes='))return[];const stat=readFileSync('/proc/'+pid+'/stat','utf8');return[{pid,startTicks:stat.slice(stat.lastIndexOf(')')+2).split(' ')[19],codeSha256:createHash('sha256').update(code).digest('hex'),targetArgument:a.includes(target),oldArgument:a.includes(old)}]}catch{return[]}});console.log(JSON.stringify({diskAvailableBytes:disk.bavail*disk.bsize,files:[old,old+'.snapshot.part',target,target+'.snapshot.part'].map(path=>({path,exists:existsSync(path),...(existsSync(path)?{bytes:statSync(path).size}:{} )})),processes}));"
 return json.loads(s.check_output(k+['exec',podname,'-c','app','--','node','--input-type=module','-e',code,target,old],timeout=10))
assert not pathlib.Path(metadata).exists();journals=list(pathlib.Path('artifacts/operations/backups').glob('*.json'));assert not any(json.loads(f.read_text()).get('metadataPath')==metadata for f in journals)
a=pods();assert next(c for c in a['containers']if c['name']=='app')['imageID']=='127.0.0.1:15050/grid@sha256:234ec56ea49f5c734339746c795403898bdba3490da7fd7929de4c252d3a3876';assert all(c['ready'] and c['restartCount']==0 for c in a['containers']);r=remote('/data/not-created-round2');assert not any(x.get('oldArgument')for x in r['processes']);assert not r['files'][0]['exists'] and r['files'][1]['exists'];assert r['diskAvailableBytes']>3000000000
save('preflight.json',{'checkedAt':now(),'pod':a,'remote':r,'localFreeBytes':shutil.disk_usage('.').free})
save('source/hashes.json',{'commit':s.check_output(['git','rev-parse','HEAD']).decode().strip(),'files':{f.name:hashlib.sha256(f.read_bytes()).hexdigest()for f in (p/'source').glob('*.mjs')},'SNAPSHOT_SOURCE_SHA256':'0ebab4bb4993239e0872bdab427db16dadb8e1d877809c5f376665f2f922589b'})
with (p/'backup.log').open('wb')as log:
 proc=s.Popen(['node','scripts/remote-backup.mjs'],env={**os.environ,'BACKUP_METADATA_PATH':metadata},stdout=log,stderr=s.STDOUT)
 save('host-process.json',{'pid':proc.pid,'startedAt':now(),'identity':s.check_output(['ps','-p',str(proc.pid),'-o','pid=,lstart=,args=']).decode().strip()})
 failures=0;start=time.monotonic();j=None
 while proc.poll()is None:
  row={'at':now()};t=time.monotonic()
  try:
   with urllib.request.urlopen('http://127.0.0.1:3104/api/health',timeout=3)as response:h=json.load(response)
   row['health']={'status':h['status'],'version':h['version'],'elapsedMs':round((time.monotonic()-t)*1000)};failures=0
  except Exception as e:failures+=1;row['health']={'errorType':type(e).__name__,'elapsedMs':round((time.monotonic()-t)*1000),'consecutiveFailures':failures}
  try:row['pod']=pods()
  except Exception as e:row['podError']=type(e).__name__
  for f in pathlib.Path('artifacts/operations/backups').glob('*.json'):
   x=json.loads(f.read_text())
   if x.get('metadataPath')==metadata:j=x;row['journal']={'path':str(f),'stage':x['stage'],'status':x['status']};break
  if j:
   try:row['remote']=remote(j['remotePath'])
   except Exception as e:row['remoteError']=type(e).__name__
  with(p/'observations.jsonl').open('a')as f:f.write(json.dumps(row)+'\n')
  if failures>=2:save('health-alert.json',row);print('HEALTH_CONSECUTIVE_FAILURE',flush=True)
  if time.monotonic()-start>200:raise RuntimeError('host monitor budget exceeded; inspect process before action')
  time.sleep(3)
 save('terminal.json',{'endedAt':now(),'exitCode':proc.returncode,'durationSeconds':round(time.monotonic()-start,2),'journal':j})
 if j:save('post-remote.json',remote(j['remotePath']))
 save('post-pod.json',pods())
 assert proc.returncode==0
