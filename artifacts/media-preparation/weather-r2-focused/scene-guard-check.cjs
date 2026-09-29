const assert=require('node:assert/strict'),plan=require('../../../scripts/media/scene-plan.cjs');
const c=plan({baseUrl:'http://127.0.0.1:3113',names:{wind:'owned wind',solar:'owned solar',hybrid:'new hybrid',scenario:'s'},csvFile:'input.csv',lifecycle:{registration:{name:'new hybrid'}}});
assert.equal(c.scenes.length,8);const a=c.scenes[2].actions;const applies=a.flatMap((x,i)=>x.name==='기상 적용'?[i]:[]);assert.equal(applies.length,2);for(const i of applies)assert.equal(a[i].requiresOwned,true);
const selection=a.findIndex(x=>x.selector?.includes('new hybrid'));assert.ok(selection>=0&&selection<applies[0]);assert.ok(applies[1]<a.findIndex(x=>x.name==='출력 상한 적용'));
assert.deepEqual(a.filter(x=>x.type==='select'&&x.label==='발전 입력 모드').map(x=>x.value),['weather','csv']);
for(const [label,values] of [['풍속 (m/s)',[14,8]],['풍향 (°)',[90,240]],['일사 (W/m²)',[300,650]],['온도 (°C)',[22,22]]])assert.deepEqual(a.filter(x=>x.type==='fill'&&x.label===label).map(x=>x.value),values);
assert.match(c.scenes[2].narration,/수동 상태로 남습니다/);assert.match(c.scenes[5].narration,/별도 실행 근거/);console.log(JSON.stringify({result:'PASS',scenes:8,guardedWeatherMutations:2,restoreValues:[8,240,650,22],r1NarrationPreserved:true}));
