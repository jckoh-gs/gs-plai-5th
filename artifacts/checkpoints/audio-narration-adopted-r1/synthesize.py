import pathlib,json,hashlib,subprocess,wave,datetime,time
p=pathlib.Path(__file__).resolve().parent;o=pathlib.Path('artifacts/checkpoints/audio-narration-adopted-r1');base=pathlib.Path('artifacts/private/audio-asr-20260921').resolve();ff='/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
template=pathlib.Path('scripts/media/scenes-template.json');plan=pathlib.Path('scripts/media/scene-plan.cjs');s={'scenes':json.loads(template.read_text())['scenes']};import re
texts=[x.strip()+'.' for sc in s['scenes'] for x in sc['narration'].split('.') if x.strip()]
plantext=plan.read_text();texts += [re.search(r"접수 패널은[^']+?\.",plantext).group(0),re.search(r"최근 저장 상태를[^']+?\.",plantext).group(0)]
prefixes=['측정한 값','접수 패널','큐오에스','최근 저장 상태','배속과','선택한 RTU','가이드에서'];rows=[]
for prefix in prefixes:
 matches=[x for x in texts if x.startswith(prefix)];assert len(matches)==1;rows.append(matches[0])
sourceHashes={str(f):hashlib.sha256(f.read_bytes()).hexdigest() for f in [template,plan,pathlib.Path('scripts/media/transcribe-audio.py')]}
receipts=[];frames=[];elapsed=0
for i,text in enumerate(rows):
 a=p/f'candidate-{i}.aiff';w=p/f'candidate-{i}.wav';assert not a.exists() and not w.exists()
 subprocess.run(['say','-v','Yuna','-r','170','-o',str(a),text],check=True,timeout=30)
 subprocess.run([ff,'-hide_banner','-loglevel','error','-n','-i',str(a),'-ar','16000','-ac','1','-c:a','pcm_s16le',str(w)],check=True,timeout=15)
 with wave.open(str(w)) as q: duration=q.getnframes()/q.getframerate();frames.append(q.readframes(q.getnframes()))
 receipts.append({'sentence1':i+1,'adoptedText':text,'start':elapsed,'end':elapsed+duration,'seconds':duration,'AIFFsha256':hashlib.sha256(a.read_bytes()).hexdigest(),'PCMsha256':hashlib.sha256(w.read_bytes()).hexdigest()});elapsed+=duration+1;frames.append(b'\x00'*32000)
with wave.open(str(p/'combined.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b''.join(frames))
(o/'synthesis.json').write_text(json.dumps({'preparationOnly':True,'directListening':False,'finalAudio':False,'revision':1,'voice':'Yuna','speechRate':170,'sourceHashes':sourceHashes,'sentences':receipts,'combinedSha256':hashlib.sha256((p/'combined.wav').read_bytes()).hexdigest()},ensure_ascii=False,indent=2)+'\n')
print('synthesis complete',elapsed)
