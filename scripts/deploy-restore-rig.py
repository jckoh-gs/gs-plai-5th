#!/usr/bin/env python3
"""Create isolated recovery proof from the immutable, consistent remote backup."""
import argparse,json,subprocess,copy
p=argparse.ArgumentParser();p.add_argument('--image',required=True);p.add_argument('--backup',default='pre-security-79c996f.sqlite');a=p.parse_args()
if '/' in a.backup or '..' in a.backup:raise SystemExit('Backup must be a basename on grid-data PVC')
if not a.image.startswith('127.0.0.1:15050/grid@sha256:'):raise SystemExit('Immutable app image required')
k=['kubectl','--context','charles-k3s','-n','gs-plai-5h']
live=json.loads(subprocess.check_output(k+['get','deployment','grid','-o','json']))
spec=copy.deepcopy(live['spec']);spec['selector']['matchLabels']={'app':'grid-restore'};spec['template']['metadata']={'labels':{'app':'grid-restore'}};pod=spec['template']['spec']
for c in pod['containers']:
 if c['name']=='app':c['image']=a.image;c['env'].append({'name':'SEED_DEMO','value':'false'})
for v in pod['volumes']:
 if v['name']=='data':v['persistentVolumeClaim']['claimName']='grid-restore-data'
 if v['name']=='mqtt-data':v['persistentVolumeClaim']['claimName']='grid-restore-mqtt-data'
pod['volumes'].append({'name':'backup-source','persistentVolumeClaim':{'claimName':'grid-data','readOnly':True}})
code="import{copyFileSync,existsSync,chmodSync}from'node:fs';import{DatabaseSync}from'node:sqlite';const dest='/restore/lab.sqlite';if(!existsSync(dest)){copyFileSync('/backup/"+a.backup+"',dest);chmodSync(dest,0o600);}const db=new DatabaseSync(dest,{readOnly:true});if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Restored database integrity failed');db.close();console.log('Isolated recovery database integrity ok');"
pod['initContainers']=[{'name':'restore-database','image':a.image,'command':['node','--input-type=module','-e',code],'securityContext':{'allowPrivilegeEscalation':False,'readOnlyRootFilesystem':True,'capabilities':{'drop':['ALL']}},'resources':{'requests':{'cpu':'50m','memory':'64Mi'},'limits':{'cpu':'1','memory':'256Mi'}},'volumeMounts':[{'name':'backup-source','mountPath':'/backup','readOnly':True},{'name':'data','mountPath':'/restore'}]}]
items=[]
for name,size in [('grid-restore-data','5Gi'),('grid-restore-mqtt-data','1Gi')]:items.append({'apiVersion':'v1','kind':'PersistentVolumeClaim','metadata':{'name':name,'namespace':'gs-plai-5h'},'spec':{'accessModes':['ReadWriteOnce'],'storageClassName':'local-path','resources':{'requests':{'storage':size}}}})
items.append({'apiVersion':'apps/v1','kind':'Deployment','metadata':{'name':'grid-restore','namespace':'gs-plai-5h'},'spec':spec})
items.append({'apiVersion':'networking.k8s.io/v1','kind':'NetworkPolicy','metadata':{'name':'grid-restore-private','namespace':'gs-plai-5h'},'spec':{'podSelector':{'matchLabels':{'app':'grid-restore'}},'policyTypes':['Ingress'],'ingress':[]}})
manifest={'apiVersion':'v1','kind':'List','items':items}
subprocess.run(k+['apply','-f','-'],input=json.dumps(manifest),text=True,check=True)
subprocess.run(k+['rollout','status','deployment/grid-restore','--timeout=180s'],check=True)
