/* MOSH R24 administration. Server-backed screen; no mock employees, approvals,
 * purchasing records, report numbers or browser-only business transactions. */
(function(){
'use strict';
if(window.MoshAdministration24)return;
const enc=encodeURIComponent;
const safe=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const $=id=>document.getElementById(id);
const api=(url,options)=>window.MoshApi.request('/r24/admin'+url,options);
const uid=()=>String(window.MoshApi?.user?.id||'');
const textDate=v=>{if(!v)return '—';const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString('ar-SY',{hour12:false,dateStyle:'short',timeStyle:'short'})};
const getForm=form=>Object.fromEntries(new FormData(form).entries());
const req=()=>{const bytes=new Uint8Array(16);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);return 'r24-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')};
const labelStatus={working:'يعمل حالياً',break:'استراحة',no_work:'لا يوجد عمل',untracked:'حاضر بلا نشاط مسجّل',off:'خارج الدوام',unknown:'نشاط غير مؤكّد'};
const statusClass={working:'ok',break:'warn',no_work:'warn',untracked:'bad',off:'',unknown:'warn'};
const bt=(label,action,extra='',kind='')=>`<button type="button" class="r24-button ${kind}" data-r24="${safe(action)}" ${extra}>${label}</button>`;
const option=(v,label,active='')=>`<option value="${safe(v)}" ${String(v)===String(active)?'selected':''}>${safe(label)}</option>`;
const firstTab=['dashboard','employees','approvals','purchases'];
const S={active:'dashboard',overview:null,approvals:null,purchases:null,decisions:null,alerts:null,presets:null,report:null,
 employeeFilter:{q:'',dept:'',status:''},approvalFilter:{status:'mine',type:''},purchaseFilter:{q:'',status:''},
 reportFilters:{type:'tasks',department:'',employeeId:'',from:'',to:''},archiveFilter:'all',loading:false,busy:false,loaded:false,modal:null,
 signatureConfigured:false,accountId:'',open:false,taskView:'',policies:null,policyUsers:null,sealInfo:null};
function content(){return $('r24AdminRoot')}
// R36.1: Bootstrap returns User::document(), not effectivePermissions().
// Use the SAME permission resolver used by the sidebar. Server authorization is unchanged.
function roleCan(){
 const u=window.MoshApi?.user;if(!u||u.active===false)return false;
 if(typeof window.MoshAuth37?.canModule==='function')return !!window.MoshAuth37.canModule('admin','view');
 return u.isRoot===true||u.effectivePermissions?.modules?.admin?.view===true;
}
function setLoader(){const target=$('r24Page');if(target)target.innerHTML='<div class="r24-loading">جارٍ جلب بيانات الإدارة من النظام…</div>'}
function errorMessage(error){return error?.message||String(error)||'تعذر إتمام العملية.'}
function toast(str,bad=false){if(typeof window.note==='function')window.note(str,bad);else if(window.MoshUI19?.toast)window.MoshUI19.toast(str);else if(bad)window.alert(str);}
function showError(err){const target=$('r24Page');if(target)target.innerHTML=`<div class="r24-error">${safe(errorMessage(err))}</div>${bt('إعادة المحاولة','refresh')}`;}
async function post(path,payload){if(S.busy)throw new Error('عملية حفظ أخرى قيد التنفيذ.');S.busy=true;try{const result=await api(path,{method:'POST',body:{...payload,requestId:req()}});document.dispatchEvent(new CustomEvent('mosh:r24-admin-updated'));return result}finally{S.busy=false}}
function timesince(ms){const t=Number(ms);if(!t||t>Date.now()+120000)return '—';const m=Math.max(0,Math.floor((Date.now()-t)/60000));return `${Math.floor(m/60)} س ${m%60} د`}
function filterByState(list,status){return status?list.filter(x=>x.status===status):list}
function wrapTable(head,rows){return `<div class="r24-table-wrap"><table><thead><tr>${head.map(v=>`<th>${safe(v)}</th>`).join('')}</tr></thead><tbody>${rows.join('')||`<tr><td colspan="${head.length}" class="r24-empty">لا توجد بيانات وفق هذا الاختيار.</td></tr>`}</tbody></table></div>`}
function pill(v,kind=''){return `<span class="r24-pill ${kind}">${safe(v)}</span>`}
function nav(){const label=[['dashboard','لوحة التحكم'],['employees','متابعة الموظفين'],['approvals','الاعتمادات'],['purchases','متابعة المشتريات']];
 const count=(S.approvals?.items||[]).filter(x=>x.canDecide).length;
 return `<div class="r24-top"><div><div class="r24-eyebrow">قسم الإدارة</div><h1>${safe({dashboard:'لوحة التحكم',employees:'متابعة الموظفين',approvals:'الاعتمادات',purchases:'متابعة المشتريات',reports:'التقارير',decisions:'القرارات الإدارية',alerts:'التنبيهات الإدارية',archive:'الأرشيف'}[S.active]||'إدارة الشركة')}</h1><p class="r24-muted r24-mini">متصل ببيانات النظام · التعديلات تحفظ على السيرفر</p></div><div class="r24-actions">${bt('تحديث البيانات','refresh')}</div></div>
 <nav class="r24-tabs" aria-label="تبويبات الإدارة">${label.map(([id,t])=>`<button class="r24-tab" data-r24="go" data-view="${id}" aria-selected="${S.active===id}">${t}${id==='approvals'&&count?`<span class="r24-count">${count}</span>`:''}</button>`).join('')}
 <button type="button" class="r24-tab" data-r29="admin-tasks">مهام الإدارة</button><div class="r24-tools"><button class="r24-tab" data-r24="tools" aria-expanded="false">أدوات الإدارة ▾</button><div class="r24-menu" id="r24ToolsMenu" hidden>
 ${[['reports','التقارير'],['decisions','القرارات الإدارية'],['alerts','التنبيهات الإدارية'],['archive','أرشيف القرارات']].map(([id,t])=>`<button data-r24="go" data-view="${id}">${t}</button>`).join('')}
 <button type="button" data-r29="customers">متابعة أعمال العملاء</button><button type="button" data-r24="legacy-tab" data-target="Reports">التقارير التنفيذية</button><button type="button" data-r24="legacy-tab" data-target="Meetings">الاجتماعات والمحاضر</button><button data-r24="notice-form">إصدار تعميم أو تنبيه</button>
 <button data-r24="purchase-settings">مسارات اعتماد المشتريات</button>
 <button data-r24="seal-settings">ختم موش الرسمي</button>
 <button data-r24="open-notices">أرشيف التعاميم الموحد</button>
 </div></div></nav>`;
}
function dashboard(){const o=S.overview;
 if(!o)return '<div class="r24-loading">لا توجد بيانات.</div>';
 const c=o.totals||{},types=[['working','يعملون حالياً'],['break','استراحة'],['no_work','لا يوجد عمل'],['untracked','بدون نشاط مسجّل']];
 return `<div class="r24-grid">${types.map(([s,t])=>`<button type="button" class="r24-card r24-metric" data-r24="employee-status" data-status="${s}"><span class="r24-muted">${t}</span><b>${Number(c[s]||0)}</b><span class="r24-mini r24-muted">اضغط لعرض الموظفين ←</span></button>`).join('')}</div>
 <div class="r24-grid r24-section" style="grid-template-columns:repeat(2,minmax(0,1fr))"><button type="button" data-r24="go" data-view="approvals" class="r24-card r24-metric"><span class="r24-muted">طلبات الخصم والعقوبات بانتظار الإدارة</span><b>${o.pendingApprovals||0}</b></button>
 <button type="button" data-r24="go" data-view="alerts" class="r24-card r24-metric"><span class="r24-muted">ردود جديدة على التنبيهات</span><b>${o.newReplies||0}</b></button></div>
 <div class="r24-notice">${safe(o.sourceNote||'')} ويمكنك الاطلاع على جميع الموظفين حسب القسم أو الاسم ضمن «متابعة الموظفين».</div>`;
}
function employees(){const data=S.overview?.employees||[],f=S.employeeFilter;
 const depts=['',...new Set(data.map(x=>x.department).filter(Boolean))];
 return `<div class="r24-section-head"><h2>موظفو الشركة</h2><span class="r24-muted r24-mini">جميع الأقسام، مع البحث وتصفية الحالة</span></div>
 <div class="r24-toolbar"><label>بحث عن موظف<input data-r24-filter="q" value="${safe(f.q)}" placeholder="اسم الموظف…"></label><label>القسم<select data-r24-filter="dept">${depts.map(d=>option(d,d||'جميع الأقسام',f.dept)).join('')}</select></label><label>الحالة<select data-r24-filter="status">${option('','كل الحالات',f.status)}${Object.entries(labelStatus).map(([s,t])=>option(s,t,f.status)).join('')}</select></label></div>
 <div id="r24EmployeeList">${employeeRows()}</div>`;
}
function employeeRows(){const f=S.employeeFilter,list=(S.overview?.employees||[]).filter(x=>(!f.q||[x.name,x.department].join(' ').toLowerCase().includes(f.q.toLowerCase()))&&(!f.dept||x.department===f.dept)&&(!f.status||x.status===f.status));
 return wrapTable(['الموظف','القسم','الحالة الآن','المهمة الحالية','مدة النشاط','الإجراء'],list.map(x=>`<tr><td><b>${safe(x.name)}</b><div class="r24-mini r24-muted">${safe(x.jobTitle)}</div></td><td>${safe(x.department)}</td><td>${pill(labelStatus[x.status]||x.status,statusClass[x.status])}</td><td>${x.taskId?`<button data-r24="task" data-id="${safe(x.taskId)}" class="r24-button">${safe(x.taskTitle)}</button>`:safe(x.status==='off'?'—':labelStatus[x.status])}</td><td>${timesince(x.sinceAt)}</td><td>${x.status!=='off'&&(window.MoshAuth37?.canModule?.('admin','create')||window.MoshApi?.user?.isRoot)?bt('إرسال تنبيه','alert-form',`data-id="${safe(x.id)}"`):'—'}</td></tr>`));}
