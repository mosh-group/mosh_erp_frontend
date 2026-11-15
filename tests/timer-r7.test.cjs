'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const M=require('../js/55-mosh-workday-model.js');
const R=require('../js/53-mosh-task-receipts-model.js');
const t=()=>({id:'T1',title:'اختبار',assigneeId:'E1',assignee:'موظف اختبار',status:'in_progress',employeeState:'working',workChat:[],workTiming:{totalMs:30000,activeStartedAt:0,sessions:[]}});
const plan=(task=t(),extra={})=>M.plan({kind:'repair_timer',taskId:'T1',tasks:[task],presence:{mode:'active',noWork:false,pausedTaskId:''},presenceId:'id:E1',employee:{id:'E1',name:'موظف اختبار'},actor:'موظف اختبار',receiptModel:R,canTask:r=>r.assigneeId==='E1',...extra});
test('Explicit repair sends command, never a browser start or forged total',()=>{
 const row=t(),before=JSON.stringify(row),ops=plan(row);
 assert.equal(ops.length,1);assert.equal(ops[0].resource,'tasks');assert.equal(ops[0].data.employeeState,'working');
 assert.deepEqual(ops[0].data.workTiming,{_command:'repair_missing'});assert.match(ops[0].data.workChat[0].id,/^MR49\/start\//);assert.equal(JSON.stringify(row),before);
});
test('A paused task uses normal resume, not recovery',()=>assert.throws(()=>plan({...t(),employeeState:'paused'}),/الجاري/));
test('Repair remains subject to status permission',()=>assert.throws(()=>plan(t(),{canTask:()=>false}),/صلاحية/));
test('No recovery command for another employee',()=>assert.throws(()=>plan({...t(),assigneeId:'E2'}),/صلاحية/));
test('Repair never bypasses unresolved idle classification',()=>assert.throws(()=>plan({...t(),workTiming:{activity:{pendingIdle:{startAt:1}}}}),/الخمول/));
test('Closed tasks cannot be repaired',()=>assert.throws(()=>plan({...t(),status:'completed'}),/تنفيذ/));
test('Another active task is paused before a repair in same transaction',()=>{
 const ops=plan(t(),{tasks:[t(),{...t(),id:'T2'}]});assert.equal(ops[0].id,'T2');assert.equal(ops[0].data.employeeState,'paused');assert.equal(ops[1].data.workTiming._command,'repair_missing');
});
test('Recovery changes presence from break atomically, no fingerprint requirement',()=>{
 const ops=plan(t(),{presence:{mode:'break',noWork:false,pausedTaskId:'T1'}});assert.equal(ops.length,2);assert.equal(ops[1].resource,'work-presence');assert.equal(ops[1].data.mode,'active');assert.equal(ops[1].data.noWork,false);
});
test('Server-confirmed recovery displays known total plus live interval, preserving warning marker',()=>{
 const now=Date.parse('2026-09-27T12:00Z'),row={...t(),workTiming:{totalMs:30000,activeStartedAt:now-45000,historyIncomplete:true,unmeasuredSessions:[{durationMs:null}]}};
 assert.equal(M.taskTiming(row,now).totalElapsedMs,75000);assert.equal(M.duration(M.taskTiming(row,now).totalElapsedMs),'00:01:15');assert.equal(row.workTiming.unmeasuredSessions[0].durationMs,null);
});
test('Normal resume still sends only state and event; server owns timestamps',()=>{
 const ops=plan({...t(),employeeState:'paused'},{kind:'start'});assert.equal(ops[0].data.employeeState,'working');assert.equal(ops[0].data.workTiming,undefined);
});
