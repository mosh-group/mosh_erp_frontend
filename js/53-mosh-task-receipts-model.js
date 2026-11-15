/* Task inbox R1: pure projection over the existing server task/workChat contract.
 * Returns stay paused+returnedForRevision (API v1.2). Receiving a returned task
 * appends an acknowledgement for THAT return; it never starts the work timer.
 * No migration, fake receipt date, custom top-level field or localStorage data.
 */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.MoshReceiptModel49 = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const list = value => Array.isArray(value) ? value : [];
  const text = value => String(value == null ? '' : value).trim();
  const closed = new Set(['completed','cancelled','canceled','deleted','done','archived','archived_invoiced','archived_no_invoice','invoiced','awaiting_invoice','منتهية','ملغاة']);
  function hash(value) {
    let h = 2166136261;
    for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function event(message, index) {
    const m = text(message?.id).match(/^MR49\/(return|receive|start|pause|submit)\/([^/]+)(?:\/[^/]+)?$/);
    return m ? {kind:m[1], cycle:m[2], index, message} : null;
  }
  function events(task) { return list(task?.workChat).map(event).filter(Boolean); }
  function returnMessages(task) {
    return list(task?.workChat).map((message, index) => {
      const ev = event(message, index);
      if (ev?.kind === 'return') return ev;
      if (message?.system && /أعيدت المهمة للتعديل|أُعيدت المهمة للتعديل/.test(text(message.text))) {
        return {kind:'return', cycle:'legacy-'+hash(JSON.stringify([message.id,message.time,index])), index, message, legacy:true};
      }
      return null;
    }).filter(Boolean);
  }
  function currentCycle(task) {
    const returns = returnMessages(task);
    const last = returns.at(-1);
    if (last) return {key:last.cycle, number:returns.length+1, returned:true, message:last.message, index:last.index};
    if (task?.returnedForRevision) {
      const h = list(task.history).filter(row=>/أعاد|إعادة.*تعديل|returned_for_revision/i.test(text(row.text || row.action))).at(-1);
      return {key:'legacy-'+hash(JSON.stringify([task.id,task.assigneeId||task.assignee,h||task.workTiming?.finishedAt||'return'])),number:2,returned:true,message:h||null,index:-1};
    }
    return {key:'initial',number:1,returned:false,message:null,index:-1};
  }
  function receipt(task, cycle=currentCycle(task)) {
    return events(task).filter(ev=>ev.kind==='receive' && ev.cycle===cycle.key && ev.index>cycle.index).at(-1)||null;
  }
  function category(task) {
    if (!task || closed.has(text(task.status).toLowerCase()) || ['finished','done','completed','منتهية'].includes(text(task.employeeState))) return 'closed';
    if (task.sharedTeamContainer || task.sharedNodeType === 'team') return 'container';
    const st = text(task.employeeState)||'new';
    if (st==='submitted' || st==='approved') return 'review';
    if (st==='new') return 'new';
    // Already-working legacy tasks remain active; don't stop real work on upgrade.
    if (task.returnedForRevision && st!=='working' && !receipt(task)) return 'new';
    return ['received','working','paused'].includes(st) ? 'active' : 'new';
  }
  function label(task) {
    const group = category(task), st = text(task?.employeeState);
    if (group==='new') return task?.returnedForRevision ? 'معادة من المدير · بانتظار الاستلام' : 'جديدة · بانتظار الاستلام';
    if (group==='review') return 'بانتظار مراجعة المدير';
    if (group==='closed') return 'منتهية / مؤرشفة';
    if (group==='container') return 'مهمة جماعية';
    if (st==='working') return 'قيد التنفيذ';
    const cycle=currentCycle(task);
    if (st==='received' || (task.returnedForRevision && receipt(task,cycle) && !events(task).some(e=>e.cycle===cycle.key && e.kind==='start' && e.index>cycle.index))) return 'تم الاستلام · بانتظار البدء';
    return 'متوقفة مؤقتاً';
  }
  function reason(task) {
    if (!task?.returnedForRevision) return '';
    const raw=text(currentCycle(task).message?.text);
    const marker='المطلوب تعديله:';
    return raw.includes(marker) ? raw.slice(raw.indexOf(marker)+marker.length).trim() : '';
  }
  function group(tasks) {
    const result={new:[],active:[],review:[]};
    for (const t of list(tasks)) { const k=category(t); if(result[k]) result[k].push(t); }
    const due=t=>/^\d{4}-\d{2}-\d{2}/.test(text(t.dueDate))?text(t.dueDate):'9999-99-99';
    result.new.sort((a,b)=>Number(!!b.returnedForRevision)-Number(!!a.returnedForRevision)||due(a).localeCompare(due(b))||text(a.taskNo||a.id).localeCompare(text(b.taskNo||b.id)));
    result.active.sort((a,b)=>Number(b.employeeState==='working')-Number(a.employeeState==='working')||due(a).localeCompare(due(b))||text(a.taskNo||a.id).localeCompare(text(b.taskNo||b.id)));
    return result;
  }
  function message(kind, task, actor, detail='', uuid) {
    const makeId=uuid||(()=>globalThis.crypto.randomUUID());
    const cycle=kind==='return'?{key:makeId(),number:currentCycle(task).number+1}:currentCycle(task);
    const labels={return:'↩ معادة من المدير — دورة استلام جديدة',receive:'تم استلام المهمة',start:'بدأ تنفيذ المهمة',pause:'تم إيقاف المهمة مؤقتاً',submit:'تم إرسال المهمة لمراجعة المدير'};
    let value=labels[kind]+' — الدورة '+cycle.number+'.';
    if(kind==='return')value+='\nالمطلوب تعديله: '+text(detail);
    else if(detail)value+='\n'+text(detail);
    return {id:'MR49/'+kind+'/'+cycle.key+(kind==='return'?'':'/'+makeId()),kind:'text',text:value,by:text(actor),time:new Date().toISOString()};
  }
  return {version:'1.0.0',category,label,reason,group,currentCycle,receipt,events,returnMessages,message};
});
