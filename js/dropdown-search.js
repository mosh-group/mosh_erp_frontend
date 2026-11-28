(() => {
  'use strict';

  const choices = 'select, input[list]:not([type="hidden"])';
  const fieldClass = 'mosh-dropdown-search-field';
  const dialogId = 'moshDropdownSearchDialog';
  const searchLabel = 'بحث في خيارات القائمة';
  const pending = new Set();
  let frame = 0;
  let active = null;

  function searchable(text) {
    return String(text).normalize('NFKD')
      .replace(/[\p{M}\u0640]/gu, '')
      .replace(/[ىی]/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) % 16))
      .toLowerCase().trim();
  }

  function optionSource(control) {
    return control instanceof HTMLSelectElement ? control : control.list;
  }

  function available(control) {
    return control.isConnected && control.matches(choices) && control.getClientRects().length
      && !control.matches(':disabled, [readonly], [aria-disabled="true"]') && optionSource(control);
  }

  function allowedOption(option) {
    return !option.disabled && !option.hidden && !option.closest('optgroup[disabled], optgroup[hidden]');
  }

  function readOptions(control) {
    return Array.from(optionSource(control)?.options || []).filter(option =>
      allowedOption(option) && (control instanceof HTMLSelectElement || option.value)
    ).map(option => {
      const label = option.label || option.value;
      const group = option.closest('optgroup')?.label || '';
      return {option, label, group, search: searchable(label + ' ' + group + ' ' + option.value)};
    });
  }

  function render(session) {
    const terms = searchable(session.query.value).split(/\s+/).filter(Boolean);
    session.matches = session.options.filter(row => terms.every(term => row.search.includes(term)));
    const rows = document.createDocumentFragment();

    for (const [index, row] of session.matches.entries()) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const selected = session.control instanceof HTMLSelectElement ? row.option.selected : row.option.value === session.control.value;
      button.type = 'button';
      button.className = 'mosh-dropdown-search-option';
      button.dataset.index = String(index);
      if (session.control instanceof HTMLSelectElement && session.control.multiple) button.setAttribute('aria-pressed', String(selected));
      else if (selected) button.setAttribute('aria-current', 'true');
      button.textContent = row.label;
      if (row.group) {
        const group = document.createElement('small');
        group.textContent = row.group;
        button.append(group);
      }
      item.append(button);
      rows.append(item);
    }

    session.list.replaceChildren(rows);
    session.list.scrollTop = 0;
    session.empty.hidden = session.matches.length > 0;
    session.empty.textContent = session.options.length ? 'لا توجد نتائج.' : 'لا توجد خيارات متاحة.';
  }

  function closeSearch() {
    if (active?.dialog.open) window.MoshUI19.close(dialogId, true);
  }

  function selectOption(session, index) {
    if (session !== active || !session.dialog.open) return;
    const {control} = session;
    if (!available(control)) {
      closeSearch();
      return;
    }
    const option = session.matches[index]?.option;
    if (!option || !optionSource(control).contains(option) || !allowedOption(option)) {
      session.options = readOptions(control);
      render(session);
      return;
    }

    const isSelect = control instanceof HTMLSelectElement;
    const multiple = isSelect && control.multiple;
    const changed = isSelect ? multiple || !option.selected : control.value !== option.value;
    if (multiple) option.selected = !option.selected;
    else if (isSelect) control.selectedIndex = Array.prototype.indexOf.call(control.options, option);
    else control.value = option.value;

    if (!multiple) closeSearch();
    if (changed) {
      control.dispatchEvent(new Event('input', {bubbles: true}));
      if (control.isConnected) control.dispatchEvent(new Event('change', {bubbles: true}));
    }
    if (multiple && available(control) && session.dialog.open) {
      render(session);
      session.query.focus();
    }
  }

  function navigate(event, session) {
    if (event.isComposing) return;
    if (event.key === 'Enter' && event.target === session.query && session.matches.length) {
      event.preventDefault();
      selectOption(session, 0);
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = Array.from(session.list.querySelectorAll('button'));
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement);
    const next = event.key === 'ArrowDown' ? buttons[Math.min(index + 1, buttons.length - 1)]
      : (index < 0 ? buttons.at(-1) : buttons[index - 1] || session.query);
    event.preventDefault();
    next?.focus();
  }

  function openSearch(control, trigger) {
    if (!available(control) || !window.MoshUI19) return;
    trigger.focus({preventScroll: true});
    const dialog = window.MoshUI19.dialog(dialogId, 'بحث في القائمة',
      '<input type="search" class="mosh-dropdown-search-query" autocomplete="off" aria-label="' + searchLabel + '" placeholder="ابحث في الخيارات…">' +
      '<ul class="mosh-dropdown-search-results" aria-label="خيارات القائمة"></ul>' +
      '<p class="mosh-dropdown-search-empty" role="status" hidden></p>'
    );
    const session = {
      control, dialog, options: readOptions(control), matches: [],
      query: dialog.querySelector('.mosh-dropdown-search-query'),
      list: dialog.querySelector('.mosh-dropdown-search-results'),
      empty: dialog.querySelector('.mosh-dropdown-search-empty')
    };
    active = session;
    trigger.setAttribute('aria-expanded', 'true');
    session.query.oninput = () => render(session);
    session.list.onclick = event => {
      const button = event.target.closest('[data-index]');
      if (button) selectOption(session, Number(button.dataset.index));
    };
    dialog.onkeydown = event => navigate(event, session);
    dialog.addEventListener('close', () => {
      trigger.setAttribute('aria-expanded', 'false');
      if (active !== session) return;
      dialog.onkeydown = null;
      session.query.oninput = null;
      session.list.onclick = null;
      session.list.replaceChildren();
      active = null;
    }, {once: true});
    render(session);
    session.query.focus();
  }

  function addSearch(control) {
    if (!control.isConnected || !control.matches(choices) || control.parentElement.classList.contains(fieldClass)) return;
    const focus = document.activeElement === control;
    const holder = document.createElement('span');
    holder.className = fieldClass;

    // A label may already contain its control. Use a non-labelable trigger inside it.
    const insideLabel = Boolean(control.closest('label'));
    const trigger = document.createElement(insideLabel ? 'span' : 'button');
    if (insideLabel) {
      trigger.tabIndex = 0;
      trigger.setAttribute('role', 'button');
      trigger.onkeydown = event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        trigger.click();
      };
    } else trigger.type = 'button';
    trigger.className = 'mosh-dropdown-search-trigger';
    trigger.title = searchLabel;
    trigger.setAttribute('aria-label', searchLabel);
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    const icon = document.createElement('span');
    icon.className = 'mosh-dropdown-search-lens';
    icon.setAttribute('aria-hidden', 'true');
    trigger.append(icon);
    trigger.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      openSearch(control, trigger);
    };
    control.before(holder);
    holder.append(control, trigger);
    if (focus) control.focus({preventScroll: true});
  }

  function queue(root) {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches(choices)) pending.add(root);
    for (const control of root.querySelectorAll(choices)) pending.add(control);
    if (pending.size && !frame) frame = requestAnimationFrame(() => {
      frame = 0;
      for (const control of pending) addSearch(control);
      pending.clear();
    });
  }

  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes' && record.attributeName === 'list') queue(record.target);
      if (!record.target.closest?.('#' + dialogId)) for (const node of record.addedNodes) queue(node);
    }

    const session = active;
    if (!session?.dialog.open) return;
    if (!available(session.control)) {
      closeSearch();
      return;
    }
    const source = optionSource(session.control);
    if (records.some(record => record.target === session.control || source.contains(record.target))) {
      session.options = readOptions(session.control);
      render(session);
    }
  }).observe(document.body, {
    subtree: true, childList: true, attributes: true,
    attributeFilter: ['list', 'disabled', 'hidden', 'label', 'value', 'selected']
  });

  for (const event of ['mosh:logout-complete', 'mosh:session-expired']) document.addEventListener(event, closeSearch);
  queue(document.body);
})();
