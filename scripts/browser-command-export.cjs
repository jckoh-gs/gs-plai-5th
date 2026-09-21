const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_NODE_MODULES,'playwright'));
(async()=>{
 const base=process.env.GRID_URL||'http://127.0.0.1:3103',directory=process.env.QA_DIRECTORY||'artifacts/checkpoints/export-browser';fs.mkdirSync(directory,{recursive:true});
 const token=fs.readFileSync(process.env.API_TOKEN_FILE||'artifacts/private/browser-auth-token','utf8').trim(),headers={Authorization:`Bearer ${token}`};
 const state=await(await fetch(base+'/api/state',{headers})).json(),plants=state.plants.toSorted((a,b)=>b.controlRuns.length-a.controlRuns.length).slice(0,2);assert.equal(plants.length,2);
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});let downloads=0;const errors=[];page.on('download',()=>downloads++);page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/#lab');await page.getByLabel('API 토큰',{exact:true}).fill(token);await page.getByRole('button',{name:'워크스페이스 연결'}).click();await page.getByLabel(/^관찰 RTU/).waitFor();
  const checks=[];
  for(const p of plants){
   await page.getByLabel(/^관찰 RTU/).selectOption(p.id);await page.getByRole('button',{name:'목표값·처리 결과',exact:true}).click();
   const button=page.getByRole('button',{name:'최근 명령 상태 JSON 내보내기',exact:true});await button.scrollIntoViewIfNeeded();
   const pending=page.waitForEvent('download');await button.click();const download=await pending,file=path.join(directory,`command-states-${p.id}.json`);await download.saveAs(file);
   assert.match(download.suggestedFilename(),/^command-states-[a-f0-9-]+-\d+\.json$/);
   const data=JSON.parse(fs.readFileSync(file)),raw=await(await fetch(base+`/api/plants/${p.id}/commands`,{headers})).json();assert.equal(data.plantId,p.id);assert.equal(data.scope,'recent-command-snapshots');assert(data.commands.length<=20);assert.deepEqual(data.commands.map(c=>c.commandId),raw.slice(0,20).map(c=>c.commandId));
   for(const row of data.commands){const original=raw.find(c=>c.commandId===row.commandId);assert(original);assert.equal(row.runId,original.runId||null);assert.equal(row.actualKw,Number.isFinite(original.actualKw)?original.actualKw:null);assert.equal(row.status,original.status);assert(!Object.hasOwn(row,'request'));assert(!Object.hasOwn(row,'reason'));}
   assert(!fs.readFileSync(file,'utf8').includes(token));checks.push({plantId:p.id,commands:data.commands.length,matchedSavedStates:true});
  }
  const button=page.getByRole('button',{name:'최근 명령 상태 JSON 내보내기',exact:true});await page.route('**/commands/export',route=>route.fulfill({status:401,contentType:'application/json',body:'{"error":"authentication required"}'}));
  const before=downloads;await button.click();await page.getByRole('alert').filter({hasText:'다운로드 실패 (401)'}).waitFor();assert.equal(downloads,before);await page.unroute('**/commands/export');
  await page.screenshot({path:path.join(directory,'export-desktop.png')});await page.setViewportSize({width:390,height:844});await button.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,'export-narrow.png')});
  const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert(widths.scroll<=widths.width+1,JSON.stringify(widths));assert.deepEqual(errors,[]);
  const report={result:'PASS',checkedAt:new Date().toISOString(),version:state.version,checks,downloadCount:downloads,authFailureNoDownload:true,selectedRTUIsolation:true,noCredentialInFiles:true,narrowNoPageOverflow:true,pageErrors:errors};fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