function approvals(){const f=S.approvalFilter,data=S.approvals?.items||[];
 const list=data.filter(x=>!f.type||x.source===f.type);
 return `<div class="r24-section-head"><h2>الاعتمادات الإدارية</h2><span class="r24-muted r24-mini">التفاصيل أولاً، ثم الموافقة أو الإرجاع</span></div>
 <div class="r24-toolbar"><label>عرض<select data-r24-approval="status">${option('mine','بانتظار موافقتك فقط',f.status)}${option('all','كل السجلات',f.status)}</select></label><label>النوع<select data-r24-approval="type">${option('','جميع الأنواع',f.type)}${option('disciplinary','خصم وعقوبة',f.type)}${option('purchase-managed','مشتريات بموافقات',f.type)}${option('purchase-legacy','مشتريات سابقة',f.type)}</select></label></div>
 ${wrapTable(['الطلب','القسم','مرحلة الاعتماد','الحالة','عرض'],list.map(x=>`<tr><td><b>${safe(x.title)}</b><div class="r24-muted r24-mini">${safe(x.requester)} · ${safe(x.id)}</div></td><td>${safe(x.department)}</td><td>${safe(x.stage)}</td><td>${pill(x.status==='pending_admin'?'بانتظار موافقتك':x.status)}</td><td>${bt('عرض التفاصيل','approval-detail',`data-id="${safe(x.id)}"`)}</td></tr>`))}
 <div class="r24-notice">يستمر اعتماد المشتريات الحالية عبر مساره الأصلي، مع الالتزام بالتحقق من المورد والطلب قبل الموافقة.</div>`;
}
function purchases(){const f=S.purchaseFilter,items=(S.purchases?.items||[]).filter(x=>(!f.q||[x.title,x.number,x.department].join(' ').toLowerCase().includes(f.q.toLowerCase()))&&(!f.status||x.stage===f.status));
 const statuses=['',...new Set((S.purchases?.items||[]).map(x=>x.stage).filter(Boolean))];
 return `<div class="r24-section-head"><h2>متابعة المشتريات</h2>${pill('اطلاع فقط','ok')}</div><div class="r24-toolbar"><label>بحث<input data-r24-purchase="q" value="${safe(f.q)}" placeholder="رقم أو وصف الطلب"></label><label>مرحلة الطلب<select data-r24-purchase="status">${statuses.map(s=>option(s,s||'جميع المراحل',f.status)).join('')}</select></label></div>
 <div id="r24PurchaseList">${wrapTable(['رقم الشراء','الطلب','القسم','المرحلة','المسؤول','تفاصيل'],items.map(x=>`<tr><td>${safe(x.number||x.id)}</td><td>${safe(x.title)}</td><td>${safe(x.department)}</td><td>${pill(x.stage,'warn')}</td><td>${safe(x.responsible||'غير معيّن')}</td><td>${bt('اطلاع','purchase-detail',`data-id="${safe(x.id)}"`)}</td></tr>`))}</div>`;
}
function reports(){const f=S.reportFilters,rs=S.report,pr=S.presets?.items||{};
 return `<div class="r24-section-head"><h2>التقارير</h2><span class="r24-muted">تقارير جاهزة أو تقرير حسب الفلترة، من سجلات النظام فقط</span></div>
 <form data-r24-submit="report" class="r24-card r24-report-controls"><label>نوع التقرير<select name="type">${[['tasks','المهام'],['employees','الموظفون'],['attendance','سجل الدوام'],['purchases','المشتريات'],['disciplinary','الخصومات والعقوبات']].map(([x,y])=>option(x,y,f.type)).join('')}</select></label>
 <label>القسم<input name="department" value="${safe(f.department)}" placeholder="كل الأقسام (حسب الصلاحيات)"></label><label>رقم الموظف (اختياري)<input name="employeeId" value="${safe(f.employeeId)}" placeholder="EMP/..."></label>
 <label>من تاريخ<input type="date" name="from" value="${safe(f.from)}"></label><label>إلى تاريخ<input type="date" name="to" value="${safe(f.to)}"></label>
 <div class="r24-actions" style="align-self:end"><button class="r24-button r24-primary" type="submit">إنشاء التقرير</button>${bt('حفظ التصفية','preset-form')}</div></form>
 <div class="r24-section r24-card"><h3>خيارات التصفية المحفوظة (خاصة بحسابي)</h3><div class="r24-actions" style="margin-top:10px">${Object.values(pr).map(p=>`${bt(safe(p.name),'preset-load',`data-id="${safe(p.id)}"`)}${bt('×','preset-delete',`data-id="${safe(p.id)}" title="حذف الفلترة"`,'r24-danger')}`).join('')||'<span class="r24-muted">لا توجد لديك خيارات تصفية محفوظة.</span>'}</div></div>
 ${rs?`<section class="r24-section"><div class="r24-section-head"><h2>نتيجة التقرير · ${rs.count} سجل</h2><div class="r24-actions">${bt('تصدير CSV / Excel','report-csv')}${bt('طباعة / PDF','report-print')}</div></div>${wrapTable(rs.columns,(rs.rows||[]).map(row=>'<tr>'+row.map(x=>`<td>${safe(x)}</td>`).join('')+'</tr>'))}<p class="r24-muted r24-mini">وقت استخراج البيانات: ${textDate(rs.generatedAt)}. الأرقام من السجلات الفعلية فقط.</p></section>`:''}`;
}
function decisionCode(d){return d.number||d.decisionNo||d.decisionNumber||d.orderNo||d.code||d.id||'—'}
function decisions(archive=false){const items=(S.decisions?.items||[]).filter(x=>!archive||S.archiveFilter==='all'||(S.archiveFilter==='active' ? x.status!=='cancelled' : x.status==='cancelled'));
 return `<div class="r24-section-head"><h2>${archive?'أرشيف القرارات':'القرارات الإدارية'}</h2><div>${archive?'<label>الحالة <select data-r24-archive-filter><option value="all" '+(S.archiveFilter==='all'?'selected':'')+'>جميع القرارات</option><option value="active" '+(S.archiveFilter==='active'?'selected':'')+'>السارية</option><option value="cancelled" '+(S.archiveFilter==='cancelled'?'selected':'')+'>الملغاة</option></select></label>':bt('إصدار قرار إداري','decision-form','', 'r24-primary')}</div></div>
 ${wrapTable(['الرقم الأصلي','الموضوع','المُصدر','تاريخ السريان','الحالة','الاطلاع'],items.map(d=>`<tr><td><b>${safe(decisionCode(d))}</b></td><td>${safe(d.title)}</td><td>${safe(d.owner||d.issuer||'—')}</td><td>${safe(d.effectiveDate||d.date||'—')}</td><td>${pill(d.status==='cancelled'?'ملغى':d.status||'محفوظ',d.status==='cancelled'?'bad':'ok')}</td><td>${bt('عرض القرار','decision-detail',`data-id="${safe(d.id)}"`)}</td></tr>`))}
 <div class="r24-notice">الأرقام القديمة تُعرض كما هي دون إعادة ترقيم. الرقم الجديد يتولد على السيرفر بعد قراءة الأرقام السابقة بنفس سنة الإصدار.</div>`;
}
function alerts(){const items=S.alerts?.items||[];
 return `<div class="r24-section-head"><h2>التنبيهات الإدارية</h2><span class="r24-muted">مراقبة الردود والتواصل مع الموظفين ومدراء الأقسام</span></div>
 ${wrapTable(['الموظف','القسم','نص التنبيه','الرد','السجل'],items.map(x=>`<tr><td>${safe(x.employeeName)}</td><td>${safe(x.department)}</td><td>${safe(x.message)}</td><td>${x.reply?pill('رد جديد',!x.replySeenAt?'warn':'ok'):'—'}</td><td>${bt('السجل','alert-detail',`data-id="${safe(x.id)}"`)}</td></tr>`))}`;
}
function render(){const root=content();if(!root)return;root.innerHTML=nav()+'<div id="r24Page"></div><div class="r24-modal-backdrop" id="r24Backdrop" hidden><section class="r24-dialog" role="dialog" aria-modal="true" aria-labelledby="r24ModalTitle"><div class="r24-dialog-title"><h2 id="r24ModalTitle"></h2><button type="button" data-r24="modal-close" class="r24-modal-close" aria-label="إغلاق">×</button></div><div id="r24ModalBody"></div></section></div>';
 renderPage();const n=$('r24ToolsMenu');if(n)n.hidden=true;
}
function renderPage(){const page=$('r24Page');if(!page)return;page.innerHTML=({dashboard,employees,approvals,purchases,reports,decisions,alerts,archive:()=>decisions(true)}[S.active]||dashboard)();
 const active=content()?.querySelector(`.r24-tab[data-view="${S.active}"]`);if(active)active.setAttribute('aria-selected','true');
}
const inFlight=new Map(), loadedAt=new Map(), latestFor=new Map(), loadedKey=new Map(), readControllers=new Map();
let requestGeneration=0, viewGeneration=0;
function cancelReads(){
 requestGeneration++;
 for(const rec of readControllers.values()){clearTimeout(rec.timer);rec.controller.abort();}
 readControllers.clear();inFlight.clear();
}
function clearLoaded(){
 cancelReads();loadedAt.clear();latestFor.clear();loadedKey.clear();
 S.overview=S.approvals=S.purchases=S.decisions=S.alerts=S.presets=null;
 S.report=null;S.signatureConfigured=false;S.policies=S.policyUsers=S.sealInfo=null;
}
function loadSpec(view){
 if(view==='dashboard'||view==='employees')return ['overview','/overview'];
 if(view==='approvals')return ['approvals','/approvals?status='+enc(S.approvalFilter.status)];
 if(view==='purchases')return ['purchases','/purchases'];
 if(view==='reports')return ['presets','/presets'];
 if(view==='decisions'||view==='archive')return ['decisions','/decisions'];
 if(view==='alerts')return ['alerts','/alerts'];
 return null;
}
async function load(view,force=false){
 const spec=loadSpec(view);if(!spec)return;
 const [key,path]=spec,who=uid(),generation=requestGeneration,requestKey=who+'|'+path;
 // A short, explicitly invalidated cache reduces repeated dashboard requests.
 if(!force&&S[key]&&loadedKey.get(key)===requestKey&&Date.now()-(loadedAt.get(requestKey)||0)<15000)return;
 if(inFlight.has(requestKey))return inFlight.get(requestKey);
 latestFor.set(key,requestKey);
 const work=(async()=>{try{
  const controller=new AbortController();let timedOut=false;
  const rec={controller,timer:setTimeout(()=>{timedOut=true;controller.abort();},20000)};
  readControllers.set(requestKey,rec);
  let result;
  try{result=await api(path,{signal:controller.signal});}
  catch(error){
   if(timedOut)throw Object.assign(new Error('تأخر رد بيانات الإدارة. يمكنك إعادة المحاولة أو الانتقال لقسم آخر.'),{status:408});
   throw error;
  }finally{clearTimeout(rec.timer);if(readControllers.get(requestKey)===rec)readControllers.delete(requestKey);}
  if(uid()!==who||requestGeneration!==generation||latestFor.get(key)!==requestKey)return;
  S[key]=result;loadedKey.set(key,requestKey);loadedAt.set(requestKey,Date.now());
 }catch(error){if(uid()!==who||requestGeneration!==generation)return;
  if(error.status===403)throw new Error('ليس لديك صلاحية الوصول إلى هذا القسم.');throw error;
 }})();
 inFlight.set(requestKey,work);
 try{return await work}finally{if(inFlight.get(requestKey)===work)inFlight.delete(requestKey)}
}
async function go(view,force=false){
 const ticket=++viewGeneration,who=uid();S.active=view;if(!content())return;
 render();const spec=loadSpec(view);if(spec&&(!S[spec[0]]||loadedKey.get(spec[0])!==who+'|'+spec[1]))setLoader();
 try{await load(view,force);if(ticket===viewGeneration&&who===uid()&&S.active===view&&$('adminApp')?.classList.contains('active'))renderPage();}
 catch(e){if(ticket===viewGeneration&&who===uid()&&S.active===view&&$('adminApp')?.classList.contains('active'))showError(e);}
}
function enter(){
 const app=$('adminApp');if(!app?.classList.contains('active')||!uid()||!roleCan())return;
 if(!app.classList.contains('r24-admin-mode'))app.classList.add('r24-admin-mode');
 const root=content();if(root)root.hidden=false;const back=$('r38AdminBack');if(back)back.hidden=true;
 if(S.accountId!==uid()){clearLoaded();S.accountId=uid();}
 S.open=true;S.taskView='';close();return go('dashboard');
}
function openTasks(mode){
 const app=$('adminApp'),root=content();
 if(!app?.classList.contains('active')||!root||!roleCan())return false;
 if(!['running','assign'].includes(mode)||!window.MoshAuth37?.canModule('admin',mode))return false;
 // The R24 shell hides all legacy children while its dashboard is active.
 // Cancel dashboard reads before revealing the existing task workspace.
 ++viewGeneration;cancelReads();close();S.open=true;S.taskView=mode;
 root.hidden=true;app.classList.remove('r24-admin-mode');
 if(mode==='running')window.openProductiveRunningTasksPage('admin');
 else window.MoshDepartmentDashboard.openAssignment('admin');
 const radio=$(mode==='running'?'adminTabRunning':'adminTabDistribution');
 if(radio)radio.checked=true;
 return true;
}
function modal(title,html){let host=$('r24Backdrop');if(!host)return;host.hidden=false;$('r24ModalTitle').textContent=title;$('r24ModalBody').innerHTML=html;
 S.modal={title};setTimeout(()=>host.querySelector('input:not([type=hidden]),textarea,select')?.focus(),10);
}
function close(){const b=$('r24Backdrop');if(b)b.hidden=true;S.modal=null}
function openLegacy(target){
 if(!['Reports','Meetings'].includes(target))return;
 const app=$('adminApp'),radio=$('adminTab'+target),root=content();if(!app||!radio||!root)return toast('لا تتوفر الواجهة المطلوبة حالياً.',true);
 root.hidden=true;app.classList.remove('r24-admin-mode');radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));
 let back=$('r38AdminBack');if(!back){back=document.createElement('button');back.type='button';back.id='r38AdminBack';back.className='btn';back.textContent='العودة إلى لوحة الإدارة';back.onclick=()=>{back.hidden=true;root.hidden=false;app.classList.add('r24-admin-mode');void go('dashboard');};app.prepend(back);}
 back.hidden=false;
}

