// Real Marketing workspace activation, follow-up rendering and department landing.
// Isolated DOM; no browser, HTTP, login or persistence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '../js', name), 'utf8');
const marketing = read('40-mosh-marketing-v33-js.js');
const followups = read('41-mosh-marketing-v34-js.js');
const layout = read('r39-layout-and-marketing.js');
function fn(source, name, next) {
  const first = source.indexOf('function ' + name + '(');
  const last = source.indexOf('function ' + next + '(', first + 1);
  assert.ok(first >= 0 && last > first);
  return source.slice(first, last);
}
class Element {
  constructor(id, classes = '') { this.id = id; this.classes = new Set(classes.split(' ')); this.style = {}; this.dataset = {}; this.innerHTML = ''; }
  get classList() { return { add: name => this.classes.add(name), remove: name => this.classes.delete(name), contains: name => this.classes.has(name), toggle: (name, value) => value ? this.classes.add(name) : this.classes.delete(name) }; }
  querySelectorAll() { return []; }
}
const nodes = new Map();
const add = (id, classes) => { const node = new Element(id, classes); nodes.set(id, node); return node; };
const app = add('marketingApp', 'active');
const content = add('marketingAppContent');
const workspace = add('marketingTaskWorkspace');
const customerSpace = add('marketingExecV33');
const legacySpace = add('marketingExecV29', 'mk29-show');
const main = add('marketingExecContentV33');
const followTab = add('mk34FollowupTab');
const crumb = add('crumb');
add('marketingCustomersTab');
const events = new Map();
const document = {
  readyState: 'loading', documentElement: {},
  getElementById: id => nodes.get(id) || null,
  querySelector: selector => nodes.get(selector.replace(/^#/, '')) || null,
  querySelectorAll: () => [],
  addEventListener: (name, callback) => events.set(name, callback)
};
const interaction = { id: 'follow-1', type: 'اتصال هاتفي', occurredAt: '2026-11-18T10:00:00Z', contactPerson: 'مسؤول العميل', summary: 'مراجعة الخطة', status: 'تم التواصل', nextAction: 'إرسال الخطة', followUpAt: '', source: 'manual', createdAt: '2026-11-18T10:00:00Z', createdBy: 'موظف التسويق', updatedAt: '2026-11-18T10:00:00Z', updatedBy: 'موظف التسويق' };
const state = { customers: [{ id: 'customer-1', name: 'عميل تجريبي', active: true, marketingProfile: { interactions: [interaction] } }] };
const before = JSON.stringify(state);
let selected = '', saves = 0, syncs = 0;
const API = { inspect: () => ({ customerId: selected }), selectCustomer: id => { selected = id; }, openDashboard() {}, openView() {}, pickAndOpen() {}, refresh() {} };
const sandbox = {
  document, state, console, Intl, Date,
  MutationObserver: class { observe() {} },
  setTimeout: () => 0, clearTimeout() {},
  currentUserDisplayName: () => 'موظف التسويق',
  save: () => { saves++; throw Error('Navigation must not save data'); },
  root: () => customerSpace,
  syncCustomerSelect: () => { syncs++; },
  compactMarketingNav() {},
  $: selector => document.querySelector(selector),
  window: { MoshMarketingV33: API, MoshAuth37: { canModule: () => true }, renderProductiveDistributionBoard: () => { workspace.innerHTML = '<h2>لوحة التحكم</h2>'; } }
};
const context = vm.createContext(sandbox);
// Keep actual showRoot/hideLegacy behavior, including hiding task content.
vm.runInContext(fn(marketing, 'hideLegacy', 'hideRoot'), context);
const showRoot = marketing.match(/function showRoot\(\)\{[^\r\n]+/)[0];
context.ensureRoot = () => customerSpace;
vm.runInContext(showRoot, context);
assert.match(marketing, /showWorkspace:showRoot/);
API.showWorkspace = context.showRoot;
vm.runInContext(fn(layout, 'ensureMarketingDashboard', 'render').split('// Primary Marketing entry')[0], context);
vm.runInContext(followups, context);
const api = context.window.MoshMarketingV34;
function dashboard() {
  context.ensureMarketingDashboard();
  assert.equal(customerSpace.classList.contains('mk33-show'), false);
  assert.equal(content.style.display, 'block');
  assert.match(workspace.innerHTML, /لوحة التحكم/);
}
function visibleFollowups() {
  assert.equal(customerSpace.classList.contains('mk33-show'), true, 'Follow-up customer space must be visible');
  assert.equal(content.style.display, 'none', 'Department dashboard must be hidden');
  assert.equal(legacySpace.style.display, 'none');
  assert.equal(followTab.classList.contains('active'), true);
  assert.match(main.innerHTML, /<h2>متابعة العميل<\/h2>/);
  assert.match(crumb.innerHTML, /متابعة العميل/);
}
dashboard();
api.openFollowups();
visibleFollowups();
assert.match(main.innerHTML, /لا يوجد عميل محدد/);
// Selecting a customer from the sidebar may re-enter the department landing.
dashboard();
api.openFollowups('customer-1');
visibleFollowups();
assert.match(main.innerHTML, /سجل متابعة العميل/);
assert.match(main.innerHTML, /مراجعة الخطة/);
assert.equal(API.inspect().customerId, 'customer-1');
for (let i = 0; i < 3; i++) { dashboard(); api.openFollowups(); visibleFollowups(); API.refresh(); visibleFollowups(); }
assert.equal(API.inspect().customerId, 'customer-1', 'Selected customer survives dashboard returns');
assert.equal(JSON.stringify(state), before, 'Customer and follow-up records remain unchanged');
assert.equal(saves, 0);
assert.ok(syncs > 0);
console.log('PASS: distinct Marketing dashboard/follow-up visibility, empty customer prompt, selected customer history, repeated returns and refresh; records unchanged and no saves.');
