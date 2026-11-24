// Offline DOM fixtures: execute the real HR sidebar functions, without HTTP/browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class Element {
  constructor(tag, cls = '', text = '') { this.tagName = tag.toUpperCase(); this.className = cls; this.text = text; this.children = []; this.dataset = {}; this.attrs = {}; this.events = {}; this.isConnected = true; }
  get classList() { return {contains: name => this.className.split(' ').includes(name), add: name => {if (!this.className.split(' ').includes(name)) this.className += ' ' + name;}}; }
  get textContent() { return this.text + this.children.map(n => n.textContent).join(''); }
  set textContent(value) { this.text = value; this.children = []; }
  append(...nodes) { for (const n of nodes) { n.parentElement = this; this.children.push(n); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  cloneNode(deep) { const n = new Element(this.tagName, this.className, this.text); if (deep) n.append(...this.children.map(c => c.cloneNode(true))); return n; }
  remove() { this.parentElement.children = this.parentElement.children.filter(n => n !== this); }
  matches(selector) {
    if (selector === 'details[open]') return this.tagName === 'DETAILS' && this.open;
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    return this.tagName.toLowerCase() === selector;
  }
  querySelectorAll(selector) { const tokens = selector.split(','); const found = []; for (const n of this.children) { if (tokens.some(t => n.matches(t))) found.push(n); found.push(...n.querySelectorAll(selector)); } return found; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(key, action) { this.events[key] = action; }
  click() { this.onclick?.(); }
  set open(value) { const changed = !!value !== this._open; this._open = !!value; if (changed) this.events.toggle?.(); }
  get open() { return !!this._open; }
}
const make = (tag, cls, text) => new Element(tag, cls, text);
const body = make('body'), hr = make('section', 'active'), box = make('div'), link = make('a');
body.append(hr, box);
const selectors = new Map(), ids = new Map([['hrApp', hr]]), permissions = new Set(['view', 'dashboard', 'running', 'assign', 'approvals']);
selectors.set('#hrApp', hr);
function source(selector, label, handler = () => {}) { const b = make('button', '', label); b.onclick = handler; selectors.set(selector, b); body.append(b); return b; }
const invoked = [];
source('#m15Tabs_hr > button[data-mode="distribution"]', 'لوحة التحكم', () => invoked.push('dashboard'));
source('#m15Tabs_hr > button[data-mode="running"]', 'مهام قسم الموارد البشرية', () => invoked.push('running'));
const approval = source('#mgr32eApproval_hr', 'اعتماد المدير', () => invoked.push('approval'));
approval.append(make('span', 'mgr28-badge', '2'));
const tools = source('#r23ManagerTools_hr', ''); tools.className = 'r23-manager-tools';
const toggle = make('button', 'r23-manager-tools-toggle', 'أدوات المدير');
const toolMenu = make('div', 'r23-manager-tools-menu'), tool = make('button', '', 'متابعة الطلبات');
tool.onclick = () => invoked.push('manager-tool'); toolMenu.append(tool); tools.append(toggle, toolMenu);
const employees = make('button', '', 'الموظفون'), requests = make('button', '', 'الطلبات والموافقات');
requests.append(make('span', 'hr-count', '1'));
employees.onclick = () => invoked.push('employees'); requests.onclick = () => invoked.push('requests');
body.append(employees, requests);
const groups = [{name: 'الموظفون والملفات', rows: [employees]}, {name: 'الطلبات والتقارير', rows: [requests]}];
const available = n => !!n && !n.hidden && !n.disabled && !n.classList.contains('mosh-auth-hidden');
const queryAll = (selector, root = body) => {
  if (root === tools && selector === '.r23-manager-tools-menu button') return [tool];
  if (selector === '#r23ManagerTools_hr .r23-manager-tools-menu button') return [tool];
  if (selector === '#hrProNav button') return groups.flatMap(g => g.rows);
  if (selectors.has(selector)) return [selectors.get(selector)];
  return root.querySelectorAll(selector);
};
const context = vm.createContext({
  $, all: queryAll, make, auth: () => ({canModule: (app, action) => permissions.has(action)}),
  document: {getElementById: id => ids.get(id)}, window: {
    MoshHR13: {go: view => invoked.push('hr-' + view)},
    MoshGrouped35: {allowed: available, groups: () => groups.map(g => ({...g, rows: g.rows.filter(available)}))},
    goApp: () => invoked.push('go-hr')
  }, openDepartmentTaskView: (app, mode) => invoked.push(mode),
  toast: message => invoked.push(message), navigateSafely: action => action(),
  remember: () => {}, schedule: () => {}, restoring: false
});
function $(selector, root = body) { return queryAll(selector, root)[0] || null; }
const sourceCode = fs.readFileSync(path.join(__dirname, '../js/ui09-interface.js'), 'utf8');
const start = sourceCode.indexOf('function openHRDepartmentDashboard('), end = sourceCode.indexOf('function refreshTree(', start);
assert.ok(start > 0 && end > start);
vm.runInContext(sourceCode.slice(start, end), context);
const rows = context.hrSidebarRows();
assert.deepEqual(Array.from(rows, r => r.name), ['لوحة التحكم', 'مهام قسم الموارد البشرية', 'المهام الفرعية', 'اعتماد المدير', 'أدوات المدير', 'قائمة القسم']);
assert.equal(rows[3].count, '2');
assert.deepEqual(Array.from(rows[5].children, r => r.name), groups.map(g => g.name));
assert.equal(rows[5].children[1].children[0].name, 'الطلبات والموافقات');
assert.equal(rows[5].children[1].children[0].count, '', 'Keep the requests label free of the previously removed number');

const tree = {box, link}; context.refreshHRTree(tree);
const leaves = box.querySelectorAll('button');
leaves.find(b => b.textContent === 'لوحة التحكم').click();
assert.equal(invoked.at(-1), 'hr-home', 'Dashboard opens the HR home, not the legacy distribution tab');
assert.ok(!leaves.some(b => b.textContent === 'توزيع المهام'));
leaves.find(b => b.textContent === 'الموظفون').click();
assert.equal(invoked.at(-1), 'employees');
leaves.find(b => b.textContent === 'متابعة الطلبات').click();
assert.equal(invoked.at(-1), 'manager-tool');
leaves.find(b => b.textContent === 'اعتماد المدير2').click();
assert.equal(invoked.at(-1), 'approval');
const sections = box.children.filter(n => n.tagName === 'DETAILS');
sections[0].open = true; sections[1].open = true;
assert.equal(sections[0].open, false, 'Only one sibling menu stays open');
assert.equal(sections[1].children[0].attrs['aria-expanded'], 'true');
const subgroup = sections[1].children[1].children[1]; subgroup.open = true;
approval.children[0].textContent = '3';
context.refreshHRTree(tree);
assert.equal(box.children.at(-1).open, true, 'Live badge update preserves expanded menu');
assert.equal(box.children.at(-1).children[1].children[1].open, true);
assert.ok(box.querySelectorAll('button').some(b => b.textContent === 'اعتماد المدير3'));
tree.currentKey = 'hr/لوحة التحكم';
context.refreshHRTree(tree);
assert.equal(box.querySelectorAll('button').find(b => b.textContent === 'لوحة التحكم').attrs['aria-current'], 'page', 'Back navigation restores the selected leaf without rebuilding');

permissions.delete('assign'); permissions.delete('approvals'); tools.hidden = true; employees.hidden = true;
const restricted = context.hrSidebarRows();
assert.ok(!restricted.some(r => r.name === 'توزيع المهام' || r.name === 'اعتماد المدير' || r.name === 'أدوات المدير'));
assert.ok(!restricted.at(-1).children.some(g => g.name === 'الموظفون والملفات'));
const oldApproval = invoked.filter(n => n === 'approval').length;
leaves.find(b => b.textContent === 'اعتماد المدير2').click();
assert.equal(invoked.filter(n => n === 'approval').length, oldApproval, 'Permission changes apply to existing leaves');
context.refreshHRTree(tree);
assert.ok(!box.querySelectorAll('button').some(b => b.textContent === 'توزيع المهام'));
console.log('PASS: original HR menu order, original actions, assignment, nested accordion, badge updates, and permission changes. No HTTP or browser.');
