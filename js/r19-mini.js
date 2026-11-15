/* MOSH R19 production: geometry and appearance layer for the original R18 Mini.
 * Load AFTER js/63-mosh-mini-workdesk.js and MoshPreview19.
 * Tasks, receipts, clocks, work states and logs remain owned by MoshWorkdesk50.
 * Only presentation preferences are stored here, per authenticated account.
 */
(function () {
 'use strict';
 if (window.MoshMini19) return;
 const mini = window.MoshMini18;
 const box = document.getElementById('moshMini18');
 if (!mini || !box) return;
 const helper = window.MoshPreview19;
 const clampNumber = (n, min, max) => Math.max(min, Math.min(max, n));
 const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
 const currentUserId = () => String(window.MoshApi?.user?.id || window.MoshAuth37?.current?.()?.id || '');
 const currentMode = () => box.classList.contains('mini18-is-compact');
 let layoutOwner = '';
 let layout = null;
 let gesture = null;
 let previousCompact = currentMode();
 let previousHidden = box.hidden;
 let pending = 0;

 function defaults() {
  return { version: 1, left: innerWidth < 480 ? 10 : 24, top: innerWidth < 480 ? 70 : 90, width: 390, height: null };
 }
 function loadLayout() {
  const id = currentUserId();
  if (layout && id === layoutOwner) return;
  layoutOwner = id;
  const fallback = defaults();
  let saved = null;
  try { saved = helper?.get('mini_layout_' + id, null); } catch (_) {}
  layout = {
   version: 1,
   left: finite(saved?.left, fallback.left),
   top: finite(saved?.top, fallback.top),
   width: clampNumber(finite(saved?.width, fallback.width), 240, 720),
   height: saved?.height == null ? null : clampNumber(finite(saved.height, 600), 180, 1400)
  };
 }
 function saveLayout() {
  if (!layout || !layoutOwner) return;
  try { helper?.set('mini_layout_' + layoutOwner, { ...layout }); } catch (_) {}
 }
 function limits() {
  return { width: Math.max(1, innerWidth - 16), height: Math.max(1, innerHeight - 16) };
 }
 function updateSizeLabel() {
  const handle = box.querySelector('.mini19-resize');
  if (!handle) return;
  const r = box.getBoundingClientRect();
  handle.setAttribute('aria-label', 'تعديل حجم لوحة MOSH MINI، العرض ' + Math.round(r.width) + ' والارتفاع ' + Math.round(r.height) + ' بكسل');
 }
 function applyLayout() {
  pending = 0;
  loadLayout();
  if (box.hidden || mini.mode === 'window') return;
  const max = limits();
  const compact = currentMode();
  const width = Math.min(compact ? 390 : layout.width, max.width);
  box.style.width = Math.max(1, width) + 'px';
  box.style.maxWidth = max.width + 'px';
  box.style.maxHeight = max.height + 'px';
  box.style.height = compact || layout.height == null ? '' : Math.min(layout.height, max.height) + 'px';
  const r = box.getBoundingClientRect();
  // Keep the user's preferred position separate from temporary viewport clamps.
  // Expanding a strip near the bottom therefore does not forget its strip position.
  box.style.left = clampNumber(layout.left, 8, Math.max(8, innerWidth - r.width - 8)) + 'px';
  box.style.top = clampNumber(layout.top, 8, Math.max(8, innerHeight - r.height - 8)) + 'px';
  updateSizeLabel();
 }
 function requestLayout() {
  if (!pending) pending = requestAnimationFrame(applyLayout);
 }

 box.classList.add('mini19-ui');
 const resizeHandle = document.createElement('button');
 resizeHandle.type = 'button';
 resizeHandle.className = 'mini19-resize';
 resizeHandle.setAttribute('aria-label', 'تعديل حجم لوحة MOSH MINI');
 resizeHandle.title = 'اسحب لتعديل الحجم، أو استخدم مفاتيح الأسهم عند تحديد المقبض';
 resizeHandle.innerHTML = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7 16 16 7M12 16l4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
 box.appendChild(resizeHandle);
 const hint = document.getElementById('mini18Hint');
 if (hint && mini.mode !== 'window') hint.textContent = 'اسحب اللوحة · غيّر حجمها من الزاوية';

 // Preserve the original independent-window control and all work actions.
 box.addEventListener('click', event => {
  if (event.target.closest?.('.mini19-resize')) { event.preventDefault(); event.stopImmediatePropagation(); }
 }, true);

 function beginGesture(event) {
  if (mini.mode === 'window' || box.hidden || event.button !== 0) return;
  const resizing = !!event.target.closest?.('.mini19-resize');
  const dragging = !!event.target.closest?.('[data-mini18-drag]') && !event.target.closest?.('button,input,a,select,textarea');
  if (!resizing && !dragging) return;
  if (resizing && currentMode()) return;
  loadLayout();
  const r = box.getBoundingClientRect();
  gesture = { id: event.pointerId, kind: resizing ? 'resize' : 'drag', x: event.clientX, y: event.clientY, left: r.left, top: r.top, width: r.width, height: r.height };
  box.classList.add(resizing ? 'mini19-resizing' : 'mini19-dragging');
  try { box.setPointerCapture(event.pointerId); } catch (_) {}
  event.preventDefault();
  // Prevent the R18 drag handler from maintaining a second position in parallel.
  event.stopImmediatePropagation();
 }
 function moveGesture(event) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
  if (gesture.kind === 'drag') {
   layout.left = gesture.left + dx;
   layout.top = gesture.top + dy;
  } else {
   const max = limits();
   // The upper-left anchor stays put when the user changes the panel size.
   const availableWidth = Math.max(1, innerWidth - gesture.left - 8);
   const availableHeight = Math.max(1, innerHeight - gesture.top - 8);
   layout.left = gesture.left;
   layout.top = gesture.top;
   layout.width = clampNumber(gesture.width + dx, Math.min(320, availableWidth), Math.min(720, max.width, availableWidth));
   layout.height = clampNumber(gesture.height + dy, Math.min(280, availableHeight), Math.min(max.height, availableHeight));
  }
  applyLayout();
  event.preventDefault();
 }
 function endGesture(event) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const r = box.getBoundingClientRect();
  layout.left = r.left;
  layout.top = r.top;
  if (gesture.kind === 'resize') { layout.width = r.width; layout.height = r.height; }
  gesture = null;
  try { box.releasePointerCapture(event.pointerId); } catch (_) {}
  box.classList.remove('mini19-dragging', 'mini19-resizing');
  saveLayout();
  applyLayout();
 }
 box.addEventListener('pointerdown', beginGesture, true);
 window.addEventListener('pointermove', moveGesture, { capture: true, passive: false });
 window.addEventListener('pointerup', endGesture, true);
 window.addEventListener('pointercancel', endGesture, true);
 box.addEventListener('lostpointercapture', endGesture);
 resizeHandle.addEventListener('keydown', event => {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
  event.preventDefault(); event.stopPropagation();
  loadLayout();
  const r = box.getBoundingClientRect(), step = event.shiftKey ? 4 : 16;
  const max = { width: Math.max(1, innerWidth - r.left - 8), height: Math.max(1, innerHeight - r.top - 8) };
  layout.left = r.left; layout.top = r.top;
  if (event.key === 'Home') { layout.width = 390; layout.height = null; }
  else {
   layout.width = clampNumber(r.width + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), Math.min(320, max.width), Math.min(720, max.width));
   layout.height = clampNumber(r.height + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0), Math.min(280, max.height), max.height);
  }
  applyLayout(); saveLayout();
 });

 const observer = new MutationObserver(() => {
  const mode = currentMode(), hidden = box.hidden, changedOwner = currentUserId() !== layoutOwner;
  if (mode !== previousCompact || hidden !== previousHidden || changedOwner) {
   previousCompact = mode; previousHidden = hidden;
   requestLayout();
  }
 });
 observer.observe(box, { attributes: true, attributeFilter: ['class', 'hidden'] });
 window.addEventListener('resize', requestLayout);
 window.visualViewport?.addEventListener('resize', requestLayout);
 ['mosh:ui-ready', 'mosh:refreshed'].forEach(type => document.addEventListener(type, requestLayout));
 window.MoshMini19 = {
  version: 'r19',
  mode: mini.mode,
  applyLayout,
  layout: () => { loadLayout(); return { ...layout }; },
  resetLayout: () => { layout = defaults(); saveLayout(); applyLayout(); }
 };
 loadLayout();
 applyLayout();
})();
