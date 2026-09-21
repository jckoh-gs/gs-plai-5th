import test from 'node:test';
import assert from 'node:assert/strict';
import {previewDataset} from '../server/dataset-preview.js';
import {parseCSV} from '../server/model.js';

const valid = 'timestamp,power_kw\n2026-01-01T00:00:00Z,1\n2026-01-01T00:10:00Z,2';
test('parser diagnostics never echo malformed CSV field contents', () => {
  const secret = 'sensitive-password-marker';
  for (const parse of [csv => parseCSV(csv), csv => previewDataset({type:'wind',csv})]) {
    assert.throws(() => parse(`timestamp,power_kw\n2026-01-01T00:00:00Z,${secret}"oops`), error => {
      assert.match(error.message,/csv 행 2: CSV_INVALID/);
      assert(!error.message.includes(secret));assert(!error.message.includes('oops'));return true;
    });
  }
});
test('prototype names remain unknown columns and never enter normalized DTOs', () => {
  for(const field of ['constructor','__proto__','toString']) {
    const csv=valid.replace('power_kw',`power_kw,${field}`).replace(',1\n',',1,secret\n').replace(',2',',2,secret');
    const result=previewDataset({type:'wind',csv});
    assert.equal(result.rowCount,2);assert(!JSON.stringify(result).includes('secret'));
    assert.deepEqual(Object.keys(result.rows[0]).sort(),['power_kw','timestamp','timestampKst','totalPowerKw'].sort());
  }
});
test('100000 rows are accepted; excessive rows abort before parsing trailing malformed input', () => {
  const rows=Array.from({length:100000},(_,i)=>`${new Date(Date.UTC(2026,0,1)+i*600000).toISOString().replace(".000Z","Z")},1`);
  const csv=`timestamp,power_kw\n${rows.join('\n')}`;
  const result=previewDataset({type:'wind',csv});
  assert.equal(result.rowCount,100000);assert.equal(result.rows.length,3);
  assert.throws(()=>parseCSV(`${csv}\n2028-01-01T00:00:00Z,1\nSECRET"malformed`),/2~100000행/);
});
test('HTTP preview returns bounded diagnostics and authenticates before malformed input', async () => {
  const {createRuntime}=await import('../server/index.js');
  const config={dbPath:':memory:',seedDemo:false,host:'127.0.0.1',port:0,token:'secret-preview-auth-marker',url:'mqtt://127.0.0.1:1',prefix:'preview-security',telemetrySeconds:60,retentionDays:30};
  const runtime=createRuntime(config);runtime.transport.start=()=>{};runtime.transport.stop=async()=>{};
  const server=await runtime.start();
  try {
    const body=JSON.stringify({type:'wind',csv:'timestamp,power_kw\n2026-01-01T00:00:00Z,sensitive-password-marker"oops'});
    const url=`http://127.0.0.1:${server.address().port}/api/datasets/preview`;
    const request=auth=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${config.token}`}:{})},body});
    assert.equal((await request(false)).status,401);
    const response=await request(true);assert.equal(response.status,400);
    const output=await response.text();assert.match(output,/csv 행 2/);
    for(const forbidden of ['sensitive-password-marker','oops',config.token,'timestamp,power_kw'])assert(!output.includes(forbidden));
    for(const malformed of ['sensitive-password-marker','"sensitive-password-marker"','{"csv": sensitive-password-marker}']) {
      const rejected=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.token}`},body:malformed});
      assert.equal(rejected.status,400);assert.deepEqual(await rejected.json(),{error:'요청 본문은 올바른 JSON 객체여야 합니다.'});
    }
  } finally {await runtime.stop();}
});
test('preflight caps columns before allocation and preserves quoted commas, escapes and newlines',()=>{
  const csv='timestamp,power_kw,note\r\n2026-01-01T00:00:00Z,1,"many'+','.repeat(200)+'""quoted""\r\ncontinued"\r\n2026-01-01T00:10:00Z,2,"safe"';
  assert.equal(previewDataset({type:'wind',csv}).rowCount,2);
  const columns=Array.from({length:126},(_,i)=>`unknown_${i}`);
  const atLimit=valid.replace('power_kw',`power_kw,${columns.join(',')}`).replace(',1\n',`,1,${columns.map(()=> 'x').join(',')}\n`).replace(',2',`,2,${columns.map(()=> 'x').join(',')}`);
  assert.equal(parseCSV(atLimit).rows.length,2);
  assert.throws(()=>parseCSV(atLimit.replace('unknown_125','unknown_125,excess')),/행 1.*128열/);
  assert.throws(()=>parseCSV(valid+'\n'+','.repeat(128)+'SECRET"broken'),/행 4.*128열/);
  const tsv=atLimit.replaceAll(',','\t');assert.equal(parseCSV(tsv).rows.length,2);
  assert.throws(()=>parseCSV(tsv.replace('unknown_125','unknown_125\texcess')),/128열/);
});
