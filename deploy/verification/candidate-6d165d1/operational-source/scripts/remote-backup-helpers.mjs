import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execute = promisify(execFile);

export function backupBudget({deadlineAt, maxMs = 180000, now = Date.now} = {}) {
  const deadline = Date.parse(deadlineAt);
  if (!Number.isFinite(deadline) || !Number.isFinite(maxMs) || maxMs <= 0) throw new Error('Invalid backup deadline or budget');
  const startedAt = now();
  const stopAt = Math.min(deadline, startedAt + maxMs);
  const check = () => {
    const remaining = stopAt - now();
    if (remaining <= 0) throw new Error('Backup time budget expired; no PASS published');
    return remaining;
  };
  check();
  return {
    startedAt, stopAt, deadline, check,
    async exec(file, args, {stage, timeout = 20000, maxBuffer = 8 * 1024 * 1024} = {}) {
      if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('Invalid command timeout');
      const boundedTimeout = Math.max(1, Math.min(timeout, check()));
      try {
        const result = await execute(file, args, {timeout: boundedTimeout, killSignal: 'SIGKILL', maxBuffer});
        check();
        return result.stdout;
      } catch (error) {
        // Child stdout can contain encoded database bytes. Never include it in diagnostics.
        const reason = error.killed ? 'timeout_or_buffer_limit' : (Number.isInteger(error.code) ? `exit_${error.code}` : 'command_failed');
        throw new Error(`Backup ${stage || 'command'} failed: ${reason}; inspect the private operation journal`);
      }
    }
  };
}

// A lost exec response does not prove that the remote process stopped. Only the
// final hard link, published after backup and integrity verification, is reusable.
export const SNAPSHOT_SOURCE = `
import {DatabaseSync, backup} from 'node:sqlite';
import {openSync,closeSync,existsSync,chmodSync,linkSync,unlinkSync} from 'node:fs';
const target=process.argv[1], stopAt=Number(process.argv[2]), source=process.env.DB_PATH;
const check=()=>{if(!Number.isFinite(stopAt)||Date.now()>=stopAt)throw Error('Snapshot deadline expired');};
check(); process.umask(0o077);
if(existsSync(target))throw Error('Snapshot already exists');
const part=target+'.snapshot.part';
closeSync(openSync(part,'wx',0o600));
const db=new DatabaseSync(source,{readOnly:true});
try{await backup(db,part);}finally{db.close();}
check();
const verify=new DatabaseSync(part,{readOnly:true});
try{if(verify.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Snapshot integrity failed');}finally{verify.close();}
check(); chmodSync(part,0o600); linkSync(part,target); unlinkSync(part);
console.log('snapshot complete');
`;

export const METADATA_SOURCE = `
import {DatabaseSync} from 'node:sqlite';
import {createReadStream,createWriteStream,statSync,renameSync} from 'node:fs';
import {createGzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
const p=process.argv[1],stopAt=Number(process.argv[2]),compressed=process.argv[3];
const check=()=>{if(!Number.isFinite(stopAt)||Date.now()>=stopAt)throw Error('Metadata deadline expired');};
check();
const db=new DatabaseSync(p,{readOnly:true});
try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Remote integrity failed');}finally{db.close();}
check();
const digest=async path=>{const h=createHash('sha256');for await(const chunk of createReadStream(path)){check();h.update(chunk);}return h.digest('hex');};
const signal=AbortSignal.timeout(Math.max(1,stopAt-Date.now()));
await pipeline(createReadStream(p),createGzip(),createWriteStream(compressed+'.part',{mode:0o600,flags:'wx'}),{signal});
check();renameSync(compressed+'.part',compressed);
console.log(JSON.stringify({bytes:statSync(p).size,sha256:await digest(p),compressedBytes:statSync(compressed).size,compressedSha256:await digest(compressed),capturedAt:statSync(p).mtime.toISOString(),peakRssBytes:process.resourceUsage().maxRSS*1024}));
`;

export const CHUNK_SOURCE = `
import {openSync,readSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
const f=openSync(process.argv[1]),b=Buffer.alloc(Number(process.argv[3]));
const n=readSync(f,b,0,b.length,Number(process.argv[2]));closeSync(f);
const data=b.subarray(0,n),text=JSON.stringify({bytes:n,sha256:createHash('sha256').update(data).digest('hex'),base64:data.toString('base64')})+String.fromCharCode(10);
await new Promise((resolve,reject)=>process.stdout.write(text,e=>e?reject(e):resolve()));
`;