function timeline(items){return `<div class="r24-timeline">${(items||[]).map(x=>`<div>${safe(typeof x==='string'?x:(x.label||x.action||x.text||''))} <span class="r24-muted">${textDate(x.at||x.time)}</span></div>`).join('')||'<span class="r24-muted">لا توجد تفاصيل مسجّلة.</span>'}</div>`}
async function taskDetails(id){const d=await api('/tasks/'+enc(id));modal('تفاصيل المهمة · اطلاع فقط',`<div class="r24-card"><h2>${safe(d.title)}</h2><p class="r24-muted">${safe(d.department)} · ${safe(d.assignee)} · ${safe(d.employeeState)}</p><p class="r24-pre">${safe(d.description||'')}</p></div><h3 style="margin:14px 0">محادثة المهمة</h3>${window.MoshChat34?window.MoshChat34.readOnlyHtml(d.workChat||[]):timeline((d.workChat||[]).map(x=>({action:`${x.by||x.sender||''}: ${x.text||x.message||''}`,at:x.time})))}<h3>المرفقات</h3><div class="r24-card">${(d.attachments||[]).map(x=>`<p>${safe(x.name||x.fileName||x.key||'مرفق')}</p>`).join('')||'لا توجد مرفقات'}</div>${bt('إغلاق','modal-close')}`)}
function alertForm(id){const e=(S.overview?.employees||[]).find(x=>x.id===id);if(!e)return;
 modal('تنبيه إداري · '+e.name,`<form data-r24-submit="send-alert" class="r24-form-grid"><input type="hidden" name="employeeId" value="${safe(id)}"><label>الجهة المستلمة<select name="target">${option('employee','الموظف نفسه')}${option('manager','مدير قسمه')}${option('both','الموظف ومديره')}</select></label><label class="wide">سبب التنبيه<textarea name="message" rows="4" required placeholder="اكتب الملاحظة التي تريد توثيقها"></textarea></label><div class="wide r24-muted">التنبيه إداري وليس عقوبة، ويمكن للموظف الرد مع حفظ كامل السجل.</div><div class="r24-form-actions wide"><button type="submit" class="r24-button r24-primary">إرسال التنبيه</button>${bt('إلغاء','modal-close')}</div></form>`)}
