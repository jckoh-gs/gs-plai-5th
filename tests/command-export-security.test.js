import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntime} from '../server/index.js';
import {createPlant} from '../server/model.js';

test('command export authenticates, omits raw fields and scrubs secrets from all configuration layers',async()=>{
  const previous=process.env.EXPORT_TEST_PASSWORD;process.env.EXPORT_TEST_PASSWORD='process-only-secret-fixture';
  const config={dbPath:':memory:',seedDemo:false,host:'127.0.0.1',port:0,token:'api-token-secret-fixture',env:{EXPORT_TEST_PASSWORD:'overlay-only-secret-fixture'},url:'mqtt://127.0.0.1:1',prefix:'export-security',telemetrySeconds:60,retentionDays:30};
  const runtime=createRuntime(config);runtime.transport.start=()=>{};runtime.transport.stop=async()=>{};
  const plant=createPlant({name:'private-plant-name',type:'wind',count:1,ratedKw:100,csv:'timestamp,power_kw\n2026-01-01T00:00:00Z,10\n2026-01-01T00:10:00Z,20'});runtime.plants.set(plant.id,plant);
  const ids=['process-only-secret-fixture','overlay-only-secret-fixture',config.token,'https://user:password-fixture@host/x?token=query-secret-fixture','https://username-secret-fixture@host/x','line\nwith\u0000control','plain-informational-id'];
  const at='2026-09-21T09:00:00.000Z';
  for(const [index,commandId]of ids.entries())runtime.controller.commands.set(commandId,{commandId,plantId:plant.id,runId:plant.runId,action:'stop',source:'REST',status:'completed',updatedAt:at,acceptedAt:at,actualKw:0,errorKw:0,targets:[{targetKw:0}],reason:'raw-reason-secret',canonical:'canonical-secret',request:{private:'request-secret'},plantName:plant.name,rawCSV:'raw-csv-secret',extra:'extra-secret'});
  const server=await runtime.start();
  try {
    const url=`http://127.0.0.1:${server.address().port}/api/plants/${plant.id}/commands/export`;
    assert.equal((await fetch(url)).status,401);
    const before=runtime.store.db.prepare('SELECT total_changes() AS n').get().n;
    const response=await fetch(url,{headers:{Authorization:`Bearer ${config.token}`}});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
    const dto=await response.json(),text=JSON.stringify(dto);assert.equal(dto.commands.length,ids.length);
    for(const secret of ['process-only-secret-fixture','overlay-only-secret-fixture',config.token,'password-fixture','username-secret-fixture','query-secret-fixture','raw-reason-secret','canonical-secret','request-secret',plant.name,'raw-csv-secret','extra-secret'])assert(!text.includes(secret),`must omit ${secret}`);
    for(const row of dto.commands){for(const key of ['reason','canonical','request','targets','plantName','rawCSV','extra'])assert(!Object.hasOwn(row,key));assert(!/[\u0000-\u001f\u007f-\u009f]/.test(row.commandId??''));}
    assert.equal(runtime.store.db.prepare('SELECT total_changes() AS n').get().n,before);
    assert.equal(runtime.controller.commands.size,ids.length);
  } finally {await runtime.stop();if(previous===undefined)delete process.env.EXPORT_TEST_PASSWORD;else process.env.EXPORT_TEST_PASSWORD=previous;}
});
test('export DTO keeps only typed snapshots, records redaction, and makes no de-identification/replay promise',async()=>{
  const {exportCommandStates}=await import('../server/command-export.js');
  const base={commandId:'safe-id',runId:'0f510a6e-ae46-4d15-aadc-32ac3496bb5c',action:'start',source:'MQTT',status:'accepted',updatedAt:'2026-09-21T18:00:00+09:00',targets:[{targetKw:null}]};
  const rows=[base,{...base,commandId:'x'.repeat(200),runId:'secret-invalid-run',action:'not-an-action',source:'secret-source',status:'secret-status',acceptedAt:'2026-02-30T00:00:00Z',dispatchedAt:'2026-01-01T24:00:00Z',deadlineAt:'2026-01-01',expiresAt:'2026-01-01T00:00:00Z secret',actualKw:Infinity,errorKw:'10',targets:[{targetKw:Number.MAX_VALUE},{targetKw:Number.MAX_VALUE}]},{...base,commandId:'unknown-person@example.test',actualKw:-10,errorKw:0,targets:[{targetKw:1},{targetKw:2}]}];
  const dto=exportCommandStates({plantId:'test-only',commands:rows,productVersion:'1.2.0'});
  const [valid,invalid,unknown]=dto.commands;
  assert.equal(valid.runId,base.runId);assert.equal(valid.targetKw,null);assert.equal(valid.updatedAt,'2026-09-21T09:00:00.000Z');
  for(const k of ['runId','action','source','status','acceptedAt','dispatchedAt','deadlineAt','expiresAt','actualKw','errorKw','targetKw'])assert.equal(invalid[k],null,k);
  assert.equal(invalid.commandId.length,128);assert.equal(invalid.commandIdRedacted,true);assert.equal(valid.commandIdRedacted,false);
  assert.equal(dto.redaction.redactedCommandIds,1);assert.equal(dto.redaction.identifiersForReplay,false);assert.equal(dto.redaction.unknownPersonalDataMayRemain,true);
  assert.equal(unknown.commandId,'unknown-person@example.test');assert.equal(unknown.targetKw,3);assert.equal(unknown.actualKw,-10);
  assert(!Object.hasOwn(dto,'runId'));
  assert.deepEqual(Object.keys(valid).sort(),['commandId','commandIdRedacted','runId','action','source','status','acceptedAt','dispatchedAt','deadlineAt','expiresAt','updatedAt','targetKw','actualKw','errorKw'].sort());
  assert.equal(exportCommandStates({plantId:'test-only',commands:Array(30).fill(base),productVersion:'1.2.0'}).commands.length,20);
});
test('explicit broker URL password is treated as known credential in informational IDs',async()=>{
  const {exportCommandStates}=await import('../server/command-export.js');
  const dto=exportCommandStates({plantId:'test-only',commands:[{commandId:'broker-only-password'}, {commandId:'broker%2Fpassword'},{commandId:'broker/password'}],productVersion:'1.2.0',config:{url:'mqtt://fixture:broker-only-password@localhost:1883',env:{ALT_URL:'mqtt://fixture:broker%2Fpassword@localhost:1883'}}});
  const text=JSON.stringify(dto);for(const secret of ['broker-only-password','broker%2Fpassword','broker/password'])assert(!text.includes(secret),secret);
  assert.equal(dto.redaction.redactedCommandIds,3);
});
test('control normalization cannot expose known secrets or create empty replacement patterns',async()=>{
  const {exportCommandStates}=await import('../server/command-export.js');
  const commands=['secret-line\nvalue','secret-linevalue','password\nfixture','passwordfixture','password%0Afixture','unchanged-id'].map(commandId=>({commandId}));
  const dto=exportCommandStates({plantId:'fixture',productVersion:'1.2.0',commands,config:{token:'secret-line\nvalue',url:'mqtt://user:password%0Afixture@localhost',env:{EMPTY_AFTER_STRIP_SECRET:'\n\r\u0000'}}});
  assert.deepEqual(dto.commands.slice(0,5).map(row=>row.commandId),Array(5).fill('[redacted]'));
  assert.equal(dto.commands[5].commandId,'unchanged-id');assert.equal(dto.commands[5].commandIdRedacted,false);
  assert.equal(dto.redaction.redactedCommandIds,5);
});
