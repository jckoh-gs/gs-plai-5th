import datetime
import hashlib
import json
from pathlib import Path
import socket
import subprocess

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
bundle = root / 'artifacts/checkpoints/media-weather-r2'
passed = bundle / 'round2-passed'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read = lambda p: json.loads(p.read_text())
inventory = read(bundle / 'inventory.json')
for item in inventory['files']:
    p = bundle / item['file']
    assert p.is_file() and p.stat().st_size == item['bytes'] and sha(p) == item['sha256'], p
sources = read(passed / 'source-hashes.json')
runtime = '40b9ed898f32037e7a87259d12d145457575a4a8'
runtime_count = 0
for item in sources:
    assert sha(root / item['path']) == item['sha256'], item['path']
    assert sha(passed / 'pre-run-sources' / item['path']) == item['sha256'], item['path']
    if item['path'].startswith(('server/', 'web/')):
        blob = subprocess.run(['git', 'show', runtime + ':' + item['path']], cwd=root, check=True, capture_output=True, timeout=10).stdout
        assert hashlib.sha256(blob).hexdigest() == item['sha256']
        runtime_count += 1
summary = read(passed / 'summary.json')
video = root / summary['video']['path']
assert sha(video) == summary['video']['sha256'] == read(passed / 'verification.json')['videoSha256']
rows = [json.loads(s) for s in (passed / 'weather-observations.jsonl').read_text().splitlines()]
owned = 'c2bccd06-b17a-46f7-9ef0-196f0707801f'
run = '2f22ae5b-be45-4a08-b5ca-9ae2e88b7147'
assert all(r['id'] == owned and r['runId'] == run for r in rows)
assert all(a['observedAt'] < b['observedAt'] for a, b in zip(rows, rows[1:]))
power = lambda r: r.get('history', [{}])[-1].get('powerKw') if r.get('history') else None
first = next(i for i, r in enumerate(rows) if r['mode'] == 'csv' and power(r) == 500)
weather = next(i for i, r in enumerate(rows) if i > first and r['mode'] == 'weather' and power(r) == 651.8)
restored = next(i for i, r in enumerate(rows) if i > weather and r['mode'] == 'csv' and power(r) == 500)
assert rows[weather]['weather'] == dict(wind_speed_ms=14, wind_direction_deg=90, irradiance_wm2=300, temperature=22)
assert rows[restored]['weather'] == dict(wind_speed_ms=8, wind_direction_deg=240, irradiance_wm2=650, temperature=22)
assert rows[weather]['weatherSource'] == rows[restored]['weatherSource'] == 'manual'
for name in ['demo-recovery.json', 'post-command-recovery.json']:
    d = read(passed / name)
    assert d['result'] == 'PASS' and d['ownedId'] == owned and d['currentRunId'] == run
    assert d['settingsMatched'] and d['weatherConfigurationMatched']
    assert d['baselineHash'] == d['actualHash']
    assert len(d['existing']) == 3 and all(p['unchanged'] and p['beforeHash'] == p['afterHash'] for p in d['existing'])
    assert d['weatherSourceAtRegistration'] == 'default' and d['weatherSourceAfterRecovery'] == 'manual'
    assert d['weatherSourceLabelUnchanged'] is False
mqtt = read(passed / 'post-weather-command.json')
assert mqtt['rtuId'] == owned and mqtt['runId'] == run and mqtt['exitCode'] == 0
assert mqtt['actualKw'] == 125 and mqtt['errorKw'] == 0
assert [e['status'] for e in mqtt['events']] == ['accepted', 'executing', 'completed']
asr = read(passed / 'video-asr/receipt.json')
assert asr['source']['sha256'] == sha(video)
assert sha(passed / 'video-asr/receipt.json') == read(passed / 'video-asr/terminal.json')['receiptSha256']
for item in asr['outputs']:
    p = Path(item['path'])
    assert p.stat().st_size == item['bytes'] and sha(p) == item['sha256']
with socket.socket() as sock:
    sock.settimeout(2)
    assert sock.connect_ex(('127.0.0.1', 3113)) != 0, 'Fixture port remains open'
identities = subprocess.run(['ps', '-p', '86092,87381,87382,87355,56137,57533,57534', '-o', 'pid=,lstart=,command='], check=True, capture_output=True, text=True, timeout=10).stdout
assert {int(line.split()[0]) for line in identities.splitlines()} == {56137, 57533, 57534}
result = {
    'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'state': 'PREPARATION_CHECKS_RECORDED', 'requiresSuccessfulExitReceipt': True,
    'inventoryFilesVerified': len(inventory['files']), 'currentAndPreservedSourcesVerified': len(sources),
    'runtimeGitSourcesVerified': runtime_count, 'runtimeCommit': runtime,
    'videoSha256': sha(video), 'observationRows': len(rows),
    'observedTransition': [{'at': rows[i]['observedAt'], 'mode': rows[i]['mode'], 'powerKw': power(rows[i]), 'weather': rows[i]['weather'], 'source': rows[i]['weatherSource']} for i in [first, weather, restored]],
    'normalAndPostMqttRecoveryVerified': True, 'preexistingThreeProjectionSettingsUnchanged': True,
    'postVideoMqtt': {'actualKw': 125, 'errorKw': 0, 'statuses': ['accepted', 'executing', 'completed']},
    'port3113Closed': True, 'processes': identities,
    'ownerTerminalRecords': {k: summary[k] for k in ['recorder', 'observer', 'postMqtt', 'fixture']},
    'rootVisualReview': {'encodedFramesIndividuallyViewed': ['scene1', 'scene2', 'weather-6518', 'csv-500'], 'weatherFrameShows': 'selected owned hybrid, 0.652MW,14/90/300/22 manual weather,3D,pointer ring,legible Korean subtitle', 'csvFrameShows': 'same owned hybrid,0.5MW,8/240/650/22,csv mode,manual source,pointer ring', 'otherFrames': 'dashboard and registration form with synthetic CSV, pointer and legible Korean subtitles; preparation banner visible'},
    'directListening': False, 'naturalPronunciationVerified': False,
    'scope': 'Three-scene local preparation only. Actual owner terminal receipts plus independent file/hash/observation/port checks. No final eight-scene video, final deployment or whole-goal acceptance. First failed attempt preserved.',
    'sourceSha256': sha(Path(__file__)), 'inventorySha256': sha(bundle / 'inventory.json')
}
target = out / 'checks.json'
assert not target.exists()
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'state': result['state'], 'output': str(target.relative_to(root)), 'sha256': sha(target), 'filesVerified': len(inventory['files'])}))
