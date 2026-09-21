import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {eventTime} from '../web/event-time.js';
test('canonical audit created uses explicitKST across midnight, leap day and year boundary',()=>{
 for(const [utc,text] of [['2026-09-21T15:00:00.123Z','2026-09-22 00:00:00.123'],['2024-02-28T15:00:00.000Z','2024-02-29 00:00:00.000'],['2024-02-29T15:00:00.987Z','2024-03-01 00:00:00.987'],['2025-12-31T15:00:00.000Z','2026-01-01 00:00:00.000']])assert.deepEqual(eventTime({created:utc}),{utc,text});
});
test('missing, nonstring, invalid calendar and noncanonical input never become visible times',()=>{
 for(const created of [undefined,null,0,{},[],true,'','<img src=x>','2025-02-29T00:00:00.000Z','2024-02-30T00:00:00.000Z','2026-13-01T00:00:00.000Z','2026-01-01T24:00:00.000Z','2026-01-01T00:00:00Z','2026-01-01T00:00:00.0Z','2026-01-01T09:00:00.000+09:00',' 2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z\n'])assert.equal(eventTime({created}),null);
 assert.equal(eventTime(null),null);assert.equal(eventTime({created:{toString(){throw Error('must not coerce')}}}),null);
});
test('alternate timestamps cannot fill absent or malformed created and cannot override valid created',()=>{
 const alternate={timestamp:'2026-01-01T00:00:00.000Z',createdAt:'2026-01-01T00:00:00.000Z',time:'2026-01-01T00:00:00.000Z'};assert.equal(eventTime(alternate),null);assert.equal(eventTime({...alternate,created:'bad'}),null);assert.equal(eventTime({...alternate,created:'2024-02-29T15:00:00.000Z'}).text,'2024-03-01 00:00:00.000');
});
test('formatting is identical across host time zones',()=>{
 const script="import {eventTime} from './web/event-time.js';process.stdout.write(JSON.stringify(eventTime({created:'2024-02-29T15:00:00.123Z'})))";
 const results=['UTC','America/Los_Angeles','Asia/Tokyo'].map(TZ=>execFileSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ},encoding:'utf8'}));assert.equal(new Set(results).size,1);assert.equal(JSON.parse(results[0]).text,'2024-03-01 00:00:00.123');
});
