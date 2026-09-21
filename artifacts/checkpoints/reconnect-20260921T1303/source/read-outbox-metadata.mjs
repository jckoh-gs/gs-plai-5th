import{DatabaseSync}from'node:sqlite';
const db=new DatabaseSync(process.env.DB_PATH,{readOnly:true});
try {const rows=db.prepare("SELECT id,plant,seq,created,acked,attempts,body FROM outbox WHERE topic='telemetry' AND created>=? AND created<?").all('2026-09-21T12:56:00Z','2026-09-21T13:06:00Z');
console.log(JSON.stringify(rows.map(({body,...row})=>{const m=JSON.parse(body);return {...row,runId:m.runId,count:m.samples?.length??0,simulationSeconds:(m.samples||[]).map(s=>s.simulationSeconds),frameTimestamps:(m.samples||[]).map(s=>s.timestamp)};})));}finally{db.close();}
