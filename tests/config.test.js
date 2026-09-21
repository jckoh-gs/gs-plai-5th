import test from 'node:test';
import assert from 'node:assert/strict';
import {readConfig,authorized,redact} from '../server/config.js';
test('remote management fails closed without strong token',()=>{assert.throws(()=>readConfig({HOST:'0.0.0.0'}),/API_TOKEN/);assert.equal(readConfig({HOST:'0.0.0.0',API_TOKEN:'x'.repeat(32)}).host,'0.0.0.0');});
test('exact bearer token required and topic wildcards forbidden',()=>{assert.equal(authorized('Bearer abc','abc'),true);assert.equal(authorized('Bearer abc1','abc'),false);assert.throws(()=>readConfig({MQTT_PREFIX:'vpp/#'}));});
test('configuration bounds and credential redaction',()=>{assert.throws(()=>readConfig({PORT:'3.1'}));assert.throws(()=>readConfig({RETENTION_DAYS:'0'}));assert.equal(redact('mqtt://alice:secret@host authKey=secret&stn=100'),'mqtt://[redacted]@host authKey=[redacted]&stn=100');});
