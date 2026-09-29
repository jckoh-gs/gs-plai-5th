// Tool rehearsal only, never a final product demonstration.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const modules=process.env.PLAYWRIGHT_NODE_MODULES||'/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(modules,'playwright'));
const ffmpeg=process.env.FFMPEG||'/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';
(async()=>{
 const out=path.resolve('artifacts/private/video-pilot');fs.mkdirSync(out,{recursive:true});
 execFileSync('say',['-v','Yuna','-r','165','-o',path.join(out,'voice.aiff'),'이 영상은 제작 도구의 사전 점검입니다. 실제 에뮬레이터 화면에서 포인터 이동과 클릭, 확대 표시를 확인합니다. 최종 시연은 검증된 배포 버전으로 다시 제작합니다.']);
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:out,size:{width:1920,height:1080}}});
 await context.addInitScript(()=>{addEventListener('DOMContentLoaded',()=>{const pointer=document.createElement('div');pointer.style.cssText='position:fixed;left:0;top:0;width:20px;height:20px;border:3px solid #fff;border-radius:50%;background:#c5f16c99;z-index:999999;pointer-events:none;box-shadow:0 0 0 6px #0005';document.body.append(pointer);addEventListener('mousemove',e=>{pointer.style.left=(e.clientX-10)+'px';pointer.style.top=(e.clientY-10)+'px'});addEventListener('mousedown',()=>{pointer.style.boxShadow='0 0 0 18px #c5f16c80'});addEventListener('mouseup',()=>setTimeout(()=>pointer.style.boxShadow='0 0 0 6px #0005',350));const caption=document.createElement('div');caption.textContent='제작 도구 사전 점검 · 최종 시연 아님';caption.style.cssText='position:fixed;bottom:20px;left:25%;width:50%;padding:16px;text-align:center;color:white;background:#07170fee;border-radius:8px;font:28px "Apple SD Gothic Neo",sans-serif;z-index:999998;pointer-events:none';document.body.append(caption);});});
 const page=await context.newPage();await page.goto('http://127.0.0.1:3101');await page.getByText('실시간 연결',{exact:true}).waitFor();
 await page.mouse.move(1100,400,{steps:40});await page.waitForTimeout(3000);
 for(const name of ['RTU 디바이스','연동 가이드','통합 대시보드']){const el=page.getByRole('link',{name,exact:true}),box=await el.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:35});await page.mouse.down();await page.waitForTimeout(180);await page.mouse.up();await page.waitForTimeout(3500);}
 await page.waitForTimeout(5000);const video=page.video();await context.close();const raw=await video.path();await browser.close();
 execFileSync(ffmpeg,['-y','-i',raw,'-i',path.join(out,'voice.aiff'),'-vf',"fps=30,zoompan=z='if(between(in,180,300),1.08,1)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=30",'-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',path.join(out,'pilot.mp4')],{stdio:'ignore'});
 execFileSync(ffmpeg,['-v','error','-i',path.join(out,'pilot.mp4'),'-f','null','-'],{stdio:'pipe'});
 execFileSync(ffmpeg,['-y','-ss','4','-i',path.join(out,'pilot.mp4'),'-frames:v','1',path.join(out,'frame.png')],{stdio:'ignore'});
 console.log(JSON.stringify({result:'PASS',rehearsal:true,actualBrowserRecording:true,pointerAndClickOverlay:true,koreanVoice:true,dimensions:'1920x1080',fullDecode:true,path:path.join(out,'pilot.mp4')}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
