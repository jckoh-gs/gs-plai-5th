import datetime, hashlib, json, os, shutil, subprocess
from pathlib import Path
root=Path.cwd();out=root/'artifacts/checkpoints/soak-1.7.1-first-hour'
def stamp(value): return datetime.datetime.fromisoformat(value.replace('Z','+00:00')).timestamp()
def prefix(file):
    rows=[]
    for raw in Path(file).read_text().splitlines(keepends=True):
        if not raw.endswith('\n'): break
        item=json.loads(raw);rows.append(item)
        if stamp(item['checkedAt'])-stamp(item['startedAt'])>=3600: return rows
    raise RuntimeError('First hour not yet observed; do not create checkpoint')
assert datetime.datetime.now(datetime.timezone.utc).timestamp()>=stamp('2026-09-21T18:59:55.011Z'),'First hour not yet observed; do not create checkpoint'
primary=prefix('artifacts/soak/v1.7.1/observations.jsonl')
audit_dir=Path('artifacts/soak/telemetry-audit/v1.7.1-20260921T1800')
audit=prefix(audit_dir/'observations.jsonl');run=json.loads(Path('docs/operations/run.json').read_text());resume=json.loads(Path('docs/operations/resume.json').read_text())
assert run['deployment']['productVersion']=='1.7.1'
assert run['deployment']['sourceCommit']=='40b9ed898f32037e7a87259d12d145457575a4a8'
assert primary[0]['sessionId']=='0ea34e34-e199-4b14-84ab-40ff75fa5d96'
assert audit[0]['sessionId']=='1e38bd3c-002a-49f4-9aa8-9039887b7889'
assert primary[0]['startedAt']=='2026-09-21T17:59:54.698Z'
assert audit[0]['startedAt']=='2026-09-21T17:59:55.011Z'
assert primary[0]['sessionId']==run['soak']['sessionId']
assert audit[0]['sessionId']==resume['supplementaryObservation']['sessionId']
assert all(x['sessionId']==primary[0]['sessionId'] for x in primary)
assert all(x['sessionId']==audit[0]['sessionId'] for x in audit)
for label in ['primary','audit','supervisor']:
    expected=resume['currentObservationProcesses'][label]
    identity=subprocess.check_output(['ps','-p',str(expected['pid']),'-o','lstart='],text=True,timeout=3).strip()
    assert identity==expected['processIdentity'],label
    os.kill(expected['pid'],0)
    if label in ['primary','audit']:
        assert expected['pid']=={'primary':57533,'audit':57534}[label]
        assert identity=='Tue Sep 22 02:59:54 2026'
    if label=='primary':
        command=subprocess.check_output(['ps','-p',str(expected['pid']),'-o','command='],text=True,timeout=3).strip()
        assert command=='node artifacts/checkpoints/observer-1.7.1-activation/source/primary/soak-monitor.mjs'
if out.exists():raise RuntimeError('Immutable checkpoint exists')
primary_source=Path('artifacts/checkpoints/observer-1.7.1-activation/source/primary')
primary_provenance=json.loads(Path('artifacts/checkpoints/soak-1.7.1-first-hour-preparation/primary-provenance.json').read_text())
for file,entry in primary_provenance['files'].items():
    assert hashlib.sha256(Path(file).read_bytes()).hexdigest()==entry['sha256'],'Prepared primary source changed'
source_directories=[primary_source,audit_dir/'source']
assert all(directory.is_dir() for directory in source_directories),'Required source directory absent'
for entry in audit[-1]['observerSources']:
    assert hashlib.sha256((audit_dir/entry['savedAs']).read_bytes()).hexdigest()==entry['sha256'],'Audit startup source changed'

def bounded(args,seconds=30):
    p=subprocess.run(['python3','scripts/deadline-command.py','--timeout-seconds',str(seconds),'--',*args],capture_output=True,text=True,timeout=seconds+8)
    if p.returncode:raise RuntimeError('Bounded read-only resource query failed')
    return p.stdout
