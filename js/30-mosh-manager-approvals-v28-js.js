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
 {key:'accounting',label:'المحاسبة',running:'accountingRunningTab'}
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
 const map=state.departmentManagers||{};const id=map[dept];
 if(id){const p=arr(state.staffProfiles).find(x=>String(x.id)===String(id));if(p)return p;}
 return arr(state.staffProfiles).find(p=>p&&p.isManager&&p.active!==false&&same(p.department,dept))||null;
}
function expectedManager(req,stage){
 if(stage==='مدير القسم الجديد')return managerForDepartment(req?.data?.target||'');
 if(stage==='مدير القسم الحالي')return managerForDepartment(req?.department||'');
 if(stage==='المدير المباشر'){
   const byName=arr(state.staffProfiles).find(p=>same(p.name,req?.manager));
   return byName||managerForDepartment(req?.department||'');
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
 if(systemOwner())return true;
 const stage=requestStage(r),m=expectedManager(r,stage),me=currentName();
 return !!(m&&same(m.name,me));
}
function isHrActor(){const p=currentProfile();return systemOwner()||same(p?.department,'الموارد البشرية');}
function saveSafe(){try{save();return true}catch(e){console.error('Manager approvals save failed',e);alert('تعذر حفظ القرار. تحقق من التخزين ثم أعد المحاولة.');return false}}
function managerDecisionLabel(r){
 if(r?.managerDecision==='approved')return 'موافقة المدير المباشر';
 if(r?.managerDecision==='rejected')return 'عدم موافقة المدير المباشر';
 return 'بانتظار قرار المدير المباشر';
}
function decisionTone(r){return r?.managerDecision==='approved'?'ok':r?.managerDecision==='rejected'?'bad':'wait'}
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

function directManagerDecision(id,decision,note=''){
 const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));
 if(!r||r.status!=='pending')return false;
 const stage=requestStage(r);
 if(stage!=='المدير المباشر')return false;
 if(!canManagerAct(r)){alert('هذا الطلب بانتظار قرار المدير المباشر المحدد للموظف.');return false;}
 r.history=arr(r.history);
 r.managerDecision=decision==='approved'?'approved':'rejected';
 r.managerDecisionBy=currentName();
 r.managerDecisionAt=now();
 r.managerNote=clean(note);
 r.history.push({action:decision==='approved'?'manager_approved':'manager_not_approved',stage:'المدير المباشر',by:currentName(),time:r.managerDecisionAt,note:r.managerNote});
 if((Number(r.stageIndex)||0)<arr(r.route).length-1)r.stageIndex=(Number(r.stageIndex)||0)+1;
 else {r.status=decision==='approved'?'approved':'rejected';r.completedAt=now();if(decision==='approved'&&typeof hrProApplyRequest==='function')hrProApplyRequest(r);}
 if(!saveSafe())return false;
 try{hrProUpdateEmployeeServiceStatus()}catch(e){}
 refreshBadges();
 return true;
}

