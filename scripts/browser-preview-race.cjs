const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_NODE_MODULES,'playwright'));
(async()=>{
 const target=new URL(process.env.GRID_URL||'http://127.0.0.1:3103'),directory=process.env.QA_DIRECTORY||'artifacts/checkpoints/preview-browser';fs.mkdirSync(directory,{recursive:true});
 let hold=false,pending=[],requests=0;const sockets=new Set();
 const proxy=http.createServer((req,res)=>{const preview=req.url==='/api/datasets/preview';if(preview)requests++;
  const upstream=http.request({hostname:target.hostname,port:target.port,path:req.url,method:req.method,headers:{...req.headers,host:target.host}},response=>{
   if(preview&&hold){const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>pending.push(()=>{res.writeHead(response.statusCode,response.headers);res.end(Buffer.concat(chunks));}));}
   else{res.writeHead(response.statusCode,response.headers);response.pipe(res);}
  });upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.pipe(upstream);res.on('close',()=>upstream.destroy());
 });proxy.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 await page.addInitScript(()=>{const original=File.prototype.text;window.pendingFileReads=[];File.prototype.text=function(){if(!this.name.startsWith('delayed-'))return original.call(this);return new Promise(resolve=>window.pendingFileReads.push(()=>original.call(this).then(resolve)));};});
 page.on('pageerror',e=>errors.push(e.message));const wait=async fn=>{for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('Proxy condition timeout');};
 try{
  await page.goto(`http://127.0.0.1:${proxy.address().port}`);await page.getByLabel('API 토큰',{exact:true}).fill(fs.readFileSync(process.env.API_TOKEN_FILE||'artifacts/private/browser-auth-token','utf8').trim());await page.getByRole('button',{name:'워크스페이스 연결'}).click();
  await page.getByRole('button',{name:'RTU 추가',exact:true}).first().click();const dialog=page.getByRole('dialog'),textarea=dialog.locator('textarea');
  const csv='timestamp,power_kw\n2026-01-01 00:00:00,100\n2026-01-01 00:10:00,200';await textarea.fill(csv);
  hold=true;await dialog.getByRole('button',{name:'CSV 해석 미리보기',exact:true}).click();await wait(()=>pending.length===1);
  assert(await dialog.getByRole('button',{name:'CSV 해석 중…'}).isDisabled());assert.equal(requests,1);
  await dialog.getByLabel(/^입력 단위/).selectOption('kwh');pending.shift()();await dialog.getByRole('button',{name:'CSV 해석 미리보기',exact:true}).waitFor();
  assert.equal(await dialog.getByRole('region',{name:'CSV 해석 미리보기 결과'}).count(),0);
  hold=false;await dialog.getByRole('button',{name:'CSV 해석 미리보기',exact:true}).click();const result=dialog.getByRole('region',{name:'CSV 해석 미리보기 결과'});await result.waitFor();assert((await result.innerText()).includes('hold'));assert((await result.innerText()).includes('600'));
  for(const [label,value] of [['발전 유형','solar'],['값 의미','mean']]){await dialog.getByLabel(new RegExp('^'+label)).selectOption(value);assert.equal(await result.count(),0);await dialog.getByRole('button',{name:'CSV 해석 미리보기',exact:true}).click();await result.waitFor();}
  await textarea.fill('broken CSV');assert.equal(await result.count(),0);hold=true;await dialog.getByRole('button',{name:'CSV 해석 미리보기',exact:true}).click();await wait(()=>pending.length===1);
  await textarea.fill(csv);pending.shift()();await dialog.getByRole('button',{name:'CSV 해석 미리보기',exact:true}).waitFor();assert.equal(await dialog.getByRole('alert').count(),0);
  hold=false;await dialog.getByRole('button',{name:'CSV 해석 미리보기',exact:true}).click();await result.waitFor();
  await dialog.locator('input[type=file]').setInputFiles({name:'delayed-old.csv',mimeType:'text/csv',buffer:Buffer.from(csv.replace(',100',',1'))});
  assert(await dialog.getByRole('button',{name:'RTU 등록 · 수집 시작'}).isDisabled());assert(await dialog.locator('.preview-actions button').isDisabled());
  const editedCSV=csv.replace(',100',',300');await textarea.fill(editedCSV);await page.evaluate(()=>window.pendingFileReads.shift()());await page.waitForTimeout(100);assert.equal(await textarea.inputValue(),editedCSV);
  await dialog.getByRole('button',{name:'CSV 해석 미리보기',exact:true}).click();await result.waitFor();await result.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(directory,'preview-race.png')});
  await page.setViewportSize({width:390,height:844});await result.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,'preview-narrow.png')});
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert(width.scroll<=width.width+1,JSON.stringify(width));
  await dialog.locator('input[type=file]').setInputFiles({name:'delayed-oversize.csv',mimeType:'text/csv',buffer:Buffer.alloc(20*1024*1024+1,120)});
  await dialog.getByRole('alert').filter({hasText:'CSV 파일은 20MiB 이하여야 합니다.'}).waitFor();assert.equal(await page.evaluate(()=>window.pendingFileReads.length),0);assert.equal(await textarea.inputValue(),'');
  assert.deepEqual(errors,[]);
  const report={result:'PASS',lateSuccessDiscarded:true,lateErrorDiscarded:true,duplicateDisabled:true,invalidation:['csv','type','unit','semantics'],pendingFileBlocksPreviewAndRegistration:true,manualCSVWinsLateFileRead:true,oversizeFileRejectedBeforeRead:true,narrowNoPageOverflow:true,authenticated:true,pageErrors:errors,requests};fs.writeFileSync(path.join(directory,'race.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();for(const s of sockets)s.destroy();await new Promise(r=>proxy.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
