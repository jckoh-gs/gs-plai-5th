import pathlib,subprocess,hashlib,json,datetime,time,sys
p=pathlib.Path(__file__).resolve().parent
model=p/'ggml-small.bin'
assert hashlib.sha256(model.read_bytes()).hexdigest()=='1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b'
name=sys.argv[1]; assert name in ['short','full']
out=p/('asr-'+name); assert not out.with_suffix('.json').exists()
cmd=[str(p/'build/bin/whisper-cli'),'-m',str(model),'-f',str(p/(name+'.wav')),'-l','ko','-t','4','-ng','-oj','-otxt','-osrt','-of',str(out)]
start=datetime.datetime.now(datetime.timezone.utc).isoformat();a=time.monotonic()
with (p/(name+'-asr.log')).open('x') as log:r=subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,timeout=480)
result={'command':cmd,'startedAt':start,'endedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-a,'exitCode':r.returncode,'promptProvided':False}
if r.returncode==0:
 d=json.loads(out.with_suffix('.json').read_text());rows=d['transcription'];assert rows and any(x['text'].strip() for x in rows)
 duration=20 if name=='short' else 255.33
 for x in rows: assert 0<=x['offsets']['from']<=x['offsets']['to']<=(duration+1)*1000
 result['segments']=len(rows);result['nonemptyAndBoundsValidated']=True
result['outputs']=[{'file':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in p.glob('asr-'+name+'.*')]
(p/(name+'-receipt.json')).write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));assert r.returncode==0
