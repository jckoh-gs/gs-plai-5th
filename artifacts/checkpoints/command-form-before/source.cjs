const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const base='http://127.0.0.1:3106',out='artifacts/checkpoints/command-form-before';
 const token=fs.readFileSync('artifacts/private/candidate-1.3/api-token','utf8').trim();
 const browser=await chromium.launch({headless:true,channel:'chrome',timeout:15000,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/#lab');await page.getByLabel('API 토큰',{exact:true}).fill(token);await page.getByRole('button',{name:'워크스페이스 연결'}).click();await page.getByLabel(/^관찰 RTU/).waitFor();
  await page.getByRole('button',{name:'목표값·처리 결과',exact:true}).click();
  const checks=[];
  for(const [label,values,reset] of [['허용 오차 (kW)',['0','10001'],'1'],['실행 timeout (초)',['0','3601'],'120'],['우선순위 (0–100)',['101'],'50']]){
   const input=page.getByLabel(label,{exact:true});
   for(const value of values){await input.fill(value);checks.push({label,value,...await input.evaluate(e=>({min:e.min,max:e.max,step:e.step,nativeValid:e.checkValidity()}))});}
   await input.fill(reset);
  }
  const selectedRtu=await page.getByLabel(/^관찰 RTU/).inputValue();
  await page.getByLabel('우선순위 (0–100)',{exact:true}).fill('101');
  const response=page.waitForResponse(r=>r.url()===base+'/api/plants/'+selectedRtu+'/commands'&&r.request().method()==='POST');
  await page.getByRole('button',{name:'목표값 전송',exact:true}).click();
  const actual=await response,body=await actual.json();assert.equal(actual.status(),200);assert.equal(body.status,'rejected');assert.equal(body.reason,'priority must be 0..100');
  await page.getByText('priority must be 0..100',{exact:true}).first().waitFor();
  await page.screenshot({path:path.join(out,'accepted-by-form-rejected-by-server.png'),fullPage:true});
  const served=await page.locator('script[type="module"][src]').first().getAttribute('src');
  const asset=await fetch(base+served,{signal:AbortSignal.timeout(5000),redirect:'error'});assert(asset.ok);const assetBytes=Buffer.from(await asset.arrayBuffer());
  assert.deepEqual(errors,[]);assert(checks.every(c=>c.nativeValid));
  const result={observedAt:new Date().toISOString(),result:'REPRODUCED',scope:'Local1.3 fixture only; one deliberately invalid command rejected with no SCADA dispatch; no k3s write',checks,request:{rtuId:selectedRtu,commandId:body.commandId,priority:101,httpStatus:actual.status(),status:body.status,reason:body.reason},servedAsset:{path:served,sha256:crypto.createHash('sha256').update(assetBytes).digest('hex'),bytes:assetBytes.length},pageErrors:errors};
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(()=>{console.error('Local command form observation failed; no completed evidence claimed');process.exitCode=1});
