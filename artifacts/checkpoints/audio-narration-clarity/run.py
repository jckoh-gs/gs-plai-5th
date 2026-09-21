import pathlib,json,hashlib,subprocess,wave,datetime,time
p=pathlib.Path(__file__).resolve().parent;o=pathlib.Path('artifacts/checkpoints/audio-narration-clarity');base=pathlib.Path('artifacts/private/audio-asr-20260921').resolve();ff='/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
s=json.load(open('artifacts/media-preparation/full-candidate17-20260921/scenes.json')); rows=[(2,2,'측정한 값은 현재 선택한 단지와 발전기 상태를 보여줍니다.'),(2,4,'접수 패널은 마지막으로 받은 결과를 보여주며 저장 상태 확인으로 서버 상태를 다시 조회합니다.'),(3,2,'큐오에스 일은 전달 과정의 중복 가능성이 있으므로 메시지 아이디로 중복을 처리합니다.'),(4,5,'최근 저장 상태를 최대 스무 개까지 구조화된 파일로 내보냅니다.'),(6,0,'배속과 일시정지, 재현에 쓰는 초기값으로 시험 조건을 조절합니다.'),(6,1,'선택한 RTU의 저장한 시나리오를 다시 불러오면 새 실행 아이디가 생깁니다.'),(6,3,'가이드에서 이 RTU의 토픽과 메시지 형식을 확인합니다.')]
receipts=[];frames=[];elapsed=0
for i,(si,ci,text) in enumerate(rows):
 a=p/f'candidate-{i}.aiff';w=p/f'candidate-{i}.wav';assert not a.exists() and not w.exists()
 subprocess.run(['say','-v','Yuna','-r','170','-o',str(a),text],check=True,timeout=30)
 subprocess.run([ff,'-hide_banner','-loglevel','error','-n','-i',str(a),'-ar','16000','-ac','1','-c:a','pcm_s16le',str(w)],check=True,timeout=15)
 with wave.open(str(w)) as q: duration=q.getnframes()/q.getframerate();frames.append(q.readframes(q.getnframes()))
 receipts.append({'scene1':si+1,'cue1':ci+1,'original':s['scenes'][si]['cues'][ci]['text'],'candidate':text,'start':elapsed,'end':elapsed+duration,'seconds':duration,'AIFFsha256':hashlib.sha256(a.read_bytes()).hexdigest(),'PCMsha256':hashlib.sha256(w.read_bytes()).hexdigest()});elapsed+=duration+1;frames.append(b'\x00'*32000)
with wave.open(str(p/'combined.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b''.join(frames))
cli=base/'build/bin/whisper-cli';model=base/'ggml-small.bin';assert hashlib.sha256(cli.read_bytes()).hexdigest()=='645af2334c629a5ee8ed33b76a2cad4745c9c39c4b003a3ca90616326cb98528';assert hashlib.sha256(model.read_bytes()).hexdigest()=='1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b'
cmd=[str(cli),'-m',str(model),'-f',str(p/'combined.wav'),'-l','ko','-t','4','-ng','-oj','-otxt','-osrt','-of',str(p/'candidate-asr')];start=time.monotonic()
with (p/'asr.log').open('x') as log:subprocess.run(cmd,stdout=log,stderr=subprocess.STDOUT,check=True,timeout=120)
a=json.loads((p/'candidate-asr.json').read_text())['transcription'];assert a and all(0<=x['offsets']['from']<=x['offsets']['to']<=elapsed*1000 for x in a)
(o/'comparison.json').write_text(json.dumps({'preparationOnly':True,'directListening':False,'finalAudio':False,'voice':'Yuna','speechRate':170,'promptProvided':False,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':cmd,'asrElapsedSeconds':time.monotonic()-start,'audioSeconds':elapsed,'combinedSha256':hashlib.sha256((p/'combined.wav').read_bytes()).hexdigest(),'candidates':receipts,'actualTranscription':a},ensure_ascii=False,indent=2)+'\n')
print((p/'candidate-asr.txt').read_text())
