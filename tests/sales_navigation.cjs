// Real sales navigation functions with isolated DOM fixtures; no browser/network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '../js', name), 'utf8');
function between(source, start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, start);
  return source.slice(first, last);
}
class Element {
  constructor(tag, cls = '', text = '') { this.tagName = tag.toUpperCase(); this.className = cls; this.text = text; this.children = []; this.dataset = {}; this.attrs = {}; this.events = {}; this.hidden = false; this.isConnected = true; }
  get classList() { return {contains: name => this.className.split(' ').includes(name)}; }
  get textContent() { return this.text + this.children.map(n => n.textContent).join(''); }
  set textContent(value) { this.text = value; this.children = []; }
  append(...nodes) { for (const n of nodes) { n.parentElement = this; this.children.push(n); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  cloneNode(deep) { const n = new Element(this.tagName, this.className, this.text); if (deep) n.append(...this.children.map(c => c.cloneNode(true))); return n; }
  remove() { this.parentElement.children = this.parentElement.children.filter(n => n !== this); }
  matches(selector) { if (selector === 'details[open]') return this.tagName === 'DETAILS' && this.open; if (selector.startsWith('.')) return this.classList.contains(selector.slice(1)); if (selector.startsWith('#')) return this.id === selector.slice(1); return this.tagName.toLowerCase() === selector; }
  querySelectorAll(selector) { const tokens = selector.split(','); const result = []; for (const n of this.children) { if (tokens.some(t => n.matches(t))) result.push(n); result.push(...n.querySelectorAll(selector)); } return result; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  getAttribute(key) { return this.attrs[key] || null; }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(key, action) { this.events[key] = action; }
  click() { this.onclick?.({preventDefault() {}}); }
  set open(value) { const changed = !!value !== this._open; this._open = !!value; if (changed) this.events.toggle?.(); }
  get open() { return !!this._open; }
  focus() {}
  contains(node) { return node === this || this.children.some(n => n.contains(node)); }
  getBoundingClientRect() { return {}; }
}
const make = (tag, cls, text) => new Element(tag, cls, text);
const body = make('body'), root = make('section', 'active'), box = make('div'), link = make('a');
root.id = 'salesApp'; body.append(root, box);
const quote = make('button', '', 'عروض الأسعار'), count = make('span', 'm15-count', '2'); quote.append(count);
const customer = make('button', '', 'العملاء'), report = make('button', '', 'تقارير المبيعات');
const legacy = make('button', '', 'اعتماد مدير القسم'), zero = make('span', 'mgr28-badge', '0'); zero.hidden = true; legacy.id = 'mgr28Tab_sales'; legacy.append(zero);
const proxy = make('button', '', 'اعتماد المدير'); proxy.id = 'mgr32eApproval_sales';
const sources = [quote, customer, report]; root.append(...sources, legacy, proxy);
const groupRows = [{name: 'العروض والعقود', rows: [quote]}, {name: 'العملاء والخدمات', rows: [customer]}, {name: 'التقارير والإعدادات', rows: [report]}];
let quoteClicks = 0, approvalClicks = 0;
quote.onclick = () => quoteClicks++; proxy.onclick = () => approvalClicks++;
legacy.onclick = () => { throw Error('Hidden legacy action must not run'); };
const legacySources = [legacy];
const all = (selector, within = body) => selector === '.menu-strip button,.menu-strip a' ? legacySources : within.querySelectorAll(selector);
const $ = (selector, within = body) => within.querySelector(selector);
const allowed = n => !!n && n !== legacy && !n.hidden && !n.disabled;
const tree = {box, link};
const sandbox = {
  make, all, $, console, trees: new Map([['sales', tree]]), expanded: 'sales',
  auth: () => ({canModule: () => true}), navigateSafely: fn => fn(), remember() {}, schedule() {}, restoring: false,
  toast: () => { throw Error('Unexpected unavailable action'); },
  window: {goApp: () => true, MoshGrouped35: {sources: () => sources, groups: () => groupRows, allowed}, MoshDepartmentDashboard: {openDashboard() {}, openAssignment() {}}}
};
const context = vm.createContext(sandbox), code = read('ui09-interface.js');
vm.runInContext(between(code, 'function openDepartmentTaskView(', '// HR mirrors'), context);
vm.runInContext(between(code, 'function refreshTree(', 'function sidebar('), context);
context.refreshTree('sales');
let sections = box.querySelectorAll('details');
assert.equal(sections.length, 4, 'All original groups and department options retained');
for (const section of sections) { assert.equal(section.open, false); assert.equal(section.querySelector('.ui09-sales-group-body').hidden, true); }
let leaves = box.querySelectorAll('button');
assert.ok(leaves.some(n => n.textContent === 'اعتماد مدير القسم'));
assert.ok(!leaves.some(n => /اعتماد.*[0٠۰]/.test(n.textContent)), 'Hidden zero must not become part of a label');
assert.ok(leaves.some(n => n.textContent === 'عروض الأسعار2'), 'Positive counts remain visible');
sections[0].querySelector('summary').click();
assert.equal(sections[0].open, true); assert.equal(sections[0].querySelector('.ui09-sales-group-body').hidden, false);
sections[1].querySelector('summary').click();
assert.equal(sections[0].open, false); assert.equal(sections[1].open, true);
sections[1].querySelector('summary').click();
assert.equal(sections[1].open, false, 'Second click collapses the same menu');
sections[0].querySelector('summary').click();
count.textContent = '3'; context.refreshTree('sales');
sections = box.querySelectorAll('details'); leaves = box.querySelectorAll('button');
assert.equal(sections[0].open, true, 'Count refresh retains the selected expanded menu');
leaves.find(n => n.textContent === 'عروض الأسعار3').click();
assert.equal(quoteClicks, 1);
assert.equal(sections[0].open, true, 'Choosing a page retains its containing menu');
assert.ok(sections.slice(1).every(n => !n.open));
sections.at(-1).querySelector('summary').click();
leaves.find(n => n.textContent === 'اعتماد مدير القسم').click();
assert.equal(approvalClicks, 1, 'Original approval option routes through the visible manager control');
assert.equal(sections[0].open, false, 'Opening another menu closes the previous menu');
assert.equal(sections.at(-1).open, true);
sections[2].querySelector('summary').click(); context.expanded = ''; context.refreshTree('sales');
assert.ok(sections.every(n => !n.open), 'Collapsing the department closes its submenus');
assert.equal(zero.textContent, '0', 'Presentation cleanup does not change the source count');
assert.deepEqual(sources, [quote, customer, report], 'Original source nodes retained');

// The real legacy menu has parent triggers AND child buttons. They must not be
// flattened together inside "Sales options", which was the remaining defect.
function originalMenu(id, title, labels, action) {
  const trigger = make('button', '', title + ' ▾'), dropdown = make('div', 'dropdown');
  trigger.setAttribute('onclick', "toggleDrop('" + id + "')"); dropdown.id = id;
  trigger.onclick = () => { throw Error('Do not open a hidden legacy dropdown'); };
  const leaves = labels.map(label => {const button = make('button', '', label); button.onclick = action; dropdown.append(button); return button;});
  root.append(trigger, dropdown); legacySources.push(trigger, ...leaves); return leaves;
}
let clientActions = 0, serviceActions = 0;
const originalClients = originalMenu('customersDrop', 'العملاء', ['إضافة عميل جديد', 'تعديل معلومات عميل', 'قائمة العملاء'], () => clientActions++);
const originalServices = originalMenu('servicesDrop', 'الخدمات', ['إضافة خدمة', 'تعديل خدمة', 'قائمة الخدمات'], () => serviceActions++);
context.expanded = 'sales'; context.refreshTree('sales');
const optionsSection = () => box.children.find(n => n.dataset.salesGroup === 'خيارات المبيعات');
const submenu = id => optionsSection().querySelectorAll('details').find(n => n.dataset.salesGroup.endsWith('/' + id));
assert.equal(optionsSection().open, false);
assert.equal(submenu('customersDrop').open, false);
assert.equal(submenu('servicesDrop').open, false);
optionsSection().querySelector('summary').click();
assert.equal(submenu('customersDrop').querySelector('.ui09-sales-group-body').hidden, true);
assert.equal(submenu('servicesDrop').querySelector('.ui09-sales-group-body').hidden, true);
submenu('customersDrop').querySelector('summary').click();
assert.equal(submenu('customersDrop').open, true);
assert.deepEqual(submenu('customersDrop').querySelectorAll('button').map(n => n.textContent), originalClients.map(n => n.textContent));
submenu('customersDrop').querySelector('summary').click();
assert.equal(submenu('customersDrop').open, false, 'Clients itself collapses on repeat click');
submenu('customersDrop').querySelector('summary').click();
submenu('servicesDrop').querySelector('summary').click();
assert.equal(submenu('customersDrop').open, false);
assert.equal(submenu('servicesDrop').open, true);
assert.deepEqual(submenu('servicesDrop').querySelectorAll('button').map(n => n.textContent), originalServices.map(n => n.textContent));
submenu('servicesDrop').querySelectorAll('button')[0].click();
assert.equal(serviceActions, 1); assert.equal(clientActions, 0);
assert.equal(optionsSection().open, true, 'The containing Sales options stays open after navigation');
assert.equal(submenu('servicesDrop').open, true, 'The selected nested menu stays open after navigation');
submenu('servicesDrop').querySelectorAll('button')[1].click();
assert.equal(serviceActions, 2);
assert.equal(optionsSection().open, true);
assert.equal(submenu('servicesDrop').open, true, 'Opening another page in the same menu does not collapse it');
optionsSection().querySelector('summary').click();
optionsSection().querySelector('summary').click();
assert.equal(submenu('servicesDrop').open, false, 'Reopening Sales options starts with collapsed children');
submenu('customersDrop').querySelector('summary').click();
count.textContent = '4'; context.refreshTree('sales');
assert.equal(optionsSection().open, true);
assert.equal(submenu('customersDrop').open, true, 'Live count updates preserve the selected nested group');
submenu('customersDrop').querySelectorAll('button')[0].click();
assert.equal(clientActions, 1);
assert.equal(optionsSection().open, true);
assert.equal(submenu('customersDrop').open, true);
submenu('servicesDrop').querySelector('summary').click();
assert.equal(submenu('customersDrop').open, false, 'Opening a different nested menu closes the previous one');
assert.equal(submenu('servicesDrop').open, true);
assert.equal(optionsSection().open, true, 'Switching nested menus retains their parent');
optionsSection().querySelector('summary').click();
optionsSection().querySelector('summary').click();
assert.equal(submenu('customersDrop').open, false, 'Closing the parent resets its expanded children');

// Navigation can rebuild the sidebar before the old leaf's click handler returns.
// The open path must survive replacement of every menu element.
submenu('customersDrop').querySelector('summary').click();
const detachedClientMenu = submenu('customersDrop');
const leafBeforeNavigation = detachedClientMenu.querySelectorAll('button')[0];
const savedGoApp = sandbox.window.goApp;
sandbox.window.goApp = () => {tree.signature = ''; context.refreshTree('sales'); return true;};
leafBeforeNavigation.click();
sandbox.window.goApp = savedGoApp;
assert.equal(optionsSection().open, true, 'Sales options survives a sidebar rebuild during navigation');
assert.equal(submenu('customersDrop').open, true, 'Client submenu survives replacement of the clicked leaf');
assert.equal(submenu('customersDrop').querySelectorAll('button')[0].attrs['aria-current'], 'page', 'Selection follows the new leaf after replacement');
detachedClientMenu.isConnected = false;
detachedClientMenu.open = false;
assert.ok(tree.salesOpenGroups.has('خيارات المبيعات/customersDrop'), 'Late toggle from a removed menu cannot clear the saved path');
submenu('customersDrop').open = false;
assert.equal(submenu('customersDrop').open, true, 'An incidental native toggle cannot override the chosen menu path');
tree.signature = ''; context.refreshTree('sales');
assert.equal(optionsSection().open, true, 'Later UI refresh retains parent');
assert.equal(submenu('customersDrop').open, true, 'Later UI refresh retains child');

// The two legacy top tabs are copied into Sales options, but their original
// controls are hidden. Their copies must route rather than click hidden nodes.
const originalAllowed = sandbox.window.MoshGrouped35.allowed;
const hiddenDashboard = make('button', '', 'لوحة التحكم'), hiddenRunning = make('button', '', 'مهام قسم المبيعات');
hiddenDashboard.id = 'salesDistributionTab'; hiddenRunning.id = 'salesRunningTab';
hiddenDashboard.onclick = hiddenRunning.onclick = () => { throw Error('Hidden task tabs must not be clicked'); };
root.append(hiddenDashboard, hiddenRunning); legacySources.push(hiddenDashboard, hiddenRunning);
sandbox.window.MoshGrouped35.allowed = n => n !== hiddenDashboard && n !== hiddenRunning && originalAllowed(n);
let destination = '';
const visited = [];
sandbox.window.goApp = () => { destination = 'dashboard'; return true; };
sandbox.window.MoshDepartmentDashboard.openDashboard = app => { visited.push([app, 'dashboard']); destination = 'dashboard'; };
sandbox.window.openProductiveRunningTasksPage = app => { visited.push([app, 'running']); destination = 'running'; };
context.refreshTree('sales');
for (let attempt = 0; attempt < 3; attempt++) {
  box.querySelectorAll('button').find(n => n.textContent === 'لوحة التحكم').click();
  assert.equal(destination, 'dashboard');
  box.querySelectorAll('button').find(n => n.textContent === 'مهام قسم المبيعات').click();
  assert.equal(destination, 'running', 'Sales options running tasks must replace the default dashboard');
}
assert.deepEqual(visited, Array.from({length: 3}, () => [['sales', 'dashboard'], ['sales', 'running']]).flat());
const visitedBeforeDenial = visited.length;
context.auth = () => ({canModule: (app, action) => action !== 'running'});
box.querySelectorAll('button').find(n => n.textContent === 'مهام قسم المبيعات').click();
assert.equal(visited.length, visitedBeforeDenial, 'A previously rendered copy still respects revoked running permission');
context.auth = () => ({canModule: () => true});

// Execute the header popup code: Sales opens on click and the same click closes it.
const panel = make('div'), sub = make('div'); panel.hidden = sub.hidden = true;
const trigger = make('button');
const popup = {
  make, panel, sub, console, innerWidth: 1000, names: {sales: 'المبيعات'}, owner: () => 'test-user', active: () => 'sales',
  groups: () => groupRows, allowed, label: source => context.salesMenuLabel(source), $: (s, n) => n.querySelector(s), $$: (s, n) => n.querySelectorAll(s),
  position: el => { el.hidden = false; }, schedule() {}, message() {}, matchMedia: () => ({matches: true}),
  window: {MoshAuth37: {canModule: () => true}}
};
const popupContext = vm.createContext(popup);
vm.runInContext(`let trigger=null,parentRow=null,app='',session='';function close(){panel.hidden=sub.hidden=true;trigger?.setAttribute('aria-expanded','false');trigger=null;parentRow=null;app='';session='';}`, popupContext);
vm.runInContext(between(read('r35-navigation.js'), 'function showGroup(', 'function install(section)'), popupContext);
popupContext.open('sales', trigger);
const popupGroups = panel.querySelectorAll('.pv-menu-group');
assert.equal(popupGroups.length, 3);
assert.ok(popupGroups.every(n => !n.onpointerenter), 'Sales does not reopen menus on hover');
popupGroups[0].click(); assert.equal(sub.hidden, false); assert.equal(popupGroups[0].attrs['aria-expanded'], 'true');
popupGroups[0].click(); assert.equal(sub.hidden, true); assert.equal(popupGroups[0].attrs['aria-expanded'], 'false');
popupGroups[0].click(); popupGroups[1].click();
assert.equal(popupGroups[0].attrs['aria-expanded'], 'false'); assert.equal(popupGroups[1].attrs['aria-expanded'], 'true');
sub.querySelector('.pv-menu-leaf').click(); assert.equal(panel.hidden, true); assert.equal(sub.hidden, true);
console.log('PASS: Sales retains nested menu and parent after page selection; switching menus closes the previous path; manual close, refresh, original actions, counts, permissions and popup behavior retained. No browser/network.');
