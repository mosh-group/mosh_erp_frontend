/* R3 in-app reminder. UI metadata only is kept in browser storage; no task,
   attendance, duration, or retroactive work-state writes originate here.
   Durable server audit is an optional explicit integration, documented separately. */
(function(){
 'use strict';
 const D=window.MoshWorkdesk50,P=window.MoshActivityReminderModel51,A=window.MoshApi;
 if(!D||!P||!A)return;
 const $=id=>document.getElementById(id),uid=()=>globalThis.crypto?.randomUUID?.()||('r-'+Date.now()+'-'+Math.random().toString(36).slice(2));
 const tabId=uid(),PREFIX='mosh.reminder.r3:',memory=new Map();
 let identity='',scopeKey='',prompt=null,pendingResponse=null,inFlight=false,checking=false,unlock=null,lastVerify=0,destroyed=false;
 const time=()=>A.serverNow(),duration=n=>window.MoshWorkdayModel50.duration(n);
 function read(storage,key,fallback){try{const v=storage.getItem(key);return v?JSON.parse(v):fallback;}catch(_){return memory.get(key)||fallback;}}
 function write(storage,key,value){memory.set(key,value);try{storage.setItem(key,JSON.stringify(value));}catch(_){}}
 function storage(name){try{return window[name];}catch(_){return {getItem(){return null;},setItem(){}};}}
 const local=()=>storage('localStorage'),session=()=>storage('sessionStorage');
 function schedule(){const s=read(local(),scopeKey,null);return s&&typeof s==='object'?s:null;}
 function ownEvents(){const list=read(session(),PREFIX+'events:'+identity,[]);return Array.isArray(list)?list:[];}
 function events(){const c=D.reminderContext();return c.userId&&c.employeeId&&identity===c.userId+'|'+c.employeeId?ownEvents():[];}
 function persistEvents(list){write(session(),PREFIX+'events:'+identity,list.slice(-150));}
 function audit(type,p,extra={}){
  if(!identity||!p)return;
  const c=D.reminderContext(),event={id:uid(),type,reminderId:p.id,gapStart:p.gapStart,shownAt:p.shownAt,observedAt:time(),date:c.date,...extra};
  persistEvents([...ownEvents(),event]);
  document.dispatchEvent(new CustomEvent('mosh:reminder-audit',{detail:Object.freeze({...event})}));
  // Host integration may persist UI events. It must authorize/derive the employee
  // on the server and return {stored:true}; never treat browser log as official audit.
  if(typeof window.MoshReminderAuditTransport==='function'){
   const owner=identity;
   Promise.resolve().then(()=>window.MoshReminderAuditTransport({...event})).then(r=>{
    if(owner!==identity||r?.stored!==true)return;
    const list=ownEvents();const row=list.find(x=>x.id===event.id);if(row){row.serverStored=true;persistEvents(list);renderLog();}
   }).catch(()=>{});
  }
  renderLog();
 }
 function ensure(){
  let box=$('wd51Reminder');if(box)return box;
  box=document.createElement('aside');box.id='wd51Reminder';box.hidden=true;box.dir='rtl';
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','false');box.setAttribute('aria-labelledby','wd51ReminderTitle');box.setAttribute('aria-describedby','wd51ReminderMessage');
  box.innerHTML='<div class="wd51-reminder-head"><span class="wd51-reminder-symbol" aria-hidden="true">◷</span><div><small>متابعة وقتك</small><h3 id="wd51ReminderTitle">حدّد حالتك الحالية</h3></div><button type="button" data-reminder-choice="dismiss" aria-label="إغلاق التذكير وتأجيله خمس دقائق">×</button></div><p id="wd51ReminderMessage"></p><div class="wd51-reminder-elapsed"><span>لا يوجد نشاط مسجّل</span><bdi id="wd51ReminderElapsed" dir="ltr"></bdi></div><div id="wd51ReminderError" role="status" hidden></div><div class="wd51-reminder-actions"><button type="button" data-reminder-choice="break">أنا في استراحة</button><button type="button" data-reminder-choice="no_work">لا يوجد عمل لدي</button><button type="button" class="wd51-reminder-task" data-reminder-choice="task">أنا أعمل على مهمة ←</button></div><button type="button" data-reminder-choice="verify" id="wd51ReminderVerify" hidden>التحقق من الحالة والحفظ</button><footer><span>الحالة تبدأ عند حفظ اختيارك، دون تغيير الوقت السابق.</span><button type="button" data-reminder-choice="dismiss">ذكّرني بعد ٥ دقائق</button></footer>';
  box.addEventListener('click',e=>{const b=e.target.closest('[data-reminder-choice]');if(!b||b.disabled)return;e.preventDefault();e.stopPropagation();choose(b.dataset.reminderChoice);});
  document.body.appendChild(box);return box;
 }
 function release(){
  const old=schedule();if(old?.leaseOwner===tabId)write(local(),scopeKey,{...old,leaseOwner:'',leaseUntil:0});
  if(unlock){const f=unlock;unlock=null;f();}
 }
 function hide(reason,record=false){
  if(prompt&&record)audit(reason,prompt);
  if($('wd51Reminder'))$('wd51Reminder').hidden=true;
  prompt=null;release();
 }
 function synchronize(){
  const c=D.reminderContext(),id=c.userId&&c.employeeId?c.userId+'|'+c.employeeId:'';
  const key=PREFIX+'schedule:'+id+':'+c.date;
  if(id!==identity||key!==scopeKey){hide('identity_changed');identity=id;scopeKey=key;pendingResponse=null;lastVerify=0;inFlight=false;}
  return c;
 }
 async function acquire(){
  if(navigator.locks?.request){
   return new Promise(resolve=>{
    let answered=false;
    navigator.locks.request(scopeKey,{ifAvailable:true},lock=>{
     answered=true;if(!lock){resolve(false);return;}
     return new Promise(done=>{unlock=done;resolve(true);});
    }).catch(()=>{if(!answered)resolve(leaseAvailable());});
   });
  }
  return leaseAvailable();
 }
 function leaseAvailable(){const s=schedule();return !s?.leaseOwner||s.leaseOwner===tabId||Number(s.leaseUntil)<=time();}
 function renew(){const s=schedule();if(prompt&&s?.leaseOwner===tabId&&Number(s.leaseUntil)-time()<10000)write(local(),scopeKey,{...s,leaseUntil:time()+25000});}
 function show(e){
  if(prompt)return;const box=ensure();prompt={id:uid(),key:e.key,gapStart:e.gapStart,shownAt:time(),identity};pendingResponse=prompt;
  write(local(),scopeKey,{...P.postpone(e,time()),leaseOwner:tabId,leaseUntil:time()+25000});
  box.hidden=false;audit('shown',prompt);render(e);
 }
 function render(e){
  if(!prompt||!$('wd51Reminder'))return;
  const c=D.reminderContext(),blocked=c.busy||c.uncertain||c.error||!c.online;
  $('wd51ReminderMessage').textContent=blocked?'تعذر التأكد من حالتك الآن. تحقّق من الحفظ والاتصال قبل تسجيل نشاط جديد.':'مرّت ٥ دقائق من وقت الحضور دون نشاط مسجّل. تُحتسب هذه الفترة وقتاً مهدوراً غير مسجّل. ما حالة عملك الآن؟';
  $('wd51ReminderElapsed').textContent=blocked?'—':duration(Math.max(0,time()-prompt.gapStart));
  for(const b of $('wd51Reminder').querySelectorAll('.wd51-reminder-actions button'))b.disabled=inFlight||blocked;
  $('wd51ReminderVerify').hidden=!blocked;$('wd51ReminderVerify').disabled=inFlight||c.busy;
  $('wd51ReminderError').hidden=!(inFlight||c.error||c.uncertain);
  $('wd51ReminderError').textContent=inFlight?'جارٍ حفظ اختيارك…':c.uncertain?'نتيجة الحفظ غير مؤكدة؛ تحقّق منها قبل إعادة المحاولة.':c.error||'';
 }
 function dismiss(){
  if(!prompt)return false;
  write(local(),scopeKey,{...schedule(),...P.postpone(prompt,time())});audit('dismissed',prompt,{nextReminderAt:time()+P.DELAY});hide('dismissed');return true;
 }
 async function choose(choice){
  if(!prompt||inFlight)return false;
  if(choice==='dismiss')return dismiss();
  if(choice==='verify'){
   inFlight=true;render();try{await D.refresh();lastVerify=time();}finally{inFlight=false;tick();}return true;
  }
  const c=synchronize(),e=P.evaluate(c);if(!prompt)return false;
  if(!e.eligible||e.key!==prompt.key){render(e);if(!['saving_or_error','offline'].includes(e.reason))hide('state_changed',true);return false;}
  if(choice==='task'){
   audit('task_picker_opened',prompt);
   write(local(),scopeKey,{...schedule(),...P.postpone(e,time())});hide('task_picker_opened');D.openPicker();return true;
  }
  if(!['break','no_work'].includes(choice))return false;
  const reference=prompt,owner=identity;inFlight=true;render();
  try{
   const ok=await D.perform(choice);
   if(owner!==identity)return false;
   if(!ok){audit('save_failed',reference,{choice});render();return false;}
   // Successful transition emits mosh:workdesk-transition below. It is the only
   // signal treated as a confirmed response; never optimistic/backdated.
   return true;
  }finally{inFlight=false;render();}
 }
 async function tick(){
  if(destroyed||checking)return;
  const c=synchronize();if(!identity){hide('signed_out');return;}
  if(document.hidden){if(prompt)hide('tab_hidden',true);return;}
  let e=P.evaluate(c);
  if(prompt){
   if(prompt.identity!==identity){hide('identity_changed');return;}
   if(!e.eligible||e.key!==prompt.key){
    if(c.busy||c.uncertain||c.error||!c.online){render(e);return;}
    hide('state_changed',true);return;
   }
   const lease=schedule();if(lease?.leaseOwner&&lease.leaseOwner!==tabId&&lease.leaseUntil>time()){hide('other_tab');return;}
   renew();render(e);return;
  }
  if(!e.eligible||!P.due(e,schedule()?.key===e.key?schedule():null))return;
  // Do not stack over a native modal or interrupt a pending save. The nonmodal
  // panel otherwise works from any application department.
  if(document.querySelector('dialog[open]'))return;
  checking=true;
  const savedIdentity=identity;
  try{
   // A due reminder requires a recent read, not a stale cached waste segment.
   if(time()-lastVerify>20000){await D.loadReport(c.date,true);lastVerify=time();}
   if(document.hidden||savedIdentity!==identity)return;
   e=P.evaluate(synchronize());if(!P.due(e,schedule()?.key===e.key?schedule():null))return;
   if(!await acquire())return;
   const current=schedule();
   if(!P.due(e,current?.key===e.key?current:null)||document.hidden){release();return;}
   // Lease is a fallback for browsers without Web Locks; settle before display.
   write(local(),scopeKey,{...(current?.key===e.key?current:{}),key:e.key,leaseOwner:tabId,leaseUntil:time()+25000});
   await new Promise(r=>setTimeout(r,70));
   if(schedule()?.leaseOwner!==tabId||document.hidden||savedIdentity!==identity){release();return;}
   const latest=P.evaluate(synchronize());if(!latest.eligible||latest.key!==e.key){release();return;}
   show(latest);
  }finally{checking=false;}
 }
 const eventLabels={shown:'ظهر التذكير',dismissed:'تأجيل خمس دقائق',task_picker_opened:'فتح اختيار المهمة — لم يبدأ التنفيذ بعد',response_confirmed:'سُجّل النشاط',save_failed:'تعذر تأكيد الحفظ',state_changed:'تغيّرت الحالة من مصدر آخر',tab_hidden:'أُخفي التبويب'};
 function renderLog(){
  const dialog=$('wd50LogDialog');if(!dialog?.open)return;
  let section=$('wd51ReminderLog');if(!section){section=document.createElement('section');section.id='wd51ReminderLog';dialog.querySelector('.wd50-log-body')?.appendChild(section);}
  const date=$('wd50LogDate')?.value,list=events().filter(e=>e.date===date);
  section.replaceChildren();const h=document.createElement('h4');h.textContent='تذكيرات النشاط';section.appendChild(h);
  const note=document.createElement('p');note.className='wd51-reminder-log-note';note.textContent='سجل هذه الجلسة في المتصفح فقط. لا يُعد سجلاً إدارياً دائماً دون ربطه بالسيرفر.';section.appendChild(note);
  if(!list.length){const p=document.createElement('p');p.textContent='لا توجد تذكيرات مسجلة في هذه الجلسة لليوم المختار.';section.appendChild(p);return;}
  for(const e of list.slice(-40).reverse()){
   const row=document.createElement('div');row.className='wd51-reminder-log-row';const label=document.createElement('span');
   label.textContent=(eventLabels[e.type]||e.type)+(e.choice?' · '+({break:'استراحة',no_work:'لا يوجد عمل',start:'بدء / استئناف مهمة'}[e.choice]||e.choice):'')+(e.responseMs!=null?' · الاستجابة بعد '+duration(e.responseMs):'')+(e.serverStored?' · محفوظ بالسيرفر':'');
   const at=document.createElement('bdi');at.dir='ltr';try{at.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:D.reminderContext().timeZone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(e.observedAt));}catch(_){at.textContent='—';}row.append(label,at);section.appendChild(row);
  }
 }
 document.addEventListener('mosh:workdesk-transition',ev=>{
  const c=synchronize(),kind=ev.detail?.kind;
  if(!pendingResponse||pendingResponse.identity!==identity||!['start','break','no_work'].includes(kind))return;
  audit('response_confirmed',pendingResponse,{choice:kind,responseMs:Math.max(0,time()-pendingResponse.shownAt),taskId:ev.detail.taskId||null});pendingResponse=null;hide('response_confirmed');
 });
 document.addEventListener('mosh:session-expired',()=>{hide('session_expired');identity='';scopeKey='';pendingResponse=null;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){hide('tab_hidden',true);}else{lastVerify=0;D.loadReport(undefined,true).then(tick);}});
 window.addEventListener('online',()=>{lastVerify=0;D.loadReport(undefined,true).then(tick);});
 window.addEventListener('pagehide',()=>{hide('page_hidden');});
 window.addEventListener('storage',ev=>{if(ev.key===scopeKey)tick();});
 window.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&prompt&&!inFlight&&!document.querySelector('dialog[open]')){ev.preventDefault();dismiss();}});
 const timer=setInterval(()=>{tick();renderLog();},1000);
 window.MoshActivityReminder51={version:'workdesk-r3',tick,dismiss,choose,events,isOpen:()=>!!prompt,destroy(){destroyed=true;clearInterval(timer);hide('destroyed');}};
 tick();
})();