const originalApprove=window.hrProApproveRequest;
const originalReject=window.hrProRejectRequest;
if(typeof originalApprove==='function'){
 window.hrProApproveRequest=function(id){
   const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));
   if(!r||r.status!=='pending')return;
   const stage=requestStage(r);
   if(stage==='المدير المباشر'){
     const note=document.getElementById('mgr28DecisionNote')?.value||'';
     if(directManagerDecision(id,'approved',note)){try{hrProCloseModal()}catch(e){};refreshOpenManagerModal();try{if(document.getElementById('hrApp')?.classList.contains('active'))openHRPro('requests')}catch(e){}}
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
 window.hrProRejectRequest=function(id){
   const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));
   if(!r||r.status!=='pending')return;
   const stage=requestStage(r);
   if(stage==='المدير المباشر'){
     let note=document.getElementById('mgr28DecisionNote')?.value||'';
     if(!clean(note)){note=prompt('ملاحظة المدير / سبب عدم الموافقة:','')||'';if(!clean(note))return;}
     if(directManagerDecision(id,'rejected',note)){try{hrProCloseModal()}catch(e){};refreshOpenManagerModal();try{if(document.getElementById('hrApp')?.classList.contains('active'))openHRPro('requests')}catch(e){}}
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
function openTaskQueue(key){close();try{goApp(key)}catch(e){};setTimeout(()=>{try{openProductiveRunningTasksPage(key)}catch(e){}},40)}
function open(key){
 close();const d=deptByKey(key);if(!d)return;const hrs=viewerHrManagerItems(d.label),deptMgr=managerForDepartment(d.label),isDeptMgr=!!(deptMgr&&same(deptMgr.name,currentName())),tasks=(systemOwner()||isDeptMgr)?taskManagerItems(d.label):[],mgr=deptMgr||(hrs[0]?expectedManager(hrs[0],requestStage(hrs[0])):null),canView=systemOwner()||isDeptMgr||hrs.length>0;
 const rows=canView?hrs.map(r=>{
   const stage=requestStage(r),can=canManagerAct(r),m=expectedManager(r,stage);
   return `<div class="mgr28-item"><div class="mgr28-item-main"><span class="mgr28-kind">طلب موظف</span><b>${esc28(hrProTypeLabel(r.type))}</b><p>${esc28(r.employeeName)} · ${esc28(r.reason||'بدون ملاحظة')}</p><small>${esc28(r.createdDate||'')} · المدير: ${esc28(m?.name||r.manager||'غير محدد')}</small></div><div class="mgr28-item-actions"><button class="btn" onclick="hrProOpenRequestDetails('${esc28(r.id)}')">فتح التفاصيل</button>${can&&stage==='المدير المباشر'?`<button class="btn" onclick="MoshManagerApprovals28.quick('${esc28(r.id)}','rejected')">عدم الموافقة</button><button class="btn primary" onclick="MoshManagerApprovals28.quick('${esc28(r.id)}','approved')">موافقة</button>`:''}</div></div>`;
 }).join(''):'';
 const taskRows=canView?tasks.map(t=>`<div class="mgr28-item"><div class="mgr28-item-main"><span class="mgr28-kind task">مهمة للمراجعة</span><b class="mt54-task-name">${esc28(MoshTaskUI.title(t))}</b><span class="mt54-client-name">${esc28(t.customer||'بدون عميل')}</span><p>${esc28(t.assignee||'بدون منفذ')}</p><small>المهمة بانتظار مراجعة المدير</small></div><div class="mgr28-item-actions"><button class="btn" onclick="MoshManagerApprovals28.openTasks('${esc28(key)}')">فتح مهام جارية</button></div></div>`).join(''):'';
 const modal=document.createElement('div');modal.id='mgr28Modal';modal.className='mgr28-backdrop';
 modal.innerHTML=`<div class="mgr28-modal" dir="rtl"><header><div><span>قسم ${esc28(d.label)}</span><h2>اعتماد مدير القسم</h2><p>كل ما يحتاج قرار المدير قبل انتقاله للمرحلة التالية.</p></div><button class="btn" onclick="MoshManagerApprovals28.close()">إغلاق</button></header><div class="mgr28-summary"><div><strong>${hrs.length}</strong><span>طلبات موظفين</span></div><div><strong>${tasks.length}</strong><span>مهام للمراجعة</span></div><div><strong>${esc28(mgr?.name||'—')}</strong><span>مدير القسم</span></div></div>${!canView?`<div class="mgr28-note-box">هذه القائمة مخصصة لمدير القسم. لن تظهر تفاصيل الطلبات إلا للمدير المحدد أو مسؤول النظام.</div>`:''}<main>${rows}${taskRows||''}${canView&&!rows&&!taskRows?'<div class="mgr28-empty">لا يوجد شيء بحاجة لاعتماد مدير القسم حالياً.</div>':''}</main></div>`;
 modal.addEventListener('click',e=>{if(e.target===modal)close()});document.body.appendChild(modal);document.getElementById(`mgr28Tab_${key}`)?.classList.add('active');
}
function quick(id,decision){
 const r=arr(state.hrProRequests).find(x=>String(x.id)===String(id));if(!r)return;
 let note='';if(decision==='rejected'){note=prompt('سبب عدم الموافقة / ملاحظة المدير:','')||'';if(!clean(note))return;}
 else note=prompt('ملاحظة المدير (اختياري):','')||'';
 if(requestStage(r)==='المدير المباشر'&&directManagerDecision(id,decision,note)){refreshOpenManagerModal();try{if(document.getElementById('hrApp')?.classList.contains('active'))openHRPro('requests')}catch(e){}}
 else if(requestStage(r)!=='المدير المباشر')hrProOpenRequestDetails(id);
}
function refreshOpenManagerModal(){const active=document.querySelector('.mgr28-tab.active');if(!active)return;const key=active.id.replace('mgr28Tab_','');open(key);}

window.MoshManagerApprovals28={open,close,quick,refresh:refreshBadges,openTasks:openTaskQueue,countFor,version:'28.0'};
function init(){installTabs();try{hrProUpdateEmployeeServiceStatus()}catch(e){};setTimeout(installTabs,400);setTimeout(installTabs,1500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
setInterval(refreshBadges,5000);
new MutationObserver(()=>{clearTimeout(window.__mgr28t);window.__mgr28t=setTimeout(installTabs,80)}).observe(document.documentElement,{childList:true,subtree:true});
})();
