import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync} from 'node:fs';
const token=readFileSync('artifacts/private/deploy/api-token','utf8').trim(),base=process.env.RESTORE_API||'http://127.0.0.1:3105';
async function api(path){const r=await fetch(base+path,{headers:{Authorization:`Bearer ${token}`}});assert(r.ok);return r.json();}
const db=new DatabaseSync('artifacts/private/pre-security-79c996f.sqlite',{readOnly:true});
try{
 assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');const state=await api('/api/state'),saved=db.prepare('SELECT body FROM plants').all().map(r=>JSON.parse(r.body));
 for(const p of saved){const restored=state.plants.find(x=>x.id===p.id);assert(restored);assert.equal(restored.runId,p.runId);assert.deepEqual(restored.generators.map(g=>g.id),p.generators.map(g=>g.id));assert.equal(restored.dataset.rowCount,p.dataset.rows.length);}
 const scenarios=db.prepare('SELECT id FROM scenarios').all(),remoteScenes=await api('/api/scenarios');for(const row of scenarios)assert(remoteScenes.some(s=>s.id===row.id));
 const result={result:'PASS',base,backupIntegrity:'ok',restoredOriginalPlants:saved.length,originalRunAndGeneratorIdsPreserved:true,originalDatasetCountsPreserved:true,originalScenariosPreserved:scenarios.length};writeFileSync(process.env.RESTORE_EVIDENCE_FILE||'deploy/verification/restore-original-data.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{db.close();}
