/* R4 — employee notice strip + explicit acknowledgement. Server stays authoritative. */
(function () {
  'use strict';
  const A = window.MoshApi, $ = id => document.getElementById(id);
  if (!A || window.MoshHomeNotices52) return;
  const arr = v => Array.isArray(v) ? v : [];
  const str = v => String(v == null ? '' : v);
  const esc = v => str(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => str(v).trim().toLocaleLowerCase();
  const bell = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6M12 1v1"/></svg>';
  let owner = '', dialogOwner = '', activeId = '', page = 1, filter = 'all', query = '';
  let fetching = false, busy = false, fetchEpoch = 0, error = '', detailError = '', returnFocus = null;
  let lastRefresh = 0, previousSignature = '', dialogSignature = '';
  const currentUser = () => A.user;
  const isHome = () => $('dashboardApp')?.classList.contains('active');
  const now = () => typeof A.serverNow === 'function' ? A.serverNow() : Date.now();
  function staff() {
    const u = currentUser();
    if (!u) return null;
    // Only explicit IDs. Never guess a different person's file from a display name.
    return arr(state.staffProfiles).find(p => str(p.id) === str(u.employeeId)) || null;
  }
  function relevant(n) {
    const u = currentUser(), p = staff();
    if (!u || !n || n.id == null || n.active === false || n.deletedAt) return false;
    const start = Date.parse(n.publishAt || n.startAt || ''), end = Date.parse(n.expiresAt || n.endAt || '');
    if (Number.isFinite(start) && start > now() || Number.isFinite(end) && end <= now()) return false;
    if (arr(p?.hrNoticeArchive).some(r => str(r.noticeId) === str(n.id) && r.deletedAt)) return false;
    if (Array.isArray(n.recipientIds)) return !!p && n.recipientIds.map(String).includes(str(p.id));
    if (Array.isArray(n.recipientSnapshots)) return !!p && n.recipientSnapshots.some(r => str(r.id || r.employeeId) === str(p.id));
    if (n.targetType === 'employee') return !!p && [str(p.id), str(p.name)].includes(str(n.targetValue));
    if (n.targetType === 'department') return !!p?.department && str(p.department) === str(n.targetValue);
    return !n.targetType || n.targetType === 'all';
  }
  function isRead(n) {
    const u = currentUser(), p = staff();
    if (!u) return false;
    // Historical username receipts were used only by accounts with no employee file.
    const keys = p ? [str(p.id)] : [str(u.username)];
    return keys.some(k => k && (arr(n.readBy).map(String).includes(k) || !!n.readAtBy?.[k])) ||
      !!p && arr(p.hrNoticeArchive).some(r => str(r.noticeId) === str(n.id) && !!r.readAt && !r.deletedAt);
  }
  const urgent = n => n.urgent === true || n.isUrgent === true || n.priority === 'urgent';
  const typeName = n => n.type === 'alert' ? 'تنبيه' : 'تعميم';
  function notices() {
    return arr(state.hrAnnouncements).filter(relevant).slice().sort((a,b) =>
      Number(isRead(a))-Number(isRead(b)) || Number(urgent(b))-Number(urgent(a)) ||
      (Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0) || str(a.id).localeCompare(str(b.id)));
  }
  function date(v) {
    if (!v) return '';
    const d = new Date(v); if (Number.isNaN(d.getTime())) return '';
    try { return new Intl.DateTimeFormat('ar-SY', {dateStyle:'medium',timeStyle:'short',timeZone:window.MoshWorkdesk50?.daySnapshot?.()?.timeZone || undefined}).format(d); }
    catch (_) { return d.toLocaleString('ar-SY'); }
  }
  function updateText(id, value) { const e=$(id), s=str(value); if(e && e.textContent!==s)e.textContent=s; }
  function mount() {
    const root=$('employeeSpaceV11'), header=root?.querySelector('.es11-header'), bindings=$('es11OriginalBindings');
    if (!root || !header || !bindings) return false;
    root.classList.add('nt52-home');
    if (!$('moshNoticeStrip52')) {
      const strip=document.createElement('section'); strip.id='moshNoticeStrip52';strip.className='nt52-strip';strip.dir='rtl';
      strip.setAttribute('aria-labelledby','nt52Heading');
      strip.innerHTML='<div class="nt52-strip-head"><div class="nt52-heading">'+bell+'<h3 id="nt52Heading">التنبيهات والتعاميم</h3><span id="nt52Count" class="nt52-count" aria-live="polite" aria-atomic="true"></span></div><div class="nt52-strip-tools"><button type="button" class="nt52-icon" data-nt52-refresh aria-label="تحديث التنبيهات" title="تحديث التنبيهات">↻</button><button type="button" class="nt52-link" data-nt52-list>عرض الجميع ←</button></div></div><div id="nt52Feature" class="nt52-feature" hidden></div><div id="nt52Error" class="nt52-error" role="status" hidden></div>';
      header.after(strip);
    }
    // Keep legacy binding IDs alive, but remove the duplicate tiles/cards from the layout.
    for (const id of ['es11RecentAttendance','es11RecentNotices']) {
      const card=$(id)?.closest('article');
      if (card && !bindings.contains(card)) {card.hidden=true;bindings.appendChild(card);}
    }
    const oldTile=$('employeeAnnouncementBtn');if(oldTile&&!bindings.contains(oldTile)){oldTile.hidden=true;bindings.appendChild(oldTile);}
    root.querySelectorAll('details[data-c19-key="employee-latest"]').forEach(e => e.remove());
    const grid=root.querySelector('.es11-bottom-grid');if(grid)grid.classList.add('c19-quick-only');
    return true;
  }
  function checkOwner() {
    const k=str(currentUser()?.id)+':'+str(currentUser()?.employeeId);
    if (k===owner) return;
    owner=k;fetchEpoch++;fetching=false;busy=false;error='';detailError='';activeId='';query='';page=1;filter='all';lastRefresh=0;previousSignature='';dialogSignature='';
    $('moshNoticeDialog52')?.close();
  }
  function render() {
    checkOwner();if(!mount())return;
    const strip=$('moshNoticeStrip52');strip.hidden=!currentUser();if(!currentUser())return;
    const all=notices(), unread=all.filter(n=>!isRead(n)), n=unread[0];
    const signature=JSON.stringify([owner,unread.map(x=>[x.id,x.title,x.message,x._version,urgent(x)]),all.length,error,fetching]);
    if (previousSignature!==signature) {
      previousSignature=signature;strip.classList.toggle('has-new',!!n);
      updateText('nt52Count',unread.length?unread.length+' غير مقروءة':'لا يوجد جديد');
      strip.querySelector('[data-nt52-list]').textContent=unread.length?'عرض الجميع ←':'السجل ←';
      strip.querySelector('[data-nt52-refresh]').disabled=fetching;
      const feature=$('nt52Feature');feature.hidden=!n;
      if(n) feature.innerHTML='<div class="nt52-feature-copy"><div class="nt52-feature-title">'+(urgent(n)?'<span class="nt52-urgent">عاجل</span>':'')+'<button type="button" data-nt52-open="'+esc(n.id)+'">'+esc(n.title||typeName(n))+'</button></div><p>'+esc(n.message||'')+'</p><small>'+esc([typeName(n),n.sourceDepartment||n.createdBy||'الإدارة',date(n.createdAt)].filter(Boolean).join(' · '))+'</small></div><button type="button" class="nt52-open" data-nt52-open="'+esc(n.id)+'">عرض '+typeName(n)+' ←</button>';
      else feature.replaceChildren();
      $('nt52Error').hidden=!error;updateText('nt52Error',error);
    }
    const dlg=$('moshNoticeDialog52');
    if (dlg?.open && dialogOwner===owner) {
      if(activeId)renderDetail();else renderList();
    }
  }
  async function refresh(force=false) {
    checkOwner();if(!currentUser()||fetching||busy||!force&&!isHome()||document.visibilityState==='hidden')return false;
    if(!force&&now()-lastRefresh<60000)return false;
    const epoch=fetchEpoch,key=owner;fetching=true;render();
    try {
      const ok=await A.refreshAnnouncements();
      if(epoch!==fetchEpoch||key!==owner)return false;
      lastRefresh=now();if(ok)error='';return ok;
    } catch(e) {
      if(epoch===fetchEpoch&&key===owner){lastRefresh=now();error='تعذر تحديث التنبيهات. المعروض هو آخر سجل تم تحميله؛ اضغط ↻ للمحاولة مجدداً.';}
      return false;
    } finally {if(epoch===fetchEpoch&&key===owner){fetching=false;render();}}
  }
  function dialog() {
    let d=$('moshNoticeDialog52');if(d)return d;
    d=document.createElement('dialog');d.id='moshNoticeDialog52';d.className='nt52-dialog';d.dir='rtl';d.setAttribute('aria-labelledby','nt52DialogTitle');
    d.innerHTML='<header><div><span>مساحة الموظف · رسائلي</span><h2 id="nt52DialogTitle">التنبيهات والتعاميم</h2></div><button type="button" class="nt52-icon" data-nt52-close aria-label="إغلاق التنبيهات">×</button></header><div id="nt52DialogContent"></div>';
    d.addEventListener('close',()=>{activeId='';dialogSignature='';if(returnFocus?.isConnected)returnFocus.focus();});
    document.body.appendChild(d);return d;
  }
  function showList(value='all') {
    checkOwner();if(!currentUser())return;mount();
    returnFocus=document.activeElement;activeId='';detailError='';query='';page=1;filter=['new','all','alert','announcement'].includes(value)?value:'all';dialogOwner=owner;dialogSignature='';
    const d=dialog();
    $('nt52DialogTitle').textContent='التنبيهات والتعاميم';
    $('nt52DialogContent').innerHTML='<div class="nt52-list-tools"><label><span class="nt52-sr">بحث في الرسائل</span><input id="nt52Search" type="search" autocomplete="off" placeholder="بحث بالعنوان أو محتوى الرسالة…"></label><select id="nt52Filter" aria-label="تصفية الرسائل"><option value="all">جميع الرسائل</option><option value="new">غير مقروءة</option><option value="announcement">التعاميم</option><option value="alert">التنبيهات</option></select></div><div id="nt52ListRows"></div><footer class="nt52-list-footer"><span id="nt52PageLabel"></span><div><button type="button" class="nt52-link" data-nt52-prev>السابق</button><button type="button" class="nt52-link" data-nt52-next>التالي</button></div></footer>';
    $('nt52Filter').value=filter;renderList();if(!d.open)d.showModal();$('nt52Search').focus();void refresh(true);
  }
  function filtered() {return notices().filter(n=>(filter==='all'||filter==='new'&&!isRead(n)||n.type===filter)&&(!query||norm([n.title,n.message,n.createdBy,n.sourceDepartment].join(' ')).includes(norm(query))));}
  function renderList() {
    if(!$('nt52ListRows'))return;
    const rows=filtered(), pages=Math.max(1,Math.ceil(rows.length/20));page=Math.min(page,pages);
    const signature=JSON.stringify([rows,page,filter,query]);if(dialogSignature===signature)return;dialogSignature=signature;
    $('nt52ListRows').innerHTML=rows.slice((page-1)*20,page*20).map(n=>'<article class="nt52-list-row '+(isRead(n)?'':'unread')+'"><div class="nt52-row-title"><h3><button type="button" data-nt52-open="'+esc(n.id)+'">'+esc(n.title||typeName(n))+'</button></h3><span class="nt52-read-tag">'+(isRead(n)?'تم الاطلاع':'غير مقروءة')+'</span>'+(urgent(n)?'<span class="nt52-urgent">عاجل</span>':'')+'</div><p>'+esc(n.message||'')+'</p><small>'+esc([typeName(n),n.sourceDepartment||n.createdBy||'الإدارة',date(n.createdAt)].filter(Boolean).join(' · '))+'</small><button type="button" class="nt52-link" data-nt52-open="'+esc(n.id)+'">فتح الرسالة ←</button></article>').join('')||'<div class="nt52-empty">'+(query?'لا توجد رسائل مطابقة للبحث.':filter==='new'?'لا توجد رسائل غير مقروءة.':'لا توجد رسائل موجهة لحسابك حالياً.')+'</div>';
    updateText('nt52PageLabel',rows.length+' رسالة · '+page+' / '+pages);
    const d=$('moshNoticeDialog52');d.querySelector('[data-nt52-prev]').disabled=page<=1;d.querySelector('[data-nt52-next]').disabled=page>=pages;
  }
  function open(id) {
    checkOwner();if(!currentUser())return false;
    const n=notices().find(x=>str(x.id)===str(id));if(!n)return false;
    if(!$('moshNoticeDialog52')?.open)returnFocus=document.activeElement;
    activeId=str(id);dialogOwner=owner;dialogSignature='';detailError='';const d=dialog();renderDetail();if(!d.open)d.showModal();
    d.querySelector('[data-nt52-close]')?.focus();return true;
  }
  function renderDetail() {
    const n=notices().find(x=>str(x.id)===activeId), saved=n&&isRead(n);
    const sig=JSON.stringify([n,saved,busy,detailError,owner]);if(sig===dialogSignature)return;dialogSignature=sig;
    updateText('nt52DialogTitle',n?.title||'الرسالة غير متاحة');
    if(!n){$('nt52DialogContent').innerHTML='<div class="nt52-empty">هذه الرسالة لم تعد متاحة لحسابك.</div><footer><button type="button" class="nt52-link" data-nt52-list>العودة إلى السجل</button></footer>';return;}
    const readAt=n.readAtBy?.[staff()?.id];
    $('nt52DialogContent').innerHTML='<div class="nt52-detail-meta"><span>'+esc(typeName(n))+'</span>'+(urgent(n)?'<span class="nt52-urgent">عاجل</span>':'')+'<span>'+esc(n.sourceDepartment||n.createdBy||'الإدارة')+'</span><time>'+esc(date(n.createdAt))+'</time></div><div class="nt52-message">'+esc(n.message||'لا يوجد نص إضافي.')+'</div><div class="nt52-ack-note">'+(saved?'✓ تم تسجيل الاطلاع'+(readAt?' · '+esc(date(readAt)):''):'فتح الرسالة لا يسجل الاطلاع تلقائياً. اضغط «تم الاطلاع» بعد قراءتها.')+'</div><div class="nt52-error" role="alert" '+(detailError?'':'hidden')+'>'+esc(detailError)+'</div>'+(!staff()?'<div class="nt52-error">يلزم ربط الحساب بملف موظف لتأكيد الاطلاع باسمه.</div>':'')+'<footer><button type="button" class="nt52-link" data-nt52-list>العودة إلى السجل ←</button>'+(saved?'<span class="nt52-confirmed">✓ تم الاطلاع</span>':'<button type="button" class="nt52-ack" data-nt52-ack="'+esc(n.id)+'" '+(busy||!staff()?'disabled':'')+'>'+(busy?'جارٍ تأكيد الحفظ…':'✓ تم الاطلاع')+'</button>')+'</footer>';
  }
  async function acknowledge(id) {
    if(busy)return false;checkOwner();
    const n=notices().find(x=>str(x.id)===str(id)), p=staff(), key=owner;
    if(!n||!p||activeId!==str(id)||!$('moshNoticeDialog52')?.open)return false;
    if(isRead(n))return true;
    busy=true;detailError='';render();
    try {
      await A.acknowledgeAnnouncement(id,p.id);
      if(owner!==key)return false;
      detailError='';return true;
    } catch(e) {
      if(owner===key)detailError='لم يتم تأكيد الاطلاع. '+(e.status===403?'الخادم لم يسمح بتسجيل الاطلاع لهذا الحساب.':e.message)+' حدّث السجل قبل إعادة المحاولة.';
      return false;
    } finally {
      if(owner===key){busy=false;render();if(activeId===str(id))$('moshNoticeDialog52')?.querySelector('[data-nt52-list]')?.focus();}
    }
  }
  // Override the employee inbox only. Manager composition, recipients and archives are unchanged.
  window.openEmployeeAnnouncements=showList;
  window.addEventListener('click',e=>{
    const legacy=e.target.closest?.('[data-m15="notice-read"]');
    if(legacy){e.preventDefault();e.stopImmediatePropagation();open(legacy.dataset.value);return;}
    const b=e.target.closest?.('button');if(!b)return;
    if(b.hasAttribute('data-nt52-open')){e.preventDefault();e.stopImmediatePropagation();open(b.dataset.nt52Open);}
    else if(b.hasAttribute('data-nt52-list')){e.preventDefault();e.stopImmediatePropagation();showList();}
    else if(b.hasAttribute('data-nt52-close')){e.preventDefault();e.stopImmediatePropagation();$('moshNoticeDialog52')?.close();}
    else if(b.hasAttribute('data-nt52-ack')){e.preventDefault();e.stopImmediatePropagation();void acknowledge(b.dataset.nt52Ack);}
    else if(b.hasAttribute('data-nt52-refresh')){e.preventDefault();e.stopImmediatePropagation();void refresh(true);}
    else if(b.hasAttribute('data-nt52-prev')||b.hasAttribute('data-nt52-next')){e.preventDefault();e.stopImmediatePropagation();page=Math.max(1,page+(b.hasAttribute('data-nt52-next')?1:-1));renderList();}
  },true);
  document.addEventListener('input',e=>{if(e.target.id==='nt52Search'){query=e.target.value;page=1;renderList();}});
  document.addEventListener('change',e=>{if(e.target.id==='nt52Filter'){filter=e.target.value;page=1;renderList();}});
  ['mosh:refreshed','mosh:announcements-refreshed','mosh:announcement-read','mosh:saved'].forEach(name=>document.addEventListener(name,render));
  document.addEventListener('mosh:session-expired',()=>{fetchEpoch++;$('moshNoticeDialog52')?.close();if($('moshNoticeStrip52'))$('moshNoticeStrip52').hidden=true;});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){render();void refresh(true);}});
  window.addEventListener('focus',()=>{render();void refresh(false);});
  window.MoshHomeNotices52={version:'R4',render,refresh,open,showList,acknowledge,rows:notices,unread:()=>notices().filter(n=>!isRead(n)),isRead};
  render();setTimeout(()=>{render();void refresh(true);},1000);
  setInterval(()=>{render();if(isHome())void refresh(false);},2000);
})();
