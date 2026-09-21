import {verifiedAppPod} from './pod-identity.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdirSync,writeFileSync,existsSync,renameSync,readFileSync,appendFileSync,createReadStream,createWriteStream,statSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createGunzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
const exec=promisify(execFile),k=['--context','charles-k3s','-n','gs-plai-5h'];
const run=JSON.parse(readFileSync('docs/operations/run.json'));
const sourceCommit=process.env.BACKUP_SOURCE_COMMIT||run.deployment?.sourceCommit;
assert(/^[a-f0-9]{7,40}$/.test(sourceCommit||''),'Verified runtime source commit required');
const deployment=JSON.parse((await exec('kubectl',[...k,'get','deployment','grid','-o','json'])).stdout);
const appImage=deployment.spec.template.spec.containers.find(c=>c.name==='app').image;
const expectedImage=process.env.BACKUP_APP_IMAGE||run.deployment?.appImage;
assert(expectedImage&&appImage===expectedImage,'Deployed image must match the recorded backup source');
const inspectPod=async()=>verifiedAppPod(JSON.parse((await exec('kubectl',[...k,'get','pods','-l','app=grid','-o','json'])).stdout),expectedImage);const verifiedTransferPod=await inspectPod();
const suffix=new Date().toISOString().replace(/[-:.]/g,''),remote=process.env.REMOTE_BACKUP_PATH||`/data/stable-${sourceCommit.slice(0,7)}-${suffix}.sqlite`;
assert(/^\/data\/stable-[a-f0-9]{7}-[A-Za-z0-9]+\.sqlite$/.test(remote));assert(remote.startsWith(`/data/stable-${sourceCommit.slice(0,7)}-`),'Backup path/source mismatch');const local='artifacts/private/backups/'+remote.split('/').at(-1),hash=b=>createHash('sha256').update(b).digest('hex');
const node=async(code,args=[])=>(await exec('kubectl',[...k,'exec',verifiedTransferPod.name,'-c','app','--','node','--input-type=module','-e',code,...args],{maxBuffer:8*1024*1024})).stdout;
if(!process.env.REMOTE_BACKUP_PATH)await node(`import{DatabaseSync,backup}from'node:sqlite';import{existsSync,chmodSync}from'node:fs';if(existsSync(process.argv[1]))throw Error('Backup path already exists');const db=new DatabaseSync(process.env.DB_PATH,{readOnly:true});await backup(db,process.argv[1]);chmodSync(process.argv[1],0o600);db.close();console.log('backup complete');`,[remote]);
const meta=JSON.parse(await node(`import{DatabaseSync}from'node:sqlite';import{createReadStream,createWriteStream,statSync,renameSync}from'node:fs';import{createGzip}from'node:zlib';import{pipeline}from'node:stream/promises';import{createHash}from'node:crypto';const p=process.argv[1],db=new DatabaseSync(p,{readOnly:true});if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Remote integrity failed');db.close();const digest=async path=>{const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');};await pipeline(createReadStream(p),createGzip(),createWriteStream(p+'.gz.part',{mode:0o600}));renameSync(p+'.gz.part',p+'.gz');console.log(JSON.stringify({bytes:statSync(p).size,sha256:await digest(p),compressedBytes:statSync(p+'.gz').size,compressedSha256:await digest(p+'.gz'),capturedAt:statSync(p).mtime.toISOString(),peakRssBytes:process.resourceUsage().maxRSS*1024}));`,[remote]));
mkdirSync('artifacts/private/backups',{recursive:true});const compressedFile=local+'.'+suffix+'.gz.part',rawFile=local+'.'+suffix+'.part';writeFileSync(compressedFile,'',{mode:0o600,flag:'wx'});
let verifiedChunks=0;const chunkSize=256*1024,compressedHash=createHash('sha256');
for(let offset=0;offset<meta.compressedBytes;offset+=chunkSize){let complete=false;for(let attempt=0;attempt<3&&!complete;attempt++){try{const part=JSON.parse(await node(`import{openSync,readSync,closeSync}from'node:fs';import{createHash}from'node:crypto';const f=openSync(process.argv[1]),b=Buffer.alloc(Number(process.argv[3]));const n=readSync(f,b,0,b.length,Number(process.argv[2]));closeSync(f);const data=b.subarray(0,n),text=JSON.stringify({bytes:n,sha256:createHash('sha256').update(data).digest('hex'),base64:data.toString('base64')})+String.fromCharCode(10);await new Promise((resolve,reject)=>process.stdout.write(text,e=>e?reject(e):resolve()));`,[remote+'.gz',String(offset),String(Math.min(chunkSize,meta.compressedBytes-offset))]));const bytes=Buffer.from(part.base64,'base64');assert.equal(bytes.length,part.bytes);assert.equal(hash(bytes),part.sha256);assert.equal(bytes.length,Math.min(chunkSize,meta.compressedBytes-offset));appendFileSync(compressedFile,bytes);compressedHash.update(bytes);verifiedChunks++;complete=true;}catch(e){if(attempt===2)throw e;}}}
assert.equal(statSync(compressedFile).size,meta.compressedBytes);assert.equal(compressedHash.digest('hex'),meta.compressedSha256);
await pipeline(createReadStream(compressedFile),createGunzip(),createWriteStream(rawFile,{mode:0o600,flags:'wx'}));assert.equal(statSync(rawFile).size,meta.bytes);const rawHash=createHash('sha256');for await(const chunk of createReadStream(rawFile))rawHash.update(chunk);assert.equal(rawHash.digest('hex'),meta.sha256);
const verify=new DatabaseSync(rawFile,{readOnly:true});try{assert.equal(verify.prepare('PRAGMA integrity_check').get().integrity_check,'ok');}finally{verify.close();}
const after=JSON.parse((await exec('kubectl',[...k,'get','deployment','grid','-o','json'])).stdout);assert.equal(after.spec.template.spec.containers.find(c=>c.name==='app').image,appImage,'Image changed during backup');
assert.deepEqual(await inspectPod(),verifiedTransferPod,'Ready pod changed during backup');
if(existsSync(local))renameSync(local,local+'.previous-transfer-'+Date.now());renameSync(rawFile,local);unlinkSync(compressedFile);
const db=new DatabaseSync(local,{readOnly:true});assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');const plants=db.prepare('SELECT count(*) AS n FROM plants').get().n,pending=db.prepare('SELECT count(*) AS n FROM outbox WHERE acked IS NULL').get().n;db.close();

const result={result:'PASS',capturedAt:meta.capturedAt,verifiedAt:new Date().toISOString(),sourceCommit,appImage,verifiedTransferPod,podVerificationStage:'transfer',remotePath:remote,localPath:local,bytes:meta.bytes,sha256:meta.sha256,compressedBytes:meta.compressedBytes,verifiedChunks,remoteCompressionPeakRssBytes:meta.peakRssBytes,localPeakRssBytes:process.resourceUsage().maxRSS*1024,integrity:'ok',plants,pending,method:'online node:sqlite backup; streaming gzip and disk-backed chunk+whole SHA256 verification; private0600 copy'};const output=process.env.BACKUP_METADATA_PATH||`deploy/verification/stable-backup-${sourceCommit.slice(0,7)}-${suffix}.json`;assert(!existsSync(output),'Refuse to overwrite prior backup evidence');writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,metadataPath:output},null,2));
