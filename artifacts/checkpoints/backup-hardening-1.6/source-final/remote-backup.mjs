import {verifiedAppPod} from './pod-identity.mjs';
import {backupBudget,SNAPSHOT_SOURCE,METADATA_SOURCE,CHUNK_SOURCE} from './remote-backup-helpers.mjs';
import {mkdirSync,writeFileSync,existsSync,renameSync,readFileSync,appendFileSync,createReadStream,createWriteStream,statSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createGunzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
const k=['--context','charles-k3s','-n','gs-plai-5h'];
const run=JSON.parse(readFileSync('docs/operations/run.json'));
const budget=backupBudget({deadlineAt:run.deadlineAt});
const sourceCommit=process.env.BACKUP_SOURCE_COMMIT||run.deployment?.sourceCommit;
assert(/^[a-f0-9]{7,40}$/.test(sourceCommit||''),'Verified runtime source commit required');
const suffix=new Date().toISOString().replace(/[-:.]/g,''),remote=process.env.REMOTE_BACKUP_PATH||`/data/stable-${sourceCommit.slice(0,7)}-${suffix}.sqlite`;
assert(/^\/data\/stable-[a-f0-9]{7}-[A-Za-z0-9]+\.sqlite$/.test(remote));assert(remote.startsWith(`/data/stable-${sourceCommit.slice(0,7)}-`),'Backup path/source mismatch');
const local='artifacts/private/backups/'+remote.split('/').at(-1),hash=b=>createHash('sha256').update(b).digest('hex');
const remoteCompressed=remote+'.'+suffix+'.gz';
const output=process.env.BACKUP_METADATA_PATH||`deploy/verification/stable-backup-${sourceCommit.slice(0,7)}-${suffix}.json`;
assert(!existsSync(output),'Refuse to overwrite prior backup evidence');
mkdirSync('artifacts/operations/backups',{recursive:true});
const journalPath=`artifacts/operations/backups/${suffix}.json`;
const journal={runId:run.runId,startedAt:new Date(budget.startedAt).toISOString(),stopAt:new Date(budget.stopAt).toISOString(),deadlineAt:run.deadlineAt,sourceCommit,remotePath:remote,remotePartialPath:remote+'.snapshot.part',remoteCompressedPath:remoteCompressed,localPath:local,metadataPath:output,status:'running',stage:'discovery',remoteCancellationGuaranteed:false};
const saveJournal=()=>{writeFileSync(journalPath+'.part',JSON.stringify(journal,null,2)+'\n',{mode:0o600});renameSync(journalPath+'.part',journalPath);};
saveJournal();
const command=async(args,stage,timeout=20000)=>{journal.stage=stage;saveJournal();return budget.exec('kubectl',[...k,...args],{stage,timeout});};
try {
const deployment=JSON.parse(await command(['get','deployment','grid','-o','json'],'deployment discovery'));
const appImage=deployment.spec.template.spec.containers.find(c=>c.name==='app').image;
const expectedImage=process.env.BACKUP_APP_IMAGE||run.deployment?.appImage;
assert(expectedImage&&appImage===expectedImage,'Deployed image must match the recorded backup source');
const inspectPod=async()=>verifiedAppPod(JSON.parse(await command(['get','pods','-l','app=grid','-o','json'],'Ready pod identity')),expectedImage);const verifiedTransferPod=await inspectPod();
const node=(code,args=[],stage='remote execution',timeout=20000)=>command(['exec',verifiedTransferPod.name,'-c','app','--','node','--input-type=module','-e',code,...args],stage,timeout);
if(!process.env.REMOTE_BACKUP_PATH){
  const snapshot=JSON.parse(await node(SNAPSHOT_SOURCE,[remote,String(budget.stopAt)],'snapshot creation',90000));
  assert.equal(snapshot.result,'PASS');assert.equal(snapshot.workerExitConfirmed,true);assert.equal(snapshot.integrity,'ok');
  journal.snapshot={...snapshot,supervisorMaxMs:80000,hostCommandMaxMs:90000};saveJournal();
}
const meta=JSON.parse(await node(METADATA_SOURCE,[remote,String(budget.stopAt),remoteCompressed],'snapshot integrity and compression',90000));
mkdirSync('artifacts/private/backups',{recursive:true});const compressedFile=local+'.'+suffix+'.gz.part',rawFile=local+'.'+suffix+'.part';writeFileSync(compressedFile,'',{mode:0o600,flag:'wx'});
let verifiedChunks=0;const chunkSize=1024*1024,compressedHash=createHash('sha256');
for(let offset=0;offset<meta.compressedBytes;offset+=chunkSize){let complete=false;for(let attempt=0;attempt<3&&!complete;attempt++){budget.check();try{const part=JSON.parse(await node(CHUNK_SOURCE,[remoteCompressed,String(offset),String(Math.min(chunkSize,meta.compressedBytes-offset))],'compressed chunk transfer',15000));const bytes=Buffer.from(part.base64,'base64');assert.equal(bytes.length,part.bytes);assert.equal(hash(bytes),part.sha256);assert.equal(bytes.length,Math.min(chunkSize,meta.compressedBytes-offset));budget.check();appendFileSync(compressedFile,bytes);compressedHash.update(bytes);verifiedChunks++;complete=true;}catch(e){if(attempt===2)throw e;}}}
assert.equal(statSync(compressedFile).size,meta.compressedBytes);assert.equal(compressedHash.digest('hex'),meta.compressedSha256);
await pipeline(createReadStream(compressedFile),createGunzip(),createWriteStream(rawFile,{mode:0o600,flags:'wx'}),{signal:AbortSignal.timeout(Math.ceil(budget.check()))});assert.equal(statSync(rawFile).size,meta.bytes);const rawHash=createHash('sha256');for await(const chunk of createReadStream(rawFile)){budget.check();rawHash.update(chunk);}assert.equal(rawHash.digest('hex'),meta.sha256);
const verify=new DatabaseSync(rawFile,{readOnly:true});try{assert.equal(verify.prepare('PRAGMA integrity_check').get().integrity_check,'ok');}finally{verify.close();}
budget.check();
const after=JSON.parse(await command(['get','deployment','grid','-o','json'],'final deployment identity'));assert.equal(after.spec.template.spec.containers.find(c=>c.name==='app').image,appImage,'Image changed during backup');
assert.deepEqual(await inspectPod(),verifiedTransferPod,'Ready pod changed during backup');
budget.check();if(existsSync(local))renameSync(local,local+'.previous-transfer-'+Date.now());renameSync(rawFile,local);unlinkSync(compressedFile);
const db=new DatabaseSync(local,{readOnly:true});assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');const plants=db.prepare('SELECT count(*) AS n FROM plants').get().n,pending=db.prepare('SELECT count(*) AS n FROM outbox WHERE acked IS NULL').get().n;db.close();

budget.check();
const result={result:'PASS',capturedAt:meta.capturedAt,verifiedAt:new Date().toISOString(),sourceCommit,appImage,verifiedTransferPod,podVerificationStage:'transfer',remotePath:remote,localPath:local,bytes:meta.bytes,sha256:meta.sha256,compressedBytes:meta.compressedBytes,verifiedChunks,transferChunkBytes:chunkSize,remoteCompressionPeakRssBytes:meta.peakRssBytes,localPeakRssBytes:process.resourceUsage().maxRSS*1024,integrity:'ok',plants,pending,snapshot:journal.snapshot??null,snapshotCreation:journal.snapshot?'new-supervised':'existing-final-retransfer',method:(journal.snapshot?'fixed WAL read snapshot; supervised node:sqlite backup; ':'Existing completed snapshot; capture method not re-established; ')+'streaming gzip and disk-backed chunk+whole SHA256 verification; private0600 copy',timePolicy:{startedAt:journal.startedAt,stopAt:journal.stopAt,deadlineAt:run.deadlineAt,remoteCancellationGuaranteed:false}};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});journal.status='verified';journal.stage='complete';journal.verifiedAt=result.verifiedAt;saveJournal();console.log(JSON.stringify({...result,metadataPath:output,operationJournal:journalPath},null,2));
} catch(error) {
  journal.status='incomplete';journal.failedAt=new Date().toISOString();saveJournal();
  console.error(`Backup incomplete at ${journal.stage}; operation journal: ${journalPath}. Existing verified backups remain available.`);
  // Parsing/validation errors may embed remote stdout, including database bytes.
  process.exitCode=1;
}
