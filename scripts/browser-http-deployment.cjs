// Read-only deployed UI check. Browser HTTP reaches the ingress through a TLS Kubernetes tunnel.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_NODE_MODULES||'/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));
(async()=>{
  const report={checkedAt:new Date().toISOString(),scope:'Actual deployed UI, authenticated read-only API and SSE through ingress; no production control writes'};
  const forward=spawn('kubectl',['--context','charles-k3s','-n','ingress-nginx','port-forward','--address=127.0.0.1','service/ingress-nginx-controller',':80'],{stdio:['ignore','pipe','pipe']});
  let browser;const exited=new Promise(resolve=>forward.once('exit',(code,signal)=>resolve({code,signal})));
  try{
    const port=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Ingress tunnel startup timed out')),10000);
      forward.once('error',error=>{clearTimeout(timer);reject(error)});
      forward.once('exit',()=>{clearTimeout(timer);reject(Error('Ingress tunnel ended before readiness'))});
      let output='';forward.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/Forwarding from 127\.0\.0\.1:(\d+) ->/);if(match){clearTimeout(timer);resolve(Number(match[1]))}});
      forward.stderr.resume();
    });
    browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader','--no-proxy-server','--host-resolver-rules=MAP grid.koh.it.kr 127.0.0.1']});
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],writes=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',route=>{
      if(route.request().method()==='GET')return route.continue();
      writes.push({method:route.request().method(),path:new URL(route.request().url()).pathname});return route.abort();
    });
    await page.addInitScript(value=>{
      sessionStorage.setItem('grid-token',value);window.httpCopyEvents=0;
      document.addEventListener('copy',()=>window.httpCopyEvents++);
    },fs.readFileSync('artifacts/private/deploy/api-token','utf8').trim());
    const response=await page.goto('http://grid.koh.it.kr:'+port,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
    await page.locator('.version').filter({hasText:'v1.7.2'}).waitFor();
    await page.locator('.connection.online').waitFor();
    report.httpContext=await page.evaluate(()=>({secure:isSecureContext,randomUUID:typeof crypto.randomUUID,clipboard:typeof navigator.clipboard}));
    assert.deepEqual(report.httpContext,{secure:false,randomUUID:'undefined',clipboard:'undefined'});
    report.product=await page.locator('.version').innerText();report.realtime=await page.locator('.connection').innerText();
    report.plantCards=await page.locator('.plant-card').count();assert(report.plantCards>0);
    await page.getByRole('link',{name:'연동 가이드'}).click();
    const copy=page.getByRole('button',{name:'코드 복사'}).first();await copy.click();
    await page.waitForFunction(()=>window.httpCopyEvents>0);
    report.copyEvents=await page.evaluate(()=>window.httpCopyEvents);
    report.temporaryCopyInputs=await page.locator('textarea[readonly]').count();assert.equal(report.temporaryCopyInputs,0);
    report.pageErrors=errors;report.blockedMutations=writes;assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
    report.result='PASS';
  }finally{
    if(browser)await browser.close();forward.kill('SIGTERM');
    report.tunnelExit=await exited;
  }
  fs.writeFileSync(process.argv[2]||'deploy/verification/ingress-grid-20260922/browser-deployed.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
})().catch(()=>{console.error('Deployed HTTP browser verification failed; raw authenticated diagnostics withheld.');process.exitCode=1});
