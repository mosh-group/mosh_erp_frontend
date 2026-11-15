/* MOSH R19 production: compact identity, metadata by the name, file by the clock, and a collapsible time summary.
 * Original employee bindings, workdesk timers and business data remain live.
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let scheduled = false, timeExpanded = false;
  function finalizeReviewStyles() {
    // R18 inserts several style elements while booting. Place just this review's
    // overrides after those runtime styles once, preserving their media rules.
    document.querySelectorAll('style[data-mosh-review^="r19-review-"],link[rel="stylesheet"][data-mosh-review^="r19-review-"]').forEach(style => {
      if (style.dataset.r19ReviewFinal === '1') return;
      style.dataset.r19ReviewFinal = '1'; document.body.appendChild(style);
    });
  }
  function arrangeIdentity() {
    const header = document.querySelector('#employeeSpaceV11 .es11-header');
    const person = document.querySelector('#employeeSpaceV11 .es11-person');
    const name = $('dashboardUserName'), file = $('r19MyFile');
    if (!header || !person || !name || !file || !person.contains(name)) return;
    let row = person.querySelector('.r19-review-name-row');
    if (!row) {
      row = document.createElement('div'); row.className = 'r19-review-name-row';
      name.before(row); row.appendChild(name);
    }
    // Compact reference 01 keeps the existing live metadata under the full name.
    // Reuse the same nodes so employee/manager refreshes and event bindings survive.
    const meta = header.querySelector('.es11-meta');
    const tools = header.querySelector('.es11-header-tools');
    if (meta && document.documentElement.classList.contains('mosh-compact01')) {
      if (meta.parentElement !== person) person.appendChild(meta);
    } else if (meta && tools && (meta.parentElement !== header || meta.nextElementSibling !== tools)) {
      header.insertBefore(meta, tools);
    }
    const clock = tools?.querySelector('.es11-clock');
    if (tools && clock && (file.parentElement !== tools || file.nextElementSibling !== clock)) {
      tools.insertBefore(file, clock);
    }
    // Restyle the existing button once; its id, onclick and portal action stay live.
    if (file.dataset.r19ClockButton !== '1') {
      file.dataset.r19ClockButton = '1';
      file.innerHTML = '<span class="r19-file-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H5v18h14V8Z"/><path d="M14 3v6h5M8 13h8m-8 4h5"/></svg></span><span class="r19-file-label">ملفي الوظيفي</span><svg class="r19-file-chevron" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6"/></svg>';
    }
  }
  function applyDisclosure(summary) {
    const button = summary.querySelector('#r19TimeToggle'), body = summary.querySelector('#r19TimeDetails');
    if (!button || !body) return;
    button.setAttribute('aria-expanded', String(timeExpanded));
    body.hidden = !timeExpanded;
    summary.classList.toggle('r19-time-open', timeExpanded);
  }
  function arrangeSummary() {
    const summary = $('wd51TimeSummary'); if (!summary) return;
    summary.classList.add('r19-time-disclosure');
    if (!summary.querySelector('#r19TimeToggle')) {
      const title = summary.querySelector('.wd50-summary-title b');
      const button = document.createElement('button'); button.id = 'r19TimeToggle';
      button.type = 'button'; button.className = 'r19-time-toggle';
      button.setAttribute('aria-controls', 'r19TimeDetails');
      if (title) button.appendChild(title);
      else { const label = document.createElement('b'); label.textContent = 'ملخص وقت عملي اليوم'; button.appendChild(label); }
      button.insertAdjacentHTML('beforeend','<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg>');
      const body = document.createElement('div'); body.id = 'r19TimeDetails'; body.className = 'r19-time-details';
      body.setAttribute('role','region'); body.setAttribute('aria-labelledby','r19TimeToggle'); body.hidden = !timeExpanded;
      while (summary.firstChild) body.appendChild(summary.firstChild);
      summary.append(button, body);
      button.addEventListener('click', () => { timeExpanded = !timeExpanded; applyDisclosure(summary); });
    }
    applyDisclosure(summary);
  }
  function mount() {
    document.documentElement.classList.add('mosh-review19-1');
    finalizeReviewStyles();
    arrangeIdentity(); arrangeSummary();
    document.querySelectorAll('.app-version').forEach(el => { const release=window.MOSH_UI_RELEASE||'R31.1';if(el.textContent!==release)el.textContent=release; });
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true; requestAnimationFrame(() => { scheduled = false; mount(); });
  }
  const host = $('appShell'); if (host) new MutationObserver(schedule).observe(host, {childList:true,subtree:true});
  ['mosh:ui-ready','mosh:refreshed','mosh:r19-change'].forEach(type => document.addEventListener(type, schedule));
  window.MoshReview19_1 = {mount};
  mount();
})();
