const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const base='http://127.0.0.1:3106',out='artifacts/checkpoints/command-expiry-before',token=fs.readFileSync('artifacts/private/candidate-1.3/api-token','utf8').trim();
 const browser=await chromium.launch({headless:true,channel:'chrome',timeout:15000,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];let commandPosts=0;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&/\/api\/plants\/[^/]+\/commands$/.test(r.url()))commandPosts++;});
  await page.goto(base+'/#lab');await page.getByLabel('API 토큰',{exact:true}).fill(token);await page.getByRole('button',{name:'워크스페이스 연결'}).click();await page.getByLabel(/^관찰 RTU/).waitFor();await page.getByRole('button',{name:'목표값·처리 결과',exact:true}).click();
  const input=page.getByLabel('전달 유효기간 (초)',{exact:true});await input.fill('100000000000000000000');
  const native=await input.evaluate(e=>({value:e.value,min:e.min,max:e.max,valid:e.checkValidity()}));assert(native.valid);
  const error=page.waitForEvent('pageerror',{timeout:5000});await page.getByRole('button',{name:'목표값 전송',exact:true}).click();await error;
  assert(errors.some(e=>e.includes('Invalid time value')));assert.equal(commandPosts,0);
  await page.screenshot({path:path.join(out,'expiry-no-validation-feedback.png'),fullPage:true});
  const result={observedAt:new Date().toISOString(),result:'REPRODUCED',scope:'Local1.3 browser only; no command POST and no k3s access',input:native,commandPosts,pageErrors:errors};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(()=>{console.error('Local expiry observation failed; no completed evidence claimed');process.exitCode=1});
