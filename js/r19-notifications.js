/* MOSH R19 — server-backed notifications and task urgency. */
(function () {
  'use strict';
  if (window.MoshAlerts19) return;
  const P = window.MoshPreview19;
  if (!P) return;
  const $ = id => document.getElementById(id);
  const list = value => Array.isArray(value) ? value.filter(Boolean) : [];
  const str = value => String(value == null ? '' : value);
  const E = value => P.esc(value);
  const now = () => new Date().toISOString();
  const stateNow = () => { try { return typeof state === 'object' && state ? state : {}; } catch (_) { return {}; } };
  const user = () => P.user?.() || window.MoshApi?.user || null;
  const role = () => P.role?.() || 'employee';
  const owner = () => str(user()?.employeeId || user()?.id);
  const identity = () => str(user()?.id) + ':' + owner();
  const tasks = () => list(stateNow().salesTasks);
  const task = id => tasks().find(t => str(t.id) === str(id));
  const presentation = () => window.MoshTaskPresentation || window.MoshTaskUI || {};
  const taskTitle = t => presentation().title?.(t) || str(t?.title || 'مهمة بدون عنوان');
  const taskClient = t => presentation().client?.(t) || str(t?.customer || 'بدون عميل محدد');
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6M12 1v1"/></svg>';
  const typeLabels = {task:'المهام', hr:'إشعار إداري', announcement:'تعميم', 'administrative-circular':'تعميم إداري', 'r24-alert':'تنبيه إداري', 'r24-admin-reply':'رد على تنبيه', 'r24-decision':'قرار إداري', 'r24-purchase-approval':'اعتماد مشتريات'};
  const deptMap = {'الإدارة':'admin','الموارد البشرية':'hr','المبيعات':'sales','التسويق':'marketing','السوشال ميديا':'social','السوشل ميديا':'social','قسم السوشال ميديا':'social','التصميم':'design','التصوير':'photo','المونتاج':'editing','الترويج':'promotion','اللوجستيات':'logistics','المشتريات':'purchases','المحاسبة':'accounting','المستودعات':'warehouses','المستودعات العامة':'warehouses','MOSH MEDIA':'platform'};
  let lastIdentity = '', currentId = '', tab = 'unread', type = 'all', query = '', page = 1;
  let frame = 0, painting = false, scanning = false, acknowledging = false, dialogSignature = '';
  let audioContext = null, audioUnlocked = false, lastSound = 0;

  let inbox = {items:[], _version:0}, loadPending = null, lastLoaded = 0, loaded = false, loadError = '';
  let refreshWanted = true, inboxEpoch = 0;
  const popupHistory = new Map(), popupQueued = new Set();
  let popupQueue = [], popupSeen = new Set(), popupNode = null, popupTimer = null;
  const urgencyPending = new Set(), acknowledgementKeys = new Map();
  function boxFor(recipient) {
    if (str(recipient) !== owner()) return {items:[], read:{}, initialized:false};
    return {items:inbox.items, read:Object.fromEntries(inbox.items.filter(n => n.readAt).map(n => [n.id,n.readAt])), initialized:loaded};
  }
  async function refresh(force = false) {
    if (!user() || user().mustChange || !window.MoshApi?.request) return false;
    syncOwner();
    if (loadPending) return loadPending;
    if (!force && !refreshWanted && Date.now() - lastLoaded < 15000) return true;
    refreshWanted = false;
    const who = identity(), epoch = inboxEpoch, startingInbox = inbox;
    const prior = new Set(inbox.items.map(n => n.id)), wasLoaded = loaded;
    const promise = (async () => {
      try {
        const response = await MoshApi.request('/r19/notifications', {cache:'no-store'});
        if (identity() !== who || epoch !== inboxEpoch) return false;
        if (inbox !== startingInbox) {
          refreshWanted = true;
          return false;
        }
        if (!response || !Array.isArray(response.items)) throw new Error('رد الإشعارات غير مكتمل.');
        inbox = {items:response.items, _version:Number(response._version)||0};
        loaded = true; loadError = ''; lastLoaded = Date.now();
        if (wasLoaded) {
          const arriving = inbox.items.filter(n => !prior.has(n.id) && belongsToCurrent(n) && !isRead(n));
          if (arriving.length) { chime(); notifyDesktop(arriving[0]); }
        }
        showCircular();
        queuePopups();
        return true;
      } catch (error) {
        if (identity() === who && epoch === inboxEpoch) { loadError = str(error?.message || 'تعذر تحميل الإشعارات.'); lastLoaded = Date.now(); }
        return false;
      } finally {
        if (identity() === who && epoch === inboxEpoch) { dialogSignature = ''; schedule(); }
      }
    })();
    loadPending = promise;
    try { return await promise; } finally { if (loadPending === promise) loadPending = null; }
  }
  function options() { return {sound:true,desktop:false,...P.get('alerts19.options.' + owner(), {})}; }
  function saveOptions(next) { P.set('alerts19.options.' + owner(), {...options(), ...next}); }
  function knownUsers() { return list(window.MoshApi?.auth?.users); }
  function recipientKey(value) {
    const key = str(value).trim();
    if (!key) return '';
    const u = knownUsers().find(x => str(x.id) === key);
    return str(u?.employeeId || u?.id || key);
  }
  function belongsToCurrent(n) {
    return !!user() && list(n.recipientIds).map(recipientKey).includes(owner());
  }
  // Presentation receipts are scoped to the account; they never acknowledge
  // notices or change the server inbox, business records or task state.
  function popupStorageKey() { return 'mosh-notification-popups-v1:' + encodeURIComponent(identity()); }
  function readPopupHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(popupStorageKey()) || '[]');
      return new Set(Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : []);
    } catch (_) { return new Set(); }
  }
  function rememberPopup(id) {
    for (const saved of readPopupHistory()) popupSeen.add(saved);
    if (popupSeen.has(id)) return false;
    popupSeen.add(id); popupHistory.set(identity(),popupSeen);
    try { localStorage.setItem(popupStorageKey(),JSON.stringify([...popupSeen])); } catch (_) {}
    return true;
  }
  function removePopup() {
    clearTimeout(popupTimer); popupTimer = null;
    if (popupNode) { try { popupNode.hidePopover?.(); } catch (_) {} popupNode.remove(); popupNode = null; }
  }
  function clearPopups() { removePopup(); popupQueue = []; popupQueued.clear(); }
  function dismissPopup() { removePopup(); showNextPopup(); }
  function availablePopup(id) { return inbox.items.find(n => str(n.id) === id && belongsToCurrent(n) && !isRead(n)); }
  function showNextPopup() {
    if (lastIdentity !== identity()) { syncOwner(); return; }
    if (popupNode || !user() || user().mustChange || document.visibilityState === 'hidden' || document.documentElement.classList.contains('mosh-booting')) return;
    while (popupQueue.length) {
      const id = popupQueue.shift(); popupQueued.delete(id);
      const n = availablePopup(id);
      if (!n || !rememberPopup(id)) continue;
      const who = identity(), epoch = inboxEpoch, node = document.createElement('article');
      node.id = 'r19IncomingPopup'; node.className = 'r19-incoming-popup' + (n.urgent ? ' is-urgent' : '');
      node.dir = 'rtl'; node.dataset.noticeId = id;
      node.setAttribute('role','status'); node.setAttribute('aria-live','polite'); node.setAttribute('aria-atomic','true');
      node.setAttribute('popover','manual');
      node.innerHTML = '<div class="r19-popup-heading"><span class="r19-popup-icon">' + icon + '</span><span>إشعار جديد</span><button type="button" class="r19-popup-close" aria-label="إخفاء التنبيه" title="إخفاء التنبيه"><span aria-hidden="true">×</span><span class="r19-popup-sr">إخفاء التنبيه</span></button></div><h3>' + E(n.title || 'إشعار جديد') + '</h3><p>' + E(n.body || '') + '</p><footer><small>' + E(n.source || typeLabels[n.type] || 'MOSH') + '</small><button type="button" data-r19-alert-open="' + E(id) + '">عرض الإشعار ←</button></footer><span class="r19-popup-progress" aria-hidden="true"></span>';
      node.querySelector('.r19-popup-close').addEventListener('click',event => {
        event.preventDefault(); event.stopPropagation();
        if (identity() === who && epoch === inboxEpoch) dismissPopup();
      });
      popupNode = node; document.body.appendChild(node);
      // A manual popover remains visible above open forms without blocking them,
      // moving keyboard focus, or requiring browser notification permission.
      try { node.showPopover?.(); } catch (_) {}
      popupTimer = setTimeout(() => {
        if (popupNode !== node) return;
        if (identity() !== who || epoch !== inboxEpoch) { clearPopups(); return; }
        dismissPopup();
      },5000);
      return;
    }
  }
  function queuePopups() {
    if (popupNode && !availablePopup(popupNode.dataset.noticeId)) removePopup();
    const notices = rows().filter(n => n.type !== 'administrative-circular' && !isRead(n)).reverse();
    for (const n of notices) {
      const id = str(n.id);
      if (!id || popupSeen.has(id) || popupQueued.has(id) || popupNode?.dataset.noticeId === id) continue;
      popupQueued.add(id); popupQueue.push(id);
    }
    showNextPopup();
  }

  const circularViewer = 'r19AdministrativeCircular';
  const circularComposer = 'r19CircularComposer';
  const presentedCirculars = new Set();

  function dismissedCirculars() {
    try {
      const saved = JSON.parse(window.sessionStorage?.getItem(circularStorageKey()) || '[]');
      return Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : [];
    } catch (_) { return []; }
  }

  function circularStorageKey() {
    return 'mosh-dismissed-circulars:' + encodeURIComponent(identity());
  }

  function dismissCircular(id) {
    try {
      const saved = new Set(dismissedCirculars());
      saved.add(id);
      window.sessionStorage?.setItem(circularStorageKey(), JSON.stringify([...saved]));
    } catch (_) { /* The in-memory set keeps this tab quiet until the next reload. */ }
  }

  function canPublishCirculars() {
    return !!user() && !user().mustChange && !!window.MoshAuth37?.can('publishAdministrativeCirculars');
  }

  function mountCircularButton() {
    const old = $('r19CircularNavigation');
    if (!canPublishCirculars()) { old?.remove(); return; }
    const nav = $('c09Nav');
    if (old || !nav) return;
    const button = document.createElement('button');
    button.id = 'r19CircularNavigation';
    button.type = 'button';
    button.className = 'btn r35-ui-navigation';
    button.textContent = 'تعميم إداري';
    button.onclick = openCircularComposer;
    nav.append(button);
  }

  function noticeRequestId() {
    return globalThis.crypto?.randomUUID?.() || r24Key();
  }

  function openCircularComposer() {
    if (!canPublishCirculars() || $(circularComposer)?.open) return;
    const who = identity(), epoch = inboxEpoch;
    const dialog = P.dialog(circularComposer, 'تعميم إداري',
      '<form class="r19-circular-form">' +
      '<div class="r19-circular-fields">' +
      '<p class="r19-circular-note">يظهر القرار لكل الموظفين ورؤساء الأقسام.</p>' +
      '<div class="r19-circular-field"><label for="r19CircularTitle">عنوان القرار</label>' +
      '<input id="r19CircularTitle" name="title" type="text" dir="auto" required maxlength="250"></div>' +
      '<div class="r19-circular-field"><label for="r19CircularMessage">نص القرار</label>' +
      '<textarea id="r19CircularMessage" name="message" dir="auto" rows="4" required maxlength="10000"></textarea></div>' +
      '<div class="r19-circular-options">' +
      '<div class="r19-circular-field"><label for="r19CircularDays">مدة الظهور بالأيام</label>' +
      '<input id="r19CircularDays" name="days" type="number" inputmode="numeric" min="1" max="3650" step="1" value="1" required></div>' +
      '<div class="r19-circular-field"><label for="r19CircularSeconds">عدد ثواني الظهور</label>' +
      '<input id="r19CircularSeconds" name="displaySeconds" type="number" inputmode="numeric" min="1" max="86400" step="1" placeholder="حتى الإغلاق"></div>' +
      '<label class="r19-circular-check"><input name="repeatOnRefresh" type="checkbox"> ظهور عند كل تحديث للصفحة</label>' +
      '</div>' +
      '</div><footer class="r19-circular-footer"><p class="r19-circular-error" role="alert" hidden></p>' +
      '<div class="r19-circular-actions"><button class="primary" type="submit">نشر التعميم</button>' +
      '<button type="button" data-r19-close="' + circularComposer + '">إلغاء</button></div></footer></form>',
      {dirty:true});
    const form = dialog.querySelector('form');
    const submit = form.querySelector('button[type="submit"]');
    const error = form.querySelector('[role="alert"]');
    form.elements.title.focus({preventScroll:true});
    let pending = null;
    const current = () => identity() === who && inboxEpoch === epoch && dialog.open;
    form.onsubmit = async event => {
      event.preventDefault();
      if (!current() || !canPublishCirculars() || submit.disabled || !form.reportValidity()) return;
      const payload = {
        title: form.elements.title.value.trim(),
        message: form.elements.message.value.trim(),
        days: Number(form.elements.days.value),
        displaySeconds: form.elements.displaySeconds.valueAsNumber || null,
        repeatOnRefresh: form.elements.repeatOnRefresh.checked,
      };
      if (!payload.title || !payload.message) {
        error.textContent = 'اكتب عنوان القرار ونصه.';
        error.hidden = false;
        return;
      }
      const signature = JSON.stringify(payload);
      if (pending && pending.signature !== signature) {
        error.textContent = 'أعد المحاولة بنفس النص والمدة للتحقق من النشر السابق.';
        error.hidden = false;
        return;
      }
      pending ??= {signature, requestId:noticeRequestId()};
      error.hidden = true;
      submit.disabled = true;
      dialog.setAttribute('aria-busy', 'true');
      try {
        await MoshApi.request('/r19/administrative-circulars', {
          method:'POST', body:{...payload, requestId:pending.requestId},
        });
        if (!current()) return;
        P.close(circularComposer, true);
        P.toast('تم نشر التعميم الإداري.');
        refreshWanted = true;
        schedule();
      } catch (failure) {
        if (!current()) return;
        if (failure.status && failure.status < 500 && ![408,429].includes(failure.status)) pending = null;
        error.textContent = failure.message || 'تعذر نشر التعميم. أعد المحاولة.';
        error.hidden = false;
      } finally {
        submit.disabled = false;
        dialog.removeAttribute('aria-busy');
      }
    };
  }

  function currentCircular(notice) {
    const serverTime = window.MoshApi?.serverNow?.() ?? Date.now();
    return notice.type === 'administrative-circular' && Date.parse(notice.expiresAt) > serverTime &&
      (notice.repeatOnRefresh === true || !isRead(notice));
  }

  function showCircular() {
    const open = $(circularViewer);
    const pending = rows().filter(currentCircular);
    if (open?.open) {
      const notice = pending.find(row => row.id === open.dataset.noticeId);
      if (!notice || (open.dataset.confirmed === 'false' && isRead(notice))) P.close(circularViewer, true);
      return;
    }
    if (!user() || user().mustChange || document.visibilityState === 'hidden' ||
        document.documentElement.classList.contains('mosh-booting')) return;
    const notice = pending.filter(row => !presentedCirculars.has(row.id)).at(-1);
    if (!notice || document.querySelector('dialog[open],.modal.show')) return;
    presentedCirculars.add(notice.id);
    const who = identity(), epoch = inboxEpoch, confirmed = isRead(notice);
    const receipt = confirmed
      ? '<p class="r19-circular-note">تم تأكيد الاطلاع</p>'
      : '<label class="r19-circular-check"><input name="read" type="checkbox"> اطلعت على التعميم</label>';
    const confirmButton = confirmed ? '' : '<button type="submit" class="primary" disabled>تأكيد الاطلاع</button>';
    const dialog = P.dialog(circularViewer, 'تعميم إداري',
      '<form class="r19-circular-form"><article class="r19-circular-fields">' +
      '<h3 dir="auto">' + E(notice.title) + '</h3>' +
      '<p class="r19-circular-meta">' + E(notice.source) + ' · حتى ' + E(formatDate(notice.expiresAt)) + '</p>' +
      '<p class="r19-circular-message" dir="auto">' + E(notice.body) + '</p>' +
      '</article><footer class="r19-circular-footer">' + receipt +
      '<p class="r19-circular-error" role="alert" hidden></p>' +
      '<div class="r19-circular-actions">' + confirmButton +
      '<button type="button" data-r19-close="' + circularViewer + '">' + (confirmed ? 'إغلاق' : 'لاحقاً') + '</button></div></footer></form>');
    dialog.dataset.noticeId = notice.id;
    dialog.dataset.confirmed = String(confirmed);
    const seconds = notice.displaySeconds;
    const timer = Number.isInteger(seconds) && seconds > 0 && seconds <= 86400 ? setTimeout(() => {
      if (identity() === who && inboxEpoch === epoch && dialog.open && dialog.dataset.noticeId === notice.id) P.close(circularViewer);
    }, seconds * 1000) : null;
    dialog.addEventListener('close', () => {
      clearTimeout(timer);
      if (!notice.repeatOnRefresh && identity() === who && inboxEpoch === epoch &&
          rows().some(row => row.id === notice.id && currentCircular(row))) dismissCircular(notice.id);
    }, {once:true});
    if (confirmed) return;
    const form = dialog.querySelector('form');
    const checked = form.elements.read;
    const confirm = form.querySelector('button[type="submit"]');
    checked.onchange = () => { confirm.disabled = !checked.checked; };
    form.onsubmit = async event => {
      event.preventDefault();
      if (!checked.checked || confirm.disabled || identity() !== who || epoch !== inboxEpoch) return;
      confirm.disabled = true;
      checked.disabled = true;
      dialog.setAttribute('aria-busy', 'true');
      const saved = await acknowledge(notice.id);
      dialog.removeAttribute('aria-busy');
      if (!dialog.open || identity() !== who || epoch !== inboxEpoch) return;
      if (saved) { P.close(circularViewer, true); return; }
      const error = form.querySelector('[role="alert"]');
      error.textContent = 'تعذر تسجيل الاطلاع. أعد المحاولة.';
      error.hidden = false;
      checked.disabled = false;
      confirm.disabled = !checked.checked;
    };
  }

  function repeatCircularsAfterRefresh() {
    syncOwner();
    const open = $(circularViewer);
    for (const notice of inbox.items) {
      if (notice.repeatOnRefresh === true && (!open?.open || open.dataset.noticeId !== notice.id)) presentedCirculars.delete(notice.id);
    }
    schedule();
  }

  function clearCirculars() {
    presentedCirculars.clear();
    for (const id of [circularViewer,circularComposer]) {
      if ($(id)?.open) P.close(id, true);
    }
  }

  function formatDate(value) {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return '';
    try { return new Intl.DateTimeFormat('ar-SY', {dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Damascus'}).format(d); }
    catch (_) { return d.toLocaleString('ar'); }
  }
  function sourceAnnouncement(n) {
    return n.sourceId ? list(stateNow().hrAnnouncements).find(x => str(x.id) === str(n.sourceId)) : null;
  }
  function hasSourceReceipt(n) {
    const a = sourceAnnouncement(n), key = owner();
    return !!a && (list(a.readBy).map(String).includes(key) || !!a.readAtBy?.[key]);
  }
  function isRead(n, recipient = owner()) {
    if (!n || !recipient) return false;
    return !!boxFor(recipient).read[n.id] || recipient === owner() && hasSourceReceipt(n);
  }
  function rows() {
    if (!user()) return [];
    return boxFor(owner()).items.filter(belongsToCurrent).sort((a,b) =>
      (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || str(b.id).localeCompare(str(a.id)));
  }
  function unread() { return rows().filter(n => !isRead(n)).length; }

  // A permission prompt is never created by initialization, refresh, or push.
  // Audio is unlocked by the first actual gesture, as browsers require.
  function unlockAudio() {
    if (!options().sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audioContext = audioContext || new Audio();
      if (audioContext.state === 'suspended') {
        Promise.resolve(audioContext.resume()).then(() => { audioUnlocked = audioContext.state === 'running'; }).catch(() => {});
      }
      audioUnlocked = audioContext.state === 'running';
    } catch (_) { audioUnlocked = false; }
  }
  function chime() {
    if (!options().sound || !audioContext) return;
    if (audioContext.state === 'suspended') {
      Promise.resolve(audioContext.resume()).then(() => { audioUnlocked = audioContext.state === 'running'; if (audioUnlocked) chime(); }).catch(() => {});
      return;
    }
    if (!audioUnlocked || audioContext.state !== 'running') return;
    if (Date.now() - lastSound < 550) return;
    lastSound = Date.now();
    try {
      const start = audioContext.currentTime;
      [660,880].forEach((frequency, i) => {
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), at = start + i * .13;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(.055,at+.025);
        gain.gain.exponentialRampToValueAtTime(.001,at+.28);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(at); oscillator.stop(at+.30);
      });
    } catch (_) { /* The browser may suspend audio when it loses foreground. */ }
  }
  function notifyDesktop(n) {
    if (!options().desktop || !window.Notification || Notification.permission !== 'granted') return;
    const who = identity();
    try {
      const popup = new Notification('MOSH · ' + n.title, {body:n.body, tag:'mosh-' + n.id, silent:true});
      popup.onclick = () => { window.focus(); popup.close(); if (identity() === who) open(n.id); };
    } catch (_) { /* Device/browser permissions may prevent desktop delivery. */ }
  }
  async function enableDesktop() {
    if (!window.Notification) { P.toast('إشعارات سطح المكتب غير مدعومة في هذا المتصفح.'); return false; }
    if (options().desktop) { saveOptions({desktop:false}); renderDialog(true); return true; }
    if (Notification.permission === 'denied') { P.toast('المتصفح حظر الإشعارات. يمكنك السماح بها من إعدادات هذا الملف أو الموقع.'); return false; }
    try {
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') { P.toast('بقيت الإشعارات داخل MOSH مفعّلة.'); return false; }
      saveOptions({desktop:true}); P.toast('تم تفعيل إشعارات سطح المكتب لهذا الحساب.'); renderDialog(true); return true;
    } catch (_) { P.toast('المتصفح لا يسمح بإشعارات سطح المكتب من هذا الموقع.'); return false; }
  }

  // A workflow event asks for a server refresh; clients cannot create notices
  // or deliver invented messages to another account.
  function push() { refreshWanted = true; return refresh(true); }
  function taskMine(t) {
    const keys = [str(user()?.id),str(user()?.employeeId)].filter(Boolean);
    return !!t && [t.assigneeId,t.assignedToId,t.assigneeUserId,t.employeeId].some(value => value != null && keys.includes(str(value)));
  }
  function canViewTask(t) {
    const u = user();
    if (!u || u.active === false || !t || t.deletedAt) return false;
    const app = deptMap[t.sharedDepartment || t.department] || '';
    const auth = window.MoshAuth37;
    if (app && auth?.canModule && (!auth.canModule(app,'view') || !auth.canModule(app,'details'))) return false;
    if (role() === 'admin') return true;
    if (role() === 'employee') return taskMine(t);
    const department = str(u.department);
    return taskMine(t) || !!department && [str(t.department),str(t.sharedDepartment)].includes(department);
  }
  function scan() { if (!scanning && user() && document.visibilityState !== 'hidden') void refresh(); }

  function syncOwner() {
    if (lastIdentity === identity()) return;
    clearPopups(); clearCirculars(); inboxEpoch++; lastIdentity = identity();
    if (user()) for (const id of dismissedCirculars()) presentedCirculars.add(id);
    popupSeen = popupHistory.get(lastIdentity) || readPopupHistory(); popupHistory.set(lastIdentity,popupSeen);
    inbox = {items:[],_version:0}; loaded = false; lastLoaded = 0; loadError = ''; loadPending = null; refreshWanted = true; acknowledgementKeys.clear(); currentId = ''; tab = 'unread'; type = 'all'; query = ''; page = 1; dialogSignature = '';
    if ($('r19Alerts')?.open) P.close('r19Alerts');
  }
  function badge(n) {
    return '<span class="r19-alert-type ' + E(n.type) + '">' + typeLabels[n.type] + '</span>' + (n.urgent ? '<span class="r19-urgent-badge">مهم</span>' : '');
  }
  function centerFrame() {
    return '<div class="r19-alerts-center" dir="rtl"><div class="r19-alert-toolbar"><div class="r19-alert-tabs" role="tablist" aria-label="حالة الإشعارات"></div><div class="r19-alert-preferences"><button type="button" data-r19-alert-action="sound"></button><button type="button" data-r19-alert-action="desktop"></button></div></div><div class="r19-alert-filters"><label><span>البحث</span><input id="r19AlertSearch" type="search" autocomplete="off" placeholder="ابحث بالعنوان أو نص الإشعار…" value="' + E(query) + '"></label><label><span>نوع الإشعار</span><select id="r19AlertType"><option value="all">جميع الأنواع</option><option value="task">المهام</option><option value="hr">إشعارات إدارية</option><option value="announcement">التعاميم</option><option value="administrative-circular">التعاميم الإدارية</option></select></label></div><div id="r19AlertRows" aria-live="polite"></div><footer class="r19-alert-pagination"><span id="r19AlertPage"></span><div><button type="button" data-r19-alert-action="previous">السابق</button><button type="button" data-r19-alert-action="next">التالي</button></div></footer></div>';
  }
  function open(value) {
    syncOwner(); refreshWanted = true; scan();
    if (!user()) return false;
    const all = rows();
    const match = all.find(n => n.id === str(value) || n.sourceId && n.sourceId === str(value));
    currentId = match ? match.id : '';
    if (!match && ['unread','all','archive'].includes(value)) tab = value;
    if (!match && !value) tab = 'unread';
    page = 1; query = ''; dialogSignature = '';
    P.dialog('r19Alerts','مركز الإشعارات','<div id="r19AlertBody"></div>',{wide:true});
    renderDialog(true); mount(); return true;
  }
  function dialogBody() { return $('r19AlertBody') || $('r19Alerts')?.querySelector('.r19-dialog-body'); }
  function renderDialog(force = false) {
    const d = $('r19Alerts'), body = dialogBody();
    if (!d?.open || !body) return;
    const all = rows(), n = all.find(x => x.id === currentId);
    const sig = JSON.stringify([currentId,tab,type,query,page,all.map(x => [x.id,x.title,x.body,x.urgent,isRead(x)]),options(),acknowledging,loaded,loadError]);
    if (!force && sig === dialogSignature) return;
    dialogSignature = sig;
    if (currentId) {
      if (!n) { body.innerHTML = '<p class="r19-alert-empty">هذا الإشعار غير متاح لحسابك.</p><button type="button" class="btn" data-r19-alert-action="back">العودة إلى الإشعارات</button>'; return; }
      const read = isRead(n), readAt = n.readAt || boxFor(owner()).read[n.id] || sourceAnnouncement(n)?.readAtBy?.[owner()];
      const details = typeof n.details === 'string' ? n.details : '';
      const linkedTask = task(n.taskId), availableTask = !!linkedTask && canViewTask(linkedTask) && n.taskEvent!=='approval';
      const procedure = n.type === 'hr' && str(n.details?.requestId).trim() && belongsToCurrent(n);
      const procedureAction = procedure ? '<div class="r19-alert-linked-task"><b>الإجراء الإداري المرتبط</b><small>المرفقات والتفاصيل الكاملة وسجل الإجراء</small><button type="button" data-r19-alert-procedure="' + E(n.id) + '">عرض الإجراء كاملاً ←</button></div>' : '';
      const reviewAction = n.taskEvent==='approval' ? '<div class="r19-alert-linked-task"><button type="button" data-r19-alert-review="'+E(n.id)+'">فتح المهمة للمراجعة ←</button></div>' : '';
      const alertReplyAction = n.type === 'r24-alert' && belongsToCurrent(n) ?
        '<div class="r19-alert-linked-task"><b>الرد على التنبيه الإداري (اختياري)</b>' +
        (n.details?.replied ? '<p>ردّك المحفوظ: ' + E(n.details.replyText || 'تم الرد') + '</p>' :
         '<textarea rows="3" maxlength="3000" id="r24AlertReplyText" placeholder="يمكنك كتابة مبررك هنا…" style="width:100%;padding:10px;margin:10px 0;border-radius:8px"></textarea><button type="button" data-r19-alert-reply="' + E(n.sourceId) + '">إرسال الرد</button>') + '</div>' : '';
      const adminReplyAction = n.type === 'r24-admin-reply' ? '<div class="r19-alert-linked-task"><button type="button" data-r19-alert-admin-record="' + E(n.sourceId) + '">فتح سجل التنبيه والرد ←</button></div>' : '';
      const decisionAction = n.type === 'r24-decision' ? '<div class="r19-alert-linked-task"><button type="button" data-r19-alert-decision="' + E(n.sourceId) + '">قراءة القرار وتفاصيله ←</button><div id="r24DecisionNoticeDetails"></div></div>' : '';
      const purchaseAction = n.type === 'r24-purchase-approval' ? '<div class="r19-alert-linked-task"><button type="button" data-r19-alert-purchase="' + E(n.sourceId) + '">مراجعة طلب الشراء ←</button></div>' : '';

      body.innerHTML = '<article class="r19-alert-detail" dir="rtl"><button type="button" class="r19-alert-back" data-r19-alert-action="back">→ كل الإشعارات</button><div class="r19-alert-detail-meta">' + badge(n) + '<time>' + E(formatDate(n.createdAt)) + '</time></div><h3>' + E(n.title) + '</h3><p class="r19-alert-source">من ' + E(n.source) + '</p><div class="r19-alert-message">' + E(n.body || 'لا يوجد نص إضافي.') + '</div>' + (details ? '<p class="r19-alert-detail-note">' + E(details) + '</p>' : '') + (availableTask ? '<div class="r19-alert-linked-task"><span>المهمة المرتبطة</span><b>' + E(taskTitle(linkedTask)) + '</b><small>' + E(taskClient(linkedTask)) + '</small>' + taskBadges(linkedTask) + '<button type="button" data-r19-alert-task="' + E(linkedTask.id) + '">فتح تفاصيل المهمة ←</button></div>' : '') + reviewAction + procedureAction + alertReplyAction + adminReplyAction + decisionAction + purchaseAction + '<div class="r19-alert-receipt ' + (read ? 'is-read' : '') + '">' + (read ? '✓ تم تسجيل الاطلاع' + (readAt ? ' · ' + E(formatDate(readAt)) : '') : 'يبقى الإشعار غير مقروء حتى تضغط «تم الاطلاع».') + (n.type === 'task' && n.taskEvent!=='approval' ? '<small>استلام المهمة وبدء تنفيذها يتمان من أزرار المهمة المخصصة.</small>' : '') + '</div><footer>' + (read ? '<span class="r19-alert-read">✓ محفوظ في الأرشيف</span>' : '<button type="button" class="r19-alert-primary" data-r19-alert-ack="' + E(n.id) + '" ' + (acknowledging ? 'disabled' : '') + '>' + (acknowledging ? 'جارٍ تسجيل الاطلاع…' : '✓ تم الاطلاع') + '</button>') + '<button type="button" data-r19-alert-action="back">العودة إلى القائمة</button></footer></article>';
      return;
    }
    if (!body.querySelector('.r19-alerts-center')) { body.innerHTML = centerFrame(); $('r19AlertType').value = type; }
    const unreadCount = all.filter(x => !isRead(x)).length;
    body.querySelector('.r19-alert-tabs').innerHTML = [['unread','غير المقروءة',unreadCount],['all','الكل',all.length],['archive','الأرشيف',all.length-unreadCount]].map(([key,label,count]) => '<button type="button" role="tab" aria-selected="' + (tab === key) + '" class="' + (tab === key ? 'active' : '') + '" data-r19-alert-tab="' + key + '">' + label + '<b>' + count + '</b></button>').join('');
    const opts = options(), soundBtn = body.querySelector('[data-r19-alert-action="sound"]'), desktopBtn = body.querySelector('[data-r19-alert-action="desktop"]');
    soundBtn.textContent = opts.sound ? 'الصوت مفعّل' : 'الصوت مكتوم'; soundBtn.setAttribute('aria-pressed',str(!!opts.sound));
    desktopBtn.textContent = opts.desktop ? 'سطح المكتب مفعّل' : 'تفعيل إشعار سطح المكتب'; desktopBtn.setAttribute('aria-pressed',str(!!opts.desktop));
    const q = query.trim().toLocaleLowerCase('ar');
    const filtered = all.filter(x => (tab === 'all' || tab === 'archive' && isRead(x) || tab === 'unread' && !isRead(x)) && (type === 'all' || x.type === type || (type === 'hr' && ['r24-alert','r24-admin-reply','r24-decision'].includes(x.type))) && (!q || [x.title,x.body,x.source].join(' ').toLocaleLowerCase('ar').includes(q)));
    const pages = Math.max(1,Math.ceil(filtered.length / 10)); page = Math.max(1,Math.min(page,pages));
    $('r19AlertRows').innerHTML = filtered.slice((page-1)*10,page*10).map(x => '<article class="r19-alert-row ' + (isRead(x) ? 'is-read' : 'is-unread') + '"><div class="r19-alert-row-meta">' + badge(x) + '<span class="r19-alert-read-state">' + (isRead(x) ? 'تم الاطلاع' : 'غير مقروء') + '</span></div><h3><button type="button" data-r19-alert-open="' + E(x.id) + '">' + E(x.title) + '</button></h3><p>' + E(x.body) + '</p><div class="r19-alert-row-foot"><small>' + E(x.source) + ' · ' + E(formatDate(x.createdAt)) + '</small><button type="button" data-r19-alert-open="' + E(x.id) + '">عرض التفاصيل ←</button></div></article>').join('') || '<div class="r19-alert-empty">' + (!loaded ? (loadError ? E(loadError) : 'جارٍ تحميل الإشعارات…') : q || type !== 'all' ? 'لا توجد إشعارات تطابق البحث والفلترة.' : tab === 'archive' ? 'سيظهر هنا كل إشعار أكدت الاطلاع عليه.' : tab === 'unread' ? 'اطلعت على جميع الإشعارات الموجهة إليك.' : 'لا توجد إشعارات موجهة إلى هذا الحساب حالياً.') + '</div>';
    $('r19AlertPage').textContent = loadError ? 'تعذر تحديث الإشعارات: ' + loadError : filtered.length + ' إشعار · صفحة ' + page + ' من ' + pages;
    body.querySelector('[data-r19-alert-action="previous"]').disabled = page <= 1;
    body.querySelector('[data-r19-alert-action="next"]').disabled = page >= pages;
  }

  async function acknowledge(id) {
    if (acknowledging || !user()) return false;
    const n = rows().find(x => x.id === str(id));
    if (!n || !belongsToCurrent(n)) return false;
    if (isRead(n)) return true;
    const who = identity(), epoch = inboxEpoch;
    acknowledging = true; renderDialog(true);
    try {
      const requestId = acknowledgementKeys.get(n.id) || noticeRequestId();
      acknowledgementKeys.set(n.id, requestId);
      const result = await MoshApi.request('/r19/notifications/' + encodeURIComponent(n.id) + '/acknowledge', {method:'POST',body:{requestId}});
      if (identity() !== who || epoch !== inboxEpoch) return false;
      if (!result?.readAt || !Array.isArray(result?.inbox?.items)) throw new Error('لم يصل تأكيد حفظ الاطلاع. أعد المحاولة.');
      inbox = {items:result.inbox.items,_version:Number(result.inbox._version)||0};
      acknowledgementKeys.delete(n.id);
      P.toast('تم تسجيل الاطلاع ونقل الإشعار إلى الأرشيف.');
      if (n.type !== 'administrative-circular' && n.sourceId && MoshApi.refreshAnnouncements) void MoshApi.refreshAnnouncements().catch(() => {});
      P.emit?.(); return true;
    } catch (error) {
      P.toast('لم يُسجل الاطلاع. ' + str(error?.message || 'أعد المحاولة.')); return false;
    } finally { acknowledging = false; dialogSignature = ''; mount(); }
  }

  function r24Key() { const a=new Uint8Array(16);if(window.crypto?.getRandomValues)crypto.getRandomValues(a);else for(let i=0;i<a.length;i++)a[i]=Math.floor(Math.random()*256);return 'r24-'+Array.from(a,b=>b.toString(16).padStart(2,'0')).join(''); }
  async function sendAdminReply(alertId) {
    const n=rows().find(x=>x.id===currentId);
    if(!n || n.type!=='r24-alert' || str(n.sourceId)!==str(alertId) || !belongsToCurrent(n)) return;
    const field=$('r24AlertReplyText'), message=field?.value.trim()||'';
    if(message.length<2){P.toast('اكتب مبررك قبل إرسال الرد.');return}
    if(field)field.disabled=true;
    try {
      await MoshApi.request('/r24/admin/alerts/'+encodeURIComponent(alertId)+'/reply',{method:'POST',body:{message,requestId:r24Key()}});
      P.toast('تم حفظ ردّك ضمن سجل التنبيه الإداري.');
      refreshWanted=true;await refresh(true);dialogSignature='';renderDialog(true);
    }catch(error){P.toast('لم يتم إرسال الرد: '+str(error?.message||'أعد المحاولة.'));if(field)field.disabled=false}
  }
  async function openAdminDecisionDetails(id){
    const n=rows().find(x=>x.id===currentId);
    if(!n||n.type!=='r24-decision'||str(n.sourceId)!==str(id)||!belongsToCurrent(n))return;
    const host=$('r24DecisionNoticeDetails');if(!host)return;
    host.textContent='جارٍ تحميل تفاصيل القرار…';
    try{
      const d=await MoshApi.request('/r24/admin/decisions/'+encodeURIComponent(id)+'/recipient');
      if(!$('r24DecisionNoticeDetails'))return;
      const at=String(d.effectiveDate||'—'),code=String(d.number||id);
      host.innerHTML='<div style="margin-top:12px;white-space:pre-wrap"><b>رقم القرار: '+E(code)+'</b><p>تاريخ السريان: '+E(at)+'</p><b>'+E(d.title||'')+'</b><p>'+E(d.body||'')+'</p>'+ (d.status==='cancelled'?'<b>قرار ملغى · '+E(d.cancelReason||'')+'</b>':'')+'</div>';
    }catch(error){host.textContent='تعذر فتح القرار: '+str(error?.message||'أعد المحاولة.');}
  }
  async function openAdminReplyRecord(id){
    if(!id)return;
    if(window.MoshPages?.pending('admin')){
      if(!window.MoshAuth37?.canModule('admin','view'))return;
      return window.MoshPages.open('admin',()=>openAdminReplyRecord(id));
    }
    if(!window.MoshAdministration24?.openAlert){P.toast('افتح قسم الإدارة لمراجعة سجل التنبيه.');return}
    P.close('r19Alerts');await window.MoshAdministration24.openAlert(id);
  }

  function openLinkedTask(id) {
    const t = task(id);
    if (!canViewTask(t)) { P.toast('المهمة خارج صلاحيات هذا الحساب.'); return false; }
    P.close('r19Alerts');
    if (taskMine(t) && window.MoshEmployeeTaskOverlay47?.open) return MoshEmployeeTaskOverlay47.open(t.id);
    const app = deptMap[t.sharedDepartment || t.department];
    if (app && typeof window.openProductiveTaskDetails === 'function' && ['design','marketing','photo','editing','promotion','logistics','hr'].includes(app)) {
      return openAppWith(app,()=>{window.openProductiveTaskDetails(app,t.id,'running');schedule();return true;});
    }
    if (role() === 'admin' && window.openTaskDetailsFromAll) { return openAppWith('tasks',()=>{window.openTaskDetailsFromAll(t.id);schedule();return true;}); }
    P.toast('افتح المهمة من قائمة مهام قسمك.'); return false;
  }
  async function openLinkedReview(noticeId) {
    const notice=rows().find(n=>n.id===noticeId&&n.taskEvent==='approval');
    if(!notice)return;
    const who=identity();
    try{
      let t=task(notice.taskId);
      if(t?.employeeState!=='submitted'){
        await window.MoshApi?.refreshTasks?.();
        t=task(notice.taskId);
      }
      if(identity()!==who)return;
      const app=t&&(deptMap[t.department]||window.MoshAuth37?.departmentApp?.(t.department));
      const auth=window.MoshAuth37;
      if(!t||t.status!=='in_progress'||t.employeeState!=='submitted'||!app||
        !auth?.canModule?.(app,'details')||!auth.canModule(app,'approve')) {
        P.toast('المهمة لم تعد متاحة للمراجعة.');return;
      }
      P.close('r19Alerts');
      if(await window.goApp?.(app)===false)return;
      window.openProductiveTaskDetails?.(app,t.id,'running');
    }catch{
      if(identity()===who)P.toast('تعذر تحديث المهمة للمراجعة.');
    }
  }
  function openLinkedProcedure(alertId) {
    // Resolve from this recipient's inbox again at click time. The HR module
    // separately verifies permission to read the actual request record.
    const n = rows().find(item => item.id === str(alertId));
    const requestId = n?.type === 'hr' ? str(n.details?.requestId).trim() : '';
    if (!n || !belongsToCurrent(n) || !requestId) { P.toast('هذا الإجراء غير متاح ضمن إشعارات حسابك.'); return false; }
    if (typeof window.MoshHR19?.openDetails !== 'function') { P.toast('تعذر فتح تفاصيل الإجراء. افتح ملفك الوظيفي وأعد المحاولة.'); return false; }
    P.close('r19Alerts');
    window.MoshHR19.openDetails(requestId);
    return true;
  }

  function flags() {
    return Object.fromEntries(tasks().filter(t => t.urgentUpdatedAt).map(t => [str(t.id), {
      urgent:isUrgent(t),updatedAt:t.urgentUpdatedAt,updatedBy:t.urgentUpdatedBy,updatedByName:t.urgentUpdatedByName
    }]));
  }
  function isUrgent(t) {
    if (!t) return false;
    if (typeof t.isUrgent === 'boolean') return t.isUrgent;
    return t.urgent === true || t.priority === 'urgent';
  }
  function needsRevision(t) { return !!(t?.returnedForRevision || t?.requiresRevision || t?.employeeState === 'revision_requested'); }
  function taskBadges(t) {
    return '<span class="r19-task-flags" data-r19-flags-id="' + E(t.id) + '">' + (isUrgent(t) ? '<span class="r19-task-urgent" title="'+E(t.urgentReason||'سبب غير مدخل في السجل القديم')+'">مستعجلة'+(t.urgentReason?' · '+E(t.urgentReason):'')+'</span>' : '') + (needsRevision(t) ? '<span class="r19-task-revision">مطلوب تعديل</span>' : '') + '</span>';
  }
  function canManageUrgency(t) {
    if (!canViewTask(t) || t.deletedAt || /^(archived|invoiced|cancelled)/.test(str(t.status))) return false;
    if (role() === 'admin' || user()?.isRoot) return true;
    const ref = stateNow().departmentManagers?.[t.department];
    const managerId = str(typeof ref === 'object' ? ref?.employeeId || ref?.id : ref);
    return !!managerId && !!user()?.employeeId && managerId === str(user().employeeId);
  }
  async function setUrgent(id, value) {
    const t = task(id);
    if (typeof value !== 'boolean' || !canManageUrgency(t)) { P.toast('تحديد الاستعجال متاح للإدارة ومدير القسم المخوّل بهذه المهمة فقط.'); return false; }
    if (urgencyPending.has(str(id))) return false;
    const who = identity(); urgencyPending.add(str(id)); mount();
    try {
      if (!MoshApi.commitTask) throw new Error('تعذر الاتصال بحفظ المهمة.');
      const reason=value?await window.MoshR29.reason('سبب استعجال المهمة',t.urgentReason||''):String(t.urgentReason||'');
      if(value&&reason===null)return false;
      await MoshApi.commitTask(str(id), () => ({isUrgent:value,urgent:value,priority:value?'urgent':'normal',urgentReason:reason}));
      if (identity() !== who) return false;
      P.toast(value ? 'تم تمييز المهمة كمستعجلة.' : 'تم إلغاء علامة الاستعجال.');
      refreshWanted = true; P.emit?.(); return true;
    } catch (error) {
      if (identity() === who) P.toast('لم تُحفظ أولوية المهمة. ' + str(error?.message || 'أعد المحاولة.'));
      return false;
    } finally { urgencyPending.delete(str(id)); mount(); }
  }
  function elementTask(el) {
    const exact = el.dataset?.taskId || el.dataset?.mr49Open || el.dataset?.v41OpenTask || el.dataset?.auth38Open;
    if (exact) return task(exact);
    const inside = el.querySelector?.('[data-mr49-open],[data-v41-open-task],[data-auth38-open],[data-task-id]');
    if (inside) return elementTask(inside);
    const handler = str(el.getAttribute?.('onclick'));
    if (!/open(?:TaskDetails|DepartmentTaskDetails|ProductiveTaskDetails|DesignTaskDetails|BillingTaskPreview)/.test(handler)) return null;
    const quoted = [...handler.matchAll(/(['"])(.*?)\1/g)].map(match => match[2]);
    return tasks().find(t => quoted.includes(str(t.id))) || null;
  }
  function updateFlags(host, t, key) {
    let block = [...host.children].find(x => x.classList?.contains('r19-task-flags'));
    const html = taskBadges(t), signature = str(t.id) + ':' + isUrgent(t) + ':' + needsRevision(t)+':'+str(t.urgentReason||'');
    if (!block) {
      if (!isUrgent(t) && !needsRevision(t)) return;
      host.insertAdjacentHTML('beforeend',html);
      block = [...host.children].find(x => x.classList?.contains('r19-task-flags'));
      if (block) block.dataset.r19Signature = signature;
      return;
    }
    if (!isUrgent(t) && !needsRevision(t)) { block.remove(); return; }
    if (block.dataset.r19Signature !== signature) {
      const template = document.createElement('template'); template.innerHTML = html;
      const replacement = template.content.firstElementChild; replacement.dataset.r19Signature = signature; block.replaceWith(replacement);
    }
    if (key) host.dataset.r19FlagTask = key;
  }
  function mountTaskFlags() {
    const rowSelector = '.wd51-home-task[data-task-id],.mr49-task-row,tr.data[onclick],[data-v41-open-task],[data-auth38-open]';
    document.querySelectorAll(rowSelector).forEach(row => {
      if (row.closest('#r19Alerts')) return;
      const t = elementTask(row); if (!t || !canViewTask(t)) return;
      const host = row.querySelector('.mr49-task-copy,.mt54-task-name,.wd51-task-title') || row.querySelector('td:nth-child(2)') || null;
      if (!host) return;
      // Place badges next to the native title, outside its clickable text.
      updateFlags(host.classList.contains('wd51-task-title') ? host.parentElement : host,t,str(t.id));
    });
    document.querySelectorAll('[id^="taskEditTitle_"]').forEach(input => {
      const id = input.id.slice('taskEditTitle_'.length), t = task(id), card = input.closest('.sales-task-card');
      if (!card || !t || !canViewTask(t)) return;
      let panel = card.querySelector('.r19-task-status-panel');
      if (!panel) { panel = document.createElement('div'); panel.className = 'r19-task-status-panel'; card.prepend(panel); }
      const can = canManageUrgency(t), urgent = isUrgent(t), saved = flags()[str(t.id)];
      const signature = [identity(),str(t.id),can,urgent,needsRevision(t),saved?.updatedAt,saved?.updatedByName,urgencyPending.has(str(t.id))].join('|');
      const html = '<div><span class="r19-task-status-label">أولوية المهمة</span>' + (urgent || needsRevision(t) ? taskBadges(t) : '<span class="r19-task-normal">عادية</span>') + (saved ? '<small>آخر تعديل: ' + E(saved.updatedByName || 'الإدارة') + '</small>' : '') + '</div>' + (can ? '<button type="button" class="r19-urgency-toggle ' + (urgent ? 'is-urgent' : '') + '" data-r19-task-urgency="' + E(t.id) + '" aria-pressed="' + urgent + '" ' + (urgencyPending.has(str(t.id)) ? 'disabled' : '') + '>' + (urgencyPending.has(str(t.id)) ? 'جارٍ الحفظ…' : urgent ? 'إلغاء الاستعجال' : 'تمييز كمستعجلة') + '</button>' : '');
      if (panel.dataset.r19Signature !== signature) { panel.dataset.r19Signature = signature; panel.innerHTML = html; }
    });
  }

  function mountStrip() {
    const header = $('employeeSpaceV11')?.querySelector('.es11-header');
    let strip = $('moshNoticeStrip52');
    if (!strip && header) {
      strip = document.createElement('section'); strip.id = 'moshNoticeStrip52'; strip.className = 'nt52-strip'; strip.dir = 'rtl';
      // Preserve the legacy binding targets in case its renderer runs later.
      strip.innerHTML = '<div><h3 id="nt52Heading">الإشعارات</h3><span id="nt52Count"></span><button data-nt52-list></button><button data-nt52-refresh></button></div><div id="nt52Feature"></div><div id="nt52Error"></div>';
      header.after(strip);
    }
    if (!strip) return;
    strip.classList.add('r19-unified-strip'); strip.hidden = !user();
    strip.setAttribute('aria-label','الإشعارات والتعاميم'); strip.removeAttribute('aria-labelledby');
    let content = strip.querySelector('.r19-notice-content');
    if (!content) { content = document.createElement('div'); content.className = 'r19-notice-content'; strip.append(content); }
    const all = rows(), fresh = all.filter(n => !isRead(n)), first = fresh.find(n => n.urgent) || fresh[0];
    const html = '<div class="r19-notice-head"><div>' + icon + '<h3>الإشعارات والتعاميم</h3><span class="r19-notice-count">' + (!loaded ? (loadError ? 'تعذر التحديث' : 'جارٍ التحميل…') : fresh.length ? fresh.length + ' غير مقروءة' : 'لا يوجد جديد') + '</span></div><button type="button" data-r19-alert-action="all">' + (fresh.length ? 'عرض الجميع' : 'السجل') + ' ←</button></div>' + (first ? '<div class="r19-notice-feature"><div>' + badge(first) + '<button type="button" class="r19-notice-title" data-r19-alert-open="' + E(first.id) + '">' + E(first.title) + '</button><p>' + E(first.body) + '</p></div><button type="button" class="r19-notice-open" data-r19-alert-open="' + E(first.id) + '">عرض الإشعار ←</button></div>' : '');
    if (content.dataset.r19Signature !== html) { content.dataset.r19Signature = html; content.innerHTML = html; }
    strip.classList.toggle('r19-has-new',fresh.length > 0);
    document.querySelectorAll('.top-actions button[onclick*="openEmployeeAnnouncements"],.top-actions [data-r19-bell]').forEach(button => {
      button.dataset.r19Bell = '1';
      let count = button.querySelector('.r19-bell-count');
      if (!count) { count = document.createElement('span'); count.className = 'r19-bell-count'; button.append(count); }
      const value = fresh.length > 99 ? '99+' : str(fresh.length);
      if (count.textContent !== value) count.textContent = value;
      count.hidden = !fresh.length;
      button.title = 'مركز الإشعارات'; button.setAttribute('aria-label','مركز الإشعارات، ' + fresh.length + ' غير مقروءة');
    });
  }
  function mount() {
    if (painting) return;
    painting = true;
    try { syncOwner(); mountCircularButton(); scan(); showCircular(); showNextPopup(); mountStrip(); mountTaskFlags(); renderDialog(); }
    finally { painting = false; }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; mount(); }); }

  document.addEventListener('pointerdown',unlockAudio,{capture:true,passive:true});
  document.addEventListener('keydown',e => { if (e.isTrusted && !e.repeat) unlockAudio(); },true);
  document.addEventListener('click',e => {
    const b = e.target.closest?.('[data-r19-alert-action],[data-r19-alert-open],[data-r19-alert-ack],[data-r19-alert-tab],[data-r19-alert-task],[data-r19-alert-review],[data-r19-alert-procedure],[data-r19-task-urgency],[data-r19-alert-reply],[data-r19-alert-decision],[data-r19-alert-admin-record],[data-r19-alert-purchase]');
    if (!b || b.disabled) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (b.hasAttribute('data-r19-alert-open')) { if (b.closest('.r19-incoming-popup')) dismissPopup(); currentId = b.dataset.r19AlertOpen; if (!$('r19Alerts')?.open) open(currentId); else { dialogSignature = ''; renderDialog(true); } }
    else if (b.hasAttribute('data-r19-alert-ack')) void acknowledge(b.dataset.r19AlertAck);
    else if (b.hasAttribute('data-r19-alert-task')) openLinkedTask(b.dataset.r19AlertTask);
    else if (b.hasAttribute('data-r19-alert-review')) openLinkedReview(b.dataset.r19AlertReview);
    else if (b.hasAttribute('data-r19-alert-procedure')) openLinkedProcedure(b.dataset.r19AlertProcedure);
    else if (b.hasAttribute('data-r19-alert-reply')) void sendAdminReply(b.dataset.r19AlertReply);
    else if (b.hasAttribute('data-r19-alert-decision')) void openAdminDecisionDetails(b.dataset.r19AlertDecision);
    else if (b.hasAttribute('data-r19-alert-admin-record')) void openAdminReplyRecord(b.dataset.r19AlertAdminRecord);
    else if (b.hasAttribute('data-r19-alert-purchase')) { P.close('r19Alerts'); window.MoshPurchasing24?.openQueue?.(); }
    else if (b.hasAttribute('data-r19-alert-tab')) { tab = b.dataset.r19AlertTab; currentId = ''; page = 1; renderDialog(true); }
    else if (b.hasAttribute('data-r19-task-urgency')) { const t = task(b.dataset.r19TaskUrgency); setUrgent(t?.id,!isUrgent(t)); }
    else {
      const action = b.dataset.r19AlertAction;
      if (action === 'all') open('all');
      if (action === 'back') { currentId = ''; dialogSignature = ''; renderDialog(true); }
      if (action === 'previous' || action === 'next') { page += action === 'next' ? 1 : -1; renderDialog(true); }
      if (action === 'sound') { const enabled = !options().sound; saveOptions({sound:enabled}); if (enabled) unlockAudio(); renderDialog(true); }
      if (action === 'desktop') void enableDesktop();
    }
  },true);
  document.addEventListener('input',e => { if (e.target.id === 'r19AlertSearch') { query = e.target.value; page = 1; renderDialog(true); } });
  document.addEventListener('change',e => { if (e.target.id === 'r19AlertType') { type = e.target.value; page = 1; renderDialog(true); } });
  ['mosh:saved','mosh:refreshed','mosh:tasks-refreshed','mosh:announcements-refreshed','mosh:announcement-read','mosh:r19-hr-updated','mosh:r24-admin-updated'].forEach(event => document.addEventListener(event,() => { refreshWanted = true; schedule(); }));
  // Layout, preferences and HR capability publication repaint the current inbox.
  // Only the business events above invalidate its server snapshot.
  document.addEventListener('mosh:page-refreshed',repeatCircularsAfterRefresh);
  document.addEventListener('mosh:r19-change',schedule);
  window.addEventListener('mosh:r19-change',schedule);
  ['mosh:session-expired','mosh:logout-complete'].forEach(event => document.addEventListener(event,() => { clearPopups(); clearCirculars(); $('r19CircularNavigation')?.remove(); inboxEpoch++; lastIdentity = ''; inbox = {items:[],_version:0}; loaded = false; loadPending = null; P.close('r19Alerts'); }));
  function refreshVisibleInbox() {
    if (document.visibilityState !== 'hidden' && Date.now() - lastLoaded >= 1000) void refresh(true);
  }
  document.addEventListener('visibilitychange', () => {
    syncOwner();
    if (document.visibilityState === 'hidden') return;
    showNextPopup();
    refreshVisibleInbox();
  });
  window.addEventListener('focus', refreshVisibleInbox);
  window.addEventListener('online', () => { if (document.visibilityState !== 'hidden') void refresh(true); });
  document.addEventListener('close', schedule, true);
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  window.openEmployeeAnnouncements = open;
  window.MoshAlerts19 = {version:'19.1.0',push,refresh,open,mount,unread,rows,isRead,acknowledge,canViewTask};
  window.MoshTaskFlags19 = {version:'19.0.0',canManage:canManageUrgency,isUrgent,needsRevision,badgesHtml:taskBadges,setUrgent,mount:mountTaskFlags};
  mount();
  setInterval(mount,3000);
})();
