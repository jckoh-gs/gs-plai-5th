import test from 'node:test';
import assert from 'node:assert/strict';
import {pollCommandList,readCommandList} from '../web/command-list.js';
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
function clock(){let seq=0;const tasks=new Map();return {tasks,setTimer:(fn,ms)=>{tasks.set(++seq,{fn,ms});return seq},clearTimer:id=>tasks.delete(id),fire(ms){const entry=[...tasks].find(([,task])=>task.ms===ms);assert.ok(entry,'expected timer '+ms);tasks.delete(entry[0]);entry[1].fn()}}}
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
test('retains last rows and browser completion time through failure, recovers with fresh success and distinguishes empty',async()=>{
 const c=clock(),states=[],answers=[[{commandId:'a'}],Error('RAW SECRET'),[]];let now=1000;
 const stop=pollCommandList({...c,now:()=>now,onChange:s=>states.push(s),read:async()=>{const a=answers.shift();if(a instanceof Error)throw a;return a}});
 await flush();assert.equal(states.at(-1).checkedAt,'1970-01-01T00:00:01.000Z');
 now=2000;c.fire(2000);await flush();assert.equal(states.at(-1).rows[0].commandId,'a');assert.equal(states.at(-1).checkedAt,'1970-01-01T00:00:01.000Z');assert.ok(states.at(-1).error);assert.ok(!JSON.stringify(states).includes('RAW SECRET'));
 now=3000;c.fire(2000);await flush();assert.deepEqual(states.at(-1).rows,[]);assert.equal(states.at(-1).error,'');assert.equal(states.at(-1).checkedAt,'1970-01-01T00:00:03.000Z');stop();assert.equal(c.tasks.size,0);
});
test('slow request never overlaps, finite timeout aborts and late success cannot replace error',async()=>{
 const c=clock(),d=defer(),states=[];let calls=0,signal;
 const stop=pollCommandList({...c,onChange:s=>states.push(s),read:s=>{calls++;signal=s;return d.promise}});await flush();assert.equal(calls,1);assert.deepEqual([...c.tasks.values()].map(t=>t.ms),[15000]);
 c.fire(15000);await flush();assert.ok(signal.aborted);assert.match(states.at(-1).error,/15초/);assert.equal(states.at(-1).checkedAt,null);d.resolve([{commandId:'late'}]);await flush();assert.deepEqual(states.at(-1).rows,[]);stop();assert.equal(c.tasks.size,0);
});
test('switch/unmount aborts owned work, clears all timers and discards late old RTU results',async()=>{
 const c=clock(),a=defer(),states=[];let signal;
 const stopA=pollCommandList({...c,onChange:s=>states.push(['A',s]),read:s=>{signal=s;return a.promise}});await flush();stopA();assert.ok(signal.aborted);assert.equal(c.tasks.size,0);
 const stopB=pollCommandList({...c,onChange:s=>states.push(['B',s]),read:async()=>[]});await flush();const count=states.length;a.resolve([{commandId:'A'}]);await flush();assert.equal(states.length,count);assert.deepEqual(states.at(-1)[1].rows,[]);stopB();assert.equal(c.tasks.size,0);
});
test('reader authenticates GET only, caps order at20, rejects malformed bodies and never reads HTTP error bodies',async()=>{
 let options,auth=0,bodyRead=0;
 const rows=Array.from({length:25},(_,i)=>({commandId:String(i)}));
 const result=await readCommandList('rtu',new AbortController().signal,{getToken:()=> 'synthetic-token',fetcher:async(url,o)=>{assert.equal(url,'/api/plants/rtu/commands');options=o;return {ok:true,json:async()=>rows}}});
 assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer synthetic-token');assert.deepEqual(result,rows.slice(0,20));
 await assert.rejects(readCommandList('rtu',new AbortController().signal,{onAuth:()=>auth++,fetcher:async()=>({ok:false,status:401,json:async()=>{bodyRead++;return {error:'secret'}}})}),{httpStatus:401});assert.equal(auth,1);assert.equal(bodyRead,0);
 await assert.rejects(readCommandList('rtu',new AbortController().signal,{fetcher:async()=>({ok:true,json:async()=>[null]})}),/format/);
});
test('timeout covers stalled JSON body after successful headers',async()=>{
 const c=clock(),body=defer(),states=[];let signal;
 const stop=pollCommandList({...c,onChange:s=>states.push(s),read:s=>readCommandList('rtu',s,{fetcher:async(_,options)=>{signal=options.signal;return {ok:true,json:()=>body.promise}}})});await flush();c.fire(15000);await flush();assert.ok(signal.aborted);assert.match(states.at(-1).error,/15초/);body.resolve([]);await flush();assert.equal(states.at(-1).checkedAt,null);stop();
});
