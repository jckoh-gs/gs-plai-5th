// Final media must bind to the same recorded runtime and immutable release.
module.exports=function assertFinalRelease(config,manifest,run,now=Date.now()){
 const freeze=Date.parse(run.freezeAt),deadline=Date.parse(run.deadlineAt);
 if(!Number.isFinite(now)||!Number.isFinite(freeze)||!Number.isFinite(deadline)||freeze>=deadline||now<freeze||now>deadline)throw Error('Final media requires the valid frozen final window');
 if(!/^[a-f0-9]{40}$/.test(manifest.source?.commit||'')||config.approvedReleaseCommit!==manifest.source.commit)throw Error('Approved release commit differs from manifest');
 const digest=value=>typeof value==='string'?value.match(/(?:^|@)(sha256:[a-f0-9]{64})$/)?.[1]:null;
 const expected=digest(manifest.deployment?.appImage);
 if(!expected||digest(config.approvedImageDigest)!==expected)throw Error('Approved image digest differs from manifest');
 if(!manifest.runId||manifest.runId!==run.runId)throw Error('Release belongs to a different run');
 const deployed=manifest.deployment,current=run.deployment;
 if(!current||current.appImage!==deployed.appImage||current.sourceCommit!==deployed.sourceCommit||manifest.runtimeIdentity?.commit!==deployed.sourceCommit)throw Error('Recorded runtime differs from release');
 if(deployed.context!=='charles-k3s'||deployed.namespace!=='gs-plai-5h'||current.context!==deployed.context||current.namespace!==deployed.namespace)throw Error('Deployment target differs from verified scope');
 if(current.productVersion!==manifest.productVersion||deployed.productVersion!==manifest.productVersion)throw Error('Recorded product version differs from release');
 if(new URL(config.baseUrl).href!==new URL(current.uiTunnel).href||new URL(config.mqtt?.url).href!==new URL(current.mqttTunnel).href)throw Error('Recording endpoints differ from the verified deployment');
 return {releaseCommit:manifest.source.commit,runtimeCommit:deployed.sourceCommit,imageDigest:expected,runId:run.runId};
};
