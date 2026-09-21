import ast,pathlib,datetime,json,subprocess
p=pathlib.Path(__file__).parent;tree=ast.parse((p/'transition.py').read_text());wanted={'stamp','transition_stop','valid_backup_age','projection','capture_uncertain'};module=ast.Module(body=[x for x in tree.body if isinstance(x,ast.FunctionDef)and x.name in wanted],type_ignores=[]);env={'datetime':datetime};exec(compile(module,'exact-prepared-functions','exec'),env);checks=[]
def check(name,fn):fn();checks.append({'name':name,'result':'PASS'})
def rejects(fn):
 try:fn()
 except AssertionError:return
 raise AssertionError('Expected rejection')
projection=env['projection'];template=[{'id':'a','generators':[{'id':'g','on':True,'limitPct':100}]}]
check('unchanged canonical nested list passes',lambda:projection(template,template))
check('extra RTU rejected',lambda:rejects(lambda:projection(template+[{'id':'b'}],template)))
check('extra generator rejected',lambda:rejects(lambda:projection([{'id':'a','generators':[{'id':'g','on':True,'limitPct':100},{'id':'extra'}]}],template)))
check('missing generator rejected',lambda:rejects(lambda:projection([{'id':'a','generators':[]}],template)))
check('duplicate same-length IDs rejected',lambda:rejects(lambda:projection([{'id':'a'},{'id':'a'}],[{'id':'a'},{'id':'b'}])))
check('different same-length scenario IDs rejected',lambda:rejects(lambda:projection([{'id':'z'}],[{'id':'a'}])))
run={'freezeAt':'2026-09-21T21:37:33Z','deadlineAt':'2026-09-21T22:07:33Z'};freeze=env['stamp'](run['freezeAt']);stop=env['transition_stop']
check('stop capped at freeze',lambda: (_ for _ in ()).throw(AssertionError())if stop(run,freeze-10)!=freeze else None)
check('exact freeze rejected',lambda:rejects(lambda:stop(run,freeze)))
check('after freeze rejected',lambda:rejects(lambda:stop(run,freeze+1)))
check('210 second cap before freeze',lambda: (_ for _ in ()).throw(AssertionError())if stop(run,freeze-1000)!=freeze-790 else None)
age=env['valid_backup_age'];verified='2026-09-21T17:00:00Z';when=env['stamp'](verified)
check('age zero accepted',lambda:age(verified,when));check('age1799 accepted',lambda:age(verified,when+1799));check('future backup rejected',lambda:rejects(lambda:age(verified,when-1)));check('age1800 rejected',lambda:rejects(lambda:age(verified,when+1800)))
def error_preserved():
 receipts=[];original=RuntimeError('original apply failure')
 def getter(args):raise subprocess.TimeoutExpired('fixture kubectl',.1)
 try:
  try:raise original
  except Exception:env['capture_uncertain'](getter,lambda n,v:receipts.append((n,v)));raise
 except Exception as e:assert e is original
 assert receipts[0][0].endswith('uncertain-query-failure.json');assert receipts[0][1]['queryFailure']and receipts[0][1]['errorType']=='TimeoutExpired'
check('uncertain read timeout emits fixed receipt and preserves original error',error_preserved)
result={'result':'PASS','scope':'AST extracts exact prepared helper functions; local data and fake getter only; zero kubectl calls','checks':checks,'count':len(checks)};out=pathlib.Path('deploy/verification/candidate-40b9ed8/transition-preparation/focused-guards.json');out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'result':'PASS','checks':len(checks),'remoteCalls':0}))
