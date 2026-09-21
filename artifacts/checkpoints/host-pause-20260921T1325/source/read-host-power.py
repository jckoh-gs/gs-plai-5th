import subprocess,json,re,datetime,pathlib,hashlib
p=pathlib.Path(__file__).resolve().parents[1]
def run(args):
 try:
  r=subprocess.run(args,capture_output=True,text=True,timeout=15);return r.stdout if r.returncode==0 else '',{'exitCode':r.returncode}
 except subprocess.TimeoutExpired:return '',{'timeout':True}
raw,status=run(['/usr/bin/pmset','-g','log']);events=[]
for line in raw.splitlines():
 m=re.match(r'^(2026-09-21 22:\d\d:\d\d)\s+([+-]\d{4})\s+(Sleep|Wake|DarkWake|WakeTime|SleepService)\s+(.*)',line)
 if not m or not '2026-09-21 22:24:20'<=m[1]<='2026-09-21 22:26:20':continue
 # Whitelist known reason labels; never persist trailing application/system details.
 reason=next((x for x in ['Idle Sleep','Clamshell Sleep','Software Sleep','Maintenance Sleep','Low Power Sleep','User Sleep','Power Button Sleep','RTC','EC.LidOpen','HID Activity'] if x in m[4]),'unclassified')
 events.append({'timestamp':m[1],'utcOffset':m[2],'eventKind':m[3],'reason':reason})
ps,psstatus=run(['/bin/ps','-p','30356','-o','pid=,lstart=,comm=,args=']);identity=[]
for line in ps.splitlines():
 if 'caffeinate' in line:
  parts=line.strip().split(); identity.append({'pid':int(parts[0]),'startedLocal':' '.join(parts[1:6]),'executable':parts[6],'arguments':parts[7:] if all(re.fullmatch(r'(?:/usr/bin/)?caffeinate|-[dimsu]+|-t|-w|\d+',x) for x in parts[7:]) else ['arguments-not-allowlisted']})
a,astatus=run(['/usr/bin/pmset','-g','assertions']);system={};owned=[]
for line in a.splitlines():
 m=re.match(r'^\s*(PreventUserIdleDisplaySleep|PreventSystemSleep|PreventUserIdleSystemSleep|UserIsActive|ExternalMedia|BackgroundTask)\s+(\d+)\s*$',line)
 if m:system[m[1]]=int(m[2])
 if re.search(r'pid\s+30356\(caffeinate\)',line):
  kind=next((x for x in ['PreventUserIdleDisplaySleep','PreventUserIdleSystemSleep','PreventSystemSleep','UserIsActive'] if x in line),'unclassified');owned.append({'pid':30356,'assertionKind':kind})
result={'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'requestedLocalWindow':['2026-09-21 22:24:20','2026-09-21 22:26:20'],'expectedTimezone':'Asia/Seoul UTC+0900','powerLogQuery':status,'events':events,'caffeinateQuery':psstatus,'caffeinateIdentity':identity,'assertionsQuery':astatus,'currentSystemAssertionSummary':system,'currentCaffeinateAssertions':owned,'limits':'Only matching sleep/wake event timestamps and allowlisted reasons retained. Current assertions/identity do not establish historical state. Absence of filtered events cannot exclude host scheduling pause, log omissions or other causes. No process/settings/signals changed.'}
(p/'evidence.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
