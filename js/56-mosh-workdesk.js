/* MOSH Workdesk R2. Central employee controls; confirmed existing /transactions.
   Historical accounting consumes optional workday data from GET /dashboard.
   No inferred attendance, browser business persistence, or optimistic counters. */
(function(){
'use strict';
const M=window.MoshWorkdayModel50,R=window.MoshReceiptModel49,A=window.MoshApi;
if(!M||!R||!A)return;
const $=id=>document.getElementById(id),arr=v=>Array.isArray(v)?v:[],txt=v=>String(v==null?'':v).trim();
const esc=v=>txt(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={play:'<path d="m8 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',cup:'<path d="M4 8h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4ZM16 9h2a3 3 0 0 1 0 6h-2M8 2v3M12 2v3"/>',bag:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M9 13h6"/>',check:'<path d="m4 12 5 5L20 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>'};
Object.assign(icons,{
 laptop:'<rect x="4" y="3" width="16" height="12" rx="2"/><path d="m4 15-2 5h20l-2-5"/>',
 hourglass:'<path d="M5 2h14M5 22h14M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4"/>',
 done:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'
});
const icon=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[k]+'</svg>';
const depMap={'الإدارة':'admin','الموارد البشرية':'hr','المبيعات':'sales','التسويق':'marketing','السوشال ميديا':'social','السوشل ميديا':'social','قسم السوشال ميديا':'social','التصميم':'design','التصوير':'photo','المونتاج':'editing','الترويج':'promotion','اللوجستيات':'logistics','المشتريات':'purchases','المحاسبة':'accounting','المستودعات العامة':'warehouses','المستودعات':'warehouses','MOSH MEDIA':'platform'};
let daySnapshot=null,dayVerifiedAt=0,infoUntil=0;
let selected='',ownerKey='',busy=false,lastError='',info='',mounted=false,renderQueued=false,taskSig='',pickSig='',reportRequest=0,reportData=null,reportLoaded=false,reportBusy=false,reportError='',revision=0,reportTimer=0,lastReportAt=0,observed=[],lastPresence=null,reportDate='',pickerOpen=false,lastReportSig='';
const user=()=>window.MoshAuth37?.current?.()||null;
const profile=()=>window.MoshEmployeeTasks41?.profile?.()||null;
const now=()=>A.serverNow?A.serverNow():Date.now();
const zone=()=>reportData?.timeZone||daySnapshot?.timeZone||window.MOSH_COMPANY_TIME_ZONE||'Asia/Damascus';
const today=()=>M.dateKey(now(),zone());
function employee(){const p=profile(),u=user();return p?{id:String(p.id),name:p.name,employeeNo:p.employeeNo}:u?.employeeId?{id:String(u.employeeId),name:u.name||u.username}:null;}
function own(t){const e=employee();if(!t||!e||!user())return false;const assignedId=txt(t.assigneeId||t.assignedEmployeeId||t.assignedToId);if(assignedId)return assignedId===e.id||assignedId===txt(e.employeeNo);return txt(t.assignee)===txt(e.name);}
const taskApp=t=>depMap[txt(t?.sharedDepartment||t?.department)]||window.MoshAuth37?.departmentApp?.()||'';
function allowed(t){const app=taskApp(t);return own(t)&&!!app&&['view','details','status'].every(a=>window.MoshAuth37?.canModule?.(app,a));}
function rows(){return arr(state.salesTasks).filter(t=>own(t)&&['new','active','review'].includes(R.category(t)));}
function running(){return rows().filter(t=>t.status==='in_progress'&&t.employeeState==='working');}
function find(id){return arr(state.salesTasks).find(t=>String(t.id)===String(id));}
function presence(snapshot=state){
 const e=employee();if(!e)return {id:'',record:null};
 const map=snapshot.workEvidence||{},id='id:'+e.id;
 if(map[id])return {id,record:map[id]};
 const entries=Object.entries(map).filter(([k,r])=>String(r?.employeeId||'')===e.id||k==='name:'+txt(e.name).toLowerCase());
 return entries.length===1?{id:entries[0][0],record:entries[0][1]}:{id,record:null};
}
function observePresence(){
 const e=employee(),p=presence(),r=p.record;if(!e)return;
 const current=r?{kind:r.mode==='break'?'break':r.mode==='active'&&r.noWork?'no_work':'none',start:M.epoch(r.mode==='break'?r.breakAt:r.noWork?r.noWorkAt:r.updatedAt),version:r._version,id:p.id}:null;
 if(lastPresence&&current&&lastPresence.version!==current.version){
  const end=M.epoch(r.updatedAt),start=lastPresence.start;
  if(lastPresence.kind!=='none'&&Number.isFinite(start)&&Number.isFinite(end)&&end>=start)observed.push({id:'observed:'+lastPresence.id+':'+lastPresence.version,kind:lastPresence.kind,startAt:start,endAt:end});
 }
 lastPresence=current;
}
function checkedStatus(s){
 if(!['task','break','no_work'].includes(s.kind))return s;
 if(s.kind==='task'){
  const time=M.taskTiming(s.task,now());
  return {...s,since:time.startAt,elapsedMs:time.totalElapsedMs,timerHistory:time.valid&&s.task?.workTiming?.historyIncomplete?'المعروض هو وقت التنفيذ المسجّل. توجد فترة قديمة ناقصة محفوظة للمراجعة؛ لم نُخمّن مدتها.':'',timerIssue:time.valid?'':'توقيت المهمة بحاجة إلى مراجعة: '+time.issues.join(' ')+' البصمة لا تمنع تنفيذ المهمة؛ يلزم توقيت محفوظ من الخادم.'};
 }
 const a=M.epoch(s.since),n=now(),elapsed=M.elapsed(a,n,M.LIVE_LIMIT);
 if(Number.isFinite(elapsed))return {...s,since:a,elapsedMs:elapsed,timerIssue:''};
 const what=s.kind==='task'?'المهمة':s.kind==='break'?'الاستراحة':'حالة عدم وجود عمل';
 const reason=!Number.isFinite(a)?'وقت البداية غير موجود أو غير صالح':a>n+2000?'وقت البداية لاحق لوقت الخادم':'جلسة مفتوحة لأكثر من ٢٤ ساعة وتحتاج مراجعة';
 return {...s,since:NaN,elapsedMs:NaN,timerIssue:'توقيت '+what+' بحاجة إلى مراجعة: '+reason+'. حدّث البيانات؛ لن نعرض وقتاً مخمّناً أو نصفر السجل.'};
}
function currentStatus(){
 const r=presence().record,t=running()[0],at=now();
 if(r?.mode==='break')return {kind:'break',label:'في استراحة',since:M.epoch(r.breakAt),note:'المهمة متوقفة مؤقتاً؛ استئناف المهمة ينهي الاستراحة.'};
 if(r?.mode==='active'&&r.noWork)return {kind:'no_work',label:'لا يوجد عمل لدي',since:M.epoch(r.noWorkAt),note:'مدة مستقلة مسجلة، وليست وقت تنفيذ مهمة.'};
 if(t)return {kind:'task',label:'أعمل الآن على: '+(t.title||'مهمة'),since:M.taskTiming(t,at).startAt,task:t,note:[t.customer,'إجمالي التنفيذ — الجلسات السابقة والحالية'].filter(Boolean).join(' · ')};
 if(daySnapshot?.date===today()&&daySnapshot.complete===true){const d=report(),last=d.segments.at(-1);if(last?.kind==='waste'&&last.end>=at-2000)return {kind:r?.mode==='active'?'ready':'off',label:r?.endedAt?'أنهيت عملي اليوم':r?.mode==='active'?'أعمل الآن':'لا يوجد نشاط مسجّل',since:last.start,note:'هذه الفترة ضمن البصمة وغير مغطّاة بنشاط؛ تُحتسب وقتاً مهدوراً غير مسجّل.'};}
 if(!r||r.mode==='off')return {kind:'off',label:r?.endedAt?'أنهيت عملي اليوم':'لم أبدأ العمل بعد',since:NaN,note:'البصمة لتسجيل الحضور. يبدأ وقت التنفيذ عند بدء المهمة.'};
 return {kind:'ready',label:'أعمل الآن',since:NaN,note:'لا يُحتسب وقت التنفيذ بمجرد بدء العمل أو استلام المهمة. يبدأ التوقيت عند بدء تنفيذها.'};
}
function resetOwner(){const k=String(user()?.id||'');if(k===ownerKey)return;$('wd50LogDialog')?.close();pickerOpen=false;ownerKey=k;selected='';observed=[];lastPresence=null;reportData=null;daySnapshot=null;dayVerifiedAt=0;reportLoaded=false;reportError='';lastError='';info='';reportDate='';reportRequest++;reportBusy=false;lastReportAt=0;taskSig='';pickSig='';}
function mount(){
 const card=$('workProofBar');if(!card||!user())return false;
 if(card.querySelector('#wd50Panel'))return true;
 // Keep original binding nodes (hidden) so older attendance/HR renderers remain intact.
 const bindings=$('es11OriginalBindings'),oldActions=document.querySelector('#employeeSpaceV11 .es11-header-tools .es11-work-actions');
 if(oldActions&&bindings){oldActions.hidden=true;bindings.appendChild(oldActions);}
 card.classList.add('wd50-card');
 card.innerHTML='<div id="wd50Panel" dir="rtl"><div class="wd50-head"><div><small>التحكم بالمهام والوقت</small><h3>'+icon('bag')+'لوحة عملي ومهامي</h3></div><button type="button" class="wd50-icon-btn" data-wd50-refresh title="تحديث لوحة العمل والمهام" aria-label="تحديث لوحة العمل والمهام"><span class="wd06-refresh-icon" aria-hidden="true">↻</span><span>تحديث</span></button></div><section class="wd06-day" aria-labelledby="wd06DayTitle"><div class="wd06-day-heading"><h4 id="wd06DayTitle">حالة العمل</h4><div id="wd50Status" class="wd50-status"><span class="wd50-dot"></span><div><strong id="wd50StatusLabel"></strong><small id="wd50StatusNote"></small></div><bdi id="wd50StatusTimer" dir="ltr">—</bdi></div></div><div class="wd50-day-controls" aria-label="اختيار حالة العمل">'+[['work_start','laptop','بدء العمل'],['break','cup','بدء الاستراحة'],['no_work','hourglass','لا يوجد عمل لدي'],['work_end','done','إنهاء العمل']].map(([k,i,label])=>'<button type="button" data-wd50-day="'+k+'">'+icon(i)+'<span>'+label+'</span></button>').join('')+'</div><details id="wd06TimeDisclosure" hidden><summary>'+icon('clock')+'<span id="wd06TimeWarningLabel">مدة الحالة غير متاحة</span><span class="wd06-warning-toggle">التفاصيل</span></summary><div id="wd50TimeWarning" class="wd50-time-warning" role="status" hidden></div></details></section><div id="wd50Notice" class="wd50-notice" role="status" hidden></div><div id="wd50Error" class="wd50-error" role="alert" hidden></div><button id="wd50Resolve" class="wd50-resolve" type="button" data-wd50-resolve hidden>التحقق من الحفظ السابق</button><section class="wd06-current" aria-label="المهمة الحالية"><div class="wd50-picker"><label for="wd50PickerToggle">المهمة الحالية</label><button type="button" id="wd50PickerToggle" aria-expanded="false" aria-controls="wd50PickerList" data-wd50-picker>'+icon('search')+'<span id="wd50PickedLabel">اختيار مهمة…</span><span aria-hidden="true">⌄</span></button><div id="wd50PickerList" hidden><input id="wd50Search" type="search" autocomplete="off" aria-label="بحث في مهامي" placeholder="ابحث باسم المهمة أو العميل…"><div id="wd50PickerResults"></div></div></div><div id="wd50Task" class="wd50-task"></div></section><div class="wd50-summary"><div class="wd50-summary-title"><b>ملخص وقت العمل اليوم</b><small id="wd50ReportState">جارٍ تحميل السجل…</small></div><div class="wd50-metrics">'+[['task','تنفيذ المهام'],['break','استراحة'],['no_work','لا يوجد عمل'],['waste','وقت مهدور غير مسجّل']].map(([k,t])=>'<div class="wd50-metric" data-kind="'+k+'"><span>'+t+'</span><bdi dir="ltr" id="wd50Total_'+k+'">—</bdi></div>').join('')+'</div><div id="wd50Review" class="wd50-review" hidden></div><button type="button" class="wd50-log-btn" data-wd50-log>'+icon('clock')+'سجل اليوم وتفاصيل الوقت ←</button><small class="wd50-rule">الاستراحة وعدم وجود عمل منفصلان عن الوقت غير المسجّل. لا تُحتسب الدقيقة مرتين.</small></div></div>';
 $('wd50Search').addEventListener('input',()=>renderPicker(true));
 compactLayout();mounted=true;taskSig='';render(true);return true;
}

function compactLayout(){
 const grid=document.querySelector('#employeeSpaceV11 .es11-main-grid');
 if(!grid)return;grid.classList.add('wd51-grid');
 const panel=$('wd50Panel'),summary=panel?.querySelector('.wd50-summary');
 if(summary){summary.id='wd51TimeSummary';summary.classList.add('wd51-time-summary');grid.appendChild(summary);}
 // Reparent existing task nodes so selection, filters and task dialogs keep their bindings.
 const current=panel?.querySelector('.wd06-current'),inbox=grid.querySelector('.es11-card.es11-task');
 if(panel&&current&&inbox){
  let body=panel.querySelector('.wd07-body');
  if(!body){body=document.createElement('div');body.className='wd07-body';current.before(body);}
  if(current.parentElement!==body)body.appendChild(current);
  if(inbox.parentElement!==body)body.appendChild(inbox);
 }
 const label=panel?.querySelector('.wd50-picker>label');if(label)label.textContent='المهمة الحالية';
 const header=panel?.querySelector('.wd50-head>div>small');if(header)header.textContent='إدارة المهام وحالة العمل';
 const attendance=grid.querySelector('.es11-attendance'),bindings=$('es11OriginalBindings');
 if(attendance&&!attendance.querySelector('#wd51PresenceTotal')&&bindings){
  const old=document.createElement('div');old.hidden=true;old.id='wd51LegacyAttendance';
  while(attendance.firstChild)old.appendChild(attendance.firstChild);bindings.appendChild(old);
  attendance.classList.add('wd51-attendance');
  attendance.innerHTML='<div class="wd51-attendance-state"><span class="wd51-punch-dot"></span><div><b id="wd51AttendanceText">بانتظار سجل الحضور</b><small id="wd51AttendanceHelper">من البصمة</small></div></div><div class="wd51-punch"><bdi id="wd51PunchIn" dir="ltr">—</bdi><span>بداية الحضور</span></div><div class="wd51-punch"><bdi id="wd51PresenceTotal" dir="ltr">—</bdi><span>إجمالي الحضور حتى الآن</span></div><button class="wd51-attendance-link" type="button" data-wd51-attendance>سجل الدوام '+icon('clock')+'</button>';
 }
}
function renderAttendance(d){
 if(!$('wd51PresenceTotal'))return;
 const has=d.presenceMs>0,live=has&&d.live&&d.windows.at(-1)?.end>=now()-2000;
 updateText('wd51PunchIn',has?clock(d.windows[0].start).slice(0,5):'—');
 updateText('wd51PresenceTotal',has?M.duration(d.presenceMs):'—');
 updateText('wd51AttendanceText',d.issues.some(x=>/بصمة|حضور/.test(x))?'سجل الحضور بحاجة إلى مراجعة':live?'داخل الدوام':has?'انتهى الحضور':'لم تُسجّل بصمة');
 updateText('wd51AttendanceHelper','الوجود في الشركة · لا يساوي وقت تنفيذ المهام');
 const card=document.querySelector('.wd51-attendance');if(card)card.dataset.live=String(live);
}
window.addEventListener('click',e=>{if(e.target.closest?.('[data-wd51-attendance]')){e.preventDefault();e.stopImmediatePropagation();window.MoshEmployeeView11?.showAttendance?.();}},true);

function showPicker(open){pickerOpen=open;const d=$('wd50PickerList');if(!d)return;d.hidden=!open;$('wd50PickerToggle').setAttribute('aria-expanded',String(open));if(open){renderPicker(true);$('wd50Search').focus();}}
function select(id){const t=find(id);if(!t||!own(t))return false;selected=String(id);showPicker(false);taskSig='';render(true);return true;}
function renderPicker(force=false){
 const target=$('wd50PickerResults');if(!target||!pickerOpen)return;
 const query=txt($('wd50Search')?.value).toLowerCase();const all=rows().filter(t=>R.category(t)!=='review');const matches=all.filter(t=>[t.title,t.customer,t.taskNo,t.number].some(v=>txt(v).toLowerCase().includes(query)));
 const sig=JSON.stringify([selected,query,matches.map(t=>[t.id,t.title,t.customer,t._version,t.employeeState])]);if(!force&&sig===pickSig)return;pickSig=sig;
 target.innerHTML=matches.slice(0,25).map(t=>'<button type="button" data-wd50-pick="'+esc(t.id)+'" class="'+(String(t.id)===selected?'selected':'')+'"><b>'+esc(t.title||'مهمة')+'</b><small>'+esc([t.customer,R.label(t)].filter(Boolean).join(' · '))+'</small></button>').join('')||'<p class="wd50-empty">لا توجد مهام مطابقة.</p>';
 if(matches.length>25)target.insertAdjacentHTML('beforeend','<small>ظهرت أول 25 نتيجة من '+matches.length+'؛ اكتب جزءاً من الاسم لتضييق البحث.</small>');
}
function actionButtons(t){
 if(!t)return '<div class="wd50-empty wd06-empty">'+icon('bag')+'<strong>اختر مهمة من «مهامي»</strong></div>';
 if(!allowed(t))return '<p class="wd50-empty">للاطلاع فقط. لا يملك هذا الحساب صلاحية تنفيذ المهمة.</p>';
 if(t.status!=='in_progress')return '<p class="wd50-empty">المهمة ليست متاحة للتنفيذ حالياً.</p>';
 const cat=R.category(t),st=t.employeeState,off=busy||A.workdeskUncertain();
 const b=(k,label,style='')=>'<button type="button" class="wd50-task-btn '+style+'" data-wd50-action="'+k+'" data-task-id="'+esc(t.id)+'" '+(off?'disabled':'')+'>'+icon(k==='receive'?'check':k==='pause'?'pause':k==='finish'?'check':'play')+label+'</button>';
 if(cat==='new')return b('receive','استلام المهمة','primary');
 if(cat==='review')return '<p class="wd50-empty">بانتظار مراجعة المدير؛ التنفيذ متوقف.</p>';
 if(cat!=='active')return '<p class="wd50-empty">المهمة منتهية.</p>';
 if(st==='working')return (!M.taskTiming(t,now()).valid?b('repair_timer','استئناف التوقيت من الآن','primary'):'')+b('pause','إيقاف مؤقت')+b('finish','إنهاء المهمة',M.taskTiming(t,now()).valid?'primary':'');
 return b('start',R.label(t).includes('بانتظار البدء')?'بدء المهمة':'استئناف المهمة','primary')+(st==='paused'&&!R.label(t).includes('بانتظار البدء')?b('finish','إنهاء المهمة'):'');
}
function renderTask(force=false){
 let t=find(selected);if(!t||!own(t)){selected=String(running()[0]?.id||presence().record?.pausedTaskId||'');t=find(selected);if(t&&!own(t)){t=null;selected='';}}
 $('wd50PickedLabel').textContent=t?'تغيير المهمة':'اختيار مهمة';
 const sig=JSON.stringify([selected,t?.work_timing,t?.workTiming,t?._version,t?.employeeState,t?.returnedForRevision,t?.workChat?.at(-1)?.id,t?.workTiming?.activeStartedAt,busy,A.workdeskUncertain(),t&&allowed(t)]);
 if(!force&&sig===taskSig)return;taskSig=sig;
 $('wd50Task').dataset.empty=String(!t);
 $('wd50Task').dataset.taskId=t?String(t.id):'';
 $('wd50Task').innerHTML=t?'<div class="wd50-task-head"><div><b>'+esc(t.title||'مهمة')+'</b><small class="wd53-task-client">'+esc(t.customer||'لم يُحدَّد عميل')+'</small></div><button type="button" class="wd50-details" data-wd50-details="'+esc(t.id)+'">التفاصيل ←</button></div><span class="wd50-task-state">'+esc(R.label(t))+'</span>'+(t.returnedForRevision?'<div class="wd50-return"><b>↩ مُعادة من المدير</b><p>'+esc(R.reason(t)||'راجع ملاحظات المدير.')+'</p></div>':'')+'<div class="wd50-task-actions">'+actionButtons(t)+'</div><small class="wd50-rule">الاستلام يؤكد وصول المهمة فقط؛ بدء المهمة يشغّل مؤقّت التنفيذ.</small>':actionButtons(null);
 window.MoshTaskInbox49?.renderHome?.();
}
function updateText(id,value){const e=$(id);if(e&&e.textContent!==String(value))e.textContent=value;}
function render(force=false){
 resetOwner();if(!user())return;if(!$('wd50Panel')){mount();return;}
 observePresence();const s=checkedStatus(currentStatus()),r=presence().record,e=employee();
 $('wd50Status').dataset.kind=s.kind;updateText('wd50StatusLabel',s.label);updateText('wd50StatusNote',s.note);$('wd50Status').title=s.note;
 updateText('wd50StatusTimer',M.duration(s.kind==='task'?s.elapsedMs:Number.isFinite(s.since)?(s.elapsedMs??M.elapsed(s.since,now())):NaN));
 $('wd50TimeWarning').hidden=!(s.timerIssue||s.timerHistory);updateText('wd50TimeWarning',s.timerIssue||s.timerHistory||'');
 $('wd06TimeDisclosure').hidden=!(s.timerIssue||s.timerHistory);
 updateText('wd06TimeWarningLabel',s.timerIssue?'مدة الحالة غير متاحة':'سجل التوقيت بحاجة إلى مراجعة');
 $('wd50StatusTimer').setAttribute('aria-label',s.timerIssue?'الوقت غير متاح — بحاجة إلى مراجعة':'مدة الحالة الحالية');
 for(const b of $('wd50Panel').querySelectorAll('[data-wd50-day]')){
  const k=b.dataset.wd50Day,on=k==='break'?s.kind==='break':k==='no_work'?s.kind==='no_work':k==='work_end'?s.kind==='off'&&!!r?.endedAt:['task','ready'].includes(s.kind);
  b.setAttribute('aria-pressed',String(on));b.classList.toggle('active',on);
  b.disabled=busy||A.workdeskUncertain()||!e||on||(k==='work_end'&&!r&&running().length===0);
 }
 const savedBusy=busy?'جارٍ حفظ التغييرات…':Date.now()<infoUntil?info:'';
 const note=!e?'الحساب غير مرتبط بملف موظف. يلزم ربطه لتسجيل وقت العمل.':savedBusy;
 $('wd50Notice').hidden=!note;updateText('wd50Notice',note);$('wd50Error').hidden=!lastError;updateText('wd50Error',lastError);$('wd50Resolve').hidden=!A.workdeskUncertain();$('wd50Resolve').disabled=busy;
 $('wd50PickerToggle').disabled=busy;renderTask(force);renderPicker();renderTotals();
}
function activitiesForPreview(){
 const e=employee(),n=now(),items=M.taskIntervals(arr(state.salesTasks),e,n).concat(observed),r=presence().record;
 if(r?.mode==='break'&&r.breakAt)items.push({id:'current-presence',kind:'break',startAt:r.breakAt,endAt:n,open:true});
 if(r?.mode==='active'&&r.noWork&&r.noWorkAt)items.push({id:'current-presence',kind:'no_work',startAt:r.noWorkAt,endAt:n,open:true});
 return items;
}
function report(forDate=today()){
 const source=forDate===today()?daySnapshot:reportData;
 const full=source&&source.date===forDate,asOf=full?M.epoch(source.asOf):NaN;
 // R5: an active state with no corresponding server interval is not certified waste.
 // Keep known history, but mark uncovered gaps for review until the sources agree.
 let inconsistent=false;const reportIssues=full?arr(source.issues).slice():[];
 if(full&&forDate===today()&&source.live===true&&source.complete===true&&Number.isFinite(asOf)){
  const p=presence().record,liveTasks=running();
  const kind=p?.mode==='break'?'break':p?.mode==='active'&&p.noWork?'no_work':liveTasks.length?'task':'';
  if(kind){
   const matching=arr(source.activities).filter(a=>!a.cancelled&&!a.voided&&!a.supersededBy&&(a.kind==='nowork'?'no_work':a.kind)===kind&&(kind!=='task'||String(a.taskId)===String(liveTasks[0]?.id))&&Number.isFinite(M.epoch(a.startAt??a.start))&&M.epoch(a.startAt??a.start)<=asOf+2000&&(a.open===true||M.epoch(a.endAt??a.end)>=asOf-2000));
   inconsistent=matching.length!==1||(kind==='task'&&liveTasks.length!==1);
   if(inconsistent)reportIssues.push('الحالة النشطة لا تطابق سجل الفترات من الخادم؛ الوقت غير المغطّى بحاجة إلى مراجعة وليس وقتاً مهدوراً معتمداً.');
  }
 }
 return M.dailyAccount({date:forDate,now:full&&Number.isFinite(asOf)?Math.min(now(),asOf+(source.live===true?Math.max(0,now()-asOf):0)):now(),timeZone:source?.timeZone||zone(),attendance:full?source.attendance:arr(profile()?.attendanceRecords),activities:full?source.activities:activitiesForPreview(),coverage:full&&!inconsistent?source.coverage:[],complete:full&&source.complete===true&&!inconsistent,issues:reportIssues});
}
function renderTotals(){
 if(!$('wd50Panel'))return;
 const d=report(),full=daySnapshot?.date===today(),has=d.presenceMs>0;
 if(!full&&!reportLoaded){
  for(const k of ['task','break','no_work','waste'])updateText('wd50Total_'+k,'—');
  updateText('wd50ReportState','جارٍ قراءة سجل اليوم…');$('wd50Review').hidden=true;renderAttendance(d);return;
 }
 for(const k of ['task','break','no_work'])updateText('wd50Total_'+k,M.duration(d.totals[k]));
 const waste=full&&has&&d.presenceComplete;
 updateText('wd50Total_waste',waste?M.duration(d.totals.waste):!has?'بانتظار الحضور':'بحاجة إلى مراجعة');
 $('wd50Total_waste').dir=waste?'ltr':'auto';
 $('wd50Total_waste').style.fontSize=waste?'':'16px';
 updateText('wd50ReportState',full?(daySnapshot.historyPartial?'الوقت المسجّل · السجل القديم جزئي':'الوقت المسجّل من الخادم'):'عرض جزئي · لم يتأكد سجل اليوم');
 let warning=reportError||d.issues[0]||'';
 if(!warning&&!has)warning='تنفيذ المهام والاستراحة وعدم وجود عمل محسوبة دون بصمة. البصمة مطلوبة لحساب المهدور فقط.';
 else if(!warning&&!waste)warning='الأنشطة المسجّلة ظاهرة. الفترات غير المعروفة ضمن الحضور تحتاج مراجعة ولا تُنسب للموظف كوقت مهدور.';
 $('wd50Review').hidden=!warning;updateText('wd50Review',warning);
 renderAttendance(d);if($('wd50LogDialog')?.open)renderLog();
}
async function loadReport(date=today(),manual=false){
 if(!user()||!employee())return false;
 if(reportBusy&&!manual)return false;
 const token=++reportRequest,rev=revision,identity=String(user().id),current=date===today();reportBusy=true;
 try{
  // Omit date for today's request: the server, not the browser timezone,
  // decides which calendar day is today.
  const value=await A.request('/workday'+(current?'':'?date='+encodeURIComponent(date)));
  if(token!==reportRequest||rev!==revision||String(user()?.id)!==identity)return false;
  const stamp=M.epoch(value?.serverNow);
  if(Number.isFinite(stamp)){A.serverOffset=stamp-Date.now();A.serverClockConfirmed=true;}
  if(value?.timeZone)window.MOSH_COMPANY_TIME_ZONE=value.timeZone;
  const w=value?.workday;
  if(w&&String(w.employeeId)===employee().id&&w.date===(current?M.dateKey(now(),w.timeZone):date)&&Array.isArray(w.activities)&&Array.isArray(w.attendance)&&Number.isFinite(M.epoch(w.asOf))){
   reportData=w;if(w.date===today()){daySnapshot=w;dayVerifiedAt=now();}reportError='';
  }else{reportData=null;if(current){daySnapshot=null;dayVerifiedAt=0;}reportError='لم يُرجع الخادم سجل الموظف اليومي. تحقق من ربط الحساب بملف الموظف واكتمال تحديث R8.';}
  reportLoaded=true;lastReportAt=Date.now();return !!reportData;
 }catch(error){if(token===reportRequest){reportLoaded=true;reportError='تعذر تحديث سجل اليوم من الخادم. المعروض من الفترات المعروفة ليس تقريراً مكتملاً.';}return false;}
 finally{if(token===reportRequest){reportBusy=false;renderTotals();}}
}
function ensureLog(){
 let d=$('wd50LogDialog');if(d)return d;
 d=document.createElement('dialog');d.id='wd50LogDialog';d.className='wd50-log-dialog';d.dir='rtl';
 d.innerHTML='<header><div><small>سجلك الشخصي · من بيانات الخادم</small><h3>سجل يومي</h3></div><button type="button" data-wd50-log-close aria-label="إغلاق">×</button></header><div class="wd50-log-body"><div class="wd50-log-filter"><label>اليوم <input id="wd50LogDate" type="date"></label><button type="button" data-wd50-log-refresh>تحديث السجل</button><span id="wd50LogTotal"></span></div><p id="wd50LogNote"></p><div id="wd50LogMetrics" class="wd50-log-metrics"></div><h4>الوقت حسب المهمة</h4><div id="wd50LogTasks"></div><h4>تسلسل اليوم</h4><div class="wd50-table-wrap"><table><thead><tr><th>من</th><th>إلى</th><th>النشاط</th><th>المدة</th></tr></thead><tbody id="wd50LogRows"></tbody></table></div><small class="wd50-rule">الأنشطة محسوبة ضمن اليوم بتوقيت الشركة، سواء وُجدت بصمة أم لا. البصمة مطلوبة للمهدور فقط. التداخل والوقت الناقص يظهران للمراجعة، ولا تتغير سجلات الحضور.</small></div><footer><button type="button" data-wd50-log-close>إغلاق</button></footer>';
 document.body.appendChild(d);$('wd50LogDate').addEventListener('change',()=>{reportDate=$('wd50LogDate').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)||reportDate>today()){reportDate=today();$('wd50LogDate').value=reportDate;}lastReportSig='';renderLog();loadReport(reportDate,true);});return d;
}
function showLog(){const d=ensureLog();reportDate=today();$('wd50LogDate').value=reportDate;$('wd50LogDate').max=today();lastReportSig='';if(!d.open)d.showModal();renderLog();loadReport(reportDate,true);}
function clock(ts){try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone(),hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(ts));}catch(_){return '—';}}
function renderLog(){
 if(!$('wd50LogDialog')?.open)return;
 const date=reportDate||today(),d=report(date),source=date===today()?daySnapshot:reportData,full=source?.date===date;
 const sig=JSON.stringify([date,full,d.totals,d.issues,d.segments,reportBusy,reportError]);if(sig===lastReportSig)return;lastReportSig=sig;
 updateText('wd50LogTotal','الأنشطة المسجّلة: '+M.duration(d.activityMs)+' · الحضور: '+(d.presenceMs?M.duration(d.presenceMs):'غير مسجّل'));
 let note=reportBusy?'جارٍ قراءة سجل اليوم…':reportError||d.issues.join(' · ')||
  (!full?'لم يتأكد اكتمال سجل هذا اليوم.':source.historyPartial?'المعروض هو الوقت المسجّل المعروف. الفترات القديمة الناقصة لم تُخمّن.':'الأوقات محفوظة على الخادم.');
 if(!d.presenceMs)note+=' لا توجد بصمة؛ هذا لا يمنع حساب الأنشطة. المهدور فقط بانتظار الحضور.';
 updateText('wd50LogNote',note);$('wd50LogNote').className=full&&!d.issues.length?'wd50-log-valid':'wd50-log-warning';
 $('wd50LogMetrics').innerHTML=Object.entries(d.totals).filter(([k,v])=>k!=='review'||v>0).map(([k,v])=>'<div><span>'+M.labels[k]+'</span><bdi dir="auto">'+(k==='waste'&&(!full||!d.presenceComplete)?!d.presenceMs?'بانتظار الحضور':'بحاجة إلى مراجعة':M.duration(v))+'</bdi></div>').join('');
 $('wd50LogTasks').innerHTML=d.byTask.length?d.byTask.map(t=>'<div class="wd50-log-task"><b>'+esc(t.title)+'</b><bdi dir="ltr">'+M.duration(t.durationMs)+'</bdi></div>').join(''):'<p class="wd50-empty">لا توجد فترات تنفيذ مسجّلة قابلة للحساب في هذا اليوم.</p>';
 $('wd50LogRows').innerHTML=d.segments.map(s=>'<tr data-kind="'+s.kind+'"><td dir="ltr">'+clock(s.start)+'</td><td dir="ltr">'+clock(s.end)+'</td><td>'+esc(s.kind==='task'?s.title||'تنفيذ مهمة':M.labels[s.kind])+'</td><td dir="ltr">'+M.duration(s.end-s.start)+'</td></tr>').join('')||'<tr><td colspan="4">لا توجد فترات مسجّلة لهذا اليوم.</td></tr>';
}
async function taskAction(kind,id){return perform(kind,id);}
async function perform(kind,id){
 if(busy)return false;resetOwner();const e=employee();if(!user()||!e){lastError='اربط الحساب بملف الموظف أولاً، دون تغيير صلاحياته.';render();return false;}
 if(A.workdeskUncertain()){lastError='نتيجة الحفظ السابق غير مؤكدة. اضغط «التحقق من الحفظ».';render();return false;}
 const target=find(id),sourceDepartment=target?.department,isFinish=kind==='finish'||kind==='submit',others=running().filter(t=>String(t.id)!==String(id));
 if(kind==='repair_timer'&&!confirm('استئناف التوقيت من لحظة تأكيد الخادم؟ سيُحفظ الوقت المعروف كما هو، وتبقى الفترة القديمة المفقودة للمراجعة دون تخمين.'))return false;
 if((kind==='start'||kind==='repair_timer')&&others.length&&!confirm('إيقاف «'+others.map(t=>t.title||'مهمة').join('، ')+'» مؤقتاً والبدء بـ«'+(target?.title||'المهمة المحددة')+'»؟'))return false;
 if((kind==='finish'||kind==='submit')&&!confirm('تأكيد إنهاء تنفيذ المهمة؟ يوم العمل يبقى مفتوحاً.'))return false;
 if(kind==='work_end'&&!confirm('إنهاء العمل؟ ستتوقف المهام النشطة مؤقتاً دون إرسالها للمراجعة، ولا يتم تسجيل بصمة خروج.'))return false;
 busy=true;daySnapshot=null;dayVerifiedAt=0;lastError='';info='';taskSig='';window.MoshTaskWorkspace08?.schedule();render(true);window.MoshEmployeeTaskWorkflow48?.render?.(true);
 try{
  const result=await A.commitWorkdesk(snapshot=>{
   const p=presence(snapshot),ownTasks=arr(snapshot.salesTasks).filter(own);
   const operations=M.plan({kind,taskId:id,tasks:ownTasks,presence:p.record,presenceId:p.id,employee:e,actor:user()?.name||user()?.username,receiptModel:R,canTask:allowed});
   if(kind==='finish'||kind==='submit'){const t=ownTasks.find(t=>String(t.id)===String(id));const op=operations.find(op=>op.resource==='tasks'&&op.id===String(id));if(t&&op&&typeof getDirectManagerName==='function')op.data.reviewManager=getDirectManagerName(t.assignee,t.department)||'';}
   return operations;
  });
  if((kind==='start'||kind==='repair_timer')&&!M.taskTiming(find(id),now()).valid){
   await A.refreshTaskDetails(id);
   const check=M.taskTiming(find(id),now());
   if(!check.valid)throw new Error('حُفظت حالة المهمة، لكن الخادم لم يُرجع توقيت تنفيذ صالحاً حتى بعد إعادة قراءة التفاصيل. '+check.issues.join(' ')+' لا علاقة لذلك ببصمة الدخول.');
  }
  revision++;reportData=null;daySnapshot=null;dayVerifiedAt=0;observePresence();
  const change=isFinish?result.changes.find(row=>row.resource==='tasks'&&String(row.id)===String(id)):null;
  const movedToFollowUp=change?.outcome==='follow_up';
  if(id)selected=movedToFollowUp?'':String(id);
  const finishFeedback=movedToFollowUp?'تم إنهاء المهمة وإرسالها إلى المهمات للمتابعة.':isFinish?window.MoshTaskInbox49?.finishMessage?.(change?.data):'';
  if(isFinish&&(movedToFollowUp||(change?.data&&(change.data.department!==sourceDepartment||change.data.status!=='in_progress')))){
   const overlay=window.MoshEmployeeTaskOverlay47;
   if(String(overlay?.current?.()?.id||'')===String(id))overlay.close();
  }
  if(finishFeedback)window.MoshUI19?.toast?.(finishFeedback);
  info=finishFeedback||({repair_timer:'حُفظ توقيت التنفيذ على الخادم. أي فترة قديمة ناقصة بقيت للمراجعة.',receive:'تم استلام المهمة؛ لم يبدأ مؤقّت التنفيذ.',start:'بدأ مؤقّت المهمة وحُفظت حالة العمل.',pause:'المهمة متوقفة. أي وقت غير مغطّى بحالة مسجلة ضمن البصمة يدخل في الوقت غير المسجّل.',work_start:'بدأ العمل؛ اختر مهمة وابدأها ليُسجّل وقت التنفيذ.',break:'بدأت الاستراحة وتوقف مؤقّت المهمة.',no_work:'سُجّلت حالة «لا يوجد عمل لدي»، وتوقّف مؤقّت المهمة.',work_end:'سُجّل انتهاء العمل. تُسجّل بصمة الخروج بصورة مستقلة.'})[kind]||'تم الحفظ.';
  infoUntil=Date.now()+5000;
  document.dispatchEvent(new CustomEvent('mosh:workdesk-transition',{detail:{kind,taskId:id||null}}));
  channel?.postMessage({type:'changed'});setTimeout(()=>loadReport(today(),true),80);return true;
 }catch(error){
  lastError=A.workdeskUncertain()?'لم نتأكد من نتيجة الحفظ. قد تكون العملية نُفّذت؛ لا نكررها بمفتاح جديد. اضغط «التحقق من الحفظ».':error.status===409?'تغيّرت البيانات بجلسة أخرى. حدّث حالة العمل ثم أعد المحاولة.':error.message||'تعذر الحفظ؛ لم تؤكد الواجهة تغيير الحالة.';return false;
 }finally{busy=false;taskSig='';window.MoshTaskWorkspace08?.schedule();render(true);window.MoshTaskInbox49?.renderHome?.();window.MoshTaskInbox49?.renderList?.();window.MoshEmployeeTaskWorkflow48?.render?.(true);}
}
async function refresh(){if(busy)return;busy=true;lastError='';render();try{if(A.workdeskUncertain())await A.resolveWorkdesk();await A.refresh();revision++;observePresence();await loadReport(today(),true);info='تم تحديث لوحة العمل والمهام.';infoUntil=Date.now()+4000;}catch(e){lastError=e.message;}finally{busy=false;taskSig='';render(true);}}
async function resolve(){if(busy)return;busy=true;render();try{await A.resolveWorkdesk();lastError='';revision++;observePresence();info='تأكد حفظ العملية السابقة. تم تحديث حالتك.';infoUntil=Date.now()+4000;await loadReport(today(),true);}catch(e){lastError=e.message;}finally{busy=false;taskSig='';render(true);window.MoshEmployeeTaskWorkflow48?.render?.(true);}}
let remoteRefreshNeeded=false;
function hasUnsavedEditor(){try{return typeof appIsDirty!=='undefined'&&!!appIsDirty;}catch(_){return document.body.dataset.r14Dirty==='1';}}
function refreshFromSibling(){
 if(!remoteRefreshNeeded||busy||A.isSaving?.()||document.hidden||hasUnsavedEditor())return;
 remoteRefreshNeeded=false;refresh();
}
let channel=null;try{channel=new BroadcastChannel('mosh-workdesk-r2');channel.onmessage=()=>{remoteRefreshNeeded=true;refreshFromSibling();};}catch(_){}
document.addEventListener('visibilitychange',refreshFromSibling);
window.addEventListener('focus',refreshFromSibling);
setInterval(refreshFromSibling,1500);
function install(){
 if(!window.MoshTaskInbox49)return;
 const inbox=window.MoshTaskInbox49;
 if(!inbox.__workdesk50){
  const oldBusy=inbox.isBusy,oldError=inbox.error,oldActions=inbox.actionHtml;
  inbox.perform=taskAction;inbox.isBusy=id=>busy||A.workdeskUncertain()||oldBusy(id);inbox.error=id=>lastError||oldError(id);
  inbox.actionHtml=t=>(lastError?'<div class="mr49-error" role="alert">'+esc(lastError)+'</div>':'')+(busy?'<p role="status">جارٍ حفظ التغييرات…</p>':A.workdeskUncertain()?'<p class="mr49-error">تحقّق من الحفظ السابق من لوحة عملي قبل المتابعة.</p>':((t.employeeState==='working'&&allowed(t)&&!M.taskTiming(t,now()).valid)?'<button type="button" class="emp48-btn primary" data-wd50-action="repair_timer" data-task-id="'+esc(t.id)+'">استئناف التوقيت من الآن</button>':'')+oldActions(t));
  inbox.__workdesk50=true;
 }
 // Original header buttons and any direct calls route to the same transaction now.
 window.workProofStart=()=>perform('work_start');window.workProofBreak=()=>perform('break');window.workProofNoWork=()=>perform('no_work');window.workProofEnd=()=>perform('work_end');
 mount();
}
// Narrow capture: only our own data-marked controls. Server + model both enforce access.
window.addEventListener('click',ev=>{
 const b=ev.target.closest?.('[data-wd50-day],[data-wd50-action],[data-wd50-pick],[data-wd50-picker],[data-wd50-details],[data-wd50-log],[data-wd50-log-close],[data-wd50-log-refresh],[data-wd50-refresh],[data-wd50-resolve],[data-wd50-select]');
 if(!b){if(pickerOpen&&!ev.target.closest?.('.wd50-picker'))showPicker(false);return;}if(b.disabled)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 if(b.hasAttribute('data-wd50-day'))perform(b.dataset.wd50Day);
 else if(b.hasAttribute('data-wd50-action'))taskAction(b.dataset.wd50Action,b.dataset.taskId);
 else if(b.hasAttribute('data-wd50-pick'))select(b.dataset.wd50Pick);
 else if(b.hasAttribute('data-wd50-picker'))showPicker(!pickerOpen);
 else if(b.hasAttribute('data-wd50-details'))window.MoshTaskInbox49?.openTask?.(b.dataset.wd50Details);
 else if(b.hasAttribute('data-wd50-log'))showLog();
 else if(b.hasAttribute('data-wd50-log-close')){$('wd50LogDialog')?.close();loadReport(today(),true);}
 else if(b.hasAttribute('data-wd50-log-refresh'))loadReport(reportDate||today(),true);
 else if(b.hasAttribute('data-wd50-refresh'))refresh();
 else if(b.hasAttribute('data-wd50-resolve'))resolve();
 else if(b.hasAttribute('data-wd50-select')){select(b.dataset.wd50Select);$('mr49ListDialog')?.close();$('wd50Panel')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&pickerOpen){e.preventDefault();showPicker(false);$('wd50PickerToggle')?.focus();}});
