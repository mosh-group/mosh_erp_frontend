'use strict';
const assert=require('node:assert/strict');
const P=require('../js/57-mosh-reminder-model.js');
const base=Date.parse('2026-09-27T09:00:00Z');let checks=0;
function ctx(ms=300000){const now=base+ms;return {userId:'U1',employeeId:'E1',date:'2026-09-27',now,online:true,clockConfirmed:true,busy:false,uncertain:false,error:'',currentKind:'ready',verifiedAt:now,snapshot:{employeeId:'E1',date:'2026-09-27',asOf:now,live:true,complete:true,issues:[]},account:{complete:true,live:true,issues:[],windows:[{start:base,end:now}],segments:[{kind:'waste',start:base,end:now}]}};}
function test(name,f){f();checks++;console.log('PASS',checks,name);}
function blocked(name,fn){test(name,()=>{const c=ctx();fn(c);assert.equal(P.evaluate(c).eligible,false);});}
test('Not due at 4m59s',()=>assert.equal(P.evaluate(ctx(299000)).due,false));
test('Due at exactly five minutes',()=>assert.equal(P.evaluate(ctx()).due,true));
test('Continuous gap retains original start',()=>assert.equal(P.evaluate(ctx(360000)).gapStart,base));
test('Repeated mouse input is irrelevant',()=>{const c=ctx();c.lastMouseMoveAt=c.now;c.lastKeyPressAt=c.now;assert.equal(P.evaluate(c).due,true);});
blocked('No signed-in account',c=>c.userId='');blocked('No linked employee',c=>c.employeeId='');
for(const kind of ['task','break','no_work'])blocked('No reminder in '+kind,c=>c.currentKind=kind);
for(const k of ['busy','uncertain'])blocked('No reminder during '+k,c=>c[k]=true);
blocked('Known save error suppresses reminder',c=>c.error='failed');blocked('Offline suppresses reminder',c=>c.online=false);blocked('Unconfirmed server clock',c=>c.clockConfirmed=false);
blocked('Incomplete server history',c=>c.snapshot.complete=false);blocked('Invalid computed history',c=>c.account.complete=false);blocked('Historical date is not today',c=>c.snapshot.date='2026-09-26');blocked('Other employee snapshot',c=>c.snapshot.employeeId='E2');
blocked('Clock skew into future rejected',c=>c.snapshot.asOf=c.now+4000);blocked('Stale snapshot rejected',c=>c.snapshot.asOf=c.now-P.MAX_AGE-1);blocked('Stale confirmation rejected',c=>c.verifiedAt=c.now-P.MAX_AGE-1);
blocked('Known outage rejected',c=>c.snapshot.issues=['recording outage']);blocked('Attendance overlap rejected',c=>c.account.issues=['overlap']);
blocked('No attendance',c=>c.account.windows=[]);blocked('Fingerprint-out ends eligibility',c=>c.account.live=false);blocked('Nonlive snapshot cannot advance',c=>c.snapshot.live=false);
blocked('Prior gap is not current',c=>{c.account.segments[0].end=c.now-30000;c.account.windows[0].end=c.now-30000;});
blocked('Unknown gap not classified as waste',c=>c.account.segments[0].kind='review');blocked('Recorded activity even with stale UI',c=>c.account.segments[0].kind='task');
test('Separate gaps never accumulate',()=>{const c=ctx(30*60000);c.account.segments=[{kind:'waste',start:base,end:base+10*60000},{kind:'task',start:base+10*60000,end:c.now-60000},{kind:'waste',start:c.now-60000,end:c.now}];assert.equal(P.evaluate(c).due,false);});
test('Dismiss postpones five minutes, does not move gap start',()=>{const e=P.evaluate(ctx()),s=P.postpone(e,e.now);assert.equal(s.nextAt,e.now+300000);assert.equal(s.gapStart,base);assert.equal(P.due({...e,now:e.now+299999},s),false);assert.equal(P.due({...e,now:e.now+300000},s),true);});
test('Work-start without task remains eligible',()=>assert.equal(P.evaluate(ctx()).eligible,true));
test('Work-end before fingerprint-out remains eligible',()=>{const c=ctx();c.currentKind='off';assert.equal(P.evaluate(c).due,true);});
test('Evaluation never mutates the attendance or timeline',()=>{const c=ctx(),original=JSON.stringify(c);P.evaluate(c);assert.equal(JSON.stringify(c),original);});
test('Different employee gets a different reminder key',()=>{const a=ctx(),b=ctx();b.employeeId='E2';b.snapshot.employeeId='E2';assert.notEqual(P.evaluate(a).key,P.evaluate(b).key);});
console.log('TOTAL',checks);
