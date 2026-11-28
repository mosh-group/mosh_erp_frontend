(function(){
'use strict';
if(window.MoshManagerApprovals28)return;

const DEPTS=[
 {key:'it',label:'تكنولوجيا المعلومات',running:'itRunningTab'},
 {key:'admin',label:'الإدارة',running:'adminRunningTab'},
 {key:'hr',label:'الموارد البشرية',running:'hrRunningTab'},
 {key:'sales',label:'المبيعات',running:'salesRunningTab'},
 {key:'marketing',label:'التسويق',running:'marketingRunningTab'},
 {key:'social',label:'السوشال ميديا',running:'socialRunningTab'},
 {key:'design',label:'التصميم',running:'designRunningTab'},
 {key:'photo',label:'التصوير',running:'photoRunningTab'},
 {key:'editing',label:'المونتاج',running:'editingRunningTab'},
 {key:'promotion',label:'الترويج',running:'promotionRunningTab'},
 {key:'logistics',label:'اللوجستيات',running:'logisticsRunningTab'},
 {key:'purchases',label:'المشتريات',running:'purchasesRunningTab'},
 {key:'warehouses',label:'المستودعات العامة',running:'warehousesRunningTab'},
 {key:'accounting',label:'المحاسبة',running:'accountingRunningTab'},
 {key:'platform',label:'MOSH MEDIA',running:'platformRunningTab'}
];
const deptByKey=k=>DEPTS.find(x=>x.key===k)||null;
const clean=v=>String(v==null?'':v).trim();
const same=(a,b)=>clean(a).localeCompare(clean(b),'ar',{sensitivity:'base'})===0;
const esc28=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=v=>Array.isArray(v)?v:[];
const now=()=>new Date().toISOString();

function systemOwner(){
 try{const r=typeof getCurrentRole==='function'?getCurrentRole():null;return r?.id==='app_programmer'||r?.permissions?.systemCustomization===true;}catch(e){return false;}
}
function currentName(){try{return clean(currentUserDisplayName())}catch(e){return ''}}
function currentProfile(){
 try{if(typeof hrProCurrentProfile==='function')return hrProCurrentProfile();}catch(e){}
 const n=currentName();return arr(state.staffProfiles).find(p=>same(p.name,n)||same(p.username,n)||same(p.email,n))||null;
}
function managerForDepartment(dept){
 try{const m=typeof getDepartmentManager==='function'?getDepartmentManager(dept):null;if(m)return m;}catch(e){}
 const map=effectiveDepartmentManagers();const id=map[dept];
 if(id){const p=arr(state.staffProfiles).find(x=>String(x.id)===String(id));if(p)return p;}
 return window.MoshApi?null:arr(state.staffProfiles).find(p=>p&&p.isManager&&p.active!==false&&same(p.department,dept))||null;
}
function namedApprover(r){
 const assigned=r?.r34Approval?.byStage?.[Number(r.stageIndex)||0];
 if(!assigned)return null;
 const dept=clean(r.department), backup=clean(window.MoshApi?.departmentManagerCoverage?.acting?.[dept]);
 if(backup&&backup!==clean(r.employeeId)&&clean(assigned.employeeId)===clean(state.departmentManagers?.[dept])){
   const profile=arr(state.staffProfiles).find(p=>clean(p.id)===backup);
   return {employeeId:backup,name:profile?.name||'',department:profile?.department||dept};
 }
 const profile=arr(state.staffProfiles).find(p=>clean(p.id)===clean(assigned.employeeId));
 return {...assigned,department:profile?.department||dept};
}

function expectedManager(req,stage){
 const assigned=namedApprover(req);
 if(assigned&&stage===requestStage(req))return assigned;
 if(stage==='مدير القسم الجديد')return managerForDepartment(req?.data?.target||'');
 if(stage==='مدير القسم الحالي')return managerForDepartment(req?.department||'');
 if(stage==='المدير المباشر'){
   const byName=arr(state.staffProfiles).find(p=>same(p.name,req?.manager));
   const dept=req?.department||'';
   return !byName||String(byName.id)===String(state.departmentManagers?.[dept]||'')?managerForDepartment(dept):byName;
 }
 return null;
}
function isManagerStage(stage){return ['المدير المباشر','مدير القسم الحالي','مدير القسم الجديد'].includes(clean(stage));}
function requestStage(r){try{return hrProRequestStage(r)}catch(e){return r?.status==='pending'?(r.route||[])[Number(r.stageIndex)||0]||'':''}}
function targetDeptForRequest(r){
 const stage=requestStage(r);
 if(stage==='مدير القسم الجديد')return clean(r?.data?.target||'');
 return clean(r?.department||'');
}
function canManagerAct(r){
 const user=window.MoshApi?.user;
 if(user&&clean(r.employeeId)===clean(user.employeeId))return false;
 const assigned=namedApprover(r);
 if(assigned)return !!(user&&clean(assigned.employeeId)===clean(user.employeeId)&&(!assigned.userId||clean(assigned.userId)===clean(user.id)));
 if(systemOwner())return true;
 const stage=requestStage(r),m=expectedManager(r,stage);
 return !!(m&&(user?clean(m.id)===clean(user.employeeId):same(m.name,currentName())));
}
function isHrActor(){const p=currentProfile();return systemOwner()||same(p?.department,'الموارد البشرية');}
function saveSafe(){try{save();return true}catch(e){console.error('Manager approvals save failed',e);alert('تعذر حفظ القرار. تحقق من التخزين ثم أعد المحاولة.');return false}}
function decisionTone(r){
 if(['approve','approved'].includes(r?.managerDecision))return 'ok';
 if(['reject','rejected'].includes(r?.managerDecision))return 'bad';
 return 'wait';
}
function managerDecisionLabel(r){
 const tone=decisionTone(r);
 if(tone==='ok')return 'موافقة المدير المباشر';
 if(tone==='bad')return 'عدم موافقة المدير المباشر';
 return 'بانتظار قرار المدير المباشر';
}
function dateText(v){if(!v)return '—';try{return new Intl.DateTimeFormat('ar-SY',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}catch(e){return clean(v)}}

// All leave requests, including sick leave, pass direct manager before HR.
try{if(typeof HR_PRO_REQUESTS==='object'&&HR_PRO_REQUESTS.sick_leave)HR_PRO_REQUESTS.sick_leave.route=['المدير المباشر','الموارد البشرية'];}catch(e){}

const originalSubmit=window.hrProSubmitRequest;
if(typeof originalSubmit==='function'){
 window.hrProSubmitRequest=function(){
   const before=arr(state.hrProRequests).length;
   const result=originalSubmit.apply(this,arguments);
   const after=arr(state.hrProRequests);
   if(after.length>before){
     for(let i=before;i<after.length;i++){
       const r=after[i];if(!r)continue;
       const stage=requestStage(r);
       if(stage==='المدير المباشر'){
         const m=expectedManager(r,stage);
         if(!clean(r.manager)&&m?.name)r.manager=m.name;
         r.managerDecision=r.managerDecision||'';
         r.managerDecisionBy=r.managerDecisionBy||'';
         r.managerDecisionAt=r.managerDecisionAt||'';
         r.managerNote=r.managerNote||'';
       }
     }
     saveSafe();
   }
   refreshBadges();
   return result;
 };
}

const decisionsInFlight=new Set();
async function directManagerDecision(id,decision,note=''){
 const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));
 if(!r||r.status!=='pending'||requestStage(r)!=='المدير المباشر'||decisionsInFlight.has(r.id))return false;
 if(!canManagerAct(r)){alert('هذا الطلب بانتظار قرار المدير المباشر المحدد للموظف.');return false;}
 const api=window.MoshApi, ownerId=String(api?.user?.id||'');
 if(!ownerId||!Number.isInteger(Number(r._version))){alert('حدّث الطلب قبل حفظ قرارك.');return false;}

 const managerDecision=decision==='approved'?'approved':'rejected';
 const stageIndex=Number(r.stageIndex)||0, last=stageIndex>=arr(r.route).length-1;
 const managerDecisionAt=now(), managerNote=clean(note), managerDecisionBy=currentName();
 const history=[...arr(r.history),{
   action:managerDecision==='approved'?'manager_approved':'manager_not_approved',
   stage:'المدير المباشر',by:managerDecisionBy,time:managerDecisionAt,note:managerNote
 }];
 const body={_version:r._version,managerDecision,managerDecisionBy,managerDecisionAt,managerNote,history,
   ...(last?{status:managerDecision}:{stageIndex:stageIndex+1})
 };
 const request={method:'PATCH',headers:{'Idempotency-Key':crypto.randomUUID()},body};
 const path='/hr-requests/'+encodeURIComponent(r.id);
 decisionsInFlight.add(r.id);
 try{
   let saved;
   try{saved=await api.request(path,request);}
   catch(error){
     if(!error.network||String(api.user?.id||'')!==ownerId)throw error;
     saved=await api.request(path,request);
   }
   if(saved!==null&&(saved?.id!==r.id||!Number.isInteger(Number(saved._version))))throw new Error('تعذّر تأكيد القرار. افتح القائمة مجدداً للتحقق.');
   api.acceptServerChanges([{resource:'hr-requests',id:String(r.id),data:saved}],ownerId);
   hrProUpdateEmployeeServiceStatus();
   refreshBadges();
   return true;
 }catch(error){
   if(String(api.user?.id||'')===ownerId)alert(error.message||'تعذّر حفظ قرار المدير.');
   return false;
 }finally{
   decisionsInFlight.delete(r.id);
 }
}

const originalApprove=window.hrProApproveRequest;
const originalReject=window.hrProRejectRequest;
if(typeof originalApprove==='function'){
 window.hrProApproveRequest=async function(id){
   const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));
   if(!r||r.status!=='pending')return;
   const stage=requestStage(r);
   if(stage==='المدير المباشر'){
     const note=document.getElementById('mgr28DecisionNote')?.value||'';
     if(await directManagerDecision(id,'approved',note)){try{hrProCloseModal()}catch(e){};refreshOpenManagerModal();try{if(document.getElementById('hrApp')?.classList.contains('active'))openHRPro('requests')}catch(e){}}
     return;
   }
   if(stage==='الموارد البشرية'){
     if(arr(r.route).includes('المدير المباشر')&&!r.managerDecision){alert('لا يمكن اعتماد الطلب نهائياً قبل تسجيل قرار المدير المباشر.');return;}
     if(!isHrActor()){alert('الاعتماد في هذه المرحلة متاح للموارد البشرية فقط.');return;}
   }
   const result=originalApprove.apply(this,arguments);refreshBadges();return result;
 };
}
if(typeof originalReject==='function'){
 window.hrProRejectRequest=async function(id){
   const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));
   if(!r||r.status!=='pending')return;
   const stage=requestStage(r);
   if(stage==='المدير المباشر'){
     let note=document.getElementById('mgr28DecisionNote')?.value||'';
     if(!clean(note)){note=prompt('ملاحظة المدير / سبب عدم الموافقة:','')||'';if(!clean(note))return;}
     if(await directManagerDecision(id,'rejected',note)){try{hrProCloseModal()}catch(e){};refreshOpenManagerModal();try{if(document.getElementById('hrApp')?.classList.contains('active'))openHRPro('requests')}catch(e){}}
     return;
   }
   if(stage==='الموارد البشرية'){
     if(arr(r.route).includes('المدير المباشر')&&!r.managerDecision){alert('لا يمكن إصدار القرار النهائي قبل تسجيل قرار المدير المباشر.');return;}
     if(!isHrActor()){alert('القرار النهائي في هذه المرحلة متاح للموارد البشرية فقط.');return;}
   }
   const result=originalReject.apply(this,arguments);refreshBadges();return result;
 };
}

