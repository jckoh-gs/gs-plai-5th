import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {backupBudget,SNAPSHOT_SOURCE,METADATA_SOURCE,CHUNK_SOURCE} from '../scripts/remote-backup-helpers.mjs';

const temporary = t => {const path=mkdtempSync(join(tmpdir(),'grid-backup-test-'));t.after(()=>rmSync(path,{recursive:true,force:true}));return path;};
const run = (code,args,env={}) => execFileSync(process.execPath,['--input-type=module','-e',code,...args],{env:{...process.env,...env},encoding:'utf8',timeout:5000,stdio:['ignore','pipe','pipe']});
const sha = data => createHash('sha256').update(data).digest('hex');

test('stalled child is killed within command budget, without printing sensitive stdout',async()=>{
  const b=backupBudget({deadlineAt:new Date(Date.now()+10000).toISOString(),maxMs:3000});
  const start=Date.now();
  await assert.rejects(b.exec(process.execPath,['-e',`process.on('SIGTERM',()=>{});process.stdout.write('fixture-database-secret');setInterval(()=>{},1000)`],{stage:'fixture discovery',timeout:150}),error=>{
    assert.match(error.message,/fixture discovery failed/);assert.doesNotMatch(error.message,/fixture-database-secret/);return true;
  });
  assert(Date.now()-start<2500);
});

test('original deadline and total budget reject subsequent launch instead of resetting on retry',async t=>{
  const dir=temporary(t),marker=join(dir,'started');let time=1000;
  const b=backupBudget({deadlineAt:new Date(1500).toISOString(),maxMs:2000,now:()=>time});
  assert.equal(b.stopAt,1500);time=1501;
  await assert.rejects(b.exec(process.execPath,['-e',`require('fs').writeFileSync(${JSON.stringify(marker)},'bad')`],{stage:'late retry'}),/expired/);
  assert(!existsSync(marker));
  assert.throws(()=>backupBudget({deadlineAt:'not-a-date'}),/Invalid/);
  assert.throws(()=>backupBudget({deadlineAt:new Date(999).toISOString(),now:()=>1000}),/expired/);
});

test('expired remote snapshot never creates a partial or final file',t=>{
  const dir=temporary(t),target=join(dir,'backup.sqlite');
  assert.throws(()=>run(SNAPSHOT_SOURCE,[target,String(Date.now()-1)],{DB_PATH:join(dir,'missing.sqlite')}));
  assert(!existsSync(target));assert(!existsSync(target+'.snapshot.part'));
});

test('snapshot failure leaves only private partial; existing verified final is preserved',t=>{
  const dir=temporary(t),target=join(dir,'backup.sqlite');
  assert.throws(()=>run(SNAPSHOT_SOURCE,[target,String(Date.now()+5000)],{DB_PATH:join(dir,'missing.sqlite')}));
  assert(!existsSync(target));assert(existsSync(target+'.snapshot.part'));
  assert.equal(statSync(target+'.snapshot.part').mode&0o777,0o600);
  writeFileSync(target,'previous-verified-content');
  assert.throws(()=>run(SNAPSHOT_SOURCE,[target,String(Date.now()+5000)],{DB_PATH:join(dir,'missing.sqlite')}));
  assert.equal(readFileSync(target,'utf8'),'previous-verified-content');
});

test('successful online snapshot publishes complete private SQLite then compression preserves bytes',t=>{
  const dir=temporary(t),source=join(dir,'source.sqlite'),target=join(dir,'backup.sqlite'),compressed=join(dir,'transfer.gz');
  const db=new DatabaseSync(source);db.exec('PRAGMA journal_mode=WAL;CREATE TABLE sample(id INTEGER PRIMARY KEY,value TEXT);');
  db.prepare('INSERT INTO sample(value) VALUES (?)').run('fixture data');
  run(SNAPSHOT_SOURCE,[target,String(Date.now()+5000)],{DB_PATH:source});
  assert(!existsSync(target+'.snapshot.part'));assert.equal(statSync(target).mode&0o777,0o600);
  const restored=new DatabaseSync(target,{readOnly:true});
  assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.equal(restored.prepare('SELECT value FROM sample').get().value,'fixture data');restored.close();db.close();
  const metadata=JSON.parse(run(METADATA_SOURCE,[target,String(Date.now()+5000),compressed]));
  const bytes=readFileSync(target),gzip=readFileSync(compressed);
  assert.equal(metadata.sha256,sha(bytes));assert.equal(metadata.compressedSha256,sha(gzip));
  assert.deepEqual(gunzipSync(gzip),bytes);assert.equal(statSync(compressed).mode&0o777,0o600);
});

test('one MiB encoded chunk and final short chunk flush completely with matching byte hashes',async t=>{
  const dir=temporary(t),file=join(dir,'data.gz'),data=randomBytes(1024*1024+137);
  writeFileSync(file,data,{mode:0o600});
  const b=backupBudget({deadlineAt:new Date(Date.now()+10000).toISOString()});
  const output=[];
  for(const offset of [0,1024*1024]){
    const count=Math.min(1024*1024,data.length-offset);
    const result=JSON.parse(await b.exec(process.execPath,['--input-type=module','-e',CHUNK_SOURCE,file,String(offset),String(count)],{stage:'chunk fixture'}));
    const bytes=Buffer.from(result.base64,'base64');
    assert.equal(bytes.length,count);assert.equal(result.bytes,count);assert.equal(sha(bytes),result.sha256);output.push(bytes);
  }
  assert.deepEqual(Buffer.concat(output),data);
});