document.addEventListener('mosh:saved',ev=>{if(arr(ev.detail?.changes).some(c=>['tasks','work-presence'].includes(c.resource)||(c.resource==='employees'&&c.data?.attendanceRecords))){daySnapshot=null;dayVerifiedAt=0;reportLoaded=false;}});
['mosh:saved','mosh:refreshed','mosh:tasks-refreshed'].forEach(type=>document.addEventListener(type,()=>{resetOwner();observePresence();taskSig='';render(true);}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();if(Date.now()-lastReportAt>60000)refresh();}});
function reminderContext(){
 resetOwner();const at=now(),s=currentStatus(),e=employee(),u=user();
 return {userId:String(u?.id||''),employeeId:String(e?.id||''),date:today(),timeZone:zone(),now:at,
  online:navigator.onLine!==false,clockConfirmed:A.serverClockConfirmed===true,busy:busy||!!A.isSaving?.(),
  uncertain:A.workdeskUncertain(),error:lastError,currentKind:s.kind,snapshot:daySnapshot,
  verifiedAt:dayVerifiedAt,account:daySnapshot?report(today()):null};
}
function openPicker(){if(typeof goApp==='function')goApp('dashboard');mount();showPicker(true);$('wd50PickerToggle')?.scrollIntoView({block:'center',behavior:'smooth'});}
/* R18: read-only projection for Mini; all writes still go through perform(). */
function miniSnapshot(){
 resetOwner();
 const u=user(),e=employee(),at=now(),status=checkedStatus(currentStatus());
 const ownRows=rows();
 const current=running()[0]||find(selected)||find(presence().record?.pausedTaskId);
 const picked=current&&own(current)?current:null;
 const day=report();
 return {
  userId:String(u?.id||''),employee:e?{...e}:null,now:at,timeZone:zone(),
  kind:status.kind,label:status.label,note:status.note,
  selectedId:picked?String(picked.id):'',activeId:status.task?String(status.task.id):'',
  busy:busy||!!A.isSaving?.(),uncertain:A.workdeskUncertain(),error:lastError,
  info:Date.now()<infoUntil?info:'',clockConfirmed:A.serverClockConfirmed===true,
  reportLoaded,reportError,reportComplete:daySnapshot?.complete===true,
  totals:{...day.totals},
  tasks:ownRows.map(t=>{const timing=M.taskTiming(t,at);return {
    id:String(t.id),title:txt(t.title)||'مهمة',customer:txt(t.customer),
    category:R.category(t),label:R.label(t),employeeState:t.employeeState,
    status:t.status,allowed:allowed(t),totalMs:timing.totalElapsedMs,
    timingValid:timing.valid,timingIssues:timing.issues,
    incomplete:!!t.workTiming?.historyIncomplete,returned:!!t.returnedForRevision,
    returnReason:R.reason(t)||''
  };})
 };
}
window.MoshWorkdesk50={version:'workdesk-r8',selectedTaskId:()=>selected,miniSnapshot,perform,taskAction,select,showLog,report,loadReport,refresh,render,employee,allowed,reminderContext,openPicker,isBusy:()=>busy};
install();setTimeout(install,400);
setInterval(()=>{if(!$('wd50Panel')&&user())install();if(user()&&$('dashboardApp')?.classList.contains('active')){render();if(!reportLoaded&&!reportBusy&&!busy)loadReport(today());}},1000);
setInterval(()=>{if(!busy&&!reportBusy&&user()&&!document.hidden&&!$('wd50LogDialog')?.open)loadReport(today());},60000);
})();
