#!/usr/bin/env python3
"""Push a buildx OCI archive to the private loopback registry through kubectl."""
import argparse,json,tarfile,urllib.request,urllib.error,urllib.parse
p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('tag');p.add_argument('--registry',default='http://127.0.0.1:15050');p.add_argument('--repository',default='grid');a=p.parse_args()
base=a.registry.rstrip('/')+'/v2/'+a.repository
def request(method,url,data=None,headers=None):
    return urllib.request.urlopen(urllib.request.Request(url,data=data,method=method,headers=headers or {}),timeout=180)
with tarfile.open(a.archive) as t:
    def blob(d):return t.extractfile('blobs/'+d.replace(':','/')).read()
    idx=json.load(t.extractfile('index.json'));desc=idx['manifests'][0];manifest=blob(desc['digest']);m=json.loads(manifest)
    for d in [m['config']]+m['layers']:
        digest=d['digest']
        try: request('HEAD',base+'/blobs/'+digest);continue
        except urllib.error.HTTPError as e:
            if e.code!=404:raise
        r=request('POST',base+'/blobs/uploads/',b'');loc=urllib.parse.urljoin(a.registry,r.headers['Location'])
        data=blob(digest)
        for offset in range(0,len(data),4*1024*1024):
            r=request('PATCH',loc,data[offset:offset+4*1024*1024],{'Content-Type':'application/octet-stream'})
            loc=urllib.parse.urljoin(a.registry,r.headers['Location'])
            print('progress',digest,min(offset+4*1024*1024,len(data)),'/',len(data),flush=True)
        loc+=('&' if '?' in loc else '?')+'digest='+urllib.parse.quote(digest)
        request('PUT',loc,b'',{'Content-Type':'application/octet-stream'})
        print('uploaded',digest,flush=True)
    r=request('PUT',base+'/manifests/'+a.tag,manifest,{'Content-Type':m['mediaType']});print('IMAGE=127.0.0.1:15050/'+a.repository+'@'+r.headers['Docker-Content-Digest'])
