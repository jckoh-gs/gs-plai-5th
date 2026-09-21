import json,pathlib,subprocess as s,time,datetime,urllib.request
p=pathlib.Path('deploy/verification/candidate-40b9ed8/outbox-observation');k=['kubectl','--context','charles-k3s','-n','gs-plai-5h'];start=time.monotonic();end=min(start+320,start+max(0,datetime.datetime.fromisoformat(json.load(open('docs/operations/run.json'))['deadlineAt']).timestamp()-time.time()));rows=[]
while time.monotonic()<end:
 row={'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 try:
  d=json.loads(s.check_output(k+['get','pods','-l','app=grid','-o','json'],timeout=min(10,max(.1,end-time.monotonic()))));row['pods']=[{'name':x['metadata']['name'],'uid':x['metadata']['uid'],'deleting':bool(x['metadata'].get('deletionTimestamp')),'phase':x['status'].get('phase'),'containers':[{q:c.get(q)for q in ['name','ready','restartCount','imageID']}for c in x['status'].get('containerStatuses',[])]}for x in d['items']]
 except Exception as e:row['podError']=type(e).__name__
 t=time.monotonic()
 try:
  h=json.load(urllib.request.urlopen('http://127.0.0.1:3104/api/health',timeout=3));row['health']={'status':h['status'],'version':h['version'],'mqttConnected':h['mqtt']['connected'],'elapsedMs':round((time.monotonic()-t)*1000)}
 except Exception as e:
  row['health']={'errorType':type(e).__name__,'elapsedMs':round((time.monotonic()-t)*1000)}
  ready=[x for x in row.get('pods',[])if not x['deleting']and any(c['name']=='app'and c['ready']for c in x['containers'])]
  if ready:
   code="try{const r=await fetch('http://127.0.0.1:3001/api/health',{signal:AbortSignal.timeout(2000)});const h=await r.json();console.log(JSON.stringify({status:r.status,version:h.version,mqttConnected:h.mqtt.connected}))}catch(e){console.log(JSON.stringify({errorType:e.name}))}"
   try:row['internalHealth']=json.loads(s.check_output(k+['exec',ready[0]['name'],'-c','app','--','node','--input-type=module','-e',code],timeout=4))
   except Exception as e:row['internalHealth']={'errorType':type(e).__name__}
 rows.append(row)
 with(p/'observations.jsonl').open('a')as f:f.write(json.dumps(row)+'\n')
 proof=p.parent/'outbox-restart.json'
 if proof.exists() and json.loads(proof.read_text()).get('result')=='PASS' and row['health'].get('status')=='ok' and row['health'].get('version')=='1.7.1' and all(c['ready'] for x in row.get('pods',[]) for c in x['containers']):
  (p/'stop-request.json').write_text(json.dumps({'proof':'../outbox-restart.json','proofPASS':True,'newReadyAndAPIRecovered':True})+'\n');break
 time.sleep(min(3,max(0,end-time.monotonic())))
(p/'summary.json').write_text(json.dumps({'result':'OBSERVED','readOnly':True,'startedAt':rows[0]['at']if rows else None,'endedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'samples':len(rows),'podUIDs':sorted({x['uid']for r in rows for x in r.get('pods',[])}),'localHealthErrors':sum('errorType'in r['health']for r in rows),'stopReason':'root-confirmed-terminal'if(p/'stop-request.json').exists()else'bounded320seconds','limitation':'Observation begins after delegation; may miss earlier planned replacement. Root operation proof establishes full transition.'},indent=2)+'\n')
