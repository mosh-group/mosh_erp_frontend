(function () {
  'use strict';

  const status = document.getElementById('pageLoadStatus');
  const styleSlots = new Map(Array.from(document.querySelectorAll('[data-page-style]'), slot => [
    slot.dataset.pageStyle, slot
  ]));
  const pages = new Map(Array.from(document.querySelectorAll('section.view[data-page]'), shell => [
    shell.dataset.page, {shell, loaded: false, request: null}
  ]));
  let navigation = 0;
  let freshEntry = null;
  const needsData = app => pages.has(app) && window.MoshApi?.sectionPending(app);

  function linkedSection() {
    const app = new URL(location.href).searchParams.get('section');
    return pages.has(app) ? app : null;
  }

  // Keep ordinary clicks inside MOSH and let the browser handle opening another tab or window.
  document.addEventListener('click', event => {
    if (!event.target.closest?.('#appSidebar .nav a[href^="?section="]')) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      event.stopImmediatePropagation();
    } else event.preventDefault();
  }, true);

  function configure(manifest) {
    for (const [app, page] of pages) {
      const entry = manifest.pages?.[app];
      if (!entry?.html || (entry.style && !styleSlots.has(app))) {
        throw new Error('ملفات أقسام الواجهة غير مكتملة.');
      }
      page.assets = entry;
      page.styleSlot = styleSlots.get(app);
    }
  }

  function insertAsset(element, append) {
    return new Promise((resolve, reject) => {
      function finish(error) {
        clearTimeout(timer);
        element.onload = element.onerror = null;
        if (error) {
          element.remove();
          reject(error);
        } else resolve();
      }
      const timer = setTimeout(() => finish(new Error('تأخر تحميل ملف من ملفات القسم.')), 15000);
      element.onload = () => finish();
      element.onerror = () => finish(new Error('تعذر تحميل ملف من ملفات القسم.'));
      append(element);
    });
  }

  async function loadStyle(page) {
    if (!page.assets.style || page.styleLoaded) return;
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = page.assets.style;
    await insertAsset(style, element => page.styleSlot.after(element));
    page.styleLoaded = true;
  }

  async function mount(page) {
    const app = page.shell.dataset.page;
    const response = await fetch(page.assets.html, {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('تعذر تحميل محتوى القسم.');
    const template = document.createElement('template');
    template.innerHTML = await response.text();
    const source = template.content.firstElementChild;
    if (template.content.childElementCount !== 1 || source?.id !== page.shell.id ||
        !source.matches('section.view')) {
      throw new Error('محتوى القسم غير صالح.');
    }

    await loadStyle(page);
    const nodes = Array.from(source.childNodes);
    page.shell.prepend(...nodes);
    if (page.assets.script) {
      const script = document.createElement('script');
      script.src = page.assets.script;
      try {
        await insertAsset(script, element => document.head.append(element));
      } catch (error) {
        nodes.forEach(node => node.remove());
        throw error;
      }
    }

    page.loaded = true;
    document.dispatchEvent(new CustomEvent('mosh:page-mounted', {detail: {app}}));
  }

  function load(app) {
    const page = pages.get(app);
    if (!page || page.loaded) return Promise.resolve();
    // One request per page, including when its menu and a shortcut are opened together.
    if (!page.request) page.request = mount(page).finally(() => { page.request = null; });
    return page.request;
  }

  function pending(app) {
    const page = pages.get(app);
    return !!page && !page.loaded;
  }

  function message(text = '', error = false) {
    status.setAttribute('role', error ? 'alert' : 'status');
    status.textContent = text;
    status.hidden = !text;
  }

  function cancel() {
    navigation++;
    message();
  }

  function open(app, action, onError) {
    cancel();
    const fetchData = needsData(app);
    if (!pending(app) && !fetchData) return action();
    const auth = window.MoshAuth37;
    if (!auth?.canModule(app, 'view')) return false;
    const ticket = navigation;
    const owner = window.MoshApi?.user?.id;
    message('جارٍ تحميل القسم…');
    const data = fetchData ? window.MoshApi.ensureSection(app) : Promise.resolve();
    return Promise.all([load(app), data]).then(() => {
      if (ticket !== navigation || owner !== window.MoshApi?.user?.id) return false;
      message();
      if (!auth.canModule(app, 'view')) return false;
      if (fetchData) freshEntry = app;
      try { return action(); } finally { if (fetchData) freshEntry = null; }
    }, error => {
      if (ticket !== navigation) return false;
      console.error('MOSH section load:', app, error);
      onError?.();
      message('تعذر تحميل القسم. حاول فتحه مرة أخرى.', true);
      return false;
    });
  }

  function installNavigation() {
    const navigate = window.goApp;
    window.goApp = function (app, ...args) {
      if ((!pending(app) && !needsData(app)) || !window.MoshAuth37?.canModule(app, 'view')) {
        cancel();
        return navigate.call(this, app, ...args);
      }
      return open(app, () => navigate.call(this, app, ...args));
    };
    const goHome = window.goMainMenu;
    window.goMainMenu = function (...args) {
      cancel();
      return goHome.apply(this, args);
    };
    for (const event of ['mosh:logout-complete', 'mosh:session-expired']) {
      document.addEventListener(event, cancel);
    }
  }

  window.MoshPages = {configure, load, open, pending, installNavigation, cancel,
    linkedSection, hasFreshEntry: app => freshEntry === app};
})();
