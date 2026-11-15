/* R19 review: compact the existing department dashboards; data and actions stay intact. */
(function () {
  'use strict';
  if (window.MoshReviewDashboard19) { window.MoshReviewDashboard19.mount(); return; }

  const ROOT = '.view .db9[data-department]';
  const FOLLOW_TITLES = new Set(['أولوية المتابعة', 'المهام المهمة حالياً']);
  let queued = false, observer;
  const titleOf = element => String(element?.textContent || '').replace(/\s+/g, ' ').trim();

  function hide(element, kind) {
    if (!element) return;
    if (!element.hidden) element.hidden = true;
    if (element.getAttribute('aria-hidden') !== 'true') element.setAttribute('aria-hidden', 'true');
    if (element.dataset.r19DashboardHidden !== kind) element.dataset.r19DashboardHidden = kind;
    // Calm19 explicitly displays its details and panels. An inline override also survives its later refresh.
    if (element.style.getPropertyValue('display') !== 'none' || element.style.getPropertyPriority('display') !== 'important') {
      element.style.setProperty('display', 'none', 'important');
    }
  }

  function hidePanel(root, panel, kind) {
    hide(panel, kind);
    // The original calm theme may wrap the panel after this overlay has run.
    // Hide only that panel's own wrapper, never the general metrics/results fold.
    const fold = panel.closest('details[data-c19-key]');
    if (fold && fold.closest('.db9') === root && fold.dataset.c19Key === 'dash-' + root.dataset.department + '-' + kind) {
      hide(fold, kind + '-fold');
    }
  }

  function mount() {
    document.querySelectorAll(ROOT).forEach(root => {
      root.querySelectorAll('.db9-panel').forEach(panel => {
        if (panel.closest('.db9') !== root) return;
        const title = titleOf(panel.querySelector(':scope > header h3'));
        if (title === 'نظرة على أعمال القسم' && panel.querySelector(':scope > .db9-special-grid')) {
          hidePanel(root, panel, 'overview');
        } else if (title === 'أحمال فريق القسم' && panel.querySelector(':scope > .db9-team')) {
          hidePanel(root, panel, 'team');
        }
      });

      root.querySelectorAll(':scope > .db9-follow').forEach(panel => {
        const header = panel.querySelector(':scope > header');
        if (!header || !FOLLOW_TITLES.has(titleOf(header.querySelector('h3')))) return;
        if (!header.querySelector('[data-action="filter"][data-value="all"]')) return;
        // The title, subtitle and redundant "all open" shortcut are the entire requested strip.
        // Filters, search, table, pagination and their delegated event handlers are not moved or edited.
        hide(header, 'follow-header');
        if (panel.dataset.r19FollowTrimmed !== '1') panel.dataset.r19FollowTrimmed = '1';
      });
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; mount(); });
  }

  function start() {
    mount();
    if (observer) return;
    observer = new MutationObserver(records => {
      const relevant = records.some(record => record.target.closest?.('.db9[data-department]') ||
        Array.from(record.addedNodes).some(node => node.nodeType === 1 &&
          (node.matches('.db9[data-department]') || node.querySelector('.db9[data-department]'))));
      // Calm19 wraps already-hidden panels in a later timer. Reflect that wrapping
      // in this mutation delivery, before paint, rather than waiting for another RAF.
      // All writes in mount() are idempotent attributes, which this observer ignores.
      if (relevant) mount();
    });
    // Own changes affect only attributes. Watching child nodes avoids feedback loops,
    // while still catching dashboard renders and calm19's later accordion wrapping.
    observer.observe(document.querySelector('main .content') || document.body, {childList: true, subtree: true});
  }

  window.MoshReviewDashboard19 = {
    mount,
    inspect: () => Array.from(document.querySelectorAll(ROOT)).map(root => ({
      department: root.dataset.department,
      hidden: Array.from(root.querySelectorAll('[data-r19-dashboard-hidden]')).map(element => ({
        kind: element.dataset.r19DashboardHidden,
        tag: element.tagName.toLowerCase(),
        foldKey: element.dataset.c19Key || '',
        hidden: element.hidden && getComputedStyle(element).display === 'none'
      })),
      taskTable: !!root.querySelector('.db9-follow > .db9-table-wrap > .db9-table'),
      taskFilter: !!root.querySelector('.db9-follow select[data-field="filter"]'),
      search: !!root.querySelector('.db9-follow .db9-search'),
      pagination: !!root.querySelector('.db9-follow > footer')
    }))
  };
  ['mosh:ui-ready', 'mosh:refreshed', 'mosh:r19-change'].forEach(type => document.addEventListener(type, schedule));
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, {once: true});
})();
