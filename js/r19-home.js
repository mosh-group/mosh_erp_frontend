/* Home simplification: same R18 shell and views, fewer duplicate entry points. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  function mount() {
    document.documentElement.classList.add('mosh-review19');
    const home = $('employeeSpaceV11');
    if (!home) return;
    const profile = home.querySelector('.es11-person');
    if (profile && !$('r19MyFile')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'r19MyFile'; b.className = 'r19-my-file';
      b.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 3H5v18h14V8Z"/><path d="M14 3v6h5M8 13h8m-8 4h5"/></svg><span>ملفي الوظيفي</span><span aria-hidden="true">←</span>';
      b.onclick = () => { window.openEmployeePortal?.(); decoratePortal(); };
      profile.appendChild(b);
    }
    const departments = $('dashboardDepartments'); if (departments && !departments.hidden) departments.hidden = true;
    decoratePortal();
  }
  function decoratePortal() {
    const portal = $('employeePortalApp'); if (!portal) return;
    const h = portal.querySelector('.employee-portal-head h2');
    if (h && h.textContent !== 'ملفي الوظيفي') h.textContent = 'ملفي الوظيفي';
    if (portal.classList.contains('active')) {
      const crumb = $('crumb'); const text = '<b>اللوحة الرئيسية</b> / ملفي الوظيفي';
      if (crumb && crumb.innerHTML !== text) crumb.innerHTML = text;
    }
    const services = portal.querySelector('.employee-portal-services');
    if (services && !$('r19MyAttendance')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'r19MyAttendance';
      b.innerHTML = '<b>سجل الدوام</b><small>الحضور والتأخير والأساسي والإضافي</small>'; b.onclick = () => window.MoshHR19?.openAttendance?.(); services.appendChild(b);
    }
    if (services && !$('r19MyDecisions')) {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'r19MyDecisions';
      b.innerHTML = '<b>الإجراءات الوظيفية</b><small>قراراتك المعتمدة مع التفاصيل</small>'; b.setAttribute('data-r19-my-record', ''); services.appendChild(b);
    }
  }
  if (typeof window.openEmployeePortal === 'function') {
    const open = window.openEmployeePortal;
    window.openEmployeePortal = function () { const result = open.apply(this, arguments); decoratePortal(); return result; };
  }
  let scheduled = false;
  const schedule = () => { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; mount(); }); };
  const host = $('appShell'); if (host) new MutationObserver(schedule).observe(host, { subtree: true, childList: true });
  document.addEventListener('mosh:r19-change', schedule); document.addEventListener('mosh:ui-ready', schedule); document.addEventListener('mosh:refreshed', schedule); mount();
  window.MoshHome19 = { mount, decoratePortal };
})();