const originalOpenDetails=window.hrProOpenRequestDetails;
if(typeof originalOpenDetails==='function'){
 window.hrProOpenRequestDetails=function(id){
   const result=originalOpenDetails.apply(this,arguments);
   const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));
   const root=document.getElementById('hrProModalRoot');if(!r||!root)return result;
   const body=root.querySelector('.hr-pro-modal-body');const foot=root.querySelector('.hr-pro-modal-foot');
   if(body&&arr(r.route).includes('المدير المباشر')){
     const block=document.createElement('div');block.className='mgr28-decision-card '+decisionTone(r);
     const m=expectedManager(r,'المدير المباشر');
     block.innerHTML=`<div><span>قرار المدير المباشر</span><b>${esc28(managerDecisionLabel(r))}</b></div><small>${r.managerDecision?`${esc28(r.managerDecisionBy||m?.name||r.manager||'—')} · ${esc28(dateText(r.managerDecisionAt))}${r.managerNote?` · ${esc28(r.managerNote)}`:''}`:`المدير: ${esc28(r.manager||m?.name||'غير محدد')}`}</small>`;
     body.appendChild(block);
   }
   if(r.status==='pending'&&foot){
     const stage=requestStage(r),reject=foot.querySelector('button[onclick^="hrProRejectRequest"]'),approve=foot.querySelector('button[onclick^="hrProApproveRequest"]');
     if(stage==='المدير المباشر'){
       if(canManagerAct(r)){
         const note=document.createElement('div');note.className='mgr28-note';note.innerHTML='<label for="mgr28DecisionNote">ملاحظة المدير <small>(اختياري عند الموافقة، ومطلوب عند عدم الموافقة)</small></label><textarea id="mgr28DecisionNote" placeholder="اكتب ملاحظتك على الطلب..."></textarea>';body.appendChild(note);
         if(reject)reject.textContent='عدم الموافقة وإرسال لـ HR';if(approve)approve.textContent='موافقة وإرسال لـ HR';
       }else{
         [reject,approve].forEach(b=>{if(b){b.disabled=true;b.title='بانتظار المدير المباشر';}});
         const info=document.createElement('span');info.className='mgr28-foot-info';info.textContent='بانتظار قرار المدير المباشر قبل اعتماد الموارد البشرية.';foot.prepend(info);
       }
     }else if(stage==='الموارد البشرية'){
       const hasManager=arr(r.route).includes('المدير المباشر');
       const blocked=hasManager&&!r.managerDecision;
       if(blocked||!isHrActor()){
         [reject,approve].forEach(b=>{if(b)b.disabled=true;});
         const info=document.createElement('span');info.className='mgr28-foot-info';info.textContent=blocked?'بانتظار قرار المدير المباشر.':'هذه المرحلة خاصة بالموارد البشرية.';foot.prepend(info);
       }else{
         const isLast=(Number(r.stageIndex)||0)>=arr(r.route).length-1;
         if(reject)reject.textContent='رفض نهائي';if(approve)approve.textContent=isLast?'اعتماد نهائي':`اعتماد وتحويل إلى ${arr(r.route)[(Number(r.stageIndex)||0)+1]}`;
       }
     }
   }
   return result;
 };
}

