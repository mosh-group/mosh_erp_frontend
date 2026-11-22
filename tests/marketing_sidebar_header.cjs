// Actual header-to-sidebar functions with isolated DOM; no HTTP/browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../js/ui09-interface.js'), 'utf8');
function between(start, end) {const first = code.indexOf(start), last = code.indexOf(end, first + start.length); assert.ok(first >= 0 && last > first); return code.slice(first, last);}
class Element {
  constructor(tag, cls = '', text = '') {this.tagName = tag.toUpperCase(); this.className = cls; this.text = text; this.children = []; this.dataset = {}; this.style = {order: '0'}; this.attrs = {}; this.events = {}; this.isConnected = true;}
  get classList() {return {contains: cls => this.className.split(' ').includes(cls), add: cls => {if (!this.className.split(' ').includes(cls)) this.className += ' ' + cls;}};}
  get textContent() {return this.text + this.children.map(n => n.textContent).join('');}
  set textContent(value) {this.text = value; this.children = [];}
  connect(value) {this.isConnected = value; this.children.forEach(n => n.connect(value));}
  append(...nodes) {for (const n of nodes) {n.parentElement = this; n.connect(this.isConnected); this.children.push(n);}}
  replaceChildren(...nodes) {this.children.forEach(n => n.connect(false)); this.children = []; this.append(...nodes);}
  cloneNode(deep) {const n = new Element(this.tagName, this.className, this.text); if (deep) n.append(...this.children.map(c => c.cloneNode(true))); return n;}
  remove() {this.parentElement.children = this.parentElement.children.filter(n => n !== this); this.connect(false);}
  matches(selector) {
    if (selector.includes(',')) return selector.split(',').some(s => this.matches(s.trim()));
    const parts = selector.trim().split(/\s+/); if (parts.length > 1) {const leaf = parts.pop(); if (!this.matches(leaf)) return false; let parent = this.parentElement; while (parent) {if (parent.matches(parts.join(' '))) return true; parent = parent.parentElement;} return false;}
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    return this.tagName.toLowerCase() === selector;
  }
  querySelectorAll(selector) {if (selector.startsWith(':scope >')) return this.children.filter(n => n.matches('button,a')); const result = []; for (const n of this.children) {if (n.matches(selector)) result.push(n); result.push(...n.querySelectorAll(selector));} return result;}
  querySelector(selector) {return this.querySelectorAll(selector)[0] || null;}
  contains(node) {return node===this || this.children.some(child=>child.contains(node));}
  closest(selector) {return this.matches(selector) ? this : this.parentElement?.closest(selector);}
  setAttribute(key, value) {this.attrs[key] = String(value);}
  removeAttribute(key) {delete this.attrs[key];}
  addEventListener(key, handler) {this.events[key] = handler;}
  click() {this.onclick?.({preventDefault() {}});}
  set open(value) {const changed = !!value !== this._open; this._open = !!value; if (changed) this.events.toggle?.();}
  get open() {return !!this._open;}
}
const make = (tag, cls, text) => new Element(tag, cls, text);
const body = make('body'), app = make('section', 'active'), bar = make('div'), box = make('div');
app.id = 'marketingApp'; bar.id = 'm15Tabs_marketing'; app.append(bar); body.append(app, box);
const visits = [];
function button(label, key, mode) {const n = make('button', '', label); n.id = key; if (mode) n.dataset.mode = mode; n.onclick = () => visits.push(key); return n;}
const dashboard = button('لوحة التحكم', 'header-dashboard', 'distribution'), running = button('مهام قسم التسويق', 'header-running', 'running');
const approval = button('اعتماد المدير', 'mgr32eApproval_marketing'), badge = make('span', 'mgr28-badge', '3'); approval.append(badge);
const tools = make('div', 'r23-manager-tools'), toolToggle = make('button', 'r23-manager-tools-toggle', 'أدوات المدير'), toolMenu = make('div', 'r23-manager-tools-menu');
tools.id = 'r23ManagerTools_marketing'; toolMenu.hidden = true;
const toolLabels = ['طلب خصم أو عقوبة', 'متابعة الطلبات', 'تقرير حضور القسم', 'إرسال تقرير للمدير التنفيذي', 'تقييمات وملفات فريقي'];
const toolsOriginal = toolLabels.map((label, i) => {const n = button(label, ''); n.onclick = () => visits.push('tool-' + i); return n;});
toolMenu.append(...toolsOriginal); tools.append(toolToggle, toolMenu);
const menu = make('div', 'pv-menu-host'), menuToggle = make('button', 'pv-menu-trigger', 'قائمة القسم'); menu.append(menuToggle);
// DOM insertion differs from flex order; the sidebar must follow the visible header.
for (const [index, node] of [dashboard, running, approval, tools, menu].entries()) node.style.order = String(index + 1);
bar.append(menu, tools, approval, running, dashboard, make('span', '', 'قسم التسويق'));
const originalHeaderNodes = [...bar.children];
const rail = make('nav', 'mk33-rail'); app.append(rail);
const customer = button('عملاء التسويق', 'marketingCustomersTab'), discovery = button('◉ جلسة اكتشاف العميل', '');
const plan = button('☷ الخطة التسويقية', ''), tasks = button('✓ مهمات التسويق', '');
discovery.onclick = () => visits.push('discovery'); plan.onclick = () => visits.push('plan'); tasks.onclick = () => visits.push('marketing-tasks');
rail.append(discovery, plan, tasks); app.append(customer);
const groups = [{name: 'العملاء والمتابعة', rows: [customer]}, {name: 'ملف العميل والخطط', rows: [discovery, plan]}, {name: 'مهام التسويق', rows: [tasks]}];
const permissions = new Set(['view', 'dashboard', 'running', 'approvals', 'assign']);
const allowed = node => !!node && node.isConnected && !node.hidden && !node.disabled && !node.closest('.mosh-auth-hidden');
let goCount = 0, rebuildOnGo = false;
const tree = {box, link: make('a')};
const sandbox = {
  make, all: (selector, root = body) => root.querySelectorAll(selector), $: (selector, root = body) => root.querySelector(selector),
  getComputedStyle: node => ({order: node.style.order}), document: {getElementById: id => body.querySelector('#' + id)},
  auth: () => ({canModule: (section, action) => permissions.has(action)}), toast() {}, restoring: false,
  navigateSafely: action => action(), remember() {}, schedule() {},
  openDepartmentTaskView: (app, mode) => visits.push('assignment-' + app + '-' + mode),
  window: {MoshGrouped35: {allowed, sources: () => groups.flatMap(g => g.rows).filter(allowed), groups: () => groups.map(g => ({...g, rows: g.rows.filter(allowed)}))}, goApp: () => {goCount++; if (rebuildOnGo) {tree.signature = ''; context.refreshMarketingTree(tree);} return true;}}
};
const context = vm.createContext(sandbox);
vm.runInContext(between('function hrMenuLabel(', 'function hrSidebarRows('), context);
vm.runInContext(between('function salesDropdownId(', 'function salesMenuSection('), context);
vm.runInContext(between('function departmentHeaderRows(', 'function refreshTree('), context);
const rows = context.marketingSidebarRows();
assert.deepEqual(Array.from(rows, r => r.name), ['لوحة التحكم', 'مهام قسم التسويق', 'توزيع المهام', 'اعتماد المدير', 'أدوات المدير', 'قائمة القسم']);
assert.deepEqual(Array.from(rows[4].children, r => r.name), toolLabels);
assert.deepEqual(Array.from(rows[5].children, r => r.name), groups.map(g => g.name));
assert.equal(rows[5].children[1].children[0].name, 'جلسة اكتشاف العميل');
context.refreshMarketingTree(tree);
const rootMenu = name => box.children.find(n => n.tagName === 'DETAILS' && n.querySelector('summary').textContent === name);
const leaf = name => box.querySelectorAll('button').find(n => n.textContent === name);
const toolsGroup = rootMenu('أدوات المدير');
assert.equal(toolsGroup.open, false);
toolsGroup.querySelector('summary').click(); assert.equal(toolsGroup.open, true);
toolsGroup.querySelector('summary').click(); assert.equal(toolsGroup.open, false);
toolsGroup.querySelector('summary').click();
leaf('متابعة الطلبات').click(); assert.equal(visits.at(-1), 'tool-1'); assert.equal(toolsGroup.open, true);
badge.textContent = '4'; context.refreshMarketingTree(tree);
assert.equal(rootMenu('أدوات المدير').open, true, 'Badge refresh preserves expanded manager tools');
assert.ok(leaf('اعتماد المدير4'));
rootMenu('قائمة القسم').querySelector('summary').click();
assert.equal(rootMenu('أدوات المدير').open, false);
const clientFiles = rootMenu('قائمة القسم').querySelectorAll('details').find(n => n.querySelector('summary').textContent === 'ملف العميل والخطط');
clientFiles.querySelector('summary').click(); rebuildOnGo = true;
leaf('جلسة اكتشاف العميل').click(); rebuildOnGo = false;
assert.equal(visits.at(-1), 'discovery');
assert.equal(rootMenu('قائمة القسم').open, true, 'Navigation preserves open department menu');
assert.equal(rootMenu('قائمة القسم').querySelectorAll('details').find(n => n.querySelector('summary').textContent === 'ملف العميل والخطط').open, true);
leaf('لوحة التحكم').click(); assert.equal(visits.at(-1), 'header-dashboard');
leaf('مهام قسم التسويق').click(); assert.equal(visits.at(-1), 'header-running');
leaf('توزيع المهام').click(); assert.equal(visits.at(-1), 'assignment-marketing-assign');
leaf('اعتماد المدير4').click(); assert.equal(visits.at(-1), 'mgr32eApproval_marketing');
// The manager header recreates its item buttons during synchronization.
const replacement = button('متابعة الطلبات', ''); replacement.onclick = () => visits.push('new-tool-target');
toolMenu.replaceChildren(replacement); context.refreshMarketingTree(tree);
rootMenu('أدوات المدير').querySelector('summary').click(); leaf('متابعة الطلبات').click();
assert.equal(visits.at(-1), 'new-tool-target');
const stale = leaf('متابعة الطلبات'), before = visits.length, beforeGo = goCount;
tools.hidden = true; stale.click();
assert.equal(visits.length, before); assert.equal(goCount, beforeGo, 'Hidden manager tools cannot execute stale actions');
permissions.delete('assign'); permissions.delete('approvals'); context.refreshMarketingTree(tree);
assert.equal(rootMenu('أدوات المدير'), undefined);
assert.equal(leaf('توزيع المهام'), undefined); assert.equal(leaf('اعتماد المدير4'), undefined);
assert.deepEqual(bar.children, originalHeaderNodes, 'Original header nodes and their order remain untouched');
console.log('PASS: Marketing mirrors visible header labels/order; manager dropdown and department menu retain original actions, assignment, permissions, counts and expanded state across navigation/rebuilds. Header unchanged. No HTTP/browser.');
