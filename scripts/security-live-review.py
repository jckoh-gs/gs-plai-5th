#!/usr/bin/env python3
"""Read-only live allowlist, secret-presence and output-leak checks; never prints secrets."""
import subprocess,json,pathlib,datetime,urllib.request,os,select,re,time
base=['kubectl','--context','charles-k3s','-n','gs-plai-5h']
# The template returns names/references only, never .value or Secret data values.
template='{{range .spec.template.spec.containers}}{{.name}}{{"\\n"}}{{range .env}}{{.name}}{{"\\n"}}{{end}}{{range .envFrom}}envFrom-reference-present{{"\\n"}}{{end}}{{end}}'
names=subprocess.check_output(base+['get','deployment','grid','-o','go-template='+template],text=True).splitlines()
secret_keys=subprocess.check_output(base+['get','secret','grid-secrets','-o','go-template={{range $key, $value := .data}}{{$key}}{{"\\n"}}{{end}}'],text=True).splitlines()
key_presence={'localProcessKmaKeyNamePresent':'KMA_AUTH_KEY' in os.environ,'deploymentKmaKeyNamePresent':'KMA_AUTH_KEY' in names,'deploymentEnvFromPresent':'envFrom-reference-present' in names,'secretKmaKeyNamePresent':any('kma' in name.lower() for name in secret_keys)}
token=pathlib.Path('artifacts/private/deploy/api-token').read_text().strip();assert token
secrets=[p.read_text().strip() for p in pathlib.Path('artifacts/private/deploy').iterdir() if p.name in ['api-token','mqtt-password','client-password']]
tunnel=subprocess.Popen(base+['port-forward','--address','127.0.0.1','service/grid',':3001'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
try:
 url_base=None;end=time.monotonic()+20
 while time.monotonic()<end and tunnel.poll() is None:
  if select.select([tunnel.stdout],[],[],.5)[0]:
   match=re.search(r'Forwarding from 127\.0\.0\.1:(\d+)',tunnel.stdout.readline())
   if match:url_base='http://127.0.0.1:'+match.group(1);break
 assert url_base,'Temporary read-only tunnel did not become ready'
 results=[]
 for path,auth in [('/api/config',False),('/api/health',False),('/api/guide',True),('/api/state',True)]:
  url=url_base+path
  with urllib.request.urlopen(urllib.request.Request(url,headers={'Authorization':'Bearer '+token} if auth else {}),timeout=10) as response:
   body=response.read().decode();headers=str(dict(response.headers));assert all(secret not in body+headers+response.url for secret in secrets)
   if path=='/api/config':assert sorted(json.loads(body))==['authRequired','version'] and json.loads(body)['authRequired'] is True
   results.append({'path':path,'status':response.status,'credentialAbsentInBodyHeadersURL':True})
 logs=subprocess.check_output(base+['logs','deployment/grid','-c','app','--tail=500'],text=True,stderr=subprocess.STDOUT);assert all(secret not in logs for secret in secrets)
 record={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'kmaPresenceOnly':key_presence,'apiChecks':results,'last500AppLogLinesCredentialAbsent':True,'limitations':['KMA presence is based on process env name, deployment env names, envFrom presence and Secret key names; no secret values are recorded.','No claim that all historical logs or arbitrary future output are secret-free.']}
 pathlib.Path('docs/security/evidence/live-security-review.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record,indent=2))
finally:
 tunnel.terminate()
 try:tunnel.wait(timeout=5)
 except subprocess.TimeoutExpired:tunnel.kill();tunnel.wait()
