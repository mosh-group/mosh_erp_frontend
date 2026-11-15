/* UI review: remove the overdue statistic card from existing MOSH dashboards. */
(function () {
  'use strict';
  if (window.MoshReviewOverdue19) { window.MoshReviewOverdue19.mount(); return; }
  const CARD = '.view .db9[data-department] .db9-kpi[data-action="filter"][data-value="overdue"]';
  const GROUP = '.db9-kpis,.c19-metrics';
  let queued = false, observer;
  function mount() {
    const groups = new Set(document.querySelectorAll('.view .db9 .r19-overdue-reflow'));
    document.querySelectorAll(CARD).forEach(card => {
      // Both the action and metric identify this card; labels in tables are untouched.
      if (!card.querySelector('strong[data-metric="overdue"]')) return;
      if (!card.hidden) card.hidden = true;
      // The original calm theme explicitly sets display:grid!important on cards.
      if (card.style.getPropertyValue('display') !== 'none' || card.style.getPropertyPriority('display') !== 'important') card.style.setProperty('display', 'none', 'important');
      if (card.tabIndex !== -1) card.tabIndex = -1;
      if (card.getAttribute('aria-hidden') !== 'true') card.setAttribute('aria-hidden', 'true');
      if (card.dataset.r19OverdueHidden !== '1') card.dataset.r19OverdueHidden = '1';
      if (card.parentElement?.matches(GROUP)) groups.add(card.parentElement);
    });
    groups.forEach(group => {
      const visible = Array.from(group.children).filter(card => card.matches('.db9-kpi') && !card.hidden && card.dataset.r19OverdueHidden !== '1' && getComputedStyle(card).display !== 'none');
      if (!group.classList.contains('r19-overdue-reflow')) group.classList.add('r19-overdue-reflow');
      // Twelve tracks fit four cards on one row while preserving the other group sizes.
      if (group.style.getPropertyValue('grid-template-columns') !== 'repeat(12, minmax(0, 1fr))' || group.style.getPropertyPriority('grid-template-columns') !== 'important') group.style.setProperty('grid-template-columns', 'repeat(12, minmax(0, 1fr))', 'important');
      const count = String(visible.length);
      if (group.dataset.r19VisibleCount !== count) group.dataset.r19VisibleCount = count;
      visible.forEach((card,index) => {
        const position = String(index + 1);
        if (card.dataset.r19OverduePosition !== position) card.dataset.r19OverduePosition = position;
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
      // Calm19 moves its final "done" KPI into another section after rendering.
      // Recount during this mutation delivery so four visible cards immediately
      // use four equal columns. Our idempotent attribute writes are not observed.
      if (relevant) mount();
    });
    observer.observe(document.querySelector('main .content') || document.body, {childList:true,subtree:true});
  }
  window.MoshReviewOverdue19 = {
    mount,
    inspect: () => Array.from(document.querySelectorAll('.view .db9 .r19-overdue-reflow')).map(group => ({
      department: group.closest('.db9')?.dataset.department || '',
      visibleCount: Number(group.dataset.r19VisibleCount),
      hiddenOverdue: group.querySelectorAll('[data-r19-overdue-hidden="1"]').length
    }))
  };
  document.addEventListener('mosh:r19-change', schedule);
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, {once:true});
})();