function alertDetail(id){const x=(S.alerts?.items||[]).find(y=>y.id===id);if(!x)return;
 modal('سجل التنبيه · '+x.employeeName,`<div class="r24-card"><p><b>نص التنبيه:</b> ${safe(x.message)}</p><p class="r24-muted">أُرسل بواسطة ${safe(x.sentByName)} · ${textDate(x.createdAt)}</p></div>${x.reply?`<div class="r24-notice"><b>رد الموظف:</b><p>${safe(x.reply)}</p><small>${textDate(x.replyAt)}</small></div>`:'<div class="r24-muted r24-section">لم يرد أي رد بعد.</div>'}${x.reply&&!x.replySeenAt?bt('تم الاطلاع على الرد','alert-seen',`data-id="${safe(id)}"`,'r24-primary'):''}${bt('إغلاق','modal-close')}`)}
function approvalDetail(id){const x=(S.approvals?.items||[]).find(y=>y.id===id);if(!x)return;
 modal('تفاصيل طلب الاعتماد',`<div class="r24-card"><h2>${safe(x.title)}</h2><p class="r24-muted">${safe(x.requester)} · ${safe(x.department)} · ${safe(x.stage)}</p><p class="r24-pre">${safe(x.reason||x.details||'')}</p><p><b>المبلغ:</b> ${safe(x.amount??'غير محدد')} ${safe(x.currency||'')}</p></div>
 <h3 style="margin:15px 0">الموافقات والسجل السابق</h3>${timeline(x.history)}<h3 style="margin:15px 0">المرفقات</h3><div class="r24-card">${(x.attachments||[]).map(f=>`<div>${safe(f.name||f.fileName||f.key||'مرفق')}</div>`).join('')||'لا يوجد مرفقات'}</div>
 ${x.canDecide?`<form class="r24-card" data-r24-submit="approval" data-id="${safe(id)}" style="margin-top:14px"><input type="hidden" name="version" value="${x._version}"><label>ملاحظة القرار / سبب الرفض<textarea name="note" rows="3"></textarea></label>${x.source==='purchase-managed' && x.stage==='اعتماد الشراء النهائي'?`<label>عرض المورد المراد اعتماده<select name="quoteId"><option value="">اختر العرض</option>${(x.quotes||[]).map(q=>option(q.id,(q.supplierName||q.supplierId||'المورد')+' — '+(q.reference||q.id))).join('')}</select></label>`:''}<div class="r24-form-actions"><button type="submit" name="decision" value="approve" class="r24-button r24-primary">موافقة</button>${x.source==='purchase-managed'?'<button type="submit" name="decision" value="return" class="r24-button">إعادة للتعديل</button>':''}<button type="submit" name="decision" value="reject" class="r24-button r24-danger">رفض</button></div></form>`:
 '<div class="r24-notice">'+(x.openInPurchasing?'هذا طلب شراء تابع لمسار المشتريات الأصلي. القرار من داخل قسم المشتريات حفاظاً على ضوابطه.':'هذا الطلب ليس بانتظار موافقتك.')+'</div>'}
 ${bt('إغلاق','modal-close')}`)}
