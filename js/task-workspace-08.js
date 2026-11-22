/* Revision 08: shared task presentation. Native records, controls and handlers stay authoritative. */
(()=>{'use strict';
 if(window.MoshTaskWorkspace08)return;
 const $=(s,r=document)=>r.querySelector(s),all=(s,r=document)=>Array.from(r.querySelectorAll(s));
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const set=(n,value)=>{const v=String(value??'');if(n&&n.textContent!==v)n.textContent=v;};
 const button=(label,fn)=>{const b=make('button','btn r35-ui-navigation',label);b.type='button';b.addEventListener('click',fn);return b;};
 const records=new WeakMap();let frame=0;
 const task=id=>{try{return (state.salesTasks||[]).find(t=>String(t.id)===String(id));}catch(_){return null;}};
 function permitted(el){
  if(!el||!el.isConnected||el.hidden||el.classList.contains('mosh-auth-hidden'))return false;
  for(let p=el;p&&p!==document.body;p=p.parentElement){if(p.hidden||p.classList.contains('mosh-auth-hidden')||p.style.display==='none')return false;}
  return true;
 }
 // Top actions delegate to the existing controls; they never change task data themselves.
 const workflowHandlers={employeeReceiveTask:'receive',employeeStartTask:'start',employeePauseTask:'pause',employeeSubmitTask:'finish',managerFinishAndInvoice:'approve',managerFinishPackageSubTask:'approve',managerReturnTask:'return'};
 function workflowApp(t){
  try{const entry=Object.entries(PRODUCTIVE_DEPARTMENTS).find(([,v])=>v.department===(t.sharedDepartment||t.department));if(entry)return entry[0];}catch(_){}
  return ({'المستودعات العامة':'warehouses','المستودعات':'warehouses','السوشل ميديا':'social','الخدمات الإدارية':'logistics'})[t.sharedDepartment||t.department]||'';
 }
 function workflowActions(r){
  const t=task(r.id),auth=window.MoshAuth37,app=t&&workflowApp(t);
  if(!t||t.status!=='in_progress'||!app||!auth?.current?.()||!auth.canModule?.(app,'view')||!auth.canModule?.(app,'details'))return [];
  const model=window.MoshReceiptModel49,group=model?.category(t)||({new:'new',received:'active',working:'active',paused:'active',submitted:'review'})[t.employeeState||'new'];
  const mine=!!window.MoshEmployeeTasks41?.isMine?.(t),state=t.employeeState||'new',waiting=model?.label(t)?.includes('بانتظار البدء');
  const eligible=kind=>['approve','return'].includes(kind)?group==='review'&&auth.canModule(app,'approve'):mine&&auth.canModule(app,'status')&&(group==='new'?kind==='receive':group==='active'&&(state==='working'?['pause','finish'].includes(kind):kind==='start'||kind==='finish'&&state==='paused'&&!waiting));
  const result=[],seen=new Set();
  // Employee-overlay controls use delegated listeners. Clicking their native button preserves them.
  const sources=[...all('[data-emp48-action]',r.execution),...all('button[onclick]',r.card)];
  for(const source of sources){
   if(source.closest('.mw08-workspace')!==r.root||!permitted(source))continue;
   let kind=source.dataset.emp48Action;
   if(kind){if(String(source.closest('.emp48-workflow')?.dataset.taskId)!==String(r.id))continue;}
   else{
    const match=(source.getAttribute('onclick')||'').match(/^\s*(?:return\s+)?(?:window\.)?(\w+)\(\s*(?:(["'])(.*?)\2|(\d+))\s*[,)]/);
    if(!match||String(match[3]??match[4])!==String(r.id))continue;
    kind=workflowHandlers[match[1]];
   }
   if(!kind||seen.has(kind)||!eligible(kind))continue;
   seen.add(kind);
   const labels={receive:'استلام المهمة',start:state==='paused'&&!waiting?'استئناف التنفيذ':'بدء التنفيذ',pause:'إيقاف مؤقت',finish:'إنهاء المهمة وإرسالها للمراجعة',return:'إعادة للتعديل'};
   result.push({kind,source,label:labels[kind]||source.textContent.trim(),primary:kind!=='pause'&&kind!=='return',disabled:!!source.disabled||source.getAttribute('aria-disabled')==='true'||!!window.MoshTaskInbox49?.isBusy?.(r.id)});
  }
  return result.sort((a,b)=>Number(b.primary)-Number(a.primary));
 }
 function syncWorkflowActions(r){
  const items=workflowActions(r);r.workflowButtons=r.workflowButtons||new Map();
  for(const [kind,b]of r.workflowButtons)if(!items.some(item=>item.kind===kind)){b.remove();r.workflowButtons.delete(kind);}
  for(const item of items){
   let b=r.workflowButtons.get(item.kind);
   if(!b){
    b=button(item.label,()=>{
     // Re-resolve after every state/permission/render change; never click a stale control.
     const current=workflowActions(r).find(action=>action.kind===item.kind);
     if(!current||current.disabled){syncWorkflowActions(r);return;}
     current.source.click();schedule();
    });
    b.classList.add('mw08-workflow-button');b.dataset.workflowAction=item.kind;
    r.workflowButtons.set(item.kind,b);r.workflowActions.append(b);
   }
   set(b,item.label);b.classList.toggle('mw08-workflow-primary',item.primary);
   if(b.disabled!==item.disabled)b.disabled=item.disabled;
  }
  // Keep the primary action first when pause/start changes without recreating the whole header.
  items.forEach((item,i)=>{const b=r.workflowButtons.get(item.kind);if(r.workflowActions.children[i]!==b)r.workflowActions.insertBefore(b,r.workflowActions.children[i]||null);});
  r.workflowActions.hidden=!items.length;
 }
 function disclosure(title,cls){const d=make('details',cls),s=make('summary','r35-ui-navigation',title);d.append(s);return d;}
 function taskInput(card,prefix,id){return all('[id]',card).find(n=>n.id===prefix+id);}
 function ensure(card){
  let r=records.get(card);if(r)return r;
  const name=$('[id^="taskEditTitle_"]',card),toolbar=card.previousElementSibling;
  if(!name||!toolbar?.classList.contains('toolbar'))return null;
  const id=name.id.slice('taskEditTitle_'.length),nativeBack=$('.toolbar-left>button',toolbar);
  if(!nativeBack)return null;
  const stage=card.parentElement,overlay=card.closest('#emp47TaskStage'),root=make('section','mw08-workspace');root.dataset.taskId=id;
  const chrome=make('div','mw08-chrome'),crumb=make('span','','تفاصيل المهمة'),header=make('header','mw08-header'),identity=make('div','mw08-identity'),title=make('h2'),meta=make('p','mw08-meta'),status=make('span','mw08-status'),actions=make('div','mw08-head-actions');
  const workflowActions=make('div','mw08-workflow-actions');workflowActions.setAttribute('role','group');workflowActions.setAttribute('aria-label','إجراءات تنفيذ المهمة ومراجعتها');workflowActions.hidden=true;
  identity.append(title,meta);header.append(identity,status,workflowActions,actions);
  const top=make('div','mw08-top'),info=make('section','mw08-info'),readHead=make('div','mw08-section-head'),brief=make('p','mw08-brief'),facts=make('dl','mw08-facts');
  const editor=disclosure('تعديل التفاصيل','mw08-editor'),editorBody=make('div','mw08-editor-body'),saveActions=make('div','mw08-save-actions');editor.append(editorBody,saveActions);
  readHead.append(make('h3','','تفاصيل المهمة'));info.append(readHead,brief,facts,editor);top.append(info);
  const management=disclosure('إجراءات المهمة','mw08-management'),nativeActions=make('div','mw08-native-actions');management.append(nativeActions);
  const execution=make('div','mw08-execution');
  toolbar.before(root);root.append(chrome,header,execution,card);card.prepend(top);card.append(management);
  if(overlay){overlay.closest('#emp47TaskOverlay').classList.add('mw08-overlay');const originalClose=document.getElementById('emp47TaskClose');const close=button('إغلاق',()=>originalClose?.click());close.setAttribute('aria-label','إغلاق صفحة المهمة');if(/openTaskDetails\(/.test(nativeBack.getAttribute('onclick')||'')){nativeBack.dataset.closeModal='';chrome.append(nativeBack,close);}else{chrome.append(crumb,close);nativeBack.classList.add('mw08-native-back');}}
  else{const isParent=/openTaskDetails\(/.test(nativeBack.getAttribute('onclick')||'');if(isParent){chrome.append(nativeBack);const close=button('إغلاق',()=>{nativeBack.click();});close.setAttribute('aria-label','إغلاق المهمة الفرعية والرجوع للرئيسية');chrome.append(close);}else{nativeBack.textContent='إغلاق';nativeBack.setAttribute('aria-label','إغلاق صفحة المهمة والرجوع للقائمة');chrome.append(crumb,nativeBack);}}
  all('button',toolbar).forEach(b=>{if(b===nativeBack)return;if(b.matches('.save-btn,.cancel-edit-btn'))saveActions.append(b);else nativeActions.append(b);});
  toolbar.classList.add('mw08-original-toolbar');root.append(toolbar);
  const transfer=button('تحويل المهمة',()=>{const select=$('[id^="managerTransferDept_"]',card);if(select&&permitted(select)){management.open=true;select.scrollIntoView({block:'center',behavior:'auto'});select.focus({preventScroll:true});return;}const field=taskInput(card,'taskEditDepartment_',id);if(field&&!field.disabled&&permitted(field)){editor.open=true;const pv=$('.pv-task-info',editor);if(pv)pv.open=true;field.scrollIntoView({block:'center',behavior:'auto'});field.focus({preventScroll:true});}});
  transfer.hidden=true;actions.append(transfer,button('إجراءات المهمة',()=>{management.open=!management.open;if(management.open)management.scrollIntoView({block:'nearest',behavior:'auto'});}));
  r={id,card,stage,root,chrome,header,title,meta,status,actions,workflowActions,transfer,top,info,brief,facts,editor,editorBody,saveActions,management,nativeActions,execution,overlay,signature:''};records.set(card,r);
  if(overlay)window.MoshEmployeeTaskOverlay47?.enforce?.(id);
  root.addEventListener('input',e=>{if(e.target.closest('.mw08-editor'))schedule();});
  return r;
 }
 function arrange(r){
  const {card,editorBody,info,top,management,nativeActions,execution}=r;
  // Preserve original field IDs and listeners, including deadline controls and permission locks.
  const pv=$(':scope>.pv-task-info',card),grid=$(':scope>.field-grid',card);
  if(pv){pv.open=true;editorBody.append(pv);}else if(grid)editorBody.append(grid);
  all(':scope>.field',card).forEach(n=>editorBody.append(n));
  const guide=$(':scope>.mk29-task-guide',card);if(guide)info.append(guide);
  const flags=$('.r19-task-status-panel',card);if(flags&&flags.parentElement!==info)info.insertBefore(flags,r.editor);
  const employee=$('.emp48-workflow',r.stage);if(employee&&employee.parentElement!==execution)execution.append(employee);
  const manager=$('.task-manager-controls',card);if(manager&&manager.parentElement!==management)management.append(manager);
  const support=$('.task-support-panel',card);if(support&&support.parentElement!==management)management.append(support);
  const shared=$('.sd32-root-panel,.sd32-child-context',card);if(shared&&shared.parentElement!==top){shared.classList.add('mw08-children');top.append(shared);}
  const childPanel=all('.panel',card).find(p=>!p.closest('.mw08-management')&&($('button[onclick*="openSubTaskModal"]',p)||$('h3',p)?.textContent.trim()==='المهام الفرعية'));
  if(childPanel&&childPanel.parentElement!==top){childPanel.classList.add('mw08-children');top.append(childPanel);}
  if(childPanel){const packageInfo=all(':scope>div',card).find(n=>n!==top&&n.textContent.trim().startsWith('تقدم الباقة:'));if(packageInfo){packageInfo.classList.add('mw08-package-info');childPanel.append(packageInfo);}const table=$('table',childPanel),headers=table?all('th',table).map(n=>n.textContent.trim()):[];if(table)all('tr.data',table).forEach(row=>all('td',row).forEach((cell,i)=>{if(headers[i]&&cell.dataset.mw08Label!==headers[i])cell.dataset.mw08Label=headers[i];}));}
  let chat=$('.r34-chat',card);const sourceTask=task(r.id);
  if(!chat&&sourceTask&&window.MoshAlerts19?.canViewTask(sourceTask)&&window.MoshChat34){card.insertAdjacentHTML('beforeend',window.MoshChat34.html(sourceTask));chat=$('.r34-chat',card);}
  if(chat&&chat.parentElement!==card)card.append(chat);
  // Existing subtask completion and package information remain available, with original actions.
  all(':scope>div',card).filter(n=>n!==top&&!n.classList.contains('r19-task-status-panel')&&!n.classList.contains('r34-chat')&&!n.classList.contains('mw08-management')).forEach(n=>{
   if(n.querySelector('button[onclick*="finishSubTask"]'))nativeActions.append(n);
   else if(n.classList.contains('panel')&&!n.children.length&&!n.textContent.trim())n.classList.add('mw08-empty-wrapper');
  });
  const hasChildren=all(':scope>.mw08-children',top).some(p=>!p.hidden);r.root.classList.toggle('mw08-has-children',hasChildren);
  const editable=all('input,textarea,select',editorBody).some(n=>!n.disabled&&!n.readOnly&&!n.hidden&&!n.closest('[hidden]'));
  set($('summary',r.editor),editable?'تعديل التفاصيل':'عرض التفاصيل');
  const target=$('[id^="managerTransferDept_"]',card)||taskInput(card,'taskEditDepartment_',r.id);
  const transferAction=$('button[onclick*="managerTransferTask"]',card),t=task(r.id);
  const canTransfer=!!target&&!target.disabled&&permitted(target)&&(!transferAction||permitted(transferAction))&&!t?.sharedDistributionChild;
  r.transfer.hidden=!canTransfer;r.transfer.disabled=!!transferAction?.disabled;
  const hasManagement=all('button',management).some(b=>permitted(b))||!!manager||!!support;
  management.hidden=!hasManagement;r.actions.lastElementChild.hidden=!hasManagement;
 }
 function refresh(r){
  const t=task(r.id);if(!t)return;
  const values=[t.title,t.customer,t.department,t.assignee,t.dueDate,t.description,t.notes,t.status,t.employeeState,t.returnedForRevision];const signature=JSON.stringify(values);
  if(signature===r.signature)return;r.signature=signature;
  set(r.title,window.MoshTaskUI?.title(t)||t.title||'المهمة');set(r.meta,[t.customer,t.sharedDepartment||t.department].filter(Boolean).join(' · '));
  set(r.status,typeof workflowEmployeeLabel==='function'?workflowEmployeeLabel(t):t.status);set(r.brief,t.description||'');r.brief.hidden=!t.description;
  r.facts.replaceChildren();for(const [key,value]of [['العميل',t.customer],['القسم',t.sharedDepartment||t.department],['المسؤول',t.assignee||'بانتظار التوزيع'],['التسليم',t.dueDate||'غير محدد']]){const item=make('div');item.append(make('dt','',key),make('dd','',value||'—'));r.facts.append(item);}
  let note=$(':scope>.mw08-notes',r.info);if(!note){note=disclosure('ملاحظات قبل التنفيذ','mw08-notes');note.append(make('p'));r.info.insertBefore(note,r.editor);}set($('p',note),t.notes||'');note.hidden=!t.notes;
 }
 function decorate(){frame=0;all('.sales-task-card').forEach(card=>{const r=ensure(card);if(r){arrange(r);refresh(r);syncWorkflowActions(r);}});}
 function schedule(){if(!frame)frame=requestAnimationFrame(decorate);}
 const observer=new MutationObserver(ms=>{if(ms.some(m=>m.type==='childList'||m.type==='attributes'&&m.oldValue!==m.target.getAttribute(m.attributeName)&&!m.target.closest?.('.mw08-workflow-actions')))schedule();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['disabled','hidden','class','style','aria-disabled']});
 ['mosh:ui-ready','mosh:refreshed','mosh:r19-change','mosh:permissions-applied'].forEach(e=>document.addEventListener(e,schedule));
 window.MoshTaskWorkspace08={decorate,schedule,version:'08'};schedule();
})();
