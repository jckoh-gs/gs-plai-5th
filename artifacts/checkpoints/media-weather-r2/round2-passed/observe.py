import pathlib,json,urllib.request,time,datetime
p=pathlib.Path('artifacts/private/media-weather-r2');o=pathlib.Path('artifacts/media-preparation/weather-r2-round2');token=(p/'api-token').read_text().strip();name=json.loads((o/'config.json').read_text())['lifecycle']['registration']['name'];end=time.monotonic()+360
with (o/'weather-observations.jsonl').open('x') as f:
 while time.monotonic()<end:
  req=urllib.request.Request('http://127.0.0.1:3113/api/state',headers={'Authorization':'Bearer '+token});s=json.load(urllib.request.urlopen(req,timeout=5));plant=next((x for x in s['plants'] if x['name']==name),None)
  if plant:
   row={k:plant.get(k) for k in ['id','runId','mode','weather','weatherSource','weatherObservedAt','generators','history']};row['observedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();row['history']=row['history'][-1:];f.write(json.dumps(row,ensure_ascii=False)+'\n');f.flush()
  if (o/'verification.json').exists():break
  time.sleep(.5)
print('observer terminal')