function purchaseDetail(id){const x=(S.purchases?.items||[]).find(y=>y.id===id);if(!x)return;
 modal('متابعة شراء · اطلاع فقط',`<div class="r24-card"><h2>${safe(x.title)}</h2><p>${safe(x.department)} · ${safe(x.stage)}</p><p>المسؤول: ${safe(x.responsible||'—')}</p><p>المورد: ${safe(x.supplier||'لم يُحدّد')}</p><p>الكمية المطلوبة: ${safe(x.ordered??'—')} · المستلمة: ${safe(x.received??'غير متوفرة')}</p><p>المدفوع: ${safe(x.paid??'—')}</p></div><h3 style="margin:12px 0">سجل الحالة</h3>${timeline(x.history)}${bt('إغلاق','modal-close')}`)}
function decisionForm(id){const d=id?(S.decisions?.items||[]).find(x=>x.id===id):null;
 const pending=!!d?.pendingRevision;
 modal(d?'تعديل قرار إداري':'إصدار قرار إداري',`<form data-r24-submit="decision" data-id="${safe(id||'')}" class="r24-form-grid">
 <label class="wide">عنوان القرار<input name="title" required maxlength="200" value="${safe(pending?d.pendingRevision.title:d?.title||'')}"></label>
 <label class="wide">نص القرار<textarea name="body" rows="6" required>${safe(pending?d.pendingRevision.body:d?.body||'')}</textarea></label>
 <label>تاريخ السريان<input name="effectiveDate" type="date" required value="${safe(pending?d.pendingRevision.effectiveDate:d?.effectiveDate||new Date().toISOString().slice(0,10))}"></label>
 ${d?`<div class="r24-muted">رقم القرار الحالي: ${safe(decisionCode(d))} (لن يتغيّر)</div>`:'<label class="r24-checkbox"><input type="checkbox" name="notify" value="1">إبلاغ الموظفين (اختياري)</label>'}
 ${!d?'<label>المستلمون عند الإبلاغ<select name="recipientScope"><option value="all">كل الشركة</option><option value="department">قسم محدد</option><option value="employees">موظفون محددون</option></select></label><label>القسم عند اختياره<input name="recipientDepartment" placeholder="اسم القسم"></label><label class="wide">معرّفات الموظفين عند اختيار موظفين محددين (مفصولة بفاصلة)<input name="recipientIds" placeholder="EMP/00001, EMP/00002"></label>':''}
 <input type="hidden" name="version" value="${safe(d?d._version:0)}">
 <div class="r24-form-actions wide"><button type="submit" class="r24-button r24-primary">${d?'حفظ التعديل':'إصدار القرار'}</button>${bt('رجوع','modal-close')}</div></form>${d?.signature?'<div class="r24-notice">تعديل نص قرار موقّع يحفظ مسودة بانتظار إعادة التوقيع، والنسخة الأصلية تبقى سارية.</div>':''}`);
}
function decisionDetail(id){const d=(S.decisions?.items||[]).find(x=>x.id===id);if(!d)return;
 modal(`قرار إداري · ${decisionCode(d)}`,`<div class="r24-card"><h2>${safe(d.title)}</h2><p class="r24-muted">الرقم الأصلي: ${safe(decisionCode(d))}</p><p class="r24-muted">الإصدار: ${safe(d.date||d.issuedAt||'—')} · السريان: ${safe(d.effectiveDate||d.date||'—')}</p><p class="r24-pre">${safe(d.body||'')}</p><p>${pill(d.status==='cancelled'?'قرار ملغى':'قرار محفوظ',d.status==='cancelled'?'bad':'ok')}</p>${d.pendingRevision?'<p class="r24-notice">توجد نسخة معدلة تنتظر إعادة التوقيع. الأصل لا يزال سارياً.</p>':''}</div>
 ${timeline(d.history)}<div class="r24-form-actions">${bt('طباعة / PDF','decision-print',`data-id="${safe(id)}"`)}${d.status!=='cancelled'?`${bt('تعديل','decision-form',`data-id="${safe(id)}"`)}${bt('توقيع إلكتروني','decision-sign',`data-id="${safe(id)}"`)}${bt('إلغاء القرار','decision-cancel',`data-id="${safe(id)}"`,'r24-danger')}`:''}${bt('إغلاق','modal-close')}</div>`)}
function decisionSign(id){const d=(S.decisions?.items||[]).find(x=>x.id===id);if(!d)return;
 modal('تأكيد التوقيع الإلكتروني',`<form data-r24-submit="sign" data-id="${safe(id)}"><p class="r24-muted">تأكيد التوقيع يتطلب كلمة سر حسابك؛ لن تُحفظ ضمن القرار.</p><label>كلمة السر<input name="password" type="password" autocomplete="current-password" required></label><input name="version" type="hidden" value="${d._version}"><div class="r24-form-actions"><button class="r24-button r24-primary" type="submit">توقيع القرار</button>${bt('إدارة توقيعي','signature-setup')}</div></form>`)}
function decisionCancel(id){const d=(S.decisions?.items||[]).find(x=>x.id===id);if(!d)return;
 modal('إلغاء قرار · '+decisionCode(d),`<form data-r24-submit="cancel-decision" data-id="${safe(id)}"><p class="r24-muted">الإلغاء لا يمسح القرار أو أرقامه أو نسخه السابقة.</p><label>سبب الإلغاء<textarea name="reason" required minlength="3"></textarea></label><input name="version" type="hidden" value="${d._version}"><div class="r24-form-actions"><button class="r24-button r24-danger" type="submit">تأكيد إلغاء القرار</button>${bt('رجوع','modal-close')}</div></form>`)}
