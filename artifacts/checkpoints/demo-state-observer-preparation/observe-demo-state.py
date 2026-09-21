#!/usr/bin/env python3
"""Read-only owned-demo observations. Run under deadline-command.py.
Exit 0 means a bounded observation interval ended, never recorder completion.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import http.client
import json
import math
import os
from pathlib import Path
import re
import signal
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
WEATHER = ('wind_speed_ms', 'wind_direction_deg', 'irradiance_wm2', 'temperature')


def safe_path(value, exists=True):
    path = Path(os.path.abspath(value))
    if any(p.is_symlink() for p in [path, *path.parents]):
        raise ValueError('unsafe path')
    if exists and not path.is_file():
        raise ValueError('missing regular file')
    return path


def read_json(path):
    path = safe_path(path)
    if path.stat().st_size > 8 * 1024 * 1024:
        raise ValueError('oversize local input')
    return json.loads(path.read_text())


def origin(value):
    u = urlsplit(value)
    if u.scheme not in ('http','https') or u.hostname not in ('127.0.0.1', 'localhost') or u.username or u.password or u.query or u.fragment or u.path not in ('', '/'):
        raise ValueError('loopback HTTP origin required')
    port=u.port or (443 if u.scheme=='https' else 80)
    return f'{u.scheme}://{u.hostname}:{port}', port, u.scheme


def numeric(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError('finite numeric observation required')
    return value


class AuthorizationDenied(Exception):
    pass


def get_state(port, token, budget, scheme):
    # No proxy, DNS, redirect, mutation, or arbitrary URL path is used.
    end = time.monotonic() + min(3.0, budget)
    connection = (http.client.HTTPSConnection if scheme=='https' else http.client.HTTPConnection)('127.0.0.1', port, timeout=max(.001, end-time.monotonic()))
    def alarm(signum, frame):
        raise TimeoutError()
    previous = signal.signal(signal.SIGALRM, alarm)
    signal.setitimer(signal.ITIMER_REAL,max(.001,end-time.monotonic()))
    try:
        connection.request('GET', '/api/state', headers={'Authorization': 'Bearer '+token})
        response = connection.getresponse()
        if response.status in (401,403):
            raise AuthorizationDenied()
        if response.status != 200:
            raise ValueError('HTTP unavailable')
        chunks = []; size = 0
        while True:
            left = end-time.monotonic()
            if left <= 0:
                raise TimeoutError()
            response.fp.raw._sock.settimeout(left)
            chunk = response.read1(65536)
            if not chunk:
                break
            size += len(chunk)
            if size > 8*1024*1024:
                raise ValueError('oversize response')
            chunks.append(chunk)
            if response.isclosed():
                break
        if time.monotonic() >= end:
            raise TimeoutError()
        return json.loads(b''.join(chunks))
    finally:
        signal.setitimer(signal.ITIMER_REAL,0)
        signal.signal(signal.SIGALRM,previous)
        connection.close()


def identity(journal, config, run, base):
    if journal['baseUrl'] != base or journal['runId'] != run['runId'] or journal['deadlineAt'] != run['deadlineAt'] or journal['productVersion'] != run['deployment']['productVersion']:
        raise ValueError('journal binding mismatch')
    owned = journal.get('owned')
    if not owned:
        return None
    name = config['lifecycle']['registration']['name']
    if owned.get('basis') != 'actual201' or journal['intent']['name'] != name or owned['baseline']['name'] != name or owned['id'] != owned['baseline']['id'] or any(x['id'] == owned['id'] for x in journal['existing']):
        raise ValueError('not proven new registration')
    initial = owned['baseline']['runId']; current = initial
    for transition in journal.get('transitions', []):
        if transition['fromRunId'] != current or not transition.get('capturedAt') or not UUID.fullmatch(transition['scenarioId']):
            raise ValueError('unproven run transition')
        current = transition['toRunId']
    if current != owned['runId'] or not all(UUID.fullmatch(x) for x in [owned['id'], initial, current]):
        raise ValueError('invalid run chain')
    return owned, name


def observe(config_path, output_path, run, seconds=450):
    if not 0 < seconds <= 450:
        raise ValueError('budget must be at most450 seconds')
    deadline = datetime.fromisoformat(run['deadlineAt'].replace('Z', '+00:00'))
    if deadline.tzinfo is None:
        raise ValueError('timezone required')
    deadline = deadline.timestamp()
    stop = time.monotonic()+min(seconds, deadline-time.time())
    def remaining():
        return min(stop-time.monotonic(), deadline-time.time())
    if remaining() <= 0:
        raise TimeoutError('original deadline elapsed')
    config_path = safe_path(config_path); config = read_json(config_path)
    base, port, scheme = origin(config['baseUrl'])
    token_path = safe_path(ROOT/config['tokenFile'])
    journal_path = safe_path(ROOT/config['lifecycle']['journalPath'], exists=False)
    private = ROOT/'artifacts/private'
    if not token_path.is_relative_to(private) or not journal_path.is_relative_to(private):
        raise ValueError('private credential and journal paths required')
    token = token_path.read_text().strip()
    if not token or '\n' in token or '\r' in token or len(token)>4096:
        raise ValueError('invalid credential')
    output = safe_path(output_path, exists=False)
    if not output.is_relative_to(ROOT/'artifacts') or not output.parent.is_dir():
        raise ValueError('existing artifact parent required')
    samples = errors = 0
    anchor = None
    auth_denied = False
    def write(stream, row):
        if time.time()>=deadline:
            raise TimeoutError('original deadline elapsed')
        encoded = json.dumps({'observedAt':datetime.now(timezone.utc).isoformat(), **row}, ensure_ascii=False, allow_nan=False)
        if token in encoded or re.search(r'Bearer\s+\S+', encoded, re.I):
            raise ValueError('unsafe output')
        stream.write(encoded+'\n'); stream.flush()
    # Exclusive creation: an old receipt or output can never become this run's evidence.
    with output.open('x', encoding='utf-8') as stream:
        write(stream, {'kind':'observer_started','configSha256':hashlib.sha256(config_path.read_bytes()).hexdigest(),'scope':'read-only observations; recorder terminal must be independently confirmed'})
        while remaining()>0:
            row = None
            try:
                if not journal_path.exists():
                    row = {'kind':'waiting_for_actual201'}
                else:
                    journal = read_json(journal_path); proof = identity(journal, config, run, base)
                    if proof is None:
                        row = {'kind':'waiting_for_actual201'}
                    else:
                        owned, name = proof
                        identity_anchor=(owned['id'],owned['createdAt'],owned['baseline']['runId'],name)
                        if anchor is None:
                            anchor=identity_anchor
                        if anchor!=identity_anchor:
                            raise ValueError('original owned identity changed')
                        state = get_state(port, token, remaining(),scheme)
                        # Re-read atomic journal after HTTP: a concurrent scenario transition
                        # may have been confirmed while the response was in flight.
                        latest = read_json(journal_path); latest_proof = identity(latest, config, run, base)
                        if latest_proof is None or (latest_proof[0]['id'],latest_proof[0]['createdAt'],latest_proof[0]['baseline']['runId'],name) != anchor:
                            raise ValueError('ownership changed')
                        owned = latest_proof[0]
                        matches = [p for p in state['plants'] if p['id']==owned['id']]
                        if state['version'] != journal['productVersion'] or len(matches)!=1:
                            raise ValueError('runtime or target mismatch')
                        p = matches[0]
                        if p['name'] != name or p['runId'] != owned['runId'] or p['createdAt'] != owned['createdAt'] or p['type'] != journal['intent']['type'] or p['mode'] not in ('csv','weather'):
                            raise ValueError('identity mismatch')
                        if p['weatherSource'] not in ('default','manual','kma'):
                            raise ValueError('unknown weather source')
                        row = {'kind':'sample','ownedId':owned['id'],'runId':owned['runId'],'journalSha256':hashlib.sha256(json.dumps(latest,sort_keys=True).encode()).hexdigest(),'mode':p['mode'],'weather':{k:numeric(p['weather'][k]) for k in WEATHER},'weatherSource':p['weatherSource'],'powerKw':sum(numeric(g['powerKw']) for g in p['generators']),'availableKw':sum(numeric(g['availableKw']) for g in p['generators'])}
                        numeric(row['powerKw']);numeric(row['availableKw'])
                        row['generators']=[{'position':i+1,'powerKw':numeric(g['powerKw']),'availableKw':numeric(g['availableKw'])} for i,g in enumerate(p['generators'])]
                        history=p.get('history') or []
                        row['latestHistory']=None
                        if history:
                            last=history[-1]
                            row['latestHistory']={key:numeric(last[key]) for key in ('powerKw','availableKw') if key in last}

            except AuthorizationDenied:
                auth_denied=True; errors+=1; row={'kind':'authorization_denied','reason':'credential_rejected_no_retry'}
            except Exception:
                errors += 1; row = {'kind':'observation_unavailable','reason':'request_or_identity_check_failed'}
            if remaining()<=0:
                break
            if row['kind']=='sample': samples += 1
            write(stream,row)
            if auth_denied:
                break
            time.sleep(max(0,min(.5,remaining())))
        # This terminal is only a bounded observer completion; never recording success.
        if time.time()<deadline:
            write(stream, {'kind':'observer_interval_ended','samples':samples,'unavailable':errors,'recorderTerminalConfirmed':False,'originalDeadlineReached':time.time()>=deadline})
    return {'scope':'read-only observer interval ended','samples':samples,'unavailable':errors,'recorderTerminalConfirmed':False,'authorizationDenied':auth_denied,'originalDeadlineReached':time.time()>=deadline}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--seconds',type=float,default=450)
    args=parser.parse_args()
    result=observe(args.config,args.output,read_json(ROOT/'docs/operations/run.json'),args.seconds)
    print(json.dumps(result))
    return 0 if result['samples'] and not result['authorizationDenied'] and not result['originalDeadlineReached'] else 2

if __name__=='__main__':
    try:
        raise SystemExit(main())
    except Exception:
        print('Read-only observation incomplete; inspect fixed status rows, never infer recorder success.')
        raise SystemExit(1)
