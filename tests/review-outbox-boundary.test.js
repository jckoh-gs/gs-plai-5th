import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import http from 'node:http';
const script=resolve('scripts/remote-outbox-restart.mjs');
async function fixture(expired,base){const dir=mkdtempSync(join(tmpdir(),'outbox-boundary-'));for(const p of ['docs/operations','artifacts/private/deploy'])mkdirSync(join(dir,p),{recursive:true});writeFileSync(join(dir,'docs/operations/run.json'),JSON.stringify({deadlineAt:new Date(Date.now()+(expired?-1000:3000)).toISOString(),deployment:{sourceCommit:'a'.repeat(40)}}));writeFileSync(join(dir,'artifacts/private/deploy/api-token'),'private-test-token');writeFileSync(join(dir,'kubectl'),`#!${process.execPath}\nrequire('node:fs').writeFileSync('called','yes');console.error('private-child-marker');setInterval(()=>{},1000);`,{mode:0o700});return{dir,run:()=>new Promise(resolve=>{const start=Date.now(),p=spawn(process.execPath,[script],{cwd:dir,env:{...process.env,PATH:dir+':'+process.env.PATH,TEST_RTU_ID:'fixture',...(base?{OUTBOX_API_BASE:base}:{})}});let text='';p.stdout.on('data',b=>text+=b);p.stderr.on('data',b=>text+=b);const timer=setTimeout(()=>p.kill('SIGKILL'),8000);p.on('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal,text,elapsed:Date.now()-start})})}),close:()=>rmSync(dir,{recursive:true,force:true})};}
test('expired actual outbox CLI launches no kubectl',async()=>{const f=await fixture(true);try{const r=await f.run();assert.notEqual(r.code,0);assert.equal(r.signal,null);assert(!existsSync(join(f.dir,'called')))}finally{f.close()}});
test('actual outbox CLI hung discovery ends at original deadline without sensitive child output',async()=>{const server=http.createServer((q,r)=>{r.setHeader('Content-Type','application/json');r.end(JSON.stringify({plants:[{id:'fixture',faults:{offline:false}}]}))});await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});const f=await fixture(false,`http://127.0.0.1:${server.address().port}`);try{const r=await f.run();assert.equal(r.code,1);assert.equal(r.signal,null);assert(r.elapsed<7000);assert(existsSync(join(f.dir,'called')));assert(!r.text.includes('private-child-marker'));assert(!r.text.includes('private-test-token'));assert.match(r.text,/Remote cancellation is not proven/)}finally{f.close();server.closeAllConnections();await new Promise(r=>server.close(r))}});

test('non-loopback override is rejected before any token-bearing HTTP or kubectl',async()=>{const f=await fixture(false,'http://example.invalid');try{const r=await f.run();assert.notEqual(r.code,0);assert.equal(r.signal,null);assert.match(r.text,/HTTP loopback/);assert(!r.text.includes('private-test-token'));assert(!existsSync(join(f.dir,'called')))}finally{f.close()}});

test('actual MQTT connection block owns and closes client when connection arrives after budget',async()=>{
 const {readFileSync}=await import('node:fs'),{EventEmitter}=await import('node:events'),vm=await import('node:vm');
 const source=readFileSync(script,'utf8');
 const bounded=source.slice(source.indexOf('const bounded='),source.indexOf('\nlet base='));
 const connect=source.slice(source.indexOf("client=mqtt.connect("),source.indexOf('let received;'));
 assert(connect.includes("client.once('connect'"));
 const client=new EventEmitter();let closed=0,late=false;
 client.end=force=>{assert.equal(force,true);closed++;};
 const context={setTimeout,clearTimeout,Error,Promise,remaining:()=>10,readFileSync:()=>({trim:()=>''}),mqtt:{connect(){setTimeout(()=>{late=true;client.emit('connect')},30);return client}}};
 await vm.runInNewContext(`(async()=>{let client;${bounded}try{${connect}}finally{if(client)client.end(true);}})()`,context).then(()=>assert.fail('must expire'),e=>assert.match(e.message,/timed out/));
 assert.equal(closed,1);await new Promise(r=>setTimeout(r,40));assert(late);assert.equal(closed,1);
});

test('actual observer callback ignores malformed and unrelated JSON and preserves exact matching body',async()=>{
 const {readFileSync}=await import('node:fs'),{EventEmitter}=await import('node:events'),vm=await import('node:vm');
 const source=readFileSync(script,'utf8'),start=source.indexOf("client.on('message'"),end=source.indexOf('await bounded(()=>client.subscribeAsync',start),listener=source.slice(start,end);
 const client=new EventEmitter(),context=vm.createContext({client,pending:{id:'expected'}});
 vm.runInContext(`let received;${listener}`,context);
 for(const text of ['{bad','null','[]','[1]','true','4','"scalar"','{}','{"messageId":5}','{"messageId":"other"}']){assert.doesNotThrow(()=>client.emit('message','telemetry',Buffer.from(text)));assert.equal(vm.runInContext('received',context),undefined);}
 const body=' { "messageId": "expected", "samples": [] } ';
 client.emit('message','telemetry',Buffer.from(body));assert.equal(vm.runInContext('received',context),body);
});