function signatureSetup(){modal('توقيعي الإلكتروني',`<p>ارسم توقيعك بالماوس أو القلم، أو ارفع صورة PNG. تغيير التوقيع لا يغيّر النسخ القديمة.</p><canvas class="r24-sign-canvas" id="r24SignatureCanvas" width="660" height="155"></canvas><div class="r24-actions" style="margin:12px 0">${bt('مسح الرسم','signature-clear')}<label>أو رفع PNG<input type="file" id="r24SignatureFile" accept="image/png"></label></div>
 <form data-r24-submit="signature"><label>تأكيد كلمة السر<input name="password" type="password" autocomplete="current-password" required></label><div class="r24-form-actions"><button class="r24-button r24-primary" type="submit">حفظ توقيعي</button>${bt('إغلاق','modal-close')}</div></form>`);
 const c=$('r24SignatureCanvas'),ctx=c?.getContext('2d');if(!ctx)return;ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#1e1e1e';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';let drawing=false;
 const pos=e=>{const b=c.getBoundingClientRect();return [(e.clientX-b.left)*c.width/b.width,(e.clientY-b.top)*c.height/b.height]};
 c.addEventListener('pointerdown',e=>{drawing=true;c.setPointerCapture(e.pointerId);const [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y)});
 c.addEventListener('pointermove',e=>{if(!drawing)return;const [x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke()});c.addEventListener('pointerup',()=>drawing=false);c.addEventListener('pointercancel',()=>drawing=false);
 $('r24SignatureFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(f.type!=='image/png'||f.size>140000){toast('ارفع صورة PNG بحجم أقل من 140 كيلوبايت.',true);return;}const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);const k=Math.min(c.width/im.width,c.height/im.height);ctx.drawImage(im,(c.width-im.width*k)/2,(c.height-im.height*k)/2,im.width*k,im.height*k)};im.src=fr.result};fr.readAsDataURL(f)});
}

const purApi=(path,options)=>window.MoshApi.request('/r24/purchasing'+path,options);
const sealApi=(path,options)=>window.MoshApi.request('/r24/stationery'+path,options);
function noticeForm(){modal('إصدار تعميم أو تنبيه',`<form data-r24-submit="notice" class="r24-form-grid"><label>نوع الرسالة<select name="type">${option('announcement','تعميم')}${option('alert','تنبيه')}</select></label><label>المستلمون<select name="targetType">${option('all','كل الشركة')}${option('department','قسم معين')}${option('employee','موظف واحد')}${option('employees','عدة موظفين')}</select></label><label class="wide">القسم أو أرقام الموظفين بحسب الاختيار<input name="targetValue" placeholder="اسم القسم أو رقم/أرقام الموظفين مفصولة بفاصلة"></label><label class="wide">العنوان<input name="title" maxlength="250" required></label><label class="wide">نص التعميم أو التنبيه<textarea name="message" rows="5" required></textarea></label><div class="r24-form-actions wide"><button type="submit" class="r24-button r24-primary">إصدار وإرسال</button>${bt('رجوع','modal-close')}</div></form>`)}
async function purchaseSettings(){
 const [p,u]=await Promise.all([purApi('/categories'),purApi('/approvers')]);
 S.policies=p;S.policyUsers=u.items||[];
 const userOptions=(id='')=>option('','بدون مدير',id)+S.policyUsers.map(x=>option(x.id,x.name+' · '+x.department,id)).join('');
 const policyRow=(d,i)=>`<fieldset data-r24-policy-row class="r24-card" style="margin:10px 0"><legend>نوع شراء ${i+1}</legend><div class="r24-form-grid"><label>رمز النوع<input name="categoryId" pattern="[a-zA-Z0-9_-]{2,48}" required maxlength="48" value="${safe(d.id||'')}"></label><label>الاسم<input name="categoryName" required value="${safe(d.name||'')}"></label><label><input type="checkbox" name="active" ${d.active!==false?'checked':''}> النوع فعّال</label><div class="wide"><b>اعتماد طلب عروض الأسعار — بالترتيب</b><div class="r24-form-grid">${[0,1,2].map(k=>`<label>المرحلة ${k+1}<select data-stage="quotation" data-step="${k}">${userOptions((d.quotationApprovers||[])[k])}</select></label>`).join('')}</div></div><div class="wide"><b>اعتماد الشراء النهائي — بالترتيب</b><div class="r24-form-grid">${[0,1,2].map(k=>`<label>المرحلة ${k+1}<select data-stage="purchase" data-step="${k}">${userOptions((d.purchaseApprovers||[])[k])}</select></label>`).join('')}</div></div>${bt('حذف النوع','policy-remove')}</div></fieldset>`;
 const rows=p.items||[];
 modal('إعداد أنواع الشراء وتسلسل الاعتمادات',`<p class="r24-muted">تغيير المسار هنا يؤثر على الطلبات الجديدة فقط، ولا يغيّر مراحل طلب بدأ اعتماده.</p><form data-r24-submit="purchase-policies" data-version="${p._version}"><div id="r24PolicyRows">${rows.map(policyRow).join('')}</div><div class="r24-form-actions">${bt('إضافة نوع شراء','policy-add')}<button type="submit" class="r24-button r24-primary">حفظ الإعدادات</button>${bt('إغلاق','modal-close')}</div></form>`);
 window.__r24PolicyRow=policyRow;
}
async function sealSettings(){
 const data=await sealApi('/seal');S.sealInfo=data;
 const approved=data.active;
 modal('ختم موش الرسمي',`<p class="r24-muted">تغيير الختم يحتاج موافقة المدير العام. الختم القديم يضل معتمداً لحد الموافقة.</p>${approved?`<div class="r24-card"><p>الختم الحالي: ${safe(approved.id)}</p><img src="${safe(approved.image)}" style="max-width:170px;max-height:130px" alt="الختم المعتمد"></div>`:'<p>لم يُعتمد ختم رسمي بعد.</p>'}
 ${data.canPropose?`<form data-r24-submit="seal-propose" class="r24-card"><h3>طلب تغيير الختم</h3><label>صورة الختم PNG<input type="file" name="sealFile" accept="image/png" required></label><label>سبب التغيير<textarea name="reason" required></textarea></label><label>تأكيد كلمة السر<input type="password" name="password" required></label><div class="r24-form-actions"><button class="r24-button r24-primary">إرسال الطلب للمدير العام</button></div></form>`:''}
 ${data.canApprove?`<h3>طلبات بانتظار موافقة المدير العام</h3>${(data.pending||[]).map(x=>`<div class="r24-card" style="margin-top:10px"><p>${safe(x.proposedBy)} · ${textDate(x.proposedAt)}</p>${x.image?`<img alt="الختم الجديد المقترح" src="${safe(x.image)}" style="max-width:170px;max-height:130px">`:''}<p>${safe(x.reason)}</p><div class="r24-form-actions">${bt('اعتماد','seal-decide',`data-id="${safe(x.id)}" data-version="${x._version}" data-decision="approve"`,'r24-primary')}${bt('رفض','seal-decide',`data-id="${safe(x.id)}" data-version="${x._version}" data-decision="reject"`,'r24-danger')}</div></div>`).join('')||'<p class="r24-muted">لا توجد طلبات تغيير معلّقة.</p>'}`:''}${bt('إغلاق','modal-close')}`);
}
function decisionPrintChoose(id){modal('طريقة طباعة القرار',`<p class="r24-muted">حدد شكل التوقيع والختم على النسخة المطبوعة.</p><div class="r24-form-actions">${bt('توقيع وختم إلكتروني','decision-print-mode',`data-id="${safe(id)}" data-mode="electronic"`,'r24-primary')}${bt('مكان للتوقيع والختم اليدوي','decision-print-mode',`data-id="${safe(id)}" data-mode="manual"`)}</div>`)}
function presetForm(){modal('حفظ التصفية باسم',`<form data-r24-submit="preset"><label>اسم الفلترة<input name="name" required maxlength="150" placeholder="مثلاً: تقرير مهام التصميم الشهري"></label><div class="r24-form-actions"><button type="submit" class="r24-button r24-primary">حفظ التصفية لحسابي</button>${bt('إلغاء','modal-close')}</div></form>`)}
function exportCsv(){const r=S.report;if(!r)return;const quote=t=>'"'+String(t??'').replace(/"/g,'""')+'"',rows=[r.columns,...r.rows].map(row=>row.map(quote).join(',')).join('\r\n');
 const link=document.createElement('a'),blob=new Blob(['\ufeff',rows],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob);link.href=url;link.download='MOSH_R24_Report_'+new Date().toISOString().slice(0,10)+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function printMarkup(title,markup){const w=window.open('','_blank','width=1000,height=720');if(!w){toast('اسمح بفتح نافذة الطباعة من المتصفح.');return}w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${safe(title)}</title><style>body{font:16px Arial,Tahoma,sans-serif;margin:40px;color:#111}h1{border-bottom:2px solid #c2a04e;padding-bottom:15px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:8px;text-align:right}p{line-height:1.9}footer{margin-top:80px;border-top:1px solid #ddd;padding-top:12px;text-align:center}</style></head><body><h1>MOSH GROUP — ${safe(title)}</h1>${markup}<footer>نظام موش · طباعة معلومات النظام</footer></body></html>`);w.document.close();w.focus();w.print()}
function reportPrint(){const r=S.report;if(!r)return;printMarkup('تقرير '+r.type,`<p>القسم: ${safe(r.department||'جميع الأقسام')} · تاريخ التقرير: ${textDate(r.generatedAt)}</p><table><thead><tr>${r.columns.map(c=>`<th>${safe(c)}</th>`).join('')}</tr></thead><tbody>${r.rows.map(row=>'<tr>'+row.map(x=>`<td>${safe(x)}</td>`).join('')+'</tr>').join('')}</tbody></table>`)}
function decisionPrint(id,mode='manual'){const d=(S.decisions?.items||[]).find(x=>x.id===id);if(!d)return;printMarkup('قرار إداري رقم '+decisionCode(d),`<p>الإصدار: ${safe(d.date||d.issuedAt||'—')} · السريان: ${safe(d.effectiveDate||d.date||'—')}</p><h2>${safe(d.title)}</h2><p style="white-space:pre-wrap">${safe(d.body||'')}</p><p>المصدر: ${safe(d.owner||'—')}</p>${mode==='electronic'&&d.signature?.imageDataUrl?`<img src="${safe(d.signature.imageDataUrl)}" alt="توقيع المدير" style="width:180px;height:80px;object-fit:contain">`:'<p>توقيع المدير: ___________________</p>'}${mode==='electronic'&&d.sealSnapshot?.image?`<img src="${safe(d.sealSnapshot.image)}" alt="ختم موش المعتمد عند توقيع القرار" style="width:150px;height:110px;object-fit:contain">`:'<p>ختم الشركة: ___________________</p>'}${d.status==='cancelled'?'<h2>قرار ملغى</h2>':''}`)}
async function onSubmit(e){const form=e.target.closest('[data-r24-submit]');if(!form)return;e.preventDefault();const action=form.dataset.r24Submit,v=getForm(form),id=form.dataset.id||'';if(S.busy)return;
 const button=e.submitter;if(button)button.disabled=true;
 try{
 if(action==='notice'){await post('/notices',{type:v.type,title:v.title,message:v.message,targetType:v.targetType,targetValue:v.targetValue||''});close();toast('تم إرسال التعميم أو التنبيه ضمن الأرشيف الموحد.');}
 else if(action==='purchase-policies'){
    const items=[...form.querySelectorAll('[data-r24-policy-row]')].map(row=>{const chain=stage=>[...row.querySelectorAll('[data-stage="'+stage+'"]')].map(x=>x.value).filter(Boolean);return{id:row.querySelector('[name=categoryId]').value,name:row.querySelector('[name=categoryName]').value,active:row.querySelector('[name=active]').checked,quotationApprovers:chain('quotation'),purchaseApprovers:chain('purchase')}});
    await purApi('/categories',{method:'POST',body:{items,version:Number(form.dataset.version),requestId:req()}});close();toast('تم حفظ مسارات اعتماد الشراء الجديدة.');
 }
 else if(action==='seal-propose'){
    const image=await new Promise((resolve,reject)=>{const file=form.querySelector('[name=sealFile]').files?.[0];if(!file||file.type!=='image/png'||file.size>150000){reject(new Error('ارفع صورة PNG أقل من 150 كيلوبايت.'));return;}const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('تعذر قراءة الختم.'));reader.readAsDataURL(file)});
    await sealApi('/seal/propose',{method:'POST',body:{image,reason:v.reason,password:v.password,requestId:req()}});await sealSettings();toast('أُرسل طلب اعتماد الختم.');
 }
 if(action==='send-alert'){await post('/alerts',{employeeId:v.employeeId,target:v.target,message:v.message});await load('alerts',true);close();toast('تم إرسال التنبيه وتوثيقه.');}
 else if(action==='approval'){const decision=e.submitter?.value||'';if(!['approve','reject','return'].includes(decision))throw new Error('حدد قرار الموافقة أو الرفض.');if(['reject','return'].includes(decision)&&!v.note.trim())throw new Error('اكتب سبب الرفض.');const row=(S.approvals?.items||[]).find(x=>x.id===id);if(row?.source==='purchase-managed'){await purApi('/requests/'+enc(id)+'/decision',{method:'POST',body:{action:decision,note:v.note,quoteId:v.quoteId||null,version:Number(v.version),requestId:req()}})}else{await post('/approvals/disciplinary/'+enc(id),{decision,note:v.note,version:Number(v.version)})}close();S.approvals=null;S.overview=null;await go('approvals',true);toast('تم حفظ قرار الاعتماد.');}
 else if(action==='report'){S.reportFilters={type:v.type,department:v.department,employeeId:v.employeeId,from:v.from,to:v.to};const qs=new URLSearchParams(Object.entries(S.reportFilters).filter(([,v])=>v));S.report=await api('/reports?'+qs);renderPage();}
 else if(action==='preset'){await post('/presets',{name:v.name,filters:S.reportFilters});S.presets=await api('/presets');close();renderPage();toast('حُفظت الفلترة باسمك.');}
 else if(action==='decision'){const data={title:v.title,body:v.body,effectiveDate:v.effectiveDate};if(id){data.version=Number(v.version);await post('/decisions/'+enc(id)+'/edit',data)}else{data.notify=!!v.notify;data.recipientScope=v.recipientScope||'employees';data.recipientDepartment=v.recipientDepartment||'';data.recipientIds=(v.recipientIds||'').split(',').map(x=>x.trim()).filter(Boolean);await post('/decisions',data)}S.decisions=await api('/decisions');close();renderPage();toast('حُفظ القرار.');}
 else if(action==='sign'){await post('/decisions/'+enc(id)+'/sign',{password:v.password,version:Number(v.version)});S.decisions=await api('/decisions');close();renderPage();toast('تم توثيق التوقيع على النسخة الحالية.');}
 else if(action==='cancel-decision'){await post('/decisions/'+enc(id)+'/cancel',{reason:v.reason,version:Number(v.version)});S.decisions=await api('/decisions');close();renderPage();toast('أُلغي القرار مع الاحتفاظ بأرشيفه.');}
 else if(action==='signature'){const c=$('r24SignatureCanvas');if(!c)throw new Error('لم يتوفر حقل الرسم.');let data=c.toDataURL('image/png');if(data.length>208000)throw new Error('حجم التوقيع كبير. أعد الرسم بشكل أبسط.');await post('/signature',{image:data,password:v.password});close();toast('تم حفظ توقيعك داخل حسابك.');}
 }catch(err){toast(errorMessage(err),true)}finally{if(button)button.disabled=false;}
}
async function onClick(e){const b=e.target.closest('[data-r24]');if(!b||!content()?.contains(b))return;
 const action=b.dataset.r24,id=b.dataset.id||'';
 if(action==='tools'){e.stopPropagation();const m=$('r24ToolsMenu');m.hidden=!m.hidden;b.setAttribute('aria-expanded',String(!m.hidden));return}
 if(action==='modal-close'){close();return}
 if(action==='go'){await go(b.dataset.view);return}
 if(action==='legacy-tab'){openLegacy(b.dataset.target);return}
 if(action==='employee-status'){S.employeeFilter.status=b.dataset.status;S.employeeFilter.q='';S.employeeFilter.dept='';await go('employees');return}
 if(action==='refresh'){S[S.active==='dashboard'||S.active==='employees'?'overview':S.active]=null;await go(S.active,true);return}
 if(action==='open-notices'){if(typeof window.openHRPro==='function')window.openHRPro('communications');else toast('افتح قسم الموارد البشرية للوصول إلى التعاميم.');return}
 try{
 if(action==='task')await taskDetails(id);
 else if(action==='alert-form')alertForm(id);
 else if(action==='alert-detail')alertDetail(id);
 else if(action==='alert-seen'){await post('/alerts/'+enc(id)+'/seen',{});S.alerts=await api('/alerts');S.overview=null;close();renderPage()}
 else if(action==='approval-detail')approvalDetail(id);
 else if(action==='purchase-detail')purchaseDetail(id);
 else if(action==='decision-form')decisionForm(id);
 else if(action==='decision-detail')decisionDetail(id);
 else if(action==='decision-sign')decisionSign(id);
 else if(action==='decision-cancel')decisionCancel(id);
 else if(action==='signature-setup')signatureSetup();
 else if(action==='signature-clear'){const c=$('r24SignatureCanvas');const ctx=c?.getContext('2d');if(ctx){ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height)}}
 else if(action==='decision-print')decisionPrintChoose(id);
 else if(action==='decision-print-mode'){decisionPrint(id,b.dataset.mode||'manual');close()}
 else if(action==='notice-form')noticeForm();
 else if(action==='purchase-settings')await purchaseSettings();
 else if(action==='seal-settings')await sealSettings();
 else if(action==='policy-add'){document.getElementById('r24PolicyRows')?.insertAdjacentHTML('beforeend',window.__r24PolicyRow?.({active:true,quotationApprovers:[],purchaseApprovers:[]},document.querySelectorAll('[data-r24-policy-row]').length)||'')}
 else if(action==='policy-remove')b.closest('[data-r24-policy-row]')?.remove();
 else if(action==='seal-decide'){if(!confirm(b.dataset.decision==='approve'?'اعتماد الختم الجديد رسمياً؟':'رفض تغيير الختم؟'))return;await sealApi('/seal/proposals/'+enc(id)+'/decision',{method:'POST',body:{decision:b.dataset.decision,version:Number(b.dataset.version),requestId:req()}});await sealSettings();toast('تم حفظ قرار الختم.')}
 else if(action==='report-print')reportPrint();
 else if(action==='report-csv')exportCsv();
 else if(action==='preset-form')presetForm();
 else if(action==='preset-load'){const p=S.presets?.items?.[id];if(!p)return;S.reportFilters={...S.reportFilters,...p.filters};renderPage();}
 else if(action==='preset-delete'){if(!confirm('هل تريد حذف هذه التصفية من حسابك فقط؟'))return;await post('/presets/'+enc(id)+'/delete',{});S.presets=await api('/presets');renderPage()}
 }catch(err){toast(errorMessage(err),true)}
}
function filter(e){const el=e.target;if(!content()?.contains(el))return;
 if(el.dataset.r24Filter){S.employeeFilter[el.dataset.r24Filter]=el.value;if($('r24EmployeeList'))$('r24EmployeeList').innerHTML=employeeRows();return}
 if(el.dataset.r24Approval){S.approvalFilter[el.dataset.r24Approval]=el.value;if(el.dataset.r24Approval==='status'){S.approvals=null;void go('approvals',true)}else renderPage();return}
 if(el.matches('[data-r24-archive-filter]')){S.archiveFilter=el.value;renderPage();return;}
 if(el.dataset.r24Purchase){S.purchaseFilter[el.dataset.r24Purchase]=el.value;if(el.dataset.r24Purchase==='status')renderPage();else if($('r24PurchaseList')){
   const q=el.selectionStart;renderPage();const next=content()?.querySelector('[data-r24-purchase="q"]');if(next){next.focus();try{next.setSelectionRange(q,q)}catch(_){}}}
 }
}
function install(){const app=$('adminApp');if(!app)return;
 if(!content()){const r=document.createElement('div');r.id='r24AdminRoot';r.setAttribute('dir','rtl');app.insertBefore(r,app.firstChild);r.addEventListener('click',e=>void onClick(e));r.addEventListener('submit',e=>void onSubmit(e));r.addEventListener('input',filter);r.addEventListener('change',filter);
 document.addEventListener('click',event=>{if(!event.target.closest('#r24AdminRoot .r24-tools')){$('r24ToolsMenu')?.setAttribute('hidden','')}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape' && S.modal){event.stopPropagation();close()}});
 }
 // The explicit section-entry event also covers clicking the already-active section.
 const activate=()=>{
  if(!app.classList.contains('active')){
   if(S.open){S.open=false;++viewGeneration;cancelReads();close();}
   return;
  }
  if(!roleCan()){
   if(S.open||S.accountId!==uid()){S.open=false;S.accountId=uid();++viewGeneration;clearLoaded();close();}
   // Never mutate the observed class with the same value: that caused an
   // infinite microtask loop. Keep legacy panels hidden and remove stale data.
   if(!app.classList.contains('r24-admin-mode'))app.classList.add('r24-admin-mode');
   const root=content();if(root&&!root.querySelector('[data-r361-access-denied]'))
    root.innerHTML='<div class="r24-error" data-r361-access-denied role="alert">لا تملك صلاحية عرض قسم الإدارة. يمكنك الانتقال إلى أحد الأقسام المتاحة لحسابك.</div>';
   return;
  }
  if(!S.open)void enter();
 };
 const obs=new MutationObserver(activate);obs.observe(app,{attributes:true,attributeFilter:['class']});activate();
 document.addEventListener('mosh:section-enter',e=>{if(e.detail?.app==='admin')void enter();});
 for(const event of ['mosh:session-expired','mosh:logout-complete'])document.addEventListener(event,()=>{
  S.open=false;S.accountId='';++viewGeneration;clearLoaded();close();
  if(content())content().replaceChildren();app.classList.remove('r24-admin-mode');
 });
 document.addEventListener('mosh:refreshed',()=>{clearLoaded();if(app.classList.contains('active')){if(roleCan()){if(S.taskView)openTasks(S.taskView);else void go(S.active,true);}else activate();}});
 document.addEventListener('mosh:permissions-applied',activate);
 document.addEventListener('mosh:r24-admin-updated',()=>{clearLoaded();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.MoshAdministration24={open:()=>{window.goApp?.('admin')},openAlert:async(id)=>{if(await window.goApp?.('admin')===false)return;await go('alerts',true);if(id)alertDetail(id)},refresh:()=>S.taskView?openTasks(S.taskView):go(S.active,true),enter,openTasks,version:'r36.2-admin-task-navigation'};
})();
