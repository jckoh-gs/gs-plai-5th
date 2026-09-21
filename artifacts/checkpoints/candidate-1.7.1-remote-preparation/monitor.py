"""Read-only proof of the exact supplied 1.7.1 monitor against the deployed broker.
Run only through scripts/deadline-command.py (40 seconds) to bound complete HTTP bodies
and withhold failure diagnostics. Preflight never spawns the monitor. Actual mode requires the exact Ready image.
The monitor does not dispatch commands or disconnect any deployed device.
"""
import datetime, hashlib, json, os, pathlib, selectors, subprocess, sys, time, urllib.request
ROOT=pathlib.Path.cwd();EXPECTED='127.0.0.1:15050/grid@sha256:234ec56ea49f5c734339746c795403898bdba3490da7fd7929de4c252d3a3876';COMMIT='40b9ed898f32037e7a87259d12d145457575a4a8';RTU='f49684af-b7dd-47b2-b360-8e7d28ef751b'
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**k):raise RuntimeError('Redirect refused')
http=urllib.request.build_opener(NoRedirect());token=(ROOT/'artifacts/private/deploy/api-token').read_text().strip()
def api(path):
 return json.loads(http.open(urllib.request.Request('http://127.0.0.1:3104'+path,headers={'Authorization':'Bearer '+token}),timeout=8).read())
def identity():
 result=subprocess.run(['kubectl','--context','charles-k3s','-n','gs-plai-5h','get','pods','-l','app=grid','-o','json'],capture_output=True,timeout=10)
 if result.returncode:raise RuntimeError('Read-only pod query failed')
 pods=[p for p in json.loads(result.stdout)['items'] if not p['metadata'].get('deletionTimestamp')];assert len(pods)==1
 pod=pods[0];cs=pod['status']['containerStatuses'];app=next(c for c in cs if c['name']=='app');return {'podUID':pod['metadata']['uid'],'imageID':app['imageID'],'ready':all(c['ready'] for c in cs)}
state=api('/api/state');pod=identity();eligible=state['version']=='1.7.1' and pod['imageID']==EXPECTED and pod['ready']
if '--preflight' in sys.argv:
 print(json.dumps({'result':'ELIGIBLE' if eligible else 'NOT_ELIGIBLE','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'actualVersion':state['version'],**pod,'monitorSpawned':False,'mainMutations':False,'expectedVersion':'1.7.1'},indent=2));sys.exit(0)
assert eligible,'Actual candidate not ready; monitor not started'
source={}
for name in ['scripts/vpp-client.js','scripts/client-message.js']:
 data=(ROOT/name).read_bytes();assert data==subprocess.check_output(['git','show',COMMIT+':'+name],timeout=5);source[name]=hashlib.sha256(data).hexdigest()
assert RTU in [p['id'] for p in state['plants']]
env={**os.environ,'MQTT_URL':'mqtt://127.0.0.1:18884','MQTT_PREFIX':'vpp','MQTT_USERNAME':'vpp-client','MQTT_PASSWORD':(ROOT/'artifacts/private/deploy/client-password').read_text().strip(),'RTU_ID':RTU,'VPP_REPORT_FILE':'','VPP_CONNECT_TIMEOUT_MS':'5000'}
child=subprocess.Popen(['node','scripts/vpp-client.js'],env=env,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL);selector=selectors.DefaultSelector();selector.register(child.stdout,selectors.EVENT_READ);buf=b'';online=None;total=0;exitcode=None
try:
 until=time.monotonic()+10
 while time.monotonic()<until and child.poll() is None and online is None:
  for key,_ in selector.select(min(.25,max(0,until-time.monotonic()))):
   chunk=os.read(key.fd,4096)
   if not chunk:continue
   total+=len(chunk);assert total<128000,'Unexpected monitor output limit';buf+=chunk
   while b'\n' in buf:
    line,buf=buf.split(b'\n',1)
    try:record=json.loads(line)
    except (ValueError,UnicodeDecodeError):continue
    if record.get('kind')=='status':
     assert record.get('rtuId')==RTU and record.get('status') is None
     if record.get('online') is True:online={k:record.get(k) for k in ['kind','rtuId','online','status','timestamp','serverVersion']}
 assert online is not None,'No online status observation within bound'
 child.terminate();exitcode=child.wait(timeout=4);assert exitcode==0
finally:
 selector.close()
 if child.poll() is None:
  child.terminate()
  try:child.wait(timeout=3)
  except subprocess.TimeoutExpired:child.kill();child.wait(timeout=3)
 child.stdout.close()
after=identity();assert after==pod;assert api('/api/state')['version']=='1.7.1'
print(json.dumps({'result':'PASS','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'actualVersion':'1.7.1',**pod,'monitorSourceCommit':COMMIT,'sourceHashes':source,'observed':online,'monitorExitCode':exitcode,'remotePodUnchanged':True,'mainMutations':False,'scope':'Exact committed local supplied monitor subscribes to actual candidate broker; no --dispatch and no device disconnection. The client output does not expose the MQTT retain flag, so this observation does not establish retained delivery. Online is not a guarantee of current device-health or missed-session delivery. Actual offline/LWT was separately verified in isolated exact image.'},indent=2))
