// Isolated HTTP-origin fixture: no production credentials or control requests.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(path.join(process.env.PLAYWRIGHT_NODE_MODULES||'/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));
const html=`<!doctype html><meta charset="utf-8"><button id="command">Send</button><button id="copy">Copy</button>
<script type="module">
import {createCommandReceipts} from '/web/command-receipts.js';
import {copyText} from '/web/browser-compat.js';
window.failures=[];window.posts=[];window.copies=[];
addEventListener('unhandledrejection',event=>failures.push(String(event.reason)));
addEventListener('copy',()=>{const input=document.querySelector('textarea');copies.push({text:input?.value,start:input?.selectionStart,end:input?.selectionEnd})});
const receipts=createCommandReceipts({request:async(path,method,body)=>{if(method!=='POST')return {plants:[]};posts.push(body);return {...body,plantId:'fixture',source:'REST',status:'accepted'}}});
document.querySelector('#command').onclick=async()=>{window.receipt=await receipts.send({id:'fixture',name:'HTTP fixture'},{action:'set_target',targetKw:10})};
document.querySelector('#copy').onclick=async()=>{window.copyResult=null;try{await copyText('HTTP 복사 fixture');window.copyResult='copied'}catch(e){window.copyResult=e.message}};
window.fixtureReady=true;
</script>`;
const files=new Set(['/web/browser-compat.js','/web/command-receipts.js']);
const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)}
  else if(files.has(req.url)){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(__dirname,'..',req.url)))}
  else{res.statusCode=404;res.end()}
});
(async()=>{
  let browser;
  const report={checkedAt:new Date().toISOString(),scope:'Isolated browser fixture; no production writes'};
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true,channel:'chrome',args:['--no-proxy-server','--host-resolver-rules=MAP grid-http.test 127.0.0.1']});
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://grid-http.test:'+server.address().port);await page.waitForFunction(()=>window.fixtureReady);
    report.browserContext=await page.evaluate(()=>({secure:isSecureContext,randomUUID:typeof crypto.randomUUID,clipboard:typeof navigator.clipboard,getRandomValues:typeof crypto.getRandomValues}));
    assert.deepEqual(report.browserContext,{secure:false,randomUUID:'undefined',clipboard:'undefined',getRandomValues:'function'});
    await page.click('#command');await page.waitForFunction(()=>window.receipt?.confirmed);
    report.command=await page.evaluate(()=>({receipt,posts}));
    assert.match(report.command.receipt.commandId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(report.command.posts.length,1);assert.equal(report.command.receipt.pending,false);
    await page.click('#copy');await page.waitForFunction(()=>window.copyResult!==null);
    report.copy=await page.evaluate(()=>({result:copyResult,events:copies,temporaryInputs:document.querySelectorAll('textarea').length,focused:document.activeElement.id}));
    assert.equal(report.copy.result,'copied');assert.equal(report.copy.events.length,1);
    assert.equal(report.copy.events[0].text,'HTTP 복사 fixture');assert.equal(report.copy.events[0].start,0);assert.equal(report.copy.events[0].end,'HTTP 복사 fixture'.length);
    assert.equal(report.copy.temporaryInputs,0);assert.equal(report.copy.focused,'copy');
    await page.evaluate(()=>{document.execCommand=()=>false});await page.click('#copy');await page.waitForFunction(()=>window.copyResult!==null);
    report.copyDenied=await page.evaluate(()=>({message:copyResult,temporaryInputs:document.querySelectorAll('textarea').length}));
    assert.match(report.copyDenied.message,/직접 복사/);assert.equal(report.copyDenied.temporaryInputs,0);
    assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>failures),[]);report.result='PASS';
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
  const out=process.argv[2];if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n')}
  console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
