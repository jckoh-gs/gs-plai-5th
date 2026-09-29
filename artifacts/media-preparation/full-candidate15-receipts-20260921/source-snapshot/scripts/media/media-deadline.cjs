// A separate watchdog owns the worker process group, including synchronous tools.
const fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync,spawnSync}=require('node:child_process');
function budget({run,rehearsal=false,rehearsalBudgetMs=15*60*1000,now=Date.now,deadline,finalReserveMs=0}={}){
 if(!Number.isFinite(finalReserveMs)||finalReserveMs<0)throw Error('Invalid final cleanup reserve');
 const limit=rehearsal?now()+rehearsalBudgetMs:Date.parse(run.deadlineAt)-finalReserveMs;
 const end=deadline===undefined?limit:Math.min(deadline,limit);
 const check=()=>{if(!Number.isFinite(end)||now()>=end||(!rehearsal&&(!Number.isFinite(Date.parse(run.freezeAt))||now()<Date.parse(run.freezeAt))))throw Error('Media execution window expired or not open');};
 const remaining=(cap=120000)=>{check();return Math.max(1,Math.min(cap,Math.floor(end-now())));};
 return {deadline:end,check,remaining,exec:(file,args,options={})=>execFileSync(file,args,{...options,timeout:remaining(options.timeout||120000),killSignal:'SIGKILL'}),spawnSync:(file,args,options={})=>spawnSync(file,args,{...options,timeout:remaining(options.timeout||120000),killSignal:'SIGKILL'})};
}
function processSnapshot(){
 const output=execFileSync('/bin/ps',['-axo','pid=,ppid=,lstart=,command='],{encoding:'utf8',timeout:500,maxBuffer:4*1024*1024,stdio:['ignore','pipe','ignore']});
 return output.trim().split('\n').map(line=>{const m=line.trim().match(/^(\d+)\s+(\d+)\s+(\S+\s+\S+\s+\d+\s+\d+:\d+:\d+\s+\d+)\s+(.+)$/);return m?{pid:Number(m[1]),ppid:Number(m[2]),birth:m[3],command:m[4]}:null;}).filter(Boolean);
}
const same=(a,b)=>!!a&&!!b&&a.pid===b.pid&&a.birth===b.birth&&a.command===b.command;
function cleanupOwned({worker,reaped=false,snapshot=processSnapshot,signal=(pid)=>process.kill(pid,'SIGKILL')}){
 if(reaped||!worker)return [];
 let rows;try{rows=snapshot();}catch{return [];}
 if(!same(rows.find(p=>p.pid===worker.pid),worker))return [];
 const owned=new Map([[worker.pid,worker]]);let changed=true;while(changed){changed=false;for(const row of rows)if(owned.has(row.ppid)&&!owned.has(row.pid)){owned.set(row.pid,row);changed=true;}}
 const killed=[],until=Date.now()+1000;
 for(const original of [...owned.values()].reverse()){
  if(Date.now()>=until)break;
  // Re-check birth identity and the entire ownership chain immediately before
  // signalling. If the parent exited/reparented or any identity changed, skip.
  let fresh;try{fresh=new Map(snapshot().map(p=>[p.pid,p]));}catch{break;}
  if(!same(fresh.get(worker.pid),worker))break;
  let current=fresh.get(original.pid),valid=same(current,original),seen=new Set();
  while(valid&&current.pid!==worker.pid){if(seen.has(current.pid)){valid=false;break;}seen.add(current.pid);current=fresh.get(current.ppid);valid=same(current,owned.get(current?.pid));}
  if(valid)try{signal(original.pid);killed.push(original.pid);}catch{}
 }
 return killed;
}
function supervise(script,{runPath='docs/operations/run.json',rehearsalBudgetMs=15*60*1000,finalReserveMs=0}={}){
 const identity=path.resolve(script);
 if(process.env.GRID_MEDIA_WORKER===identity)return true;
 const rehearsal=process.argv.includes('--rehearsal'),run=JSON.parse(fs.readFileSync(runPath));
 const b=budget({run,rehearsal,rehearsalBudgetMs,finalReserveMs});b.check();
 const child=spawn(process.execPath,[identity,...process.argv.slice(2)],{detached:true,stdio:'inherit',env:{...process.env,GRID_MEDIA_WORKER:identity,GRID_MEDIA_DEADLINE:String(b.deadline)}});
 let reaped=false,worker;
 try{worker=processSnapshot().find(p=>p.pid===child.pid);}catch{}
 const kill=()=>cleanupOwned({worker,reaped});
 const timer=setTimeout(()=>{kill();console.error('Media deadline reached; unfinished outputs are not verified');process.exit(124);},b.remaining(2**31-1));
 child.on('error',()=>{reaped=true;clearTimeout(timer);console.error('Media worker could not start');process.exit(1);});
 child.on('exit',code=>{reaped=true;clearTimeout(timer);process.exit(code??1);});
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{kill();process.exit(130);});
 return false;
}
function workerBudget(run,rehearsal){return budget({run,rehearsal,deadline:process.env.GRID_MEDIA_DEADLINE?Number(process.env.GRID_MEDIA_DEADLINE):undefined});}
module.exports={budget,supervise,workerBudget,cleanupOwned};