const originalRequestsTable=window.hrProRequestsTable;
if(typeof originalRequestsTable==='function'){
 window.hrProRequestsTable=function(req){
   const html=originalRequestsTable.apply(this,arguments);
   setTimeout(()=>{
     document.querySelectorAll('.hr-pro-table tbody tr').forEach((tr,i)=>{
       const r=req?.[i];if(!r||!arr(r.route).includes('المدير المباشر'))return;
       const td=tr.children[3];if(!td||td.querySelector('.mgr28-mini'))return;
       const x=document.createElement('div');x.className='mgr28-mini '+decisionTone(r);x.textContent=managerDecisionLabel(r);td.appendChild(x);
     });
   },0);
   return html;
 };
}

const originalEmployeeStatus=window.hrProUpdateEmployeeServiceStatus;
window.hrProUpdateEmployeeServiceStatus=function(){
 try{
   const el=document.getElementById('employeeServiceStatus');if(!el){if(typeof originalEmployeeStatus==='function')return originalEmployeeStatus();return;}
   const p=currentProfile(),name=currentName();
   const mine=arr(state.hrProRequests).filter(r=>p?String(r.employeeId)===String(p.id):same(r.employeeName,name)).sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
   const pending=mine.filter(r=>r.status==='pending');
   if(pending.length){const last=pending[pending.length-1];el.innerHTML=`لديك <b>${pending.length}</b> طلب قيد الإجراء · ${esc28(hrProTypeLabel(last.type))}: ${esc28(requestStage(last))}`;return;}
   const last=mine[mine.length-1];
   if(last){el.innerHTML=`آخر طلب: <b>${esc28(hrProTypeLabel(last.type))}</b> · <span class="mgr28-result ${last.status==='approved'?'ok':'bad'}">${last.status==='approved'?'معتمد':last.status==='rejected'?'مرفوض':'مغلق'}</span>`;return;}
   el.textContent='لا يوجد لديك طلبات معلقة حالياً.';
 }catch(e){if(typeof originalEmployeeStatus==='function')return originalEmployeeStatus();}
};

