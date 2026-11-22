/* R20 attendance header. Header shows fingerprint entry only; physical
 * attendance duration is published for the employee-file portal.
 * Read-only presentation layer on the MOSH interface.
 * Uses the existing verified workday snapshot; never starts work, writes a
 * punch, changes a task, or creates an additional API request.
 */
(function () {
  'use strict';
  if (window.MoshPresenceHeader20) return;
  const ID = 'r20PresenceHeader';
  const DAY = 86400000, LIVE_LIMIT = 20 * 3600000;
  const text = value => String(value == null ? '' : value).trim();
  const list = value => Array.isArray(value) ? value : [];
  const model = () => window.MoshWorkdayModel50;
  let override = null, context = null, contextReadAt = 0, timer = 0, observer = null, scheduled = false;
  let currentResult = null, publishedSignature = '';
  const copyResult = value => value == null ? null : {...value,issues:[...(value.issues || [])],windows:(value.windows || []).map(row => ({...row}))};

  function derive(input, at) {
    const M = model(), ctx = input || {}, snap = ctx.snapshot;
    const blank = {entry:'—',entryLabel:'بصمة الدخول',duration:'—',state:'loading',status:'جارٍ قراءة سجل الحضور',firstAt:null,totalMs:null,live:false,issues:[]};
    if (!ctx.userId) return {...blank,state:'signed-out',status:'سجّل الدخول لعرض حضورك'};
    if (!ctx.employeeId) return {...blank,state:'unlinked',status:'الحساب غير مرتبط بملف موظف'};
    if (!M || !snap || text(snap.employeeId) !== text(ctx.employeeId)) return blank;
    const zone = snap.timeZone || ctx.timeZone || 'Asia/Damascus';
    let now = M.epoch(at == null ? ctx.now : at);
    const stamp = M.epoch(snap.asOf);
    if (!Number.isFinite(now) || !Number.isFinite(stamp)) return blank;
    const synchronized = ctx.clockConfirmed === true;
    if (!synchronized || ctx.online === false) now = Math.min(now,stamp);
    const date = M.dateKey(now,zone), begin = M.wallTime(date,'00:00',zone), finish = M.wallTime(M.nextDate(date),'00:00',zone);
    if (snap.date !== date || !Number.isFinite(begin) || !Number.isFinite(finish)) return {...blank,status:'جارٍ تحديث حضور اليوم'};
    const intervals = [], issues = [], seen = new Set();
    let firstAt = null, lastOut = null, live = false, reviewRecord = false;
    for (const row of list(snap.attendance)) {
      if (!row || row.cancelled || row.deletedAt || ['cancelled','canceled','deleted','rejected','overridden'].includes(text(row.status).toLowerCase())) continue;
      const recordDate = text(row.date || row.workDate || row.createdAt).slice(0,10);
      const inValue = row.inTime || row.checkIn || row.firstIn || row.startTime || row.start;
      const outValue = row.outTime || row.checkOut || row.lastOut || row.endTime || row.end;
      let start = M.epoch(row.inAt || row.startAt), end = M.epoch(row.outAt || row.endAt);
      if (!Number.isFinite(start)) start = /^\d{1,2}:/.test(text(inValue)) ? M.wallTime(recordDate,text(inValue),zone) : M.epoch(inValue);
      if (!Number.isFinite(end) && outValue) end = /^\d{1,2}:/.test(text(outValue)) ? M.wallTime(recordDate,text(outValue),zone) : M.epoch(outValue);
      if (!Number.isFinite(start)) {
        if (recordDate === date) issues.push('بصمة الدخول مفقودة أو غير صالحة.');
        continue;
      }
      if (start >= finish || (start < begin - DAY && !Number.isFinite(end))) continue;
      if (start > now) { if (recordDate === date) issues.push('بصمة الدخول لاحقة لوقت النظام.'); continue; }
      if (Number.isFinite(end) && end < start && /^\d{1,2}:/.test(text(outValue))) end = M.wallTime(M.nextDate(recordDate),text(outValue),zone);
      const closed = Number.isFinite(end);
      const hasExit = !!(outValue || row.outAt || row.endAt);
      let isLive = false;
      if (!closed) {
        if (hasExit || ['closed','completed'].includes(text(row.status).toLowerCase())) {
          if (recordDate === date || start >= begin - DAY) issues.push('بصمة الخروج ناقصة أو غير صالحة؛ المدة تحتاج مراجعة.');
          continue;
        }
        const explicitOpen = text(row.status).toLowerCase() === 'open';
        if ((M.dateKey(start,zone) === date || explicitOpen) && now - start <= LIVE_LIMIT) { end = now; isLive = true; }
        else {
          if (start >= begin - DAY) issues.push('هناك دخول سابق دون خروج مؤكد؛ لا نفترض استمرار الحضور.');
          continue;
        }
      }
      if (closed && end <= begin) continue;
      if (end < start || end > now || end - start > DAY || (closed && end === start)) {
        issues.push('توقيت الحضور متعارض؛ لم تُخمن المدة.'); continue;
      }
      const key = start + '|' + end + '|' + isLive;
      if (seen.has(key)) continue;
      seen.add(key);
      intervals.push({start,end});
      firstAt = firstAt == null ? start : Math.min(firstAt,start);
      if (closed) lastOut = lastOut == null ? end : Math.max(lastOut,end);
      live = live || isLive;
      // One real ZKTeco entry is marked needsHrReview until its matching exit.
      // That does not make the recorded entry disappear or imply task activity.
      if (closed && row.needsHrReview) reviewRecord = true;
    }
    intervals.sort((a,b) => a.start - b.start || a.end - b.end);
    let maxEnd = -Infinity;
    for (const interval of intervals) {
      if (interval.start < maxEnd) issues.push('سجلات بصمة متداخلة؛ الوقت محسوب مرة واحدة ويحتاج مراجعة.');
      maxEnd = Math.max(maxEnd,interval.end);
    }
    if (reviewRecord) issues.push('يوجد سجل حضور يحتاج مراجعة الموارد البشرية.');
    const uniqueIssues = [...new Set(issues)];
    if (firstAt == null) return {...blank,state:uniqueIssues.length ? 'review' : 'missing',entry:uniqueIssues.length ? 'بحاجة إلى مراجعة' : 'لم تُسجّل',status:uniqueIssues[0] || 'لا توجد بصمة دخول مسجلة لليوم',issues:uniqueIssues};
    const windows = M.union(intervals), totalMs = windows.reduce((sum,row) => sum + row.end - row.start,0);
    const minutes = Math.floor(totalMs / 60000), hours = Math.floor(minutes / 60);
    let entry;
    try { entry = new Intl.DateTimeFormat('ar-SY-u-nu-latn',{timeZone:zone,hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date(firstAt)); }
    catch (_) { entry = new Date(firstAt).toISOString().slice(11,16); }
    let state = uniqueIssues.length ? 'review' : live ? 'inside' : 'outside';
    let status = uniqueIssues.length ? 'الحضور بحاجة إلى مراجعة' : live ? 'داخل الشركة' : 'انتهى الحضور';
    if (!synchronized || ctx.online === false) { state = 'unconfirmed'; status = ctx.online === false ? 'آخر حضور مؤكد · بانتظار الاتصال' : 'بانتظار مزامنة ساعة النظام'; live = false; }
    const dayLabel = M.dateKey(firstAt,zone) !== date ? ' · أمس' : '';
    return {entry,entryLabel:'بصمة الدخول'+dayLabel,duration:String(hours).padStart(2,'0')+' س '+String(minutes % 60).padStart(2,'0')+' د',state,status,firstAt,lastOut,totalMs,live,issues:uniqueIssues,windows};
  }

  const icon = paths => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
  function mount() {
    const tools = document.querySelector('#employeeSpaceV11 .es11-header-tools');
    if (!tools) return null;
    let group = document.getElementById(ID);
    if (!group) {
      group = document.createElement('div'); group.id = ID; group.className = 'r20-presence-strip'; group.dir = 'rtl';
      group.setAttribute('role','group'); group.setAttribute('aria-label','بصمة الدخول');
      group.innerHTML = '<div class="r20-presence-fact">'+icon('<path d="M9 3H5v18h4M14 8l4 4-4 4M8 12h10"/>')+'<div class="r20-presence-copy"><span class="r20-presence-label"><span id="r20PresenceEntryLabel">بصمة الدخول</span><span id="r20PresenceState" class="r20-presence-state" aria-label="جارٍ قراءة سجل الحضور"></span></span><bdi id="r20PresenceEntry" class="r20-presence-value" dir="auto">—</bdi></div></div>';
      tools.insertBefore(group,tools.firstChild);
    }
    if (group.parentElement !== tools || tools.firstElementChild !== group) tools.insertBefore(group,tools.firstChild);
    document.documentElement.classList.add('mosh-presence-review20');
    return group;
  }
  function readContext(force) {
    if (override) return override;
    if (force || !context || Date.now() - contextReadAt >= 10000) {
      contextReadAt = Date.now();
      try { context = window.MoshWorkdesk50?.reminderContext?.() || null; } catch (_) { context = null; }
    }
    return context;
  }
  function setText(id,value) { const element = document.getElementById(id); if (element && element.textContent !== value) element.textContent = value; }
  function render(force) {
    const group = mount(), ctx = readContext(force);
    const result = {...derive(ctx,window.MoshApi?.serverNow?.() || ctx?.now || Date.now()),userId:text(ctx?.userId),employeeId:text(ctx?.employeeId)};
    currentResult = copyResult(result);
    if (group) {
      const hidden = result.state === 'signed-out'; if (group.hidden !== hidden) group.hidden = hidden;
      setText('r20PresenceEntryLabel',result.entryLabel); setText('r20PresenceEntry',result.entry);
      if (group.dataset.state !== result.state) group.dataset.state = result.state;
      const note = [result.status,...result.issues].join(' · ');
      if (group.title !== note) group.title = note;
      const dot = document.getElementById('r20PresenceState');
      if (dot && dot.getAttribute('aria-label') !== result.status) dot.setAttribute('aria-label',result.status);
      const accessible = result.entryLabel+': '+result.entry+'، '+result.status;
      if (group.getAttribute('aria-label') !== accessible) group.setAttribute('aria-label',accessible);
    }
    const signature = JSON.stringify([result.userId,result.employeeId,result.entry,result.entryLabel,result.duration,result.state,result.status,result.issues]);
    if (signature !== publishedSignature) {
      publishedSignature = signature;
      document.dispatchEvent(new CustomEvent('mosh:r20-presence-updated',{detail:copyResult(result)}));
    }
    return copyResult(result);
  }
  function schedule() { if (!scheduled) { scheduled = true; requestAnimationFrame(() => { scheduled = false; render(true); }); } }
  const events = ['mosh:ui-ready','mosh:refreshed','mosh:r19-ready','mosh:r19-change','mosh:tasks-refreshed','mosh:saved','mosh:r20-attendance-updated','mosh:session-expired'];
  events.forEach(name => document.addEventListener(name,schedule));
  document.addEventListener('visibilitychange',schedule); window.addEventListener('focus',schedule);
  window.addEventListener('online',schedule); window.addEventListener('offline',schedule);
  // Observe only mounting/removal, ignoring clock and value text changes.
  const host = document.getElementById('employeeSpaceV11');
  if (host) {
    observer = new MutationObserver(records => {
      if (!document.getElementById(ID) || records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches?.('.es11-header-tools') || node.querySelector?.('.es11-header-tools'))))) schedule();
    });
    observer.observe(host,{childList:true,subtree:true});
  }
  timer = setInterval(() => { if (!document.hidden) render(false); },1000);
  window.MoshPresenceHeader20 = {
    derive,mount,refresh:() => render(true),current:() => copyResult(currentResult),
    setContext(value) { override = value; return render(true); },
    useLiveContext() { override = null; context = null; return render(true); },
    destroy() {
      clearInterval(timer); observer?.disconnect(); events.forEach(name => document.removeEventListener(name,schedule));
      document.removeEventListener('visibilitychange',schedule); window.removeEventListener('focus',schedule);
      window.removeEventListener('online',schedule); window.removeEventListener('offline',schedule);
      document.getElementById(ID)?.remove(); currentResult = null; delete window.MoshPresenceHeader20;
    }
  };
  render(true);
})();
