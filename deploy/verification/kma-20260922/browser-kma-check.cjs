// One authorized KMA refresh on the screenshot RTU; other mutations are blocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_NODE_MODULES||'/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));
(async()=>{
  const report={checkedAt:new Date().toISOString(),scope:'Actual KMA button on the screenshot RTU through the encrypted Kubernetes ingress tunnel; one weather refresh, no control writes'};
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
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],writes=[];let allowedRefreshes=0;const target='c81f4573-1987-4c01-8d7c-b1e7aa5af38f',refreshPath='/api/plants/'+target+'/weather/refresh';
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',route=>{
      if(route.request().method()==='GET')return route.continue();
      if(route.request().method()==='POST'&&new URL(route.request().url()).pathname===refreshPath&&allowedRefreshes===0){allowedRefreshes++;return route.continue()}
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
    const before=await page.evaluate(async id=>{const r=await fetch('/api/state',{headers:{Authorization:'Bearer '+sessionStorage.getItem('grid-token')}});const state=await r.json();const p=state.plants.find(p=>p.id===id);return p?{mode:p.mode,frozen:p.replay.freezeLiveWeather,station:p.station}:null},target);
    assert(before&&before.mode==='weather'&&!before.frozen,'Target mode changed; explicit refresh skipped to preserve settings');
    await page.locator('.plant-card').filter({has:page.getByRole('heading',{name:'대관령 바람 정원',exact:true})}).click();
    const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname===refreshPath&&r.request().method()==='POST');
    await page.getByRole('button',{name:'KMA 조회',exact:true}).click();
    const refreshed=await responsePromise,value=await refreshed.json();
    assert.equal(refreshed.status(),200);assert.equal(value.weatherSource,'kma');assert.equal(value.weatherError,null);
    assert.equal(value.id,target);assert.equal(value.station,100);assert(value.weatherObservedAt);
    await page.waitForFunction(()=>document.querySelector('.weather-info')?.textContent.includes('kma'));
    report.observation={station:value.station,source:value.weatherSource,observedAt:value.weatherObservedAt,weather:value.weather,error:value.weatherError};
    report.weatherPanelText=await page.locator('.weather-info').innerText();assert(!report.weatherPanelText.includes('KMA_AUTH_KEY'));
    report.refreshHttpStatus=refreshed.status();report.allowedWeatherRefreshes=allowedRefreshes;assert.equal(allowedRefreshes,1);
    report.pageErrors=errors;report.blockedMutations=writes;assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
    report.result='PASS';
  }finally{
    if(browser)await browser.close();forward.kill('SIGTERM');
    report.tunnelExit=await exited;
  }
  fs.writeFileSync(process.argv[2]||'deploy/verification/kma-20260922/browser-verification.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
})().catch(()=>{console.error('Deployed HTTP browser verification failed; raw authenticated diagnostics withheld.');process.exitCode=1});
