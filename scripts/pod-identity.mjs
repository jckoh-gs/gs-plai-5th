import assert from 'node:assert/strict';
export function verifiedAppPod(pods,expectedImage,containerName='app'){
 const digest=expectedImage?.match(/@sha256:([a-f0-9]{64})$/)?.[1];assert(digest,'Expected immutable image digest required');
 const ready=pods.items.filter(p=>!p.metadata.deletionTimestamp&&p.status?.conditions?.some(c=>c.type==='Ready'&&c.status==='True'));
 assert.equal(ready.length,1,'Exactly one Ready app pod required');const p=ready[0],spec=p.spec.containers.find(c=>c.name===containerName),status=p.status.containerStatuses.find(c=>c.name===containerName);
 assert.equal(spec?.image,expectedImage,'Actual pod image differs from expected deployment');assert(status?.ready,'App container must be ready');assert(status.imageID?.endsWith('sha256:'+digest),'Running container digest differs from expected image');
 return {name:p.metadata.name,uid:p.metadata.uid,image:spec.image,imageID:status.imageID};
}
