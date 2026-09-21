#!/usr/bin/env python3
"""Isolated registry2 -> patched registry3 persistence / OCI push-pull test."""
import hashlib,json,subprocess,time,uuid,urllib.request,urllib.parse,urllib.error
name='grid-registry-sec-'+uuid.uuid4().hex[:10];volume=name+'-data';containers=[]
old='registry:2@sha256:a3d8aaa63ed8681a604f1dea0aa03f100d5895b6a58ace528858a7b332415373'
new='grid-registry:3.1.1-sec1'
def docker(*args):return subprocess.check_output(['docker',*args],text=True,stderr=subprocess.STDOUT).strip()
def request(base,method,path,data=None,headers=None):
 with urllib.request.urlopen(urllib.request.Request(urllib.parse.urljoin(base,path),data=data,method=method,headers=headers or {}),timeout=10) as r:return r.status,dict(r.headers),r.read()
def start(image,label):
 container=name+'-'+label;containers.append(container)
 docker('run','-d','--name',container,'--platform','linux/amd64','--user','1000:1000','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','-p','127.0.0.1::15050','-e','REGISTRY_HTTP_ADDR=0.0.0.0:15050','-v',volume+':/var/lib/registry',image)
 port=docker('port',container,'15050/tcp').split(':')[-1];base='http://127.0.0.1:'+port
 for _ in range(60):
  try:
   if request(base,'GET','/v2/')[0]==200:return container,base
  except (OSError,urllib.error.URLError):pass
  time.sleep(.25)
 raise RuntimeError('registry readiness timeout')
def push(base,tag):
 config=json.dumps({'architecture':'amd64','os':'linux','rootfs':{'type':'layers','diff_ids':[]},'config':{'Labels':{'test':tag}}},sort_keys=True).encode();digest='sha256:'+hashlib.sha256(config).hexdigest()
 _,headers,_=request(base,'POST','/v2/probe/blobs/uploads/',b'')
 location=headers.get('Location') or headers.get('location');location+=('&' if '?' in location else '?')+'digest='+urllib.parse.quote(digest)
 request(base,'PUT',location,config,{'Content-Type':'application/octet-stream'})
 manifest=json.dumps({'schemaVersion':2,'mediaType':'application/vnd.oci.image.manifest.v1+json','config':{'mediaType':'application/vnd.oci.image.config.v1+json','digest':digest,'size':len(config)},'layers':[]},sort_keys=True).encode();md='sha256:'+hashlib.sha256(manifest).hexdigest()
 request(base,'PUT','/v2/probe/manifests/'+tag,manifest,{'Content-Type':'application/vnd.oci.image.manifest.v1+json'})
 return (tag,config,digest,manifest,md)
def verify(base,item):
 tag,config,digest,manifest,md=item
 assert request(base,'GET','/v2/probe/blobs/'+digest)[2]==config
 assert request(base,'GET','/v2/probe/manifests/'+md,headers={'Accept':'application/vnd.oci.image.manifest.v1+json'})[2]==manifest
 assert request(base,'GET','/v2/probe/manifests/'+tag,headers={'Accept':'application/vnd.oci.image.manifest.v1+json'})[2]==manifest
try:
 docker('volume','create',volume)
 docker('run','--rm','--user','0','--entrypoint','sh','-v',volume+':/data','eclipse-mosquitto:2@sha256:6f8d8a947c506f8a2290ec65cd4bd2bc7cb4d43fb5f6271f861cb013e2ef9797','-c','chown 1000:1000 /data')
 c,b=start(old,'old');first=push(b,'before-upgrade');verify(b,first);docker('stop',c)
 c,b=start(new,'new');verify(b,first);second=push(b,'after-upgrade');verify(b,second)
 docker('exec',c,'/healthcheck');docker('restart',c)
 b='http://127.0.0.1:'+docker('port',c,'15050/tcp').split(':')[-1]
 last_error=None
 for _ in range(40):
  try:verify(b,first);verify(b,second);break
  except Exception as error:last_error=error;time.sleep(.25)
 else:raise RuntimeError('post-restart persistence check failed: '+str(last_error))
 print(json.dumps({'result':'PASS','oldImage':old,'newImage':new,'checks':['registry2 OCI push + digest pull','existing v2 data readable by patched3','patched3 OCI push + digest pull','nonroot read-only no-capability runtime','healthcheck binary','restart persistence']},indent=2))
finally:
 for c in containers:
  subprocess.run(['docker','rm','-f',c],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 subprocess.run(['docker','volume','rm',volume],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
