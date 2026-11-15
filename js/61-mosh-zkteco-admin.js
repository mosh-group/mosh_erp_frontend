(function () {
  'use strict';
  const E = v => typeof esc === 'function' ? esc(v == null ? '' : String(v)) : String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = () => window.MoshApi;
  let root = null, employees = [], filter = 'unmapped', page = 1;
  let data = { status: null, mappings: [], events: [], eventsError: null, pagination: { currentPage: 1, lastPage: 1, total: 0, from: 0, to: 0 } };

  const fmt = v => { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? E(v) : d.toLocaleString('ar-SY') };
  const employeeById = id => employees.find(x => String(x.id) === String(id));
  const labelEmployee = id => { if (!id) return '—'; const p = employeeById(id); return p ? `${p.name || p.employeeNo || p.id} (${p.employeeNo || p.id})` : id };
  const mappingFor = (enroll, deviceId) => data.mappings.find(m => m?.active && String(m.enrollment_number ?? '') === String(enroll ?? '') && (!deviceId || String(m.device_id ?? '') === String(deviceId))) || null;
  const effectiveEmployee = e => e?.employee_id ? { employeeId: e.employee_id, historical: false } : (mappingFor(e?.enrollment_number, e?.device_id) ? { employeeId: mappingFor(e.enrollment_number, e.device_id).employee_id, historical: true } : null);

  function ensure() {
    if (root) return root;
    root = document.createElement('div'); root.id = 'moshZktecoAdmin';
    root.innerHTML = '<div class="zk-backdrop"></div><section class="zk-modal"><header><div><h2>ZKTeco — الحضور بالبصمة</h2><div class="muted">إدارة الربط، الأحداث غير المربوطة، وحالة التكامل.</div></div><button class="btn" data-close>إغلاق</button></header><div class="zk-body"></div></section>';
    const s = document.createElement('style'); s.textContent = `
 #moshZktecoAdmin{position:fixed;inset:0;z-index:100000;display:none}#moshZktecoAdmin.show{display:block}.zk-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.62)}
 .zk-modal{position:absolute;inset:4vh 4vw;background:var(--panel,#171717);border:1px solid var(--line,#444);border-radius:16px;overflow:auto;color:var(--text,#eee);padding:18px}
 .zk-modal header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;position:sticky;top:-18px;background:var(--panel,#171717);padding:18px 0 12px;z-index:2}.zk-modal h2{margin:0 0 5px}
 .zk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:12px 0}.zk-card,.zk-section{border:1px solid var(--line,#444);border-radius:12px;padding:12px;background:var(--panel2,#202020)}
 .zk-card b{display:block;font-size:22px;margin-top:5px}.zk-section{margin-top:12px}.zk-table{width:100%;border-collapse:collapse}.zk-table th,.zk-table td{padding:8px;border-bottom:1px solid var(--line,#444);text-align:right;vertical-align:top}
 .zk-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:end}.zk-actions .field{min-width:190px}.zk-badge{display:inline-block;padding:3px 7px;border-radius:999px;border:1px solid var(--line,#555);font-size:12px}
 .zk-ready{color:#8fd9a8;font-size:12px;margin-top:5px}.zk-unmapped{color:#e6c46c;font-size:12px;margin-top:5px}.zk-error{white-space:pre-wrap;color:#ffb3b3}.zk-pager{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.zk-pager-actions{display:flex;gap:8px}
 .zk-enrollment-link{border:0;background:transparent;color:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:3px;padding:0;font:inherit}.zk-modal button:disabled{opacity:.45;cursor:not-allowed}`;
    document.head.appendChild(s); document.body.appendChild(root);
    root.querySelector('[data-close]').onclick = close; root.querySelector('.zk-backdrop').onclick = close; return root;
  }
  function close() { root?.classList.remove('show') }
  async function request(path, options) { return api().request('/zkteco' + path, options) }
  async function loadEmployees() { try { const r = await api().listAll('employees'); employees = Array.isArray(r) ? r : []; employees.sort((a, b) => String(a.name || a.employeeNo || a.id || '').localeCompare(String(b.name || b.employeeNo || b.id || ''), 'ar')) } catch (e) { employees = []; console.error('Unable to load MOSH employees for ZKTeco:', e) } }
  function parseEvents(r) {
    const p = r?.data && !Array.isArray(r.data) ? r.data : null;
    if (p) { data.events = Array.isArray(p.data) ? p.data : []; data.pagination = { currentPage: +p.current_page || page, lastPage: +p.last_page || 1, total: +p.total || 0, from: +p.from || 0, to: +p.to || 0 }; page = data.pagination.currentPage; return }
    data.events = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []; data.pagination = { currentPage: 1, lastPage: 1, total: data.events.length, from: data.events.length ? 1 : 0, to: data.events.length }; page = 1;
  }
  async function load() {
    const body = ensure().querySelector('.zk-body'); body.innerHTML = '<div class="muted">جارٍ تحميل بيانات ZKTeco...</div>';
    try {
      const [, status, mappings, events] = await Promise.all([loadEmployees(), request('/status').catch(__error => ({ __error })), request('/mappings').catch(__error => ({ __error })), request(`/events?status=${encodeURIComponent(filter)}&perPage=50&page=${encodeURIComponent(page)}`, { envelope: true }).catch(__error => ({ __error }))]);
      data.status = status; data.mappings = Array.isArray(mappings) ? mappings : [];
      if (events?.__error) { data.events = []; data.eventsError = events.__error; data.pagination = { currentPage: page, lastPage: 1, total: 0, from: 0, to: 0 } } else { data.eventsError = null; parseEvents(events) }
      render();
    } catch (e) { body.innerHTML = '<div class="zk-error">' + E(e.message) + '</div>' }
  }
  const device = () => data.status?.devices?.[0] || data.status?.deviceDetails?.[0] || null;
  function employeeOptions() { return '<option value="">اختر الموظف...</option>' + employees.map(p => `<option value="${E(p.id)}">${E(p.name || p.employeeNo || p.id)} — ${E(p.employeeNo || p.id)}${p.department ? ' — ' + E(p.department) : ''}</option>`).join('') }
  function eventEmployee(e) { const x = effectiveEmployee(e); if (!x) return '<span>—</span><div class="zk-unmapped">لا يوجد ربط حالي</div>'; const l = E(labelEmployee(x.employeeId)); return !e.employee_id && x.historical ? `${l}<div class="zk-ready">الربط متوفر الآن</div>` : l }
  function replayCell(e) { if (!['unmapped', 'error'].includes(e.processing_status)) return ''; if (!effectiveEmployee(e)) return '<button class="btn" disabled>إعادة معالجة</button><div class="zk-unmapped">اربط الموظف أولاً</div>'; return `<button class="btn" data-replay="${E(e.id)}">إعادة معالجة</button><div class="zk-ready">جاهز لإعادة المعالجة</div>` }
  function pager() { const p = data.pagination; if (!p.total) return ''; return `<div class="zk-pager"><div class="muted">${E(p.from)}–${E(p.to)} من ${E(p.total)} · الصفحة ${E(p.currentPage)} من ${E(p.lastPage)}</div><div class="zk-pager-actions"><button class="btn" id="zkPrev" ${p.currentPage <= 1 ? 'disabled' : ''}>السابق</button><button class="btn" id="zkNext" ${p.currentPage >= p.lastPage ? 'disabled' : ''}>التالي</button></div></div>` }

  function render() {
    const body = ensure().querySelector('.zk-body'), d = device(), se = data.status?.__error;
    body.innerHTML = `
 ${se ? `<div class="zk-error">تعذر تحميل الحالة: ${E(se.message)}</div>` : `<div class="zk-grid"><div class="zk-card">حالة الجهاز<b>${E(d?.status || 'غير معروف')}</b><span class="muted">آخر ظهور: ${fmt(d?.last_seen_at)}</span></div><div class="zk-card">غير مربوط<b>${E(data.status?.unmappedCount ?? '—')}</b></div><div class="zk-card">معلّق<b>${E(data.status?.pendingCount ?? '—')}</b></div><div class="zk-card">أخطاء<b>${E(data.status?.errorCount ?? '—')}</b></div></div>`}
 <div class="zk-section"><h3>ربط موظف بالجهاز</h3><div class="zk-actions"><div class="field"><label>الموظف</label><select id="zkEmployee">${employeeOptions()}</select></div><div class="field"><label>رقم التسجيل</label><input id="zkEnrollment" inputmode="numeric" autocomplete="off" placeholder="82"></div><button class="btn primary" id="zkMap">حفظ الربط</button></div>
 <div style="overflow:auto;margin-top:10px"><table class="zk-table"><thead><tr><th>الجهاز</th><th>رقم التسجيل</th><th>الموظف</th><th>نشط</th></tr></thead><tbody>${data.mappings.length ? data.mappings.map(m => `<tr><td>${E(m.device_id)}</td><td>${E(m.enrollment_number)}</td><td>${E(labelEmployee(m.employee_id))}</td><td>${m.active ? 'نعم' : 'لا'}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">لا توجد روابط.</td></tr>'}</tbody></table></div></div>
 <div class="zk-section"><div class="zk-actions"><h3 style="margin:0 auto 0 0">أحداث الجهاز</h3><select id="zkFilter"><option value="unmapped" ${filter === 'unmapped' ? 'selected' : ''}>غير مربوطة</option><option value="error" ${filter === 'error' ? 'selected' : ''}>أخطاء</option><option value="pending" ${filter === 'pending' ? 'selected' : ''}>معلّقة</option><option value="processed" ${filter === 'processed' ? 'selected' : ''}>معالجة</option></select><button class="btn" id="zkRefresh">تحديث</button></div>
 ${data.eventsError ? `<div class="zk-error">${E(data.eventsError.message)}</div>` : ''}
 <div style="overflow:auto;margin-top:10px"><table class="zk-table"><thead><tr><th>الوقت</th><th>التسجيل</th><th>الموظف</th><th>الحالة</th><th>المصدر</th><th></th></tr></thead><tbody>${data.events.length ? data.events.map(e => `<tr><td>${fmt(e.device_time)}</td><td><button class="zk-enrollment-link" data-enrollment="${E(e.enrollment_number)}">${E(e.enrollment_number)}</button></td><td>${eventEmployee(e)}</td><td><span class="zk-badge">${E(e.processing_status)}</span>${e.ignore_reason ? `<div class="muted">${E(e.ignore_reason)}</div>` : ''}</td><td>${E(e.source)}</td><td>${replayCell(e)}</td></tr>`).join('') : '<tr><td colspan="6" class="muted">لا توجد أحداث ضمن هذا الفلتر.</td></tr>'}</tbody></table></div>${pager()}</div>`;

    body.querySelector('#zkRefresh')?.addEventListener('click', load);
    body.querySelector('#zkFilter')?.addEventListener('change', e => { filter = e.target.value; page = 1; load() });
    body.querySelector('#zkMap')?.addEventListener('click', map);
    body.querySelector('#zkPrev')?.addEventListener('click', () => { if (page > 1) { page--; load() } });
    body.querySelector('#zkNext')?.addEventListener('click', () => { if (page < data.pagination.lastPage) { page++; load() } });
    body.querySelectorAll('[data-replay]').forEach(b => b.addEventListener('click', () => replay(b.dataset.replay)));
    body.querySelectorAll('[data-enrollment]').forEach(b => b.addEventListener('click', () => { const i = document.getElementById('zkEnrollment'); if (i) { i.value = b.dataset.enrollment || ''; i.focus(); i.scrollIntoView({ block: 'center', behavior: 'smooth' }) } }));
  }

  async function map() {
    const employeeId = document.getElementById('zkEmployee')?.value, enrollmentNumber = String(document.getElementById('zkEnrollment')?.value || '').trim(), deviceId = device()?.id || 'zkteco-primary';
    if (!employeeId || !enrollmentNumber) { alert('اختر الموظف وأدخل رقم التسجيل.'); return }
    try { await request('/mappings', { method: 'POST', body: { deviceId, employeeId, enrollmentNumber } }); await api().refresh().catch(() => { }); if (typeof toast === 'function') toast('تم حفظ ربط ZKTeco.'); page = 1; await load() } catch (e) { api().showError(e) }
  }

  async function replay(id) {
    const event = data.events.find(e => String(e.id) === String(id)); if (!event) return;
    const x = effectiveEmployee(event); if (!x) { alert('يجب ربط رقم التسجيل بموظف قبل إعادة معالجة الحدث.'); return }
    if (!confirm(`إعادة معالجة الحدث للموظف ${labelEmployee(x.employeeId)}؟`)) return;
    try { await request('/events/' + encodeURIComponent(id) + '/replay', { method: 'POST', body: {} }); if (typeof toast === 'function') toast('تمت إعادة معالجة الحدث.'); await api().refresh().catch(() => { }); await load() } catch (e) { api().showError(e) }
  }

  async function open() { ensure().classList.add('show'); await load() }
  window.MoshZktecoAdmin = { open, close, refresh: load };

  function installEmployeeButton() {
    const hrApp = document.getElementById('hrApp'); if (!hrApp || document.getElementById('moshZktecoAdminButton')) return;
    const head = [...hrApp.querySelectorAll('.h13-page-head')].find(h => h.querySelector('h2')?.textContent.trim() === 'الموظفون'); if (!head) return;
    const actions = head.lastElementChild; if (!actions) return;
    const b = document.createElement('button'); b.id = 'moshZktecoAdminButton'; b.type = 'button'; b.className = 'h13-btn'; b.textContent = 'ZKTeco'; b.onclick = e => { e.preventDefault(); e.stopPropagation(); open() }; actions.insertBefore(b, actions.firstChild);
  }
  const hrApp = document.getElementById('hrApp');
  if (hrApp) new MutationObserver(installEmployeeButton).observe(hrApp, { childList: true, subtree: true });
  installEmployeeButton();
})();