function hrManagerItems(dept){return arr(state.hrProRequests).filter(r=>{if(!r||r.status!=='pending')return false;const st=requestStage(r);if(!isManagerStage(st))return false;const m=expectedManager(r,st);return same(targetDeptForRequest(r),dept)||same(m?.department,dept);});}
function viewerHrManagerItems(dept){const all=hrManagerItems(dept);if(systemOwner())return all;const dm=managerForDepartment(dept);if(dm&&same(dm.name,currentName()))return all;return all.filter(canManagerAct);}
function taskManagerItems(dept){return arr(state.salesTasks).filter(t=>t&&same(t.department,dept)&&t.status==='in_progress'&&(t.employeeState==='submitted'||t.managerApprovalStatus==='pending'));}
function canViewDeptQueue(dept){if(systemOwner())return true;const dm=managerForDepartment(dept);if(dm&&same(dm.name,currentName()))return true;return viewerHrManagerItems(dept).length>0;}
function countFor(dept){const dm=managerForDepartment(dept),deptManager=systemOwner()||!!(dm&&same(dm.name,currentName()));return viewerHrManagerItems(dept).length+(deptManager?taskManagerItems(dept).length:0);}

function refreshBadges(){
 DEPTS.forEach(d=>{const b=document.querySelector(`#mgr28Tab_${d.key} .mgr28-badge`);if(!b)return;const n=d.key==='marketing'&&typeof window.MoshMarketingV29?.approvalCount==='function'?MoshMarketingV29.approvalCount():countFor(d.label);if(b.textContent!==String(n))b.textContent=String(n);b.hidden=!n;document.getElementById(`mgr28Tab_${d.key}`)?.classList.toggle('has-pending',n>0);});
}
function insertTab(d){
 const running=document.getElementById(d.running);if(!running||document.getElementById(`mgr28Tab_${d.key}`))return;
 let btn;
 if(running.tagName==='LABEL'){
   btn=document.createElement('label');btn.className=running.className;btn.tabIndex=0;btn.setAttribute('role','button');
   btn.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(d.key)}});
 }else{btn=document.createElement('button');btn.type='button';btn.className=running.className;}
 btn.id=`mgr28Tab_${d.key}`;btn.classList.add('mgr28-tab');
 btn.innerHTML=`<span>اعتماد مدير القسم</span><span class="mgr28-badge" hidden>0</span>`;
 btn.onclick=e=>{e.preventDefault();open(d.key)};
 const wrap=running.parentElement;
 if(wrap?.classList.contains('menu')){const w=document.createElement('div');w.className='menu';w.appendChild(btn);wrap.insertAdjacentElement('afterend',w);}else running.insertAdjacentElement('afterend',btn);
}
function installTabs(){DEPTS.forEach(insertTab);refreshBadges();}

