const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_NODE_MODULES,'playwright'));
const base=process.env.GRID_URL||'http://127.0.0.1:3106',out=process.env.QA_DIRECTORY||'artifacts/checkpoints/scenario-scope-local';
// Creates isolated test RTUs; never run against the primary cluster tunnel.
assert.equal(new URL(base).hostname,'127.0.0.1');assert.equal(new URL(base).port,'3106');
const token=fs.readFileSync('artifacts/private/candidate-1.3/api-token','utf8').trim();
const api=async(url,method='GET',body)=>{const r=await fetch(base+'/api'+url,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000),redirect:'error'});assert(r.ok,`HTTP ${r.status}`);return r.json()};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const gate=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release}};
(async()=>{
 fs.mkdirSync(out,{recursive:true});const fixture=randomUUID().slice(0,8),plants=[],errors=[],checks=[];
 const csv='timestamp,power_kw,voltage,current_a\n2026-01-01 00:00:00,1000,380,100\n2026-01-01 00:10:00,1000,380,100';
 for(const role of ['A','B','Empty']){
  const p=await api('/plants','POST',{name:`${role}-${fixture} Scenario`,type:'wind',count:2,ratedKw:1000,rampKwPerSec:1000,csv});plants.push(p);
  await api(`/plants/${p.id}/replay`,'POST',{paused:true});await api(`/plants/${p.id}/faults`,'PATCH',{offline:true});
 }
 const [a,b,c]=plants,name=`동일 이름 ${fixture}`,sa=await api('/scenarios','POST',{plantId:a.id,name}),sb=await api('/scenarios','POST',{plantId:b.id,name});
 const all=await api('/scenarios');assert(all.some(s=>s.id===sa.id)&&all.some(s=>s.id===sb.id));checks.push('REST global list contract unchanged');
 const commands=[];for(const p of [a,b])commands.push(await api(`/plants/${p.id}/commands`,'POST',{schemaVersion:2,commandId:randomUUID(),action:'set_target',targetKw:125,expiresAt:new Date(Date.now()+600000).toISOString(),timeoutSeconds:600}));
 commands.forEach(c=>assert.equal(c.status,'accepted'));
 const before=(await api('/state')).plants,bBefore=before.find(p=>p.id===b.id),aBefore=before.find(p=>p.id===a.id);
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});page.on('pageerror',e=>errors.push(e.message));
 const select=async p=>{await page.getByLabel(/^관찰 RTU/).selectOption(p.id);await page.getByRole('button',{name:'저장 시나리오',exact:true}).click();await page.getByRole('heading',{name:`${p.name} · 저장된 시나리오`,exact:true}).waitFor()};
 const rows=page.locator('.scenario');const waitRows=async n=>{await page.waitForFunction(n=>document.querySelectorAll('.scenario').length===n,n)};
 const assertRows=async(p,n)=>{await waitRows(n);for(const text of await rows.allTextContents())assert(text.includes(p.id));assert.equal(await page.getByLabel(/^관찰 RTU/).inputValue(),p.id)};
 try{
  await page.goto(base+'/#lab');await page.getByLabel('API 토큰',{exact:true}).fill(token);await page.getByRole('button',{name:'워크스페이스 연결'}).click();await page.getByLabel(/^관찰 RTU/).waitFor();
  for(const [p,scenario] of [[a,sa],[b,sb]]){
   await select(p);await assertRows(p,1);const downloadWait=page.waitForEvent('download');await rows.getByRole('button',{name:'JSON',exact:true}).click();const download=await downloadWait,file=path.join(out,`export-${p===a?'A':'B'}.json`);await download.saveAs(file);
   const actual=JSON.parse(fs.readFileSync(file)),expected=await api(`/scenarios/${scenario.id}/export`);assert.deepEqual(actual,expected);assert.equal(actual.snapshot.id,p.id);assert(!fs.readFileSync(file,'utf8').includes(token));
  }
  checks.push('Same-named A/B rows scoped; real JSON downloads equal original server snapshots');
  await select(c);await page.getByText(`${c.name}에 저장된 시나리오가 없습니다. 다른 단지는 위 RTU 선택에서 변경하세요.`,{exact:true}).waitFor();await assertRows(c,0);checks.push('Named empty RTU state');
  await select(a);await assertRows(a,1);const restored=page.waitForResponse(r=>r.url().endsWith(`/scenarios/${sa.id}/run`)&&r.request().method()==='POST');await rows.getByRole('button',{name:'복원·재실행'}).click();assert.equal((await restored).status(),200);await page.getByText(`${a.name} (RTU ${a.id})에 시나리오 “${name}”를 복원했습니다.`,{exact:true}).waitFor();
  const after=(await api('/state')).plants,aAfter=after.find(p=>p.id===a.id),bAfter=after.find(p=>p.id===b.id);assert.notEqual(aAfter.runId,aBefore.runId);assert.equal(aAfter.controlRuns.find(x=>x.commandId===commands[0].commandId).status,'cancelled');assert.equal(bAfter.runId,bBefore.runId);assert.deepEqual(bAfter.generators,bBefore.generators);assert.deepEqual(bAfter.controlRuns,bBefore.controlRuns);checks.push('A restore new run and cancels A only; paused B run/models/command unchanged');
  // Delay only the outgoing A list response, then remount B and release A last.
  await select(c);const listStarted=gate(),listRelease=gate();let interceptList=true;
  await page.route('**/api/scenarios',async route=>{if(route.request().method()==='GET'&&interceptList){interceptList=false;const response=await route.fetch();listStarted.release();await listRelease.promise;await route.fulfill({response})}else await route.continue()});
  await select(a);await listStarted.promise;await select(b);await assertRows(b,1);listRelease.release();await sleep(250);await assertRows(b,1);await page.unroute('**/api/scenarios');checks.push('Late A list cannot expose A rows while B selected');
  // Let the server save A, hold its response while selection moves to B and back.
  const saveStarted=gate(),saveRelease=gate();let postCount=0;
  await page.route('**/api/scenarios',async route=>{if(route.request().method()==='POST'){postCount++;const response=await route.fetch();saveStarted.release();await saveRelease.promise;await route.fulfill({response})}else await route.continue()});
  await select(a);await page.getByLabel('시나리오 이름',{exact:true}).fill(`late A ${fixture}`);await page.getByRole('button',{name:'현재 상태 저장',exact:true}).click();await saveStarted.promise;
  await select(b);assert(await page.getByRole('button',{name:'현재 상태 저장',exact:true}).isDisabled());await select(a);assert(await page.getByRole('button',{name:'현재 상태 저장',exact:true}).isDisabled());await select(b);saveRelease.release();await page.getByText(`${a.name} (RTU ${a.id})의 시나리오를 저장했습니다.`,{exact:true}).waitFor();await assertRows(b,1);assert.equal(postCount,1);await page.unroute('**/api/scenarios');checks.push('Late A save names actual request RTU; A→B→A remount stays disabled; one POST');
  await page.reload();await select(a);await assertRows(a,2);await page.setViewportSize({width:390,height:844});await page.getByLabel(/^관찰 RTU/).focus();await page.keyboard.type(c.name,{delay:35});await page.waitForFunction(id=>document.querySelector('.plant-selector select')?.value===id,c.id);assert.equal(await page.getByLabel(/^관찰 RTU/).inputValue(),c.id);await page.getByRole('button',{name:'저장 시나리오',exact:true}).click();await assertRows(c,0);await page.screenshot({path:path.join(out,'scenario-empty-narrow.png')});const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert(width.scroll<=width.width+1);checks.push('Reload, narrow layout and keyboard RTU selection');
  await page.setViewportSize({width:1600,height:1000});await select(a);await assertRows(a,2);await page.screenshot({path:path.join(out,'scenario-A-desktop.png')});
  // Real missing-key error; no route mock or external weather service.
  await page.goto(base+'/#dashboard');await page.locator('.plant-card').filter({has:page.getByRole('heading',{name:a.name,exact:true})}).click();const weatherResponse=page.waitForResponse(r=>r.url().endsWith(`/plants/${a.id}/weather/refresh`)&&r.request().method()==='POST');await page.getByRole('button',{name:'KMA 조회',exact:true}).click();const response=await weatherResponse,result=await response.json();assert.equal(response.status(),200);assert.match(result.weatherError,/KMA_AUTH_KEY/);await page.getByRole('alert').filter({hasText:'기상 조회 오류:'}).waitFor();await page.getByRole('alert').filter({hasText:'기상 조회 오류:'}).scrollIntoViewIfNeeded();assert.equal(await page.getByText('기상청 관측을 조회했습니다.',{exact:true}).count(),0);await page.screenshot({path:path.join(out,'weather-error-desktop.png')});checks.push('Actual missing-key HTTP200 displayed as error with RTU attribution, no false green success');
  // Controlled response demonstrates no fresh-observation claim even if server skipped a stale lookup.
  await page.route('**/weather/refresh',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...result,weatherError:null,weatherSource:'manual'})}));await page.getByRole('button',{name:'KMA 조회',exact:true}).click();await page.getByRole('status').filter({hasText:'조회 요청 처리가 완료되었습니다.'}).waitFor();assert.equal(await page.getByText('기상청 관측을 조회했습니다.',{exact:true}).count(),0);await page.unroute('**/weather/refresh');checks.push('Controlled manual/no-error receipt is neutral, not evidence of new KMA data');
  const weatherStarted=gate(),weatherRelease=gate();await page.route('**/weather/refresh',async route=>{weatherStarted.release();await weatherRelease.promise;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...result,weatherError:'controlled late A error'})})});await page.getByRole('button',{name:'KMA 조회',exact:true}).click();await weatherStarted.promise;await page.locator('.plant-card').filter({has:page.getByRole('heading',{name:b.name,exact:true})}).click();weatherRelease.release();await sleep(500);assert.equal(await page.getByText(/controlled late A error/).count(),0);assert((await page.locator('.plant-card.selected').textContent()).includes(b.name));await page.unroute('**/weather/refresh');checks.push('Controlled late A weather response does not render receipt under B');
  assert.deepEqual(errors,[]);const assets=[...fs.readFileSync('dist/index.html','utf8').matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m=>({path:'dist'+m[1],sha256:createHash('sha256').update(fs.readFileSync('dist'+m[1])).digest('hex')}));
  const report={result:'PASS',observedAt:new Date().toISOString(),version:(await api('/state')).version,scope:'Isolated local browser + real REST; explicitly marked controlled response races; no live external KMA claim',plants:plants.map(p=>({id:p.id,name:p.name})),checks,pageErrors:errors,assets};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();for(const p of plants)await api(`/plants/${p.id}/faults`,'PATCH',{offline:false})}
})().catch(e=>{console.error(e);process.exitCode=1});
