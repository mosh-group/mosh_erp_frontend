(function(){
'use strict';
if(window.MoshEmployeeTasks41)return;
const arr=v=>Array.isArray(v)?v:[];
const norm=v=>{try{return typeof normalizeStaffName==='function'?String(normalizeStaffName(v||'')).trim().toLowerCase().replace(/\s+/g,' '):String(v==null?'':v).trim().toLowerCase().replace(/\s+/g,' ')}catch(e){return String(v==null?'':v).trim().toLowerCase().replace(/\s+/g,' ')}};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function account(){try{return window.MoshAuth37?.current?.()||null}catch(e){return null}}
function appState(){try{return typeof state!=='undefined'?state:null}catch(e){return null}}
function appUser(){try{return typeof currentUser!=='undefined'?currentUser:null}catch(e){return null}}
function linkedProfile(){
 const u=account(),cu=appUser();
 try{
  const staff=arr(appState()?.staffProfiles);
  if(u?.employeeId)return staff.find(x=>String(x?.id)===String(u.employeeId))||null;
  if(cu?.employeeId||cu?.staffId){const id=String(cu?.employeeId||cu?.staffId);const p=staff.find(x=>String(x?.id)===id||String(x?.employeeNo||'')===id);if(p)return p;}
  const names=[u?.name,u?.username,cu?.name,cu?.username,cu?.email].filter(Boolean).map(norm);
  for(const n of names){const p=staff.find(x=>norm(x?.name)===n||norm(x?.username)===n||norm(x?.email)===n||norm(x?.systemUsername)===n);if(p)return p;}
 }catch(e){}
 return null;
}
const legacyProfile=typeof window.hrProCurrentProfile==='function'?window.hrProCurrentProfile:null;
window.hrProCurrentProfile=function(){const p=linkedProfile();if(p)return p;try{return typeof legacyProfile==='function'?legacyProfile.apply(this,arguments):null}catch(e){return null}};
function tokens(){
 const u=account(),p=linkedProfile(),cu=appUser(),ids=new Set(),names=new Set();
 (u?.employeeId?[u.employeeId]:[cu?.employeeId,cu?.staffId,p?.id,p?.employeeNo]).filter(Boolean).forEach(x=>ids.add(String(x)));
 [p?.name,p?.username,p?.email,p?.systemUsername,u?.name,u?.username,cu?.name,cu?.username,cu?.email].filter(Boolean).forEach(x=>names.add(norm(x)));
 return {u,p,ids,names};
}
function matchValue(v,tk){
 if(v==null)return false;
 if(typeof v==='object')return ['id','employeeId','assigneeId','assignedToId','assignedEmployeeId','staffId','employeeNo','name','employeeName','assignee','username','email'].some(k=>v[k]!=null&&matchValue(v[k],tk));
 const raw=String(v).trim(),n=norm(raw);return tk.ids.has(raw)||tk.names.has(n);
}
function assignedValues(t){
 const out=[];
 ['assigneeId','employeeId','assignedToId','assignedEmployeeId','staffId','assignee','assignedTo','assigneeName','employeeName','worker','workerName','sharedTeamLead'].forEach(k=>{if(t?.[k]!=null&&t[k]!=='')out.push(t[k])});
 ['assignees','assignedEmployees','employees','team','members'].forEach(k=>arr(t?.[k]).forEach(x=>out.push(x)));
 return out;
}
function isMine(t){if(!t)return false;const tk=tokens();
 // Server-filtered rows only. Explicit assignment wins over old names/worker history.
 if(Object.prototype.hasOwnProperty.call(t,'assigneeId'))return !!String(t.assigneeId||'')&&tk.ids.has(String(t.assigneeId));
 if(t.employeeId)return tk.ids.has(String(t.employeeId));
 // Compatibility for genuinely old name-only records already authorized by the API.
 const values=[t.assignee,t.assignedTo,t.assigneeName].filter(Boolean);return values.some(v=>matchValue(v,tk));
}
function isVisibleOpen(t){if(!t)return false;const st=norm(t.status),es=norm(t.employeeState);return !['completed','cancelled','canceled','deleted','done','archived','archived_invoiced','archived_no_invoice','invoiced','awaiting_invoice','منتهية','ملغاة'].includes(st)&&!['finished','completed','done','منتهية'].includes(es)}
function syncAssigneeIds(){return false;/* R36: only explicit server assignments may change employee IDs. */}
function mine(){return arr(appState()?.salesTasks).filter(t=>isMine(t)&&isVisibleOpen(t))}

function openTask(id){
 const t=arr(appState()?.salesTasks).find(x=>String(x?.id)===String(id));if(!t||!isMine(t))return false;
 try{if(typeof hrProCloseModal==='function')hrProCloseModal()}catch(e){}
 try{
  const depMap={'الإدارة':'admin','الموارد البشرية':'hr','المبيعات':'sales','التسويق':'marketing','السوشال ميديا':'social','السوشل ميديا':'social','قسم السوشال ميديا':'social','التصميم':'design','التصوير':'photo','المونتاج':'editing','الترويج':'promotion','اللوجستيات':'logistics','المشتريات':'purchases','المحاسبة':'accounting','المستودعات العامة':'warehouses','MOSH MEDIA':'platform'};
  const accountApp=window.MoshAuth37?.departmentApp?.()||'';
  let app=depMap[String(t.sharedDepartment||t.department||'').trim()]||accountApp||'';
  // For an employee in "my tasks only" mode, always open the task inside an allowed department shell.
  // Some shared tasks keep department='المهمات', so fall back to the account's own department.
  if(app&&window.MoshAuth37?.canModule&&window.MoshAuth37.canModule(app,'view')===false&&accountApp)app=accountApp;
  if(app){
    if(window.MoshPages?.pending(app))return window.MoshPages.open(app,()=>openTask(id));
   try{if(typeof window.goApp==='function')window.goApp(app)}catch(e){console.warn('v46 goApp before task details',e)}
   setTimeout(()=>{
    try{
     const sec=document.getElementById(app+'App');
     if(sec){
      sec.classList.remove('auth38-task-only');
      const host=sec.querySelector(':scope > [data-auth38-host="'+app+'"]');
      if(host)host.style.display='none';
      [...sec.children].forEach(ch=>{if(ch!==host)ch.style.display=''});
     }
     const content=document.getElementById(app+'AppContent');if(content)content.style.display='block';
     if(typeof window.openProductiveTaskDetails==='function'){
      window.openProductiveTaskDetails(app,t.id,'running');if(sec)sec.dataset.r36EmployeeTask=String(t.id);
      setTimeout(()=>{try{if(content)content.style.display='block';const host=sec?.querySelector(':scope > [data-auth38-host="'+app+'"]');if(host)host.style.display='none'}catch(e){}},0);
      return;
     }
     // Legacy fallback: only use the global task details route when no departmental renderer exists.
     if(typeof openTaskDetailsFromAll==='function')openTaskDetailsFromAll(t.id);
     else if(typeof openTaskDetails==='function')openTaskDetails(t.id);
    }catch(e){console.error('v46 employee task open failed',e);try{toast('تعذر فتح تفاصيل المهمة.',true)}catch(_){} }
   },80);
   return true;
  }
  if(typeof openTaskDetailsFromAll==='function')return openTaskDetailsFromAll(t.id);
  if(typeof openTaskDetails==='function')return openTaskDetails(t.id);
 }catch(e){console.error(e)}return false;
}
function showMine(pageNo=1){
 if(window.MoshTaskInbox49)return MoshTaskInbox49.showList('all',pageNo);
 const rows=mine(),pages=Math.max(1,Math.ceil(rows.length/20)),page=Math.max(1,Math.min(pages,Number(pageNo)||1));
 if(typeof hrProShowModal!=='function')return false;
 hrProShowModal('<div class="hr-pro-modal-head"><div><h3>مهامي</h3><p>المهام المسندة إليك فقط · '+rows.length+' مهمة مفتوحة</p></div><button type="button" class="hr-pro-modal-close" onclick="hrProCloseModal()">×</button></div><div class="hr-pro-modal-body"><div class="hr-pro-table-wrap"><table class="hr-pro-table"><thead><tr><th>المهمة</th><th>العميل</th><th>القسم</th><th>الموعد</th><th>الحالة</th><th></th></tr></thead><tbody>'+(rows.slice((page-1)*20,page*20).map(t=>'<tr><td>'+MoshTaskUI.nameHtml(t)+'</td><td>'+MoshTaskUI.clientHtml(t)+'</td><td>'+esc(t.sharedDepartment||t.department||'—')+'</td><td>'+esc(t.dueDate||'غير محدد')+'</td><td>'+esc(typeof workflowEmployeeLabel==='function'?workflowEmployeeLabel(t):t.employeeState||t.status||'—')+'</td><td><button type="button" class="btn" data-v41-open-task="'+esc(t.id)+'">فتح</button></td></tr>').join('')||'<tr><td colspan="6"><div class="hr-pro-empty">لا توجد مهام مفتوحة مسندة إليك.</div></td></tr>')+'</tbody></table></div></div><div class="hr-pro-modal-foot"><button type="button" class="btn" onclick="MoshEmployeeTasks41.showMine('+(page-1)+')" '+(page<=1?'disabled':'')+'>السابق</button><span>'+page+' / '+pages+'</span><button type="button" class="btn" onclick="MoshEmployeeTasks41.showMine('+(page+1)+')" '+(page>=pages?'disabled':'')+'>التالي</button><button type="button" class="btn" onclick="hrProCloseModal()">إغلاق</button></div>');
 return true;
}
function refreshHomeTask(){
 if(window.MoshTaskInbox49)return MoshTaskInbox49.renderHome();
 if(!document.getElementById('dashboardApp')?.classList.contains('active'))return;
 const rows=mine(),active=rows.find(t=>t.employeeState==='working')||rows.find(t=>t.employeeState==='paused')||rows[0]||null;
 const count=document.getElementById('es11TaskCount'),title=document.getElementById('es11TaskTitle'),sub=document.getElementById('es11TaskSub');
 if(count)count.textContent=rows.length?rows.length+' مهمة خاصة بك':'لا توجد مهام حالياً';
 if(title){title.textContent=active?(active.title||active.name||'مهمة بدون عنوان'):'لا توجد مهمة مسندة إليك';title.dataset.v41TaskId=active?String(active.id):'';title.style.cursor=active?'pointer':'';title.title=active?'فتح تفاصيل المهمة':'';}
 if(sub)sub.textContent=active?[(active.customer||''),(active.sharedDepartment||active.department||''),active.employeeState==='working'?'قيد التنفيذ':active.employeeState==='paused'?'متوقفة مؤقتاً':'بانتظار المتابعة'].filter(Boolean).join(' · '):'تظهر هنا المهام المسندة إليك فقط';
}
function reconcile(){
 const u=account();if(!u)return;
 try{const cu=appUser();if(cu){cu.employeeId=u.employeeId||'';cu.staffId=u.employeeId||''}}catch(e){}
 refreshHomeTask();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-v41-open-task]');if(b){e.preventDefault();e.stopImmediatePropagation();openTask(b.dataset.v41OpenTask);return;}
 const title=e.target.closest('#es11TaskTitle');if(title?.dataset.v41TaskId){e.preventDefault();e.stopImmediatePropagation();openTask(title.dataset.v41TaskId);}
},true);
window.MoshEmployeeTasks41={version:'41',profile:linkedProfile,mine,isMine,showMine,openTask,reconcile,syncAssigneeIds};
setTimeout(()=>{reconcile();try{if(window.MoshEmployeeView11)window.MoshEmployeeView11.showMyTasks=showMine}catch(e){}},0);
setInterval(()=>{reconcile();try{if(window.MoshEmployeeView11&&window.MoshEmployeeView11.showMyTasks!==showMine)window.MoshEmployeeView11.showMyTasks=showMine}catch(e){}},1500);
})();
