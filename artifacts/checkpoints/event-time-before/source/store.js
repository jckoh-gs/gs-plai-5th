import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
const json = JSON.stringify;
export class Store {
 constructor(path='data/lab.sqlite') {
  if(path!==':memory:') mkdirSync(dirname(path),{recursive:true});
  this.db=new DatabaseSync(path); this.depth=0;this.rollbackHooks=[];
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;
  CREATE TABLE IF NOT EXISTS plants(id TEXT PRIMARY KEY,body TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS samples(plant TEXT,time TEXT,power REAL,available REAL);
  CREATE TABLE IF NOT EXISTS rtu_metrics(id TEXT PRIMARY KEY,body TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS command_runs(id TEXT PRIMARY KEY,plant TEXT NOT NULL,request TEXT NOT NULL,body TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS command_events(id INTEGER PRIMARY KEY,plant TEXT,body TEXT,created TEXT);
  CREATE TABLE IF NOT EXISTS scada_frames(id INTEGER PRIMARY KEY AUTOINCREMENT,plant TEXT,body TEXT,created TEXT,message_id TEXT);
  CREATE INDEX IF NOT EXISTS frame_pending ON scada_frames(plant,message_id,id);
  CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,plant TEXT,seq INTEGER,topic TEXT,body TEXT,created TEXT,acked TEXT,attempts INTEGER DEFAULT 0);
  CREATE INDEX IF NOT EXISTS outbox_pending ON outbox(plant,acked,seq);
  CREATE TABLE IF NOT EXISTS sequences(plant TEXT PRIMARY KEY,value INTEGER);
  CREATE TABLE IF NOT EXISTS scenarios(id TEXT PRIMARY KEY,name TEXT,plant TEXT,body TEXT,created TEXT);
  CREATE TABLE IF NOT EXISTS audit_events(id INTEGER PRIMARY KEY,created TEXT,level TEXT,message TEXT);`);
 }
 transaction(fn){if(this.depth)return fn();this.db.exec('BEGIN IMMEDIATE');this.rollbackHooks=[];this.depth++;try{const r=fn();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');for(const hook of this.rollbackHooks.reverse())hook();throw e;}finally{this.depth--;this.rollbackHooks=[];}}
 onRollback(fn){if(this.depth)this.rollbackHooks.push(fn);}
 loadPlants(){return this.db.prepare('SELECT body FROM plants').all().map(x=>JSON.parse(x.body));}
 savePlant(p){this.db.prepare('INSERT OR REPLACE INTO plants VALUES(?,?)').run(p.id,json(p));}
 addFrame(p,f){this.db.prepare('INSERT INTO scada_frames(plant,body,created) VALUES(?,?,?)').run(p.id,json(f),f.timestamp);this.db.prepare('INSERT INTO samples VALUES(?,?,?,?)').run(p.id,f.timestamp,f.powerKw,f.availableKw);}
 enqueue(plant,topic,body){return this.transaction(()=>{const id=randomUUID();this.db.prepare('INSERT INTO sequences VALUES(?,1) ON CONFLICT(plant) DO UPDATE SET value=value+1').run(plant);const seq=this.db.prepare('SELECT value FROM sequences WHERE plant=?').get(plant).value;const created=new Date().toISOString();const payload=json({...body,schemaVersion:2,messageId:id,sequence:seq,rtuId:plant,createdAt:created});if(Buffer.byteLength(payload)>120000)throw Error('MQTT payload exceeds 120000 bytes');this.db.prepare('INSERT INTO outbox(id,plant,seq,topic,body,created) VALUES(?,?,?,?,?,?)').run(id,plant,seq,topic,payload,created);return {id,seq,topic,body:payload};});}
 batch(plant){return this.transaction(()=>{const rows=this.db.prepare('SELECT id,body FROM scada_frames WHERE plant=? AND message_id IS NULL ORDER BY id').all(plant);let frames=[],ids=[],messages=[];const body=fs=>{const f=fs.at(-1);return {runId:f.runId,timestamp:f.timestamp,sourceTimestamp:f.sourceTimestamp,mode:f.mode,quality:f.quality,powerKw:f.powerKw,availableKw:f.availableKw,electrical:f.electrical,weather:f.weather,scada:f,samples:fs,sampleCount:fs.length,batchFirstTimestamp:fs[0].timestamp};};const flush=()=>{if(!frames.length)return;const m=this.enqueue(plant,'telemetry',body(frames));for(const id of ids)this.db.prepare('UPDATE scada_frames SET message_id=? WHERE id=?').run(m.id,id);messages.push(m);frames=[];ids=[];};for(const row of rows){const f=JSON.parse(row.body);const candidate=[...frames,f];const estimate=Buffer.byteLength(json({...body(candidate),schemaVersion:2,messageId:'0'.repeat(36),sequence:Number.MAX_SAFE_INTEGER,rtuId:plant,createdAt:new Date().toISOString()}));if(frames.length&&(frames.length===60||frames[0].runId!==f.runId||estimate>120000))flush();frames.push(f);ids.push(row.id);}flush();return messages;});}
 pending(id){return this.db.prepare('SELECT * FROM outbox WHERE plant=? AND acked IS NULL ORDER BY seq LIMIT 1').get(id)||null;}
 attempt(id){this.db.prepare('UPDATE outbox SET attempts=attempts+1 WHERE id=?').run(id);}
 ack(id){this.db.prepare('UPDATE outbox SET acked=? WHERE id=?').run(new Date().toISOString(),id);}
 queueStats(id){return {...this.db.prepare('SELECT count(*) AS pendingMessages,min(created) AS oldestPendingAt FROM outbox WHERE plant=? AND acked IS NULL').get(id),unbatchedSamples:this.db.prepare('SELECT count(*) AS n FROM scada_frames WHERE plant=? AND message_id IS NULL').get(id).n};}
 loadCommands(){return this.db.prepare('SELECT body FROM command_runs').all().map(x=>JSON.parse(x.body));}
 saveCommand(c){this.db.prepare('INSERT OR REPLACE INTO command_runs VALUES(?,?,?,?)').run(c.commandId,c.plantId,c.canonical,json(c));}
 commandEvent(c){this.db.prepare('INSERT INTO command_events(plant,body,created) VALUES(?,?,?)').run(c.plantId,json(c),c.updatedAt);}
 loadMetrics(id){const x=this.db.prepare('SELECT body FROM rtu_metrics WHERE id=?').get(id);return x?JSON.parse(x.body):{};}
 saveMetrics(id,m){this.db.prepare('INSERT OR REPLACE INTO rtu_metrics VALUES(?,?)').run(id,json(m));}
 audit(level,message){this.db.prepare('INSERT INTO audit_events(created,level,message) VALUES(?,?,?)').run(new Date().toISOString(),level,message);}
 events(limit=80){return this.db.prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT ?').all(limit);}
 samples(id,limit=3600){return this.db.prepare('SELECT time AS timestamp,power AS powerKw,available AS availableKw FROM samples WHERE plant=? ORDER BY rowid DESC LIMIT ?').all(id,limit).reverse();}
 frames(id,limit=120){return this.db.prepare('SELECT body FROM scada_frames WHERE plant=? ORDER BY id DESC LIMIT ?').all(id,limit).reverse().map(x=>JSON.parse(x.body));}
 scenarios(){return this.db.prepare('SELECT body FROM scenarios ORDER BY created DESC').all().map(x=>JSON.parse(x.body));}
 saveScenario(s){this.db.prepare('INSERT OR REPLACE INTO scenarios VALUES(?,?,?,?,?)').run(s.id,s.name,s.plantId,json(s),s.createdAt||new Date().toISOString());}
 getScenario(id){const s=this.db.prepare('SELECT body FROM scenarios WHERE id=?').get(id);return s?JSON.parse(s.body):null;}
 prune(days=30){if(!Number.isInteger(days)||days<1||days>3650)throw Error('RETENTION_DAYS must be 1..3650');const cutoff=new Date(Date.now()-days*86400000).toISOString();this.transaction(()=>{this.db.prepare('DELETE FROM scada_frames WHERE message_id IN (SELECT id FROM outbox WHERE acked IS NOT NULL AND acked<?)').run(cutoff);this.db.prepare('DELETE FROM outbox WHERE acked IS NOT NULL AND acked<?').run(cutoff);for(const t of ['audit_events','command_events'])this.db.prepare(`DELETE FROM ${t} WHERE created<?`).run(cutoff);this.db.prepare('DELETE FROM samples WHERE time<?').run(cutoff);});}
 close(){this.db.close();}
}
