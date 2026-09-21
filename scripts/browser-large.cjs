const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_NODE_MODULES,'playwright'));
(async()=>{
 const base=process.env.GRID_URL||'http://127.0.0.1:3103',token=fs.readFileSync(process.env.API_TOKEN_FILE,'utf8').trim();
 const req=await fetch(base+'/api/plants',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({name:'대용량 SSE 검증 '+Date.now(),type:'wind',count:100,ratedKw:1000,rampKwPerSec:1000,csv:'timestamp,power_kw\n2026-01-01 00:00:00,50000\n2026-01-01 00:10:00,50000'})});assert.equal(req.status,201);const plant=await req.json();
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(token=>sessionStorage.setItem('grid-token',token),token);await page.goto(base);await page.getByText('실시간 연결',{exact:true}).waitFor();await page.getByRole('button').filter({has:page.getByRole('heading',{name:plant.name,exact:true})}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.table-wrap tbody tr').length===100);
 const first=await page.locator('.chart-axis').innerText();await page.waitForTimeout(3100);const last=await page.locator('.chart-axis').innerText();assert.notEqual(first,last);
 const snapshot=await fetch(base+'/api/state',{headers:{Authorization:`Bearer ${token}`}});const body=await snapshot.text();assert(Buffer.byteLength(body)>65536);assert.deepEqual(errors,[]);
 fs.mkdirSync('artifacts/checkpoints/browser-large',{recursive:true});await page.screenshot({path:'artifacts/checkpoints/browser-large/dashboard.png',fullPage:true});
 const result={result:'PASS',plantId:plant.id,generatorRows:100,stateBytes:Buffer.byteLength(body),continuedChartUpdates:true,pageErrors:errors};fs.writeFileSync('artifacts/checkpoints/browser-large/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
