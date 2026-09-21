import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
const script=resolve('scripts/deadline-command.py');
function fixture(){
  const directory=mkdtempSync(join(tmpdir(),'grid-deadline-')),run=join(directory,'run.json'),marker=join(directory,'marker');
  writeFileSync(run,JSON.stringify({deadlineAt:new Date(Date.now()+60000).toISOString()}));
  return {directory,run,marker,invoke(code,seconds=5){return spawnSync('python3',[script,'--run-file',run,'--timeout-seconds',String(seconds),'--','python3','-c',code],{encoding:'utf8',timeout:10000});},close(){rmSync(directory,{recursive:true,force:true});}};
}
test('deadline command preserves successful proof bytes but withholds failed child secrets',()=>{
  const f=fixture();try{
    const good=f.invoke('import sys;sys.stdout.write(\'{"result":"PASS"}\\n\')');
    assert.equal(good.status,0,good.stderr);assert.equal(good.stdout,'{"result":"PASS"}\n');
    const bad=f.invoke('import sys;print("private-marker");print("private-marker",file=sys.stderr);sys.exit(7)');
    assert.notEqual(bad.status,0);assert.equal(bad.stdout,'');assert(!bad.stderr.includes('private-marker'));assert.match(bad.stderr,/outcome may be uncertain/);
  }finally{f.close();}
});
test('expired, missing or invalid original deadline never starts the supplied command',()=>{
  const f=fixture();try{
    const command=`from pathlib import Path;Path(${JSON.stringify(f.marker)}).write_text('started')`;
    for(const value of [{deadlineAt:new Date(Date.now()-1000).toISOString()},{deadlineAt:'invalid'},{deadlineAt:'2026-09-22T22:00:00'},{}]){
      writeFileSync(f.run,JSON.stringify(value));assert.notEqual(f.invoke(command).status,0);assert(!existsSync(f.marker));
    }
    rmSync(f.run);assert.notEqual(f.invoke(command).status,0);assert(!existsSync(f.marker));
  }finally{f.close();}
});
test('original remaining time caps a larger host timeout and uncertain output is withheld',()=>{
  const f=fixture();try{
    writeFileSync(f.run,JSON.stringify({deadlineAt:new Date(Date.now()+2000).toISOString()}));
    const start=Date.now(),r=f.invoke(`import time;from pathlib import Path;Path(${JSON.stringify(f.marker)}).write_text('started');print('private-marker',flush=True);time.sleep(30)`,20);
    assert.equal(r.status,124,r.stderr);assert.equal(readFileSync(f.marker,'utf8'),'started');assert(Date.now()-start<7000);assert.equal(r.stdout,'');assert(!r.stderr.includes('private-marker'));assert.match(r.stderr,/not proven cancelled/);
  }finally{f.close();}
});
test('host timeout terminates descendants only in the process group it created',async()=>{
  const f=fixture();try{
    const child=`import time;from pathlib import Path;time.sleep(2.5);Path(${JSON.stringify(f.marker)}).write_text('survived')`;
    const parent=`import subprocess,sys,time;subprocess.Popen([sys.executable,'-c',${JSON.stringify(child)}]);print('private-marker',flush=True);time.sleep(30)`;
    const r=f.invoke(parent,1);assert.equal(r.status,124,r.stderr);assert.equal(r.stdout,'');
    await new Promise(resolve=>setTimeout(resolve,2200));assert(!existsSync(f.marker),'owned descendant must not survive the local timeout');
  }finally{f.close();}
});
test('successful leader exit stops residual group members before its PID is reaped',async()=>{
  const f=fixture();try{
    const child=`import time;from pathlib import Path;time.sleep(1);Path(${JSON.stringify(f.marker)}).write_text('survived')`;
    const parent=`import subprocess,sys;subprocess.Popen([sys.executable,'-c',${JSON.stringify(child)}],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);print('proof')`;
    const r=f.invoke(parent,3);assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'proof\n');
    await new Promise(resolve=>setTimeout(resolve,1200));assert(!existsSync(f.marker),'background group member must not outlive the completed command');
  }finally{f.close();}
});
test('combined child output is capped while running and never emitted after failure',()=>{
  const f=fixture();try{
    const r=f.invoke("import os,time;chunk=b'private-marker'*10000\nfor i in range(400):os.write(1,chunk)\ntime.sleep(30)",5);
    assert.equal(r.status,125,r.stderr);assert.equal(r.stdout,'');assert.match(r.stderr,/32 MiB combined limit/);assert(!r.stderr.includes('private-marker'));
  }finally{f.close();}
});
test('SIGTERM to the wrapper stops its owned command group with no success output',async()=>{
  const f=fixture();let running;
  try{
    const started=f.marker+'.started';
    const child=`import time;from pathlib import Path;time.sleep(2);Path(${JSON.stringify(f.marker)}).write_text('survived')`;
    const parent=`import subprocess,sys,time;from pathlib import Path;subprocess.Popen([sys.executable,'-c',${JSON.stringify(child)}]);Path(${JSON.stringify(started)}).write_text('started');print('private-marker',flush=True);time.sleep(4)`;
    running=spawn('python3',[script,'--run-file',f.run,'--timeout-seconds','8','--','python3','-c',parent],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';running.stdout.on('data',b=>stdout+=b);running.stderr.on('data',b=>stderr+=b);
    const done=new Promise((resolve,reject)=>{running.on('error',reject);running.on('exit',(code,signal)=>resolve({code,signal}));});
    const until=Date.now()+3000;while(!existsSync(started)&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,30));
    assert(existsSync(started),'fixture must start before interrupt');running.kill('SIGTERM');
    const result=await done;assert.equal(result.code,130,stderr);assert.equal(result.signal,null);assert.equal(stdout,'');assert(!stderr.includes('private-marker'));
    await new Promise(resolve=>setTimeout(resolve,2200));assert(!existsSync(f.marker));
  }finally{if(running?.exitCode===null)running.kill('SIGTERM');f.close();}
});
