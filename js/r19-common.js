/* MOSH R19 shared production UI: real session identity and presentation preferences.
 * Load before original modules so backdrop guards run before their close handlers.
 * Business records and authorization remain owned by the authenticated server. */
(function () {
  'use strict';
  if (window.MoshUI19) return;
  const preferenceMemory = new Map();
  let capabilityOwner = '', serverCapabilities = null;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let toastTimer, emitPending = false, openedOrder = 0;
  const nativeShowModal = window.HTMLDialogElement?.prototype.showModal;
  if (nativeShowModal) window.HTMLDialogElement.prototype.showModal = function () { const result = nativeShowModal.call(this); this._r19OpenedOrder = ++openedOrder; return result; };
  const emit = () => { if (emitPending) return; emitPending = true; queueMicrotask(() => { emitPending = false; document.dispatchEvent(new CustomEvent('mosh:r19-change')); }); };
  const user = () => window.MoshApi ? (window.MoshApi.user || null) : (window.MoshAuth37?.current?.() || null);
  const preferenceKey = key => {
    const name = String(key || '');
    if (!/^(mini_layout_|alerts19\.options\.)/.test(name)) throw new TypeError('Only presentation preferences may use MoshUI19 storage.');
    const owner = String(user()?.id || '');
    return owner ? 'mosh-ui-r19:' + encodeURIComponent(owner) + ':' + name : '';
  };
  const get = (key, fallback = null) => {
    const name = preferenceKey(key); if (!name) return fallback;
    if (preferenceMemory.has(name)) return JSON.parse(JSON.stringify(preferenceMemory.get(name)));
    try {
      const raw = localStorage.getItem(name);
      if (raw !== null) return JSON.parse(raw);
    } catch (_) { /* Presentation remains usable if the browser disallows storage. */ }
    return preferenceMemory.has(name) ? preferenceMemory.get(name) : fallback;
  };
  const set = (key, value) => {
    const name = preferenceKey(key); if (!name) return value;
    // Serialize first: preference writes never retain mutable references to app state.
    const raw = JSON.stringify(value), saved = JSON.parse(raw);
    preferenceMemory.set(name, saved);
    try { localStorage.setItem(name, raw); } catch (_) {}
    emit(); return saved;
  };
  const capabilities = () => capabilityOwner === String(user()?.id || '') ? serverCapabilities?.capabilities || {} : {};
  function setCapabilities(data) {
    capabilityOwner = String(user()?.id || '');
    serverCapabilities = data && typeof data === 'object' ? data : null;
    emit();
  }
  function role() {
    const u = user(); if (!u) return 'guest';
    if (capabilityOwner === String(u.id) && ['employee','manager','admin','hr'].includes(serverCapabilities?.role)) return serverCapabilities.role;
    const auth = window.MoshAuth37;
    const r = (window.MoshApi?.auth?.roles || []).find(item => String(item.id) === String(u.roleId));
    const department = auth?.departmentApp?.() || '';
    if (u.isRoot === true || u.roleId === 'app_programmer') return 'admin';
    // These are UI hints only. Server endpoints independently enforce each action.
    if (department === 'hr' && (auth?.canModule?.('hr','approve') || auth?.canModule?.('hr','edit'))) return 'hr';
    if (u.roleId === 'role_admin' || (auth?.canModule?.('admin','approve') && (r?.scope === 'all' || department === 'admin'))) return 'admin';
    if (department && auth?.canModule?.(department,'approve')) return 'manager';
    return 'employee';
  }
  function dateKey(value) {
    const at = value ?? window.MoshApi?.serverNow?.() ?? Date.now();
    const zone = window.MOSH_COMPANY_TIME_ZONE || 'Asia/Damascus';
    if (window.MoshWorkdayModel50?.dateKey) return window.MoshWorkdayModel50.dateKey(at, zone);
    try {
      const parts = new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at));
      const part = name => parts.find(item => item.type === name)?.value || '';
      return part('year') + '-' + part('month') + '-' + part('day');
    } catch (_) { return ''; }
  }
  const snapshot = d => JSON.stringify(Array.from(d.querySelectorAll('input:not([type=search]),textarea,select,[contenteditable=true]')).map(e => [e.name || e.id, e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.type === 'file' ? Array.from(e.files || []).map(f => [f.name, f.size]) : e.value ?? e.textContent]));
  const isDirty = d => d?._r19TrackDirty && snapshot(d) !== d._r19Initial;
  function toast(message) {
    let box = $('r19Toast');
    if (!box) { box = document.createElement('div'); box.id = 'r19Toast'; box.className = 'r19-toast'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    box.textContent = message; box.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.hidden = true; }, 5200);
  }
  function guard(d, next) {
    if (!isDirty(d)) { next(); return; }
    d._r19AfterSave = null;
    const confirmId = 'r19Unsaved';
    const c = dialog(confirmId, 'لديك تعديلات غير محفوظة', '<p>هل تريد حفظ التعديلات قبل الخروج؟</p><footer class="r19-dialog-actions"><button type="button" data-r19-exit="keep">متابعة التعديل</button><button type="button" data-r19-exit="discard">خروج دون حفظ</button><button type="button" class="primary" data-r19-exit="save">حفظ ومتابعة</button></footer>');
    const findSave = () => primaryAction(d);
    c.querySelector('[data-r19-exit="save"]').hidden = !findSave();
    c.onclose = () => { c.onclick = null; };
    c.onclick = function handler(e) {
      const b = e.target.closest('[data-r19-exit]'); if (!b) return;
      c.onclick = null; c.close();
      if (b.dataset.r19Exit === 'keep') return;
      if (b.dataset.r19Exit === 'discard') { d._r19TrackDirty = false; next(); return; }
      const save = findSave(); if (save) { d._r19AfterSave = next; save.click(); }
    };
  }
  function close(id, force = false) {
    const d = $(id); if (!d) return;
    if (!force && d.getAttribute('aria-busy') === 'true') return false;
    const finish = () => { d._r19TrackDirty = false; d.close(); const after = d._r19AfterSave; d._r19AfterSave = null; if (after) after(); };
    if (force) finish(); else guard(d, finish);
  }
  function dialog(id, title, body, options = {}) {
    let d = $(id);
    if (!d) {
      d = document.createElement('dialog'); d.id = id; d.className = 'r19-dialog'; d.dir = 'rtl'; document.body.appendChild(d);
      d.addEventListener('cancel', e => { e.preventDefault(); close(id); });
      d.addEventListener('close', () => { d._r19ReturnFocus?.isConnected && d._r19ReturnFocus.focus(); });
    }
    d.classList.toggle('r19-dialog-wide', !!options.wide);
    d._r19AfterSave = null;
    d.innerHTML = '<header class="r19-dialog-head"><h2 id="' + esc(id) + '-title">' + esc(title) + '</h2><button type="button" class="r19-dialog-close" aria-label="إغلاق" data-r19-close="' + esc(id) + '">×</button></header><div class="r19-dialog-body">' + body + '</div>';
    d.setAttribute('aria-labelledby', id + '-title'); d._r19TrackDirty = !!options.dirty; d._r19Initial = snapshot(d);
    if (!d.open) { d._r19ReturnFocus = document.activeElement; d.showModal(); }
    d.querySelector('input:not([type=hidden]),select,textarea,button')?.focus();
    return d;
  }
  // Installed before all original modules: backdrop clicks never close a dialog.
  const backdropSelectors = '.modal,.hr-pro-modal-backdrop,.hr-pro-modal-root,.auth37-editorback,.fw30-overlay,.task-image-lightbox,#emp47TaskOverlay,.o18-overlay,[class*="-backdrop"],[class*="-overlay"],dialog';
  ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach(type => window.addEventListener(type, e => {
    const t = e.target;
    if (t?.matches?.(backdropSelectors) && (t.matches('dialog') ? t.open : t.getClientRects().length > 0)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true));
  window.addEventListener('click', e => {
    const b = e.target.closest?.('[data-r19-close]'); if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation(); close(b.dataset.r19Close);
  }, true);
  function primaryAction(d) {
    const buttons = Array.from(d.querySelectorAll('button,input[type="submit"]')).filter(b => !b.disabled && !b.closest('[hidden]'));
    return buttons.find(b => b.type === 'submit') || buttons.find(b => b.classList.contains('primary') && !b.classList.contains('r19-dialog-close')) ||
      buttons.find(b => /^(إرسال الطلب|حفظ|اعتماد|تأكيد|إرسال)/.test(b.textContent.trim()));
  }
  window.addEventListener('keydown', e => {
    if (e.isComposing || !['Escape','Enter'].includes(e.key)) return;
    const dialogs = Array.from(document.querySelectorAll('dialog[open]')).sort((a, b) => (a._r19OpenedOrder || 0) - (b._r19OpenedOrder || 0));
    const d = dialogs.at(-1);
    if (!d || (!d.classList.contains('r19-dialog') && !d._r19TrackDirty)) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(d.id); return; }
    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.target?.closest?.('textarea,select,[contenteditable=true],button,a,input[type=search],[data-filter]')) return;
    const action = primaryAction(d);
    if (action && d.getAttribute('aria-busy') !== 'true') { e.preventDefault(); e.stopImmediatePropagation(); action.click(); }
  }, true);
  // Compatibility name for existing R19 feature modules; no preview runtime exists.
  window.MoshUI19 = { role, user, get, set, capabilities, setCapabilities, esc, toast, dialog, close, emit, isDirty, guard, dateKey };
  window.MoshPreview19 = window.MoshUI19;
  ['mosh:ui-ready','mosh:refreshed'].forEach(type => document.addEventListener(type, emit));
  document.addEventListener('mosh:session-expired', () => { capabilityOwner = ''; serverCapabilities = null; preferenceMemory.clear(); });
  document.addEventListener('mosh:logout-complete', () => { capabilityOwner = ''; serverCapabilities = null; preferenceMemory.clear(); });
})();
