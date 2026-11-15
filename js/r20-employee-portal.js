/* R20 employee-file layout: reorganizes the original employee portal.
 * Keeps its renderer, live balances, request/document lists, service buttons,
 * delegated handlers and dialogs. Keeps existing API writes and business records unchanged; adds no new business writes or timers. */
(function () {
  'use strict';
  if (window.MoshEmployeePortal20) return;
  const $ = id => document.getElementById(id);
  const str = value => String(value == null ? '' : value);
  const sections = [
    {key:'attendance',title:'دوامي',content:'employeePortalAttendance',icon:'clock'},
    {key:'leave',title:'إجازاتي',content:'employeePortalLeaveDetails',icon:'calendar'},
    {key:'requests',title:'طلباتي',content:'employeePortalRequests',icon:'request'},
    {key:'documents',title:'وثائقي',content:'employeePortalDocuments',icon:'file'}
  ];
  const requestActions = {
    annual_leave:['leave','r202AnnualLeave','calendar'],hourly_leave:['leave','r202HourlyLeave','clock'],
    attendance_correction:['attendance','r202AttendanceCorrection','edit'],advance:['requests','r202Advance','wallet'],
    salary_certificate:['requests','r202SalaryCertificate','check'],document_update:['documents','r202DocumentUpdate','upload']
  };
  const paths = {
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    calendar:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 4h2m3 0h2m-7 3h2"/>',
    request:'<path d="M14 3H5v18h14V8Z"/><path d="M14 3v6h5M8 13h8m-8 4h5"/>',
    file:'<path d="M14 3H5v18h14V8Z"/><path d="M14 3v6h5M8 14h8"/>',
    check:'<path d="M9 4H5v17h14V4h-4M9 3h6v4H9zM8 14l3 3 5-6"/>',
    edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/>',
    wallet:'<path d="M19 7V4H6a3 3 0 0 0 0 6h14v10H6a3 3 0 0 1-3-3V7"/><path d="M20 12h-5v5h5m-2-2.5h.01"/>',
    upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
    history:'<path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7M12 7v5l3 2"/>'
  };
  const icon = key => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[key]+'</svg>';
  const records = new WeakMap(), foldStates = new Map();
  let mountedPortal = null, observer = null, queued = false, deferredRender = null, presence = null;
  const text = (node,value) => { value = str(value); if (node && node.textContent !== value) node.textContent = value; };
  function profile() { try { return window.employeePortalCurrentProfile?.() || null; } catch (_) { return null; } }
  function identity() { const user = window.MoshApi?.user || {}; return str(user.id)+':'+str(user.employeeId || user.employee_id || profile()?.id); }
  function activeEditor(portal) {
    const focus = document.activeElement;
    return !!(focus && portal?.contains(focus) && focus.matches?.('input,select,textarea,[contenteditable="true"],[contenteditable=""]'));
  }
  function move(node,parent) { if (node && parent && node.parentNode !== parent) parent.appendChild(node); }
  function hide(node) { if (node && !node.hidden) node.hidden = true; }
  function stateFor(owner) { if (!foldStates.has(owner)) foldStates.set(owner,{}); return foldStates.get(owner); }

  function styleAction(button, key) {
    if (!button) return;
    // Keep the original button, inline action and delegated listeners intact.
    if (!button.querySelector('.r203-action-icon')) {
      const holder = document.createElement('span'); holder.innerHTML = icon(key || 'request');
      const svg = holder.firstElementChild; svg.classList.add('r203-action-icon');
      button.insertBefore(svg,button.firstChild);
    }
    const label = button.querySelector('b'), description = button.querySelector('small');
    if (label && button.getAttribute('aria-label') !== label.textContent.trim()) button.setAttribute('aria-label',label.textContent.trim());
    if (description) {
      if (!description.id) description.id = button.id+'-description';
      hide(description);
      if (button.getAttribute('aria-describedby') !== description.id) button.setAttribute('aria-describedby',description.id);
      if (button.title !== description.textContent.trim()) button.title = description.textContent.trim();
    }
  }

  function createFold(config, record) {
    const fold = document.createElement('details');
    fold.id = 'r202PortalSection-'+config.key;
    fold.className = 'r202-portal-section'; fold.dataset.r202Section = config.key;
    const summary = document.createElement('summary');
    summary.id = 'r202PortalSummary-'+config.key;
    summary.innerHTML = icon(config.icon)+'<strong>'+config.title+'</strong><span class="r202-section-hint"></span><svg class="r202-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>';
    const body = document.createElement('div'); body.className = 'r202-section-body';
    body.id = 'r202PortalBody-'+config.key;
    const actions = document.createElement('div'); actions.className = 'employee-portal-services r202-portal-actions';
    actions.dataset.r202Actions = config.key;
    body.appendChild(actions); fold.append(summary,body);
    const saved = stateFor(record.identity); fold.open = saved[config.key] === true;
    fold.addEventListener('toggle',() => { stateFor(record.identity)[config.key] = fold.open; });
    record.grid.appendChild(fold);
    return {fold,summary,body,actions,hint:summary.querySelector('.r202-section-hint')};
  }
  function ensureStructure(portal) {
    let record = records.get(portal);
    if (!record) {
      const grid = portal.querySelector('.employee-portal-grid');
      if (!grid) return null;
      const legacyServices = portal.querySelector('.employee-portal-services');
      record = {grid,identity:identity(),folds:{},legacyServices,legacyServiceCard:legacyServices?.closest('.employee-portal-card')};
      records.set(portal,record);
    }
    const nextIdentity = identity();
    if (record.identity !== nextIdentity) {
      record.identity = nextIdentity;
      const saved = stateFor(nextIdentity);
      for (const [key,part] of Object.entries(record.folds)) part.fold.open = saved[key] === true;
    }
    if (!portal.classList.contains('r202-portal')) portal.classList.add('r202-portal');
    if (portal.getAttribute('dir') !== 'rtl') portal.setAttribute('dir','rtl');
    const head = portal.querySelector('.employee-portal-head');
    if (head) {
      hide(head.querySelector('.eyebrow')); hide(head.querySelector('p'));
      text(head.querySelector('h2'),'ملفي الوظيفي');
      const person = $('employeePortalProfile'), back = head.querySelector('button[onclick*="closeEmployeePortal"]');
      if (person && person.parentNode !== head) head.insertBefore(person,back || null);
    }
    hide(record.legacyServiceCard);
    if (record.legacyServiceCard && !record.legacyServiceCard.hasAttribute('data-r202-legacy-services')) record.legacyServiceCard.dataset.r202LegacyServices = '';
    for (const coming of portal.querySelectorAll('.employee-portal-coming')) hide(coming.closest('.employee-portal-card') || coming);
    for (const config of sections) {
      let part = record.folds[config.key];
      if (!part || !part.fold.isConnected) part = record.folds[config.key] = createFold(config,record);
      if (config.content) {
        const content = $(config.content), card = content?.closest('.employee-portal-card');
        if (card && card !== record.legacyServiceCard) {
          if (!card.classList.contains('r202-source-card')) card.classList.add('r202-source-card');
          hide(card.querySelector('.employee-portal-card-head'));
          if (card.parentNode !== part.body) part.body.insertBefore(card,part.actions);
        }
      }
    }
    const attendance = record.folds.attendance;
    if (!$('r202PortalPunches')) {
      const punches = document.createElement('div'); punches.id = 'r202PortalPunches'; punches.className = 'r202-portal-punches';
      punches.innerHTML = '<div><span id="r203PortalPunchInLabel">بصمة الدخول</span><bdi id="r202PortalPunchIn" dir="ltr">—</bdi></div><div><span>بصمة الخروج</span><bdi id="r202PortalPunchOut" dir="ltr">—</bdi></div><div class="r202-punch-status"><span>حالة الحضور</span><b id="r202PortalPresenceState">جارٍ قراءة الحضور…</b></div>';
      attendance.body.insertBefore(punches,attendance.body.firstChild);
    }
    for (const button of portal.querySelectorAll('button[onclick]')) {
      const match = str(button.getAttribute('onclick')).match(/hrProOpenRequestForm\s*\(\s*(['"])([^'"]+)\1/);
      const action = match && requestActions[match[2]];
      if (action) { if (!button.id) button.id = action[1]; if (button.type !== 'button') button.type = 'button'; move(button,record.folds[action[0]].actions); styleAction(button,action[2]); }
    }
    move($('r19MyAttendance'),attendance.actions);
    styleAction($('r19MyAttendance'),'history');
    // Remove the decisions shortcut from this view; retain the original node so
    // the existing home module does not recreate it. HR records are untouched.
    const decisions = $('r19MyDecisions'); hide(decisions); move(decisions,record.legacyServices);
    // Preserve any additional service except the explicitly removed shortcut.
    if (record.legacyServices) for (const button of [...record.legacyServices.children]) if (button.tagName === 'BUTTON' && button.id !== 'r19MyDecisions') { move(button,record.folds.requests.actions); styleAction(button,'request'); }
    for (const config of sections) move(record.folds[config.key].fold,record.grid);
    return record;
  }

  function buildSummary(portal) {
    const container = $('employeePortalKpis'); if (!container || !portal.contains(container)) return;
    if (!container.hasAttribute('data-r202-summary')) container.dataset.r202Summary = '';
    const original = [...container.children].filter(node => node.classList?.contains('employee-portal-kpi'));
    const annual = original.find(node => node.dataset.r202Kpi === 'annual' || node.querySelector('span')?.textContent.trim() === 'الإجازة السنوية المتبقية');
    const pending = original.find(node => node.dataset.r202Kpi === 'pending' || node.querySelector('span')?.textContent.trim() === 'طلبات قيد الإجراء');
    if (!annual || !pending) return; // Wait for the original renderer's live values.
    if (annual.dataset.r202Kpi !== 'annual') annual.dataset.r202Kpi = 'annual';
    if (pending.dataset.r202Kpi !== 'pending') pending.dataset.r202Kpi = 'pending';
    const annualValue = annual.querySelector('b'), pendingValue = pending.querySelector('b');
    if (annualValue && annualValue.id !== 'r202PortalAnnual') annualValue.id = 'r202PortalAnnual';
    if (pendingValue && pendingValue.id !== 'r202PortalPending') pendingValue.id = 'r202PortalPending';
    let entry = $('r203EntryKpi');
    if (!entry) {
      entry = document.createElement('div'); entry.id = 'r203EntryKpi'; entry.className = 'employee-portal-kpi'; entry.dataset.r202Kpi = 'entry';
      entry.innerHTML = '<span id="r203PortalEntryLabel">بصمة الدخول</span><bdi id="r203PortalEntry" dir="auto">—</bdi><small id="r203PortalEntryNote">جارٍ قراءة الحضور…</small>';
    }
    let duration = $('r202PresenceKpi');
    if (!duration) {
      duration = document.createElement('div'); duration.id = 'r202PresenceKpi'; duration.className = 'employee-portal-kpi'; duration.dataset.r202Kpi = 'presence';
      duration.innerHTML = '<span>مدة وجودي في الشركة</span><bdi id="r20PortalDuration" dir="auto">—</bdi><small id="r202PortalDurationNote">جارٍ قراءة الحضور…</small>';
    }
    let open = pending.querySelector('#r202PendingRequestsOpen');
    if (!open) {
      open = document.createElement('button'); open.type = 'button'; open.id = 'r202PendingRequestsOpen'; open.className = 'r202-summary-link';
      open.textContent = 'عرض الطلبات'; open.setAttribute('aria-controls','r202PortalSection-requests');
      open.addEventListener('click',() => openSection('requests'));
      pending.appendChild(open);
    }
    const keep = [entry,duration,annual,pending];
    for (const child of [...container.children]) if (!keep.includes(child) && !child.contains(document.activeElement)) child.remove();
    for (let i=0;i<keep.length;i++) if (container.children[i] !== keep[i]) container.insertBefore(keep[i],container.children[i] || null);
  }
  function clock(value) {
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) return '—';
    try { return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Damascus',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(Number(value))); } catch (_) { return '—'; }
  }
  function currentPresence() {
    try { return window.MoshPresenceHeader20?.current?.() || presence; } catch (_) { return presence; }
  }
  function updatePresence(value) {
    presence = value || currentPresence();
    const currentUser = window.MoshApi?.user || {}, expected = str(currentUser.employeeId || currentUser.employee_id || profile()?.id);
    const result = presence && (!presence.userId || str(presence.userId) === str(currentUser.id)) && (!presence.employeeId || !expected || str(presence.employeeId) === expected) ? presence : null;
    text($('r203PortalEntryLabel'),result?.entryLabel || 'بصمة الدخول');
    text($('r203PortalEntry'),result?.entry || '—');
    text($('r203PortalEntryNote'),result?.firstAt && result?.state !== 'unconfirmed' ? 'وقت الدخول المسجّل' : result?.status || 'جارٍ قراءة الحضور…');
    text($('r20PortalDuration'),result?.duration || '—');
    text($('r202PortalDurationNote'),result?.status || 'جارٍ قراءة الحضور…');
    text($('r203PortalPunchInLabel'),result?.entryLabel || 'بصمة الدخول');
    text($('r202PortalPunchIn'),result?.entry || '—');
    text($('r202PortalPunchOut'),result?.live ? '—' : clock(result?.lastOut));
    text($('r202PortalPresenceState'),result?.status || 'جارٍ قراءة الحضور…');
    for (const card of [$('r203EntryKpi'),$('r202PresenceKpi')]) if (card && card.dataset.presenceState !== (result?.state || 'loading')) card.dataset.presenceState = result?.state || 'loading';
    const part = records.get($('employeePortalApp'))?.folds.attendance;
    if (part) text(part.hint,result?.status || 'الدخول والخروج وسجل الدوام');
  }
  function updateHints(record) {
    const p = profile(); let requests = [];
    try { requests = window.employeePortalMyRequests?.(p) || []; } catch (_) {}
    text(record.folds.leave.hint,($('r202PortalAnnual')?.textContent || '—')+' يوم سنوي متبقٍ');
    const pending = requests.filter(request => request.status === 'pending').length;
    text(record.folds.requests.hint,requests.length ? (pending ? pending+' قيد الإجراء' : 'عرض الطلبات السابقة') : 'لا توجد طلبات حالياً');
    const documents = Array.isArray(p?.documents) ? p.documents.length : 0;
    text(record.folds.documents.hint,documents ? documents+' وثيقة محفوظة' : 'لا توجد وثائق حالياً');
  }
  function mount() {
    const portal = $('employeePortalApp'); if (!portal) return false;
    if (activeEditor(portal)) { updatePresence(); return false; }
    const record = ensureStructure(portal); if (!record) return false;
    buildSummary(portal); updateHints(record); updatePresence(); installShortcuts();
    if (mountedPortal !== portal) {
      observer?.disconnect(); mountedPortal = portal;
      observer = new MutationObserver(schedule);
      observer.observe(portal,{childList:true,subtree:true});
    }
    return true;
  }
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; mount(); }); }
  function openSection(key, options = {}) {
    mount(); const part = records.get($('employeePortalApp'))?.folds[key]; if (!part) return false;
    part.fold.open = true; stateFor(identity())[key] = true;
    if (options.focus !== false) { try { part.summary.focus({preventScroll:true}); } catch (_) { part.summary.focus(); } }
    if (options.scroll !== false) part.fold.scrollIntoView?.({behavior:'smooth',block:'nearest'});
    return true;
  }
  function installShortcuts() {
    const service = window.MoshRequestResults28B;
    if (service && typeof service.openMyRequests === 'function' && !service.openMyRequests.__r202Portal) {
      const original = service.openMyRequests;
      const wrapped = function () { const result = original.apply(this,arguments); openSection('requests'); return result; };
      wrapped.__r202Portal = true; service.openMyRequests = wrapped;
    }
  }
  if (typeof window.renderEmployeePortal === 'function') {
    const original = window.renderEmployeePortal;
    window.renderEmployeePortal = function () {
      if (activeEditor($('employeePortalApp'))) { deferredRender = {context:this,args:[...arguments]}; updatePresence(); return; }
      deferredRender = null;
      const focus = document.activeElement, restoreId = $('employeePortalApp')?.contains(focus) ? focus.id : '';
      const result = original.apply(this,arguments); mount();
      if (restoreId && !focus.isConnected && document.activeElement === document.body) { try { $(restoreId)?.focus({preventScroll:true}); } catch (_) {} }
      return result;
    };
    window.renderEmployeePortal.__r202Portal = true;
  }
  document.addEventListener('focusout',() => {
    if (!deferredRender) return;
    queueMicrotask(() => { if (!deferredRender || activeEditor($('employeePortalApp'))) return; const next = deferredRender; deferredRender = null; window.renderEmployeePortal.apply(next.context,next.args); });
  });
  document.addEventListener('mosh:r20-presence-updated',event => updatePresence(event.detail));
  ['mosh:ui-ready','mosh:refreshed','mosh:saved','mosh:r19-change','mosh:r19-hr-updated'].forEach(type => document.addEventListener(type,schedule));
  window.addEventListener('mosh:r19-change',schedule);
  window.MoshEmployeePortal20 = {mount,refresh:mount,openSection,sections:sections.map(({key,title}) => ({key,title}))};
  mount();
})();
