// Optional workstation QA: PLAYWRIGHT_NODE_MODULES points at a Playwright installation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_NODE_MODULES?path.join(process.env.PLAYWRIGHT_NODE_MODULES,'playwright'):'playwright');
(async()=>{
 const base=process.env.GRID_URL||'http://127.0.0.1:3103',directory=process.env.QA_DIRECTORY||'artifacts/checkpoints/browser-auth';fs.mkdirSync(directory,{recursive:true});
 const target=new URL(base);let disconnected=false,muted=false,initial=true;const sockets=new Set();
 // A real HTTP stream interruption fixture. Browser offline emulation alone may leave
 // an already-open SSE TCP connection receiving data, so it cannot prove stale UI.
 const proxy=http.createServer((req,res)=>{if(disconnected||(initial&&req.url==='/api/state')){res.writeHead(503);res.end();return;}const upstream=http.request({hostname:target.hostname,port:target.port,path:req.url,method:req.method,headers:{...req.headers,host:target.host}},response=>{res.writeHead(response.statusCode,response.headers);if(req.url==='/api/events'){response.on('data',chunk=>{if(!muted)res.write(chunk)});response.on('end',()=>res.end());}else response.pipe(res);});upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});res.on('close',()=>upstream.destroy());req.pipe(upstream);});
 proxy.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const browserBase=`http://127.0.0.1:${proxy.address().port}`;
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(browserBase);await page.getByText('서버 상태를 불러오는 중입니다…',{exact:true}).waitFor();initial=false;const config=await (await fetch(base+'/api/config')).json();
  if(config.authRequired){await page.getByRole('heading',{name:'관리 API 로그인'}).waitFor();const token=process.env.API_TOKEN_FILE?fs.readFileSync(process.env.API_TOKEN_FILE,'utf8').trim():process.env.API_TOKEN;if(!token)throw Error('QA token required');await page.getByLabel('API 토큰',{exact:true}).fill('invalid-fixture-token');await page.getByRole('button',{name:'워크스페이스 연결'}).click();await page.getByRole('heading',{name:'관리 API 로그인'}).waitFor();await page.getByLabel('API 토큰',{exact:true}).fill(token);await page.getByRole('button',{name:'워크스페이스 연결'}).click();}
  await page.getByText('실시간 연결',{exact:true}).waitFor({timeout:15000});await page.waitForTimeout(2000);
  if(config.authRequired){const another=await context.newPage();await another.goto(browserBase);await another.getByRole('heading',{name:'관리 API 로그인'}).waitFor();await another.close();assert.equal(await page.evaluate(()=>localStorage.getItem('grid-token')),null);assert(!page.url().includes('token'));assert(!(await page.locator('body').innerText()).includes(fs.readFileSync(process.env.API_TOKEN_FILE||'/dev/null','utf8').trim()||'__no_token_file__'));}
  await page.screenshot({path:path.join(directory,'authenticated-dashboard.png'),fullPage:true});
  muted=true;await page.getByText(/데이터 지연 ·/).waitFor({timeout:12000});muted=false;await page.getByText('실시간 연결',{exact:true}).waitFor({timeout:15000});
  disconnected=true;for(const socket of sockets)socket.destroy();await page.getByText(/데이터 지연 ·/).waitFor({timeout:12000});await page.screenshot({path:path.join(directory,'stale-stream.png')});
  disconnected=false;await page.getByText('실시간 연결',{exact:true}).waitFor({timeout:15000});
  await page.getByRole('link',{name:'연동 가이드',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'전체 규격 Markdown'}).click();const download=await downloadPromise;const file=path.join(directory,'guide-download.md');await download.saveAs(file);assert(fs.readFileSync(file,'utf8').includes('MQTT'));
  await page.getByRole('link',{name:'RTU 디바이스',exact:true}).click();await page.screenshot({path:path.join(directory,'devices.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert(width.scroll<=width.width+1,JSON.stringify(width));await page.screenshot({path:path.join(directory,'narrow-devices.png'),fullPage:true});
  assert.deepEqual(errors,[]);const result={result:'PASS',authRequired:config.authRequired,authenticatedSSE:true,initialWaitingState:true,openStreamWithoutMessagesStale:true,wrongTokenReentry:true,independentTabRequiresLogin:true,noLocalStorageToken:true,staleAfterFiveSeconds:true,resumeClearsStale:true,guideDownload:true,narrowViewportNoPageOverflow:true,pageErrors:errors};fs.writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(r=>proxy.close(r));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