function close(){document.getElementById('mgr28Modal')?.remove();document.querySelectorAll('.mgr28-tab.active').forEach(x=>x.classList.remove('active'));}
function openTaskQueue(key){close();return openAppWith(key,()=>openProductiveRunningTasksPage(key));}
// Open the selected review directly instead of sending the manager to a generic task list.
function taskReviewContext(key,id,action='details'){
 const d=deptByKey(key),t=arr(state.salesTasks).find(row=>String(row.id)===String(id));
 if(!d||!t||!same(t.department,d.label)||!taskManagerItems(d.label).includes(t))return null;
 const manager=managerForDepartment(d.label),auth=window.MoshAuth37;
 if(!systemOwner()&&!(manager&&same(manager.name,currentName())))return null;
 if(!auth?.current?.()||!auth.canModule?.(key,'view')||!auth.canModule?.(key,'details'))return null;
 if(action!=='details'&&(!auth.canModule(key,'approve')||t.employeeState!=='submitted'))return null;
 if(action==='return'&&t.assignmentMode==='manager_self')return null;
 return {d,t};
}
function reviewTask(key,id,action='details'){
 if(!['details','approve','return'].includes(action))return false;
 const context=taskReviewContext(key,id,action);if(!context)return false;
 if(typeof window.openProductiveTaskDetails!=='function')return false;
 if(window.MoshPages?.pending(key))return window.MoshPages.open(key,()=>reviewTask(key,id,action));
 close();try{goApp(key);window.openProductiveRunningTasksPage?.(key);window.openProductiveTaskDetails(key,String(context.t.id),'running');}catch(error){console.error('Manager review open failed',error);return false;}
 if(action==='details')return true;
 // Use the actual rendered native button, including its original confirmation and permission gate.
 const fresh=taskReviewContext(key,id,action);if(!fresh)return false;
 const cfg=typeof getProductiveConfig==='function'?getProductiveConfig(key):null,box=cfg&&document.getElementById(cfg.workspaceId);
 if(!box)return false;
 let control=action==='approve'?Array.from(box.querySelectorAll('[id]')).find(node=>node.id==='managerFinishBtn_'+fresh.t.id):null;
 if(action==='return'){
  const card=Array.from(box.querySelectorAll('[id]')).find(node=>node.id==='taskEditTitle_'+fresh.t.id)?.closest('.sales-task-card');
  control=card?.querySelector('button[onclick*="managerReturnTask("]');
 }
 if(!control||control.disabled||control.hidden||control.closest('.mosh-auth-hidden,[hidden]'))return false;
 for(let node=control;node&&node!==document.body;node=node.parentElement)if(node.style?.display==='none'||node.classList?.contains('mosh-auth-hidden'))return false;
 control.click();return true;
}
function taskReviewActions(key,t){
 const args=esc28(JSON.stringify(key))+','+esc28(JSON.stringify(String(t.id)));
 const call=action=>'MoshManagerApprovals28.reviewTask('+args+',&quot;'+action+'&quot;)';
 let html='<button type="button" class="btn r35-ui-navigation" onclick="'+call('details')+'">مراجعة تفاصيل المهمة</button>';
 if(taskReviewContext(key,t.id,'approve')){
  const packageParent=!t.parentTaskId&&typeof getSubTasks==='function'&&getSubTasks(t.id).length>=2;
  if(!packageParent)html='<button type="button" class="btn primary r35-ui-navigation" onclick="'+call('approve')+'">'+(t.parentTaskId?(t.sharedDistributionChild?'اعتماد وإنهاء الدور':'اعتماد وإنهاء الخدمة الفرعية'):(taskFinishesToFollowUp(t)?'اعتماد وإرسال للمتابعة':'اعتماد وإنهاء للفوترة'))+'</button>'+html;
  if(taskReviewContext(key,t.id,'return'))html+='<button type="button" class="btn r35-ui-navigation" onclick="'+call('return')+'">إعادة للتعديل</button>';
 }
 return '<div class="mgr28-item-actions mgr28-task-review-actions" role="group" aria-label="إجراءات مراجعة المهمة">'+html+'</div>';
}
async function open(key){
 if(!deptByKey(key))return;
 const api=window.MoshApi, owner=String(api?.user?.id||'');
 if(!owner)return renderQueue(key);
 renderQueue(key,'loading');
 const modal=document.getElementById('mgr28Modal');
 try{
   await api.refresh({section:key});
   if(modal?.isConnected&&String(api.user?.id||'')===owner)renderQueue(key);
 }catch(error){
   if(modal?.isConnected&&String(api.user?.id||'')===owner)renderQueue(key,'error');
 }
}
function renderQueue(key,loadState=''){
 close();const d=deptByKey(key);if(!d)return;const hrs=viewerHrManagerItems(d.label),deptMgr=managerForDepartment(d.label),isDeptMgr=!!(deptMgr&&same(deptMgr.name,currentName())),tasks=(systemOwner()||isDeptMgr)?taskManagerItems(d.label):[],mgr=deptMgr||(hrs[0]?expectedManager(hrs[0],requestStage(hrs[0])):null),canView=systemOwner()||isDeptMgr||hrs.length>0;
 const rows=canView?hrs.map(r=>{
   const stage=requestStage(r),can=canManagerAct(r),m=expectedManager(r,stage);
   return `<div class="mgr28-item"><div class="mgr28-item-main"><span class="mgr28-kind">طلب موظف</span><b>${esc28(hrProTypeLabel(r.type))}</b><p>${esc28(r.employeeName)} · ${esc28(r.reason||'بدون ملاحظة')}</p><small>${esc28(r.createdDate||'')} · المدير: ${esc28(m?.name||r.manager||'غير محدد')}</small></div><div class="mgr28-item-actions"><button class="btn" onclick="hrProOpenRequestDetails('${esc28(r.id)}')">فتح التفاصيل</button>${can&&stage==='المدير المباشر'?`<button class="btn" onclick="MoshManagerApprovals28.quick('${esc28(r.id)}','rejected')">عدم الموافقة</button><button class="btn primary" onclick="MoshManagerApprovals28.quick('${esc28(r.id)}','approved')">موافقة</button>`:''}</div></div>`;
 }).join(''):'';
 const taskRows=canView?tasks.map(t=>`<div class="mgr28-item mgr28-task-review-item">${taskReviewActions(key,t)}<div class="mgr28-item-main"><span class="mgr28-kind task">مهمة للمراجعة</span><b class="mt54-task-name">${esc28(MoshTaskUI.title(t))}</b><span class="mt54-client-name">${esc28(t.customer||'بدون عميل')}</span><p>${esc28(t.assignee||'بدون منفذ')}</p><small>المهمة بانتظار مراجعة المدير</small></div></div>`).join(''):'';
 const modal=document.createElement('div');modal.id='mgr28Modal';modal.className='mgr28-backdrop';modal.dataset.department=key;
 modal.innerHTML=`<div class="mgr28-modal" dir="rtl"><header><div><span>قسم ${esc28(d.label)}</span><h2>اعتماد مدير القسم</h2><p>كل ما يحتاج قرار المدير قبل انتقاله للمرحلة التالية.</p></div><button class="btn" onclick="MoshManagerApprovals28.close()">إغلاق</button></header><div class="mgr28-summary"><div><strong>${loadState?'—':hrs.length}</strong><span>طلبات موظفين</span></div><div><strong>${loadState?'—':tasks.length}</strong><span>مهام للمراجعة</span></div><div><strong>${esc28(mgr?.name||'—')}</strong><span>مدير القسم</span></div></div>${!canView?`<div class="mgr28-note-box">هذه القائمة مخصصة لمدير القسم. لن تظهر تفاصيل الطلبات إلا للمدير المحدد أو مسؤول النظام.</div>`:''}<main>${loadState==='loading'?'<div class="mgr28-empty" role="status">جارٍ تحديث طلبات الاعتماد…</div>':loadState==='error'?'<div class="mgr28-empty" role="alert">تعذّر تحديث طلبات الاعتماد. <button type="button" class="btn" onclick="MoshManagerApprovals28.open(this.closest(\'#mgr28Modal\').dataset.department)">إعادة المحاولة</button></div>':rows+(taskRows||'')+(canView&&!rows&&!taskRows?'<div class="mgr28-empty">لا يوجد شيء بحاجة لاعتماد مدير القسم حالياً.</div>':'')}</main></div>`;
 modal.addEventListener('click',e=>{if(e.target===modal)close()});document.body.appendChild(modal);document.getElementById(`mgr28Tab_${key}`)?.classList.add('active');
}
async function quick(id,decision){
 const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));if(!r)return;
 let note='';if(decision==='rejected'){note=prompt('سبب عدم الموافقة / ملاحظة المدير:','')||'';if(!clean(note))return;}
 else note=prompt('ملاحظة المدير (اختياري):','')||'';
 if(requestStage(r)==='المدير المباشر'&&await directManagerDecision(id,decision,note)){refreshOpenManagerModal();try{if(document.getElementById('hrApp')?.classList.contains('active'))openHRPro('requests')}catch(e){}}
 else if(requestStage(r)!=='المدير المباشر')hrProOpenRequestDetails(id);
}
function refreshOpenManagerModal(){const key=document.getElementById('mgr28Modal')?.dataset.department;if(key)renderQueue(key);}

window.MoshManagerApprovals28={open,close,quick,refresh:refreshBadges,openTasks:openTaskQueue,reviewTask,countFor,version:'28.0'};
document.addEventListener('mosh:page-mounted',installTabs);
function init(){installTabs();try{hrProUpdateEmployeeServiceStatus()}catch(e){};setTimeout(installTabs,400);setTimeout(installTabs,1500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
setInterval(refreshBadges,5000);
new MutationObserver(()=>{clearTimeout(window.__mgr28t);window.__mgr28t=setTimeout(installTabs,80)}).observe(document.documentElement,{childList:true,subtree:true});
})();
