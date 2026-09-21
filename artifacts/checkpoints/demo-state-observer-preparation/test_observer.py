import importlib.util,pathlib,json,tempfile,threading,http.server,time,datetime,uuid,unittest
ROOT=pathlib.Path.cwd();spec=importlib.util.spec_from_file_location('observer',ROOT/'scripts/media/observe-demo-state.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(dir=ROOT/'artifacts/private',prefix='observer-test-');self.p=pathlib.Path(self.temp.name);self.token='synthetic-private-token-never-output';(self.p/'token').write_text(self.token);self.id=str(uuid.uuid4());self.rid=str(uuid.uuid4());self.name='isolated test';self.calls=0;self.mode='normal';self.j=None
  owner=self
  class Handler(http.server.BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_GET(self):
    owner.calls+=1
    if owner.mode=='outage' and owner.calls==2:self.send_response(503);self.end_headers();self.wfile.write(owner.token.encode());return
    if owner.mode=='disconnect' and owner.calls==2:
     self.close_connection=True;self.connection.close();return
    if owner.mode=='auth':self.send_response(401);self.end_headers();return
    if owner.mode=='redirect':self.send_response(302);self.send_header('Location','http://127.0.0.1:1/leak');self.end_headers();return
    if owner.mode=='slow':time.sleep(.4)
    if owner.mode=='transition' and owner.calls==2:
     new=str(uuid.uuid4());owner.j['transitions']=[{'scenarioId':str(uuid.uuid4()),'fromRunId':owner.rid,'toRunId':new,'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}];owner.j['owned']['runId']=new;owner.plant['runId']=new;owner.save()
    if owner.mode=='mismatch' and owner.calls>=2:owner.plant['runId']=str(uuid.uuid4())
    body=json.dumps({'version':'1.7.1','plants':[owner.plant],'secret':owner.token}).encode();self.send_response(200);self.send_header('Content-Length',str(len(body)));self.end_headers()
    try:self.wfile.write(body)
    except (BrokenPipeError,ConnectionResetError):pass
  self.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=self.server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{self.server.server_port}'
  self.run={'runId':'fixture','deadlineAt':(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(seconds=60)).isoformat(),'deployment':{'productVersion':'1.7.1'}}
  self.plant={'id':self.id,'runId':self.rid,'name':self.name,'type':'hybrid','createdAt':'2026-09-21T19:00:00Z','mode':'weather','weather':dict(zip(m.WEATHER,[14,90,300,22])),'weatherSource':'manual','generators':[{'powerKw':651.8,'availableKw':651.8}],'secret':self.token}
  self.j={'baseUrl':base,'runId':'fixture','deadlineAt':self.run['deadlineAt'],'productVersion':'1.7.1','intent':{'name':self.name,'type':'hybrid'},'existing':[],'owned':{'id':self.id,'runId':self.rid,'createdAt':self.plant['createdAt'],'basis':'actual201','baseline':{'id':self.id,'name':self.name,'runId':self.rid}}};self.save();self.config=self.p/'config.json';self.config.write_text(json.dumps({'baseUrl':base,'tokenFile':str(self.p/'token'),'lifecycle':{'journalPath':str(self.p/'journal.json'),'registration':{'name':self.name}}}));self.output=self.p/'observations.jsonl'
 def save(self):
  q=self.p/'journal.tmp';q.write_text(json.dumps(self.j));q.replace(self.p/'journal.json')
 def tearDown(self):self.server.shutdown();self.server.server_close();self.temp.cleanup()
 def observe(self,seconds=1.2):return m.observe(self.config,self.output,self.run,seconds)
 def rows(self):return [json.loads(x) for x in self.output.read_text().splitlines()]
 def test_read_outage_recovery_no_secret(self):
  self.mode='outage';r=self.observe(1.7);self.assertGreaterEqual(r['samples'],2);self.assertGreaterEqual(r['unavailable'],1);self.assertNotIn(self.token,self.output.read_text());self.assertFalse(r['recorderTerminalConfirmed'])
 def test_connection_loss_reconnects(self):
  self.mode='disconnect';r=self.observe(1.7);self.assertGreaterEqual(r['samples'],2);self.assertGreaterEqual(r['unavailable'],1)
 def test_401_stops_without_retry(self):
  self.mode='auth';a=time.monotonic();r=self.observe(4);self.assertTrue(r['authorizationDenied']);self.assertEqual(self.calls,1);self.assertLess(time.monotonic()-a,1)
 def test_redirect_never_followed(self):
  self.mode='redirect';r=self.observe(.7);self.assertEqual(r['samples'],0);self.assertGreater(r['unavailable'],0)
 def test_actual_journal_transition_only(self):
  self.mode='transition';r=self.observe(1.2);self.assertEqual(r['unavailable'],0);self.assertEqual(len({x['runId'] for x in self.rows() if x['kind']=='sample'}),2)
 def test_unrecorded_run_change_not_sample(self):
  self.mode='mismatch';r=self.observe(1.2);self.assertEqual(r['samples'],1);self.assertGreaterEqual(r['unavailable'],1)
 def test_no_registration_guess(self):
  self.j['owned']=None;self.save();r=self.observe(.6);self.assertEqual(self.calls,0);self.assertEqual(r['samples'],0);self.assertIn('waiting_for_actual201',[x['kind'] for x in self.rows()])
 def test_expired_original_deadline_no_output(self):
  self.run['deadlineAt']='2020-01-01T00:00:00+00:00'
  with self.assertRaises(TimeoutError):self.observe()
  self.assertFalse(self.output.exists());self.assertEqual(self.calls,0)
 def test_deadline_interrupts_request(self):
  self.mode='slow';self.run['deadlineAt']=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(seconds=.12)).isoformat();self.j['deadlineAt']=self.run['deadlineAt'];self.save();a=time.monotonic();r=self.observe(3);self.assertLess(time.monotonic()-a,.35);self.assertTrue(r['originalDeadlineReached']);self.assertEqual(r['samples'],0)
 def test_output_never_overwritten(self):
  self.output.write_text('sentinel')
  with self.assertRaises(FileExistsError):self.observe()
  self.assertEqual(self.output.read_text(),'sentinel');self.assertEqual(self.calls,0)
 def test_existing_rtu_never_adopted(self):
  self.j['existing']=[{'id':self.id}];self.save();r=self.observe(.6);self.assertEqual(r['samples'],0);self.assertEqual(self.calls,0)
if __name__=='__main__':unittest.main(verbosity=2)
