/* MOSH R18 Mini — production UI projection of MoshWorkdesk50.
 * No test users, local task storage, alternative clock, or unguarded writes.
 * Popup is an independent instance of the SAME authenticated application.
 */
(function () {
 'use strict';
 if (window.MoshMini18) return;
 const W=window.MoshWorkdesk50,A=window.MoshApi,M=window.MoshWorkdayModel50;
 if(!W?.miniSnapshot||!A||!M)return;
 const $=id=>document.getElementById(id);
 const popupMode=new URLSearchParams(location.search).get('moshMini')==='1';
 let shown=popupMode,compact=false,picker=false,locked=false,uiBusy=false,popout=null;
 let owner='',message='',messageError=false,messageUntil=0,lastListSig='',lastSync=Date.now(),needsSync=false;
 let expandedSize=null,drag=null,channel=null,sessionChannel=null;
 const currentUser=()=>window.MoshAuth37?.current?.();
 const setText=(id,value)=>{const el=$(id),str=String(value??'');if(el&&el.textContent!==str)el.textContent=str;};
 const modalOpen=()=>Array.from(document.querySelectorAll('dialog[open],.modal.show,.auth37-editorback,.hr-pro-modal-root:not([hidden])')).some(el=>el.getClientRects().length);
 const dirty=()=>{try{return typeof appIsDirty!=='undefined'&&!!appIsDirty;}catch(_){return document.body.dataset.r14Dirty==='1';}};
 const duration=v=>Number.isFinite(v)?M.duration(v):'—';
 const online=()=>navigator.onLine!==false;
 function notice(text,isError=false){message=String(text||'');messageError=!!isError;messageUntil=Date.now()+(isError?15000:5000);render();}
 function root(){return $('moshMini18');}
 function ensure(){
  if(root())return;
  const box=document.createElement('section');box.id='moshMini18';box.dir='rtl';box.hidden=!shown;box.setAttribute('aria-label','لوحة عملي المصغّرة');
  box.innerHTML=`<header class="mini18-header" data-mini18-drag>
   <div class="mini18-heading"><strong>MOSH <span>MINI</span></strong><small id="mini18Hint">اسحب اللوحة إلى الزاوية المناسبة</small></div>
   <div class="mini18-header-actions"><button type="button" class="mini18-icon" data-mini18="compact" title="تصغير إلى شريط" aria-label="تصغير إلى شريط">−</button><button type="button" class="mini18-icon" id="mini18Popout" data-mini18="popout" title="فتح بنافذة مستقلة" aria-label="فتح بنافذة مستقلة">↗</button><button type="button" class="mini18-icon" id="mini18Hide" data-mini18="hide" title="إخفاء اللوحة فقط" aria-label="إخفاء اللوحة فقط">×</button></div>
  </header>
  <div class="mini18-body">
   <div class="mini18-person"><span id="mini18Employee"></span><span class="mini18-badge" id="mini18Status">—</span></div>
   <h2 class="mini18-title" id="mini18TaskTitle">اختر مهمة للبدء</h2><p class="mini18-client" id="mini18Client"></p>
   <div class="mini18-clock"><small id="mini18TimerLabel">الوقت المسجّل على المهمة</small><bdi class="mini18-timer" id="mini18Timer">—</bdi></div>
   <div class="mini18-buttons"><button type="button" class="mini18-action mini18-primary" data-mini18="primary" id="mini18Primary">اختر مهمة</button><button type="button" class="mini18-action" data-mini18="picker" id="mini18Switch">تبديل المهمة</button><button type="button" class="mini18-action" data-mini18="break" id="mini18Break">استراحة ☕</button><button type="button" class="mini18-action" data-mini18="no_work" id="mini18NoWork">لا يوجد عمل لدي</button></div>
   <div class="mini18-picker" id="mini18Picker" hidden><div class="mini18-picker-head"><b>مهامك المتاحة</b><button type="button" class="mini18-icon" data-mini18="picker-close" aria-label="إغلاق اختيار المهمة">×</button></div><input type="search" class="mini18-search" id="mini18Search" placeholder="ابحث بالمهمة أو العميل…" aria-label="البحث في مهامي" autocomplete="off"><div class="mini18-list" id="mini18TaskList"></div></div>
   <div class="mini18-links"><button type="button" class="mini18-link" data-mini18="work_end" id="mini18End">إنهاء العمل</button><button type="button" class="mini18-link" data-mini18="log" id="mini18Log">سجل اليوم ←</button></div>
   <div class="mini18-stats"><div><small>تنفيذ</small><bdi dir="ltr" id="mini18TotalTask">—</bdi></div><div><small>استراحة</small><bdi dir="ltr" id="mini18TotalBreak">—</bdi></div><div><small>بلا عمل</small><bdi dir="ltr" id="mini18TotalNoWork">—</bdi></div></div>
   <button type="button" class="mini18-link mini18-return" data-mini18="full">العودة لواجهة MOSH الكاملة</button>
   <div class="mini18-message" id="mini18Message" role="status" aria-live="polite" hidden></div>
   <button type="button" class="mini18-action" id="mini18Resolve" data-mini18="refresh" hidden>التحقق من الحفظ وتحديث الحالة</button>
  </div>
  <footer class="mini18-footer"><span id="mini18Connection">نفس حسابك وسجل الوقت في MOSH</span> · <button type="button" class="mini18-link" style="font-size:11px;padding:0" data-mini18="refresh">تحديث الحالة</button></footer>
  <div class="mini18-compact" data-mini18-drag><div class="mini18-compact-info"><strong>MOSH MINI</strong><small id="mini18CompactTask"></small></div><bdi class="mini18-compact-timer" id="mini18CompactTimer" dir="ltr">—</bdi><button type="button" class="mini18-icon" data-mini18="expand" aria-label="تكبير اللوحة" title="تكبير اللوحة">↗</button></div>`;
  document.body.appendChild(box);
  $('mini18Search').addEventListener('input',()=>{lastListSig='';render();});
  box.addEventListener('click',onClick);
  box.addEventListener('pointerdown',beginDrag);
  if(popupMode){document.documentElement.classList.add('mosh-mini-window18');$('mini18Popout').hidden=true;$('mini18Hide').hidden=true;setText('mini18Hint','تصغير − يحوّل النافذة إلى شريط');}
 }
 function snapshot(){return W.miniSnapshot();}
 function chosen(s){return s.tasks.find(t=>t.id===(s.activeId||s.selectedId))||null;}
 function renderTasks(s){
  if(!picker)return;
  const query=$('mini18Search').value.trim().toLocaleLowerCase();
  const all=s.tasks.filter(t=>t.category!=='review'&&t.status==='in_progress');
  const matches=all.filter(t=>(t.title+' '+t.customer).toLocaleLowerCase().includes(query));
  const sig=JSON.stringify([query,s.busy,s.uncertain,uiBusy,online(),matches.map(t=>[t.id,t.title,t.customer,t.category,t.label,t.employeeState,t.allowed])]);if(sig===lastListSig)return;lastListSig=sig;
  const host=$('mini18TaskList');host.replaceChildren();
  for(const task of matches.slice(0,40)){
   const row=document.createElement('div');row.className='mini18-item';const detail=document.createElement('div');
   const name=document.createElement('b');name.textContent=task.title;const meta=document.createElement('small');meta.textContent=[task.customer,task.label].filter(Boolean).join(' · ');detail.append(name,meta);
   const button=document.createElement('button');button.type='button';button.dataset.mini18Task=task.id;button.textContent=task.category==='new'?'استلام':task.employeeState==='working'?'تعمل عليها':'بدء';
   button.disabled=uiBusy||s.busy||s.uncertain||!online()||!task.allowed||task.employeeState==='working';row.append(detail,button);host.append(row);
  }
  if(!matches.length){const el=document.createElement('p');el.className='mini18-empty';el.textContent=query?'لا توجد مهمة مطابقة.':'لا توجد مهام متاحة للتنفيذ حالياً.';host.append(el);}
  if(matches.length>40){const el=document.createElement('p');el.className='mini18-empty';el.textContent='ظهرت أول 40 مهمة؛ اكتب جزءاً من الاسم لتضييق البحث.';host.append(el);}
 }
 function clearPrivateDisplay(){
  for(const id of ['mini18TaskTitle','mini18Client','mini18Employee','mini18CompactTask','mini18Timer','mini18CompactTimer','mini18TotalTask','mini18TotalBreak','mini18TotalNoWork'])setText(id,'');
  $('mini18TaskList')?.replaceChildren();
 }
 function render(){
  ensure();const user=currentUser();
  if(locked||!user||!A.user){root().hidden=true;clearPrivateDisplay();document.documentElement.classList.remove('mini18-session-ready');return;}
  const s=snapshot();
  if(s.userId!==owner){owner=s.userId;picker=false;compact=false;lastListSig='';message='';if(!popupMode)shown=false;}
  root().hidden=!shown;root().classList.toggle('mini18-is-compact',compact);
  const button=$('moshMiniToggle18');button?.setAttribute('aria-expanded',String(shown));
  if(!shown)return;
  document.documentElement.classList.add('mini18-session-ready');
  const task=chosen(s),blocked=uiBusy||s.busy||s.uncertain||!online()||!s.employee;
  setText('mini18Employee',s.employee?.name||user.name||user.username||'');
  const modeText={task:'قيد التنفيذ',break:'استراحة',no_work:'لا يوجد عمل',off:s.label,ready:task?.label||s.label};
  setText('mini18Status',uiBusy||s.busy?'جارٍ الحفظ…':modeText[s.kind]||s.label);
  setText('mini18TaskTitle',task?.title||(!s.employee?'الحساب غير مربوط بموظف':'اختر مهمة للبدء'));
  setText('mini18Client',task?.customer||'');
  const time=task&&online()&&s.clockConfirmed?duration(task.totalMs):'—';
  setText('mini18Timer',time);setText('mini18CompactTimer',time);
  setText('mini18CompactTask',task?.title||s.label||'اختر مهمة');
  $('mini18CompactTask').title=[task?.title,s.label].filter(Boolean).join(' · ');
  setText('mini18TimerLabel',s.kind==='break'?'الوقت المسجّل على المهمة · في استراحة':s.kind==='no_work'?'الوقت المسجّل على المهمة · بلا عمل':'الوقت المسجّل على المهمة');
  let primary='اختر مهمة';
  if(task)primary=task.category==='new'?'تم استلام المهمة':task.category==='review'?'بانتظار المراجعة':task.employeeState==='working'?'إيقاف مؤقت':task.employeeState==='received'?'بدء المهمة':'استئناف المهمة';
  setText('mini18Primary',primary);$('mini18Primary').disabled=blocked||!!task&&(!task.allowed||task.category==='review');
  $('mini18Switch').disabled=blocked;
  setText('mini18Break',s.kind==='break'?'إنهاء الاستراحة':'استراحة ☕');$('mini18Break').setAttribute('aria-pressed',String(s.kind==='break'));$('mini18Break').disabled=blocked;
  setText('mini18NoWork',s.kind==='no_work'?'إنهاء حالة بلا عمل':'لا يوجد عمل لدي');$('mini18NoWork').setAttribute('aria-pressed',String(s.kind==='no_work'));$('mini18NoWork').disabled=blocked;
  $('mini18End').disabled=blocked||s.kind==='off';$('mini18Log').disabled=!s.employee||uiBusy||s.busy;
  for(const [key,id] of [['task','mini18TotalTask'],['break','mini18TotalBreak'],['no_work','mini18TotalNoWork']])setText(id,s.reportLoaded?duration(s.totals[key]):'—');
  $('mini18Picker').hidden=!picker;renderTasks(s);
  let msg='',err=false;
  if(!s.employee){msg='اربط هذا الحساب بملف الموظف من الموارد البشرية حتى تظهر مهامه وأوقاته.';err=true;}
  else if(!online()){msg='الاتصال مقطوع. لن نغيّر حالتك أو نخزّن أوقاتاً بديلة. حدّث الحالة بعد عودة الاتصال.';err=true;}
  else if(s.uncertain){msg='نتيجة الحفظ السابق غير مؤكدة؛ تحقّق منها قبل تنفيذ أي إجراء جديد.';err=true;}
  else if(s.error){msg=s.error;err=true;}
  else if(uiBusy||s.busy)msg='جارٍ تأكيد الحفظ من الخادم…';
  else if(Date.now()<messageUntil){msg=message;err=messageError;}
  else if(task?.employeeState==='working'&&!task.timingValid){msg='بداية توقيت المهمة بحاجة مراجعة؛ استخدم لوحة عملي الكاملة لاستئناف التوقيت من الآن.';err=true;}
  else if(s.info)msg=s.info;
  else if(s.reportError){msg=s.reportError;err=true;}
  $('mini18Message').hidden=!msg;setText('mini18Message',msg);$('mini18Message').classList.toggle('error',err);
  $('mini18Resolve').hidden=!(s.uncertain||s.error);$('mini18Resolve').disabled=uiBusy||s.busy||!online();
  setText('mini18Connection',!online()?'غير متصل بالخادم':s.uncertain?'الحفظ بحاجة تحقق':s.busy||uiBusy?'جارٍ تأكيد العملية':'نفس حسابك وسجل الوقت في MOSH');
 }
 function setPicker(value){picker=!!value;lastListSig='';render();if(picker){$('mini18Search')?.focus();$('mini18Picker')?.scrollIntoView({block:'nearest'});}}
 async function sync(){
  if(locked||!currentUser()||uiBusy||W.isBusy()||A.isSaving?.()||!online()||dirty())return false;
  await W.refresh();lastSync=Date.now();needsSync=false;render();return !snapshot().error;
 }
 async function action(kind,id){
  if(locked||uiBusy||W.isBusy()||A.isSaving?.()||!online())return;
  // A read performed by another tab must not discard an unfinished form here.
  if(dirty()){notice('احفظ تعديلات الشاشة الحالية أو ألغها قبل تغيير حالة العمل من اللوحة المصغّرة.',true);return;}
  if(needsSync||Date.now()-lastSync>60000){if(!await sync())return;}
  if(locked||uiBusy||W.isBusy())return;
  uiBusy=true;message='';render();
  try{
   const ok=await W.perform(kind,id);
   if(ok){picker=false;lastSync=Date.now();needsSync=false;}
  }catch(error){notice(error?.message||'تعذر تأكيد العملية من الخادم.',true);}
  finally{uiBusy=false;render();}
 }
 function show(){ensure();shown=true;compact=false;render();if(!popupMode)clamp();if(needsSync&&!dirty())sync();}
 function hide(){if(popupMode){setCompact(true);return;}shown=false;picker=false;render();$('moshMiniToggle18')?.focus();}
 function toggle(){if(popupMode){setCompact(!compact);return;}if(!shown||compact)show();else hide();}
 function popupUrl(){const url=new URL(location.href);url.searchParams.set('moshMini','1');url.hash='';return url.href;}
 function openPopup(){
  if(!currentUser()||locked)return;
  try{
   if(popout&&!popout.closed){popout.focus();return;}
   popout=window.open(popupUrl(),'MOSH_MINI_R18','popup=yes,width=420,height=730,resizable=yes,scrollbars=yes');
   if(!popout){notice('المتصفح منع فتح النافذة. اسمح بالنوافذ المنبثقة لهذا الموقع ثم اضغط ↗ مرة أخرى.',true);return;}
   popout.focus();if(!popupMode){shown=false;render();}
  }catch(_){notice('تعذر فتح نافذة مستقلة. يمكنك استخدام اللوحة داخل التطبيق.',true);}
 }
 function resizePopup(value){
  if(!popupMode)return;
  try{
   const chromeW=Math.max(0,window.outerWidth-window.innerWidth),chromeH=Math.max(0,window.outerHeight-window.innerHeight);
   if(value){
    expandedSize={width:window.outerWidth,height:window.outerHeight};
    window.resizeTo(Math.max(390,Math.min(440,window.innerWidth))+chromeW,Math.max(86,root().querySelector('.mini18-compact').scrollHeight)+chromeH);
   }else if(expandedSize){window.resizeTo(expandedSize.width,expandedSize.height);}
   else window.resizeTo(420+chromeW,Math.min(730,screen.availHeight-100)+chromeH);
  }catch(_){/* Browser may disallow resizing tabs/mobile windows; UI still compacts. */}
 }
 function setCompact(value){
  if(locked)return;const changed=compact!==!!value;shown=true;picker=false;compact=!!value;render();if(changed)resizePopup(compact);if(!popupMode)clamp();
 }
 function full(){
  if(!popupMode){hide();return;}
  try{if(window.opener&&!window.opener.closed&&window.opener.location.origin===location.origin){window.opener.focus();window.opener.MoshMini18?.hide();return;}}catch(_){}
  const url=new URL(location.href);url.searchParams.delete('moshMini');location.assign(url.href);
 }
 function onClick(event){
  const item=event.target.closest('[data-mini18-task]');
  if(item){event.preventDefault();if(item.disabled)return;const s=snapshot(),t=s.tasks.find(t=>t.id===item.dataset.mini18Task);if(!t||!t.allowed)return;W.select(t.id);action(t.category==='new'?'receive':'start',t.id);return;}
  const button=event.target.closest('[data-mini18]');if(!button||button.disabled)return;
  event.preventDefault();const key=button.dataset.mini18,s=snapshot(),task=chosen(s);
  if(key==='compact')setCompact(true);else if(key==='expand')setCompact(false);else if(key==='hide')hide();else if(key==='popout')openPopup();
  else if(key==='picker')setPicker(!picker);else if(key==='picker-close')setPicker(false);
  else if(key==='primary'){if(!task)setPicker(true);else action(task.category==='new'?'receive':task.employeeState==='working'?'pause':'start',task.id);}
  else if(key==='break')action(s.kind==='break'?'work_start':'break');
  else if(key==='no_work')action(s.kind==='no_work'?'work_start':'no_work');
  else if(key==='work_end')action('work_end');
  else if(key==='refresh')sync();
  else if(key==='log'){if(compact)setCompact(false);W.showLog();}
  else if(key==='full')full();
 }
 function clamp(){
  if(popupMode||!root()||!shown)return;const b=root(),r=b.getBoundingClientRect();
  b.style.left=Math.max(8,Math.min(r.left,innerWidth-r.width-8))+'px';b.style.top=Math.max(8,Math.min(r.top,innerHeight-Math.min(r.height,innerHeight-16)-8))+'px';
 }
 function beginDrag(event){
  if(popupMode||event.button!==0||event.target.closest('button,input')||!event.target.closest('[data-mini18-drag]'))return;
  const r=root().getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:r.left,top:r.top};root().setPointerCapture(event.pointerId);event.preventDefault();
 }
 function endDrag(event){if(!drag||drag.id!==event.pointerId)return;drag=null;try{root().releasePointerCapture(event.pointerId);}catch(_){}clamp();}
 window.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;root().style.left=drag.left+event.clientX-drag.x+'px';root().style.top=drag.top+event.clientY-drag.y+'px';clamp();});
 window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);window.addEventListener('resize',clamp);
 window.addEventListener('keydown',event=>{
  if(!currentUser()||locked)return;
  if(event.ctrlKey&&event.altKey&&event.code==='KeyM'){event.preventDefault();event.stopImmediatePropagation();toggle();return;}
  if(event.key==='Escape'&&shown&&!modalOpen()&&(popupMode||root()?.contains(event.target))){event.preventDefault();event.stopImmediatePropagation();if(picker)setPicker(false);else if(compact&&!popupMode)hide();else setCompact(true);}
 },true);
 function sessionLock(){locked=true;shown=false;clearPrivateDisplay();root()&&(root().hidden=true);if(popupMode){setTimeout(()=>location.reload(),0);}else location.reload();}
 function broadcastLogout(){
  const packet={type:'logout',userId:owner,at:Date.now()};
  try{sessionChannel?.postMessage(packet);}catch(_){}
  try{localStorage.setItem('mosh-mini-r18-session-event',JSON.stringify(packet));}catch(_){}
  locked=true;shown=false;clearPrivateDisplay();if(root())root().hidden=true;
 }
 try{channel=new BroadcastChannel('mosh-workdesk-r2');channel.onmessage=()=>{needsSync=true;};}catch(_){}
 try{sessionChannel=new BroadcastChannel('mosh-mini-r18-session');sessionChannel.onmessage=e=>{if(e.data?.type==='logout'&&e.data.userId===owner)sessionLock();};}catch(_){}
 window.addEventListener('storage',e=>{if(e.key!=='mosh-mini-r18-session-event'||!e.newValue)return;try{const p=JSON.parse(e.newValue);if(p.type==='logout'&&p.userId===owner)sessionLock();}catch(_){} });
 document.addEventListener('mosh:logout-complete',broadcastLogout);
 document.addEventListener('mosh:session-expired',()=>{locked=true;shown=false;clearPrivateDisplay();if(root())root().hidden=true;},true);
 ['mosh:saved','mosh:tasks-refreshed','mosh:workdesk-transition'].forEach(type=>document.addEventListener(type,()=>{lastListSig='';render();}));
 document.addEventListener('mosh:refreshed',()=>{lastSync=Date.now();needsSync=false;lastListSig='';render();});
 document.addEventListener('mosh:ui-ready',render);
 window.addEventListener('online',()=>{needsSync=true;render();if(shown&&!dirty())sync();});window.addEventListener('offline',render);
 const onFocus=()=>{render();if(shown&&(needsSync||Date.now()-lastSync>60000)&&!dirty())sync();};
 window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',()=>{if(!document.hidden)onFocus();});
 window.MoshMini18={version:'r18-mini1',show,hide,toggle,openPopup,setCompact,render,sync,mode:popupMode?'window':'overlay'};
 ensure();render();
 // Some desktop browsers initially restore a previous named-window size.
 // Request the compact workdesk dimensions once, only for our script-opened popup.
 if(popupMode&&window.name==='MOSH_MINI_R18')setTimeout(()=>resizePopup(false),100);
 setInterval(()=>{if(locked)return;render();if(popupMode&&shown&&!document.hidden&&Date.now()-lastSync>60000&&!dirty())sync();},1000);
})();
