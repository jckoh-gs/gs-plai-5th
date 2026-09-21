import pathlib,json,hashlib,subprocess,re,wave,datetime
p=pathlib.Path(__file__).resolve().parent;o=pathlib.Path('artifacts/checkpoints/audio-narration-r3-preparation');plan=json.loads((p/'plan.json').read_text());ff='/Users/charleskoh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';rows=[];allframes=[];subtitles=[];timeline=0
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
for i,scene in enumerate(plan['scenes']):
 parts=[x.strip() for x in re.findall(r'[^.!?。]+[.!?。]?',scene['narration'])];sent=[];frames=[];voiceDuration=0
 for j,text in enumerate(parts):
  a=p/f'voice-{i}-{j}.aiff';w=p/f'voice-{i}-{j}.wav';assert not a.exists()
  subprocess.run(['say','-v','Yuna','-r','170','-o',str(a),text],check=True,timeout=20)
  subprocess.run([ff,'-hide_banner','-loglevel','error','-n','-i',str(a),'-ar','16000','-ac','1','-c:a','pcm_s16le',str(w)],check=True,timeout=10)
  info=subprocess.check_output(['afinfo',str(a)],text=True,timeout=5);actual=float(re.search(r'estimated duration:\s*([\d.]+)',info)[1])
  with wave.open(str(w)) as q:dur=q.getnframes()/q.getframerate();data=q.readframes(q.getnframes())
  sent.append({'sentence1':j+1,'text':text,'start':voiceDuration,'end':voiceDuration+dur,'aiffDurationSeconds':actual,'pcmDurationSeconds':dur,'AIFFsha256':sha(a),'PCMsha256':sha(w)});subtitles.append(f'{len(subtitles)+1}\n{stamp(timeline+voiceDuration)} --> {stamp(timeline+voiceDuration+dur)}\n{text}\n');voiceDuration+=dur;frames.append(data)
 duration=max(scene['seconds'],voiceDuration+1.5);sampleDuration=round(duration*16000)/16000;sceneWav=p/f'voice-{i}.wav'
 with wave.open(str(sceneWav),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b''.join(frames))
 allframes.extend(frames);allframes.append(b'\x00'*(round((sampleDuration-voiceDuration)*16000)*2));rows.append({'scene1':i+1,'title':scene['title'],'narration':scene['narration'],'plannedSeconds':scene['seconds'],'voiceSeconds':voiceDuration,'minimumSceneSeconds':sampleDuration,'plannedStart':timeline,'plannedEnd':timeline+sampleDuration,'scenePCMsha256':sha(sceneWav),'sentences':sent});timeline+=sampleDuration
with wave.open(str(p/'planned-timeline.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b''.join(allframes))
srt='\n'.join(subtitles);(o/'planned-ko.srt').write_text(srt);parsed=re.findall(r'\d\d:\d\d:\d\d,\d{3} --> \d\d:\d\d:\d\d,\d{3}\n(.*?)(?=\n\n|$)',srt,re.S);assert parsed==[x['text'] for sc in rows for x in sc['sentences']]
result={'preparationOnly':True,'narrationRevision':3,'productVersion':'1.7.1','voice':'Yuna','speechRate':170,'directListening':False,'actualVideoCreated':False,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceHashes':{str(f):sha(f) for f in [pathlib.Path('scripts/media/scenes-template.json'),pathlib.Path('scripts/media/scene-plan.cjs'),pathlib.Path('scripts/media/release-features.cjs'),pathlib.Path('scripts/media/transcribe-audio.py')]},'minimumPlannedTimelineSeconds':timeline,'totalVoiceSeconds':sum(x['voiceSeconds'] for x in rows),'srtSourceMatched':True,'srtSentenceCount':len(parsed),'plannedPcmSha256':sha(p/'planned-timeline.wav'),'limitation':'Timing is synthesized lower-bound scene plan; browser action overruns, startup lead and final actual scene times are unmeasured. Planned SRT is not final video SRT.','scenes':rows}
(o/'synthesis.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='scenes'},ensure_ascii=False))