pods=json.loads(bounded(['kubectl','--context','charles-k3s','-n','gs-plai-5h','get','pods','-l','app=grid','-o','json']))
active=[p for p in pods['items'] if not p['metadata'].get('deletionTimestamp')];assert len(active)==1;pod=active[0]
assert pod['metadata']['uid']=='75f4bc7a-0c4d-4cff-8ce2-cea68fd43cbc'
assert run['deployment']['appImage']=='127.0.0.1:15050/grid@sha256:234ec56ea49f5c734339746c795403898bdba3490da7fd7929de4c252d3a3876'
containers=pod['status']['containerStatuses'];app=next(c for c in containers if c['name']=='app');assert app['imageID']==run['deployment']['appImage'] and all(c['ready'] for c in containers)
resource_source="""import{statfsSync,statSync,readdirSync,lstatSync,existsSync}from'node:fs';const dir='/data',db=process.env.DB_PATH||'/data/lab.sqlite',f=statfsSync(dir),size=p=>existsSync(p)?statSync(p).size:0;console.log(JSON.stringify({observedAt:new Date().toISOString(),filesystemAvailableBytes:f.bavail*f.bsize,databaseBytes:size(db),walBytes:size(db+'-wal'),dataFileBytes:readdirSync(dir).map(n=>lstatSync(dir+'/'+n)).filter(s=>s.isFile()).reduce((n,s)=>n+s.size,0)}));"""
resource=json.loads(bounded(['kubectl','--context','charles-k3s','-n','gs-plai-5h','exec',pod['metadata']['name'],'-c','app','--','node','--input-type=module','-e',resource_source]))
resource.update({'scope':'Read-only; available host filesystem bytes are not reserved PVC capacity','pod':pod['metadata']['name'],'uid':pod['metadata']['uid'],'containers':[{'name':c['name'],'imageID':c['imageID'],'ready':c['ready'],'restarts':c['restartCount']} for c in containers]})
out.mkdir();(out/'source').mkdir()
for rows,name in [(primary,'primary'),(audit,'audit')]:
    (out/(name+'-observations.jsonl')).write_text(''.join(json.dumps(x)+'\n' for x in rows))
    (out/(name+'-boundary.json')).write_text(json.dumps(rows[-1],indent=2)+'\n')
for directory in source_directories:
    for source in directory.iterdir():
        if source.is_file():shutil.copyfile(source,out/'source'/source.name)
shutil.copyfile('artifacts/checkpoints/soak-1.7.1-first-hour-preparation/primary-provenance.json',out/'source/primary-provenance.json');shutil.copyfile(__file__,out/'source/capture-first-hour.py');(out/'source/resource-read.mjs').write_text(resource_source+'\n')
(out/'resource-observation.json').write_text(json.dumps(resource,indent=2)+'\n')
p=primary[-1];a=audit[-1]
summary={'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'runtimeCommit':run['deployment']['sourceCommit'],'scope':'Immutable first poll after one hour for each live observer; processes continue. Not uninterrupted uptime or full acceptance proof.','primary':{'sessionId':p['sessionId'],'startedAt':p['startedAt'],'through':p['checkedAt'],'durationSeconds':stamp(p['checkedAt'])-stamp(p['startedAt']),'observations':len(primary),**{k:p[k] for k in ['messages','invalid','duplicates','apiErrors','connectionErrors']},'maxPending':max(h['pending'] for x in primary for h in x.get('health',[])),'nonHealthyPolls':sum(any(h['health']!='HEALTHY' for h in x.get('health',[])) for x in primary),'apiUnavailablePolls':sum(x.get('apiReady') is False for x in primary),'minRssBytes':min(x['rssBytes'] for x in primary if 'rssBytes'in x),'maxRssBytes':max(x['rssBytes'] for x in primary if 'rssBytes'in x)},'supplementary':{'sessionId':a['sessionId'],'startedAt':a['startedAt'],'through':a['checkedAt'],'durationSeconds':stamp(a['checkedAt'])-stamp(a['startedAt']),'observations':len(audit),**{k:a[k] for k in ['received','invalidMessages','duplicateMessages','connectionErrors']},'rtus':[{k:x[k] for k in ['rtuId','samples','invalidMessages','sampleDiscontinuities','baselineDriftMessages','runTransitions']} for x in a['rtus']]},'incidentEvidence':[x['evidence'] for x in resume.get('currentObservationIncidents',[]) if x.get('runtime')=='1.7.1'],'interpretation':'Initial1.7.1 observercounterbaseline0; allcapturedcounterincrements and known1.7.1incidentreferences preserved. This is received-observation evidence, not every subscriber receipt or uninterrupted service proof; missingincidentlinks do not prove nooutage.','processesContinue':True,'primarySourceProvenance':primary_provenance}
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
(out/'sha256.json').write_text(json.dumps({str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file()},indent=2)+'\n')
print(json.dumps(summary,indent=2))
