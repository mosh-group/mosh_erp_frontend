'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const M=require('../js/55-mosh-workday-model.js');
const stamp=s=>Date.parse(s),ms=t=>stamp('2026-09-29T'+t+':00+03:00');
const base={date:'2026-09-29',now:ms('18:00'),timeZone:'Asia/Damascus',attendance:[],complete:false};
const act=(kind,a,b,taskId='')=>({kind,taskId,startAt:ms(a),endAt:ms(b)});
const calc=p=>M.dailyAccount({...base,...p});
test('R8: 30 minutes task + 10 break + 5 no-work display without punches',()=>{
 const r=calc({activities:[act('task','09:00','09:30','T1'),act('break','09:30','09:40'),act('no_work','09:40','09:45')]});
 assert.deepEqual(r.totals,{task:1800000,break:600000,no_work:300000,waste:0,review:0});assert.equal(r.activityMs,2700000);assert.equal(r.presenceMs,0);assert.equal(r.presenceComplete,false);
});
test('R8: same report recomputed after restart has identical totals',()=>{
 const p={activities:[act('break','09:00','09:10'),act('no_work','10:00','10:05')]};assert.deepEqual(calc(p),calc(JSON.parse(JSON.stringify(p))));
});
test('R8: empty valid day is zero activity, never fabricated attendance',()=>{
 const r=calc({activities:[]});assert.equal(r.activityMs,0);assert.equal(r.presenceMs,0);assert.equal(r.totals.waste,0);
});
test('R8: activity outside attendance counts but does not inflate presence',()=>{
 const r=calc({attendance:[{date:'2026-09-29',inTime:'09:00',outTime:'10:00'}],complete:true,activities:[act('task','08:00','09:30','T1')]});
 assert.equal(r.totals.task,5400000);assert.equal(r.presenceMs,3600000);assert.equal(r.totals.waste,1800000);assert.equal(r.attendanceTotals.task,1800000);assert.equal(r.activityMs,5400000);
});
test('R8: unobserved gaps outside attendance never become waste',()=>{
 const r=calc({complete:true,coverage:[{startAt:ms('08:00'),endAt:ms('17:00')}],activities:[act('task','08:00','08:10','T1'),act('task','16:00','16:10','T2')]});assert.equal(r.totals.waste,0);assert.equal(r.totals.review,0);assert.equal(r.totals.task,1200000);
});
test('R8: overlap is review, not double counted work',()=>{
 const r=calc({activities:[act('task','09:00','09:30','T1'),act('break','09:20','09:40')]});assert.equal(r.totals.task,1200000);assert.equal(r.totals.break,600000);assert.equal(r.totals.review,600000);assert.ok(r.issues.length);
});
test('R8: repeated same sessions and intervals do not duplicate totals',()=>{
 const a=act('task','09:00','09:30','T1');const r=calc({activities:[a,{...a,id:'another-copy'},a]});assert.equal(r.totals.task,1800000);assert.equal(r.totals.review,0);
});
test('R8: live open intervals advance past last snapshot without resetting',()=>{
 const r=calc({now:ms('09:05'),activities:[{...act('break','09:00','09:02'),open:true}]});assert.equal(r.totals.break,300000);
});
test('R8: closed intervals stay frozen when current time advances',()=>{
 const r=calc({now:ms('09:05'),activities:[act('break','09:00','09:02')]});assert.equal(r.totals.break,120000);
});
test('R8: midnight splits each session into its actual calendar day',()=>{
 const a={kind:'task',taskId:'T1',startAt:stamp('2026-09-28T23:50:00+03:00'),endAt:ms('00:20')};
 assert.equal(calc({activities:[a]}).totals.task,1200000);assert.equal(calc({date:'2026-09-28',activities:[a]}).totals.task,600000);
});
test('R8: total task lifetime is not counted again as daily work',()=>{
 const r=calc({activities:[act('task','09:00','09:30','T1'),{kind:'task',taskId:'T1',startAt:stamp('2026-09-28T09:00:00+03:00'),endAt:stamp('2026-09-28T11:00:00+03:00')}]});assert.equal(r.totals.task,1800000);assert.equal(r.byTask[0].durationMs,1800000);
});
test('R8: old incomplete history does not certify attended gaps as waste',()=>{
 const r=calc({attendance:[{date:'2026-09-29',inTime:'09:00',outTime:'10:00'}],activities:[act('task','09:00','09:30','T1')]});assert.equal(r.totals.task,1800000);assert.equal(r.totals.waste,0);assert.equal(r.totals.review,1800000);assert.equal(r.presenceComplete,false);
});
test('R8: malformed attendance does not hide legitimate task sessions',()=>{
 const r=calc({attendance:[{date:'2026-09-29',outTime:'10:00'}],activities:[act('task','09:00','09:30','T1')]});assert.equal(r.totals.task,1800000);assert.equal(r.presenceMs,0);assert.equal(r.presenceComplete,false);assert.ok(r.issues.length);
});
test('R8: per-day DST boundary uses company elapsed time, not 24h assumption',()=>{
 const r=calc({date:'2026-03-29',timeZone:'Europe/Paris',now:stamp('2026-03-30T12:00:00Z'),activities:[{kind:'task',taskId:'T1',startAt:stamp('2026-03-29T00:00:00+01:00'),endAt:stamp('2026-03-29T04:00:00+02:00')}]});assert.equal(r.totals.task,3*3600000);
});
test('R8: original attendance-only function remains compatible',()=>{
 const acts=[act('task','09:00','09:30','T1')];assert.equal(M.account({...base,activities:acts}).totals.task,0);assert.equal(calc({activities:acts}).totals.task,1800000);
});
