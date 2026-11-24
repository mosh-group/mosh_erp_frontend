// Offline integration of actual dashboard/assignment renderers and sidebar routes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '../js', file), 'utf8');
const core = read('02-mosh-core-runtime-14.js'), dashboards = read('13-mosh-department-dashboards-v9-js.js'), sidebar = read('ui09-interface.js');
function between(source, start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Source boundary: ${start}`);
  return source.slice(first, last);
}
class Element {
  constructor(id) { this.id = id; this.dataset = {}; this.style = {}; this.innerHTML = ''; this.hidden = false; this.open = false; this.parentElement = null; this.children = []; this.classList = {contains: name => name === 'active', remove() {}, add() {}}; }
  querySelector(selector) { if (selector === '.db9' && this.innerHTML.includes('class="db9"')) return new Element('dashboard'); if (selector === 'form') return new Element('form'); return null; }
  querySelectorAll() { return []; }
  addEventListener() {}
  contains() { return true; }
  insertAdjacentHTML(where, html) { this.innerHTML += html; }
}
const elements = {crumb: new Element('crumb')};
let deniedAction = '';
const sandbox = {
  console, document: {getElementById: id => elements[id] || null, querySelectorAll: () => []},
  state: {salesTasks: [], staffProfiles: []}, productiveTaskViewModes: {},
  getProductiveConfig: key => configs[key], cfg: key => configs[key],
  setProductiveTopTab() {}, normalizeStaffName: value => String(value || '').trim(),
  productiveTaskStateKey: task => task.employeeState, getDepartmentManager: () => null,
  filterAndPageAppList: (key, items) => ({items, total: items.length}),
  esc: text => String(text), E: text => String(text), MoshTaskUI: {arg: JSON.stringify},
  productiveTeamReportHtml: () => '', productiveAssigneeOptions: () => '<option>Employee</option>', appListPagerHtml: () => '',
  $s: key => ({k: key, all: [], live: [], department: configs[key].department, people: [], m: {}, done: [], dated: [], timed: [], onTime: 0, sum: 0, undated: 0, now: Date.now(), v: {period: 'all', scope: 'all', employee: 'all', search: '', filter: 'all'}}),
  $e: {all: 'كل الفترات'}, $d: {all: 'كل المهام'}, $r: String,
  $ad: () => '', $ah: () => '', $ap: () => '', $bc: () => '', $bp: () => '', $br: () => '',
  MoshAuth37: {canModule: (app, action) => action !== deniedAction}, MoshUI19: {tabState() {}},
  $: selector => elements[selector.replace(/^#/, '')] || null, all: () => [],
  auth: () => sandbox.MoshAuth37, toast() {},
  goApp: () => true
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox), run = source => vm.runInContext(source, context);
run(between(core, 'const PRODUCTIVE_DEPARTMENTS=', 'function resetDepartmentLanding('));
const ops = read('22-mosh-ops18-js.js');
run(between(ops, 'if(!PRODUCTIVE_DEPARTMENTS.warehouses)', "if(typeof salesTaskDepartments"));
const configs = run('PRODUCTIVE_DEPARTMENTS');
for (const [key, cfg] of Object.entries(configs)) {
  for (const id of [cfg.appId, cfg.contentId, cfg.workspaceId]) elements[id] ||= new Element(id);
  if (cfg.workspaceId !== cfg.contentId) elements[cfg.workspaceId].parentElement = elements[cfg.contentId];
  sandbox.state.salesTasks.push(
    {id: key + '-unassigned', title: key + ' unassigned fixture', taskNo: key + '/1', department: cfg.department, status: 'in_progress'},
    {id: key + '-assigned', title: key + ' assigned fixture', taskNo: key + '/2', department: cfg.department, status: 'in_progress', assignee: 'Employee'}
  );
}
run(between(core, 'function renderProductiveDistributionBoard(key)', 'function setProductiveRunningFilter('));
run(between(core, 'function openProductiveDistributionPage(key)', 'function openProductiveRunningTasksPage(key)'));
sandbox.openProductiveRunningTasksPage = key => {
  sandbox.productiveTaskViewModes[key] = 'running';
  elements[configs[key].workspaceId].innerHTML = '<h2>Running tasks</h2>';
};
run('const $a={render:renderProductiveDistributionBoard,open:openProductiveDistributionPage,running:openProductiveRunningTasksPage,go:goApp};');
run(between(dashboards, 'function $am(k,', 'function $ap(d)'));
run(between(dashboards, 'function $bt(k)', 'function $ca(k,id)'));
run(between(dashboards, 'function $cj(k)', 'window.goApp=function(app,'));
run('window.MoshDepartmentDashboard={' + between(dashboards, 'openDashboard(k){', ',inspect:k=>') + '};');
run(between(core, 'function refreshProductiveView(key)', 'function assignProductiveTaskFromBoard('));
run(between(sidebar, 'function openDepartmentTaskView(', 'function salesTreeGroups('));
let adminMode = '';
sandbox.MoshAdministration24 = {enter: () => sandbox.openProductiveDistributionPage('admin'), openTasks: mode => {adminMode = mode; return sandbox.MoshDepartmentDashboard.openAssignment('admin');}};
const originalData = JSON.stringify(sandbox.state);
for (const [key, cfg] of Object.entries(configs)) {
  const rows = sandbox.treeRows(key), box = elements[cfg.workspaceId], root = elements[cfg.appId];
  const dashboard = rows.find(row => row.action === 'dashboard'), assign = rows.find(row => row.action === 'assign');
  assert.ok(dashboard && assign, `Both sidebar destinations exist: ${key}`);
  for (let attempt = 0; attempt < 2; attempt++) {
    dashboard.run();
    assert.match(box.innerHTML, /class="db9"/, key + ': real dashboard renderer');
    assert.equal(root.dataset.taskView, undefined);
    assign.run();
    assert.equal(root.dataset.taskView, 'assign');
    assert.doesNotMatch(box.innerHTML, /class="db9"/);
    assert.ok(box.innerHTML.includes('توزيع مهام قسم ' + cfg.label));
    assert.ok(box.innerHTML.includes(key + ' unassigned fixture'));
    assert.ok(!box.innerHTML.includes(key + ' assigned fixture'));
    assert.ok(box.innerHTML.includes('id="' + key + 'Assign_' + key + '-unassigned"'));
    sandbox.renderProductiveDistributionBoard(key);
    assert.ok(box.innerHTML.includes(key + ' unassigned fixture'), key + ': redraw preserves assignment');
    sandbox.refreshProductiveView(key);
    assert.equal(root.dataset.taskView, 'assign', key + ': refresh preserves assignment');
    assert.doesNotMatch(box.innerHTML, /class="db9"/);
    sandbox.openProductiveRunningTasksPage(key);
    assert.equal(root.dataset.taskView, undefined);
    assert.match(box.innerHTML, /Running tasks/);
  }
  dashboard.run();
  assert.match(box.innerHTML, /class="db9"/, key + ': return restores dashboard');
}
assert.equal(adminMode, 'assign', 'Admin keeps its existing task workspace entry');
deniedAction = 'assign';
assert.equal(sandbox.MoshDepartmentDashboard.openAssignment('sales'), false);
deniedAction = 'dashboard';
assert.equal(sandbox.MoshDepartmentDashboard.openDashboard('sales'), false);
deniedAction = '';
assert.equal(JSON.stringify(sandbox.state), originalData, 'Navigation must not modify business records');

// Delayed IT data loads must redraw the selected assignment page, not running tasks.
for (const id of ['it31Body', 'f21Page', 'f21TasksFold']) elements[id] = new Element(id);
sandbox.showTabs = () => {};
sandbox.renderProductiveRunningTasks = key => { elements[configs[key].workspaceId].innerHTML = 'Running tasks'; };
const it = read('r31-it.js');
run(`(()=>{let tab='tasks',taskMode='running';function render(){${between(it, "if(!$('#it31Body'))return;", 'if(!data)')}return;}${between(it, 'function openTasks(mode)', 'const previousDistribution=')}window.MoshIT31={openTasks,render};})();`);
sandbox.MoshDepartmentDashboard.openAssignment('it');
sandbox.MoshIT31.render();
assert.ok(elements.itTaskList.innerHTML.includes('it unassigned fixture'), 'IT response preserves selected assignment');

// Finance assignment must be visible outside its financial dashboard and open fold.
const finance = read('24-mosh-finance22-js.js');
sandbox.Q = id => elements[id]; sandbox.mount = () => {};
sandbox.hideLegacy = () => { elements.accountingTasksContent.style.display = 'none'; elements.f21TasksFold.hidden = true; };
sandbox.taskContainer = () => elements.f21TasksFold; sandbox.navActive = () => {};
sandbox.MoshUI15 = {tabState() {}};
run(`(()=>{let view='home';${between(finance, 'function render(){', '// ---- Forms')}${between(finance, 'function openTaskView(mode)', 'window.MoshFinance21=')}window.MoshFinance21={openTaskView,render};})();`);
sandbox.MoshDepartmentDashboard.openAssignment('accounting');
sandbox.MoshFinance21.render();
assert.equal(elements.f21Page.hidden, true);
assert.equal(elements.f21TasksFold.hidden, false);
assert.equal(elements.f21TasksFold.open, true);
assert.equal(elements.accountingTasksContent.style.display, 'block');
assert.ok(elements.accountingDepartmentTasks.innerHTML.includes('accounting unassigned fixture'));

// A later Marketing shell sync must not replace assignment with its dashboard.
const marketing = read('r39-layout-and-marketing.js');
run(between(marketing, 'function ensureMarketingDashboard(){', '// Primary Marketing entry'));
sandbox.MoshDepartmentDashboard.openAssignment('marketing');
const marketingAssignment = elements.marketingTaskWorkspace.innerHTML;
sandbox.ensureMarketingDashboard();
assert.equal(elements.marketingTaskWorkspace.innerHTML, marketingAssignment);

const manager = {id: 'manager', name: 'Manager'};
const colleague = {id: 'employee', name: 'Employee'};
const managedDashboard = {
  ...sandbox,
  PRODUCTIVE_DEPARTMENTS: configs,
  state: {salesTasks: [], staffProfiles: [manager, colleague]},
  getDepartmentManager: () => manager,
  getStaffProfileByName: name => [manager, colleague].find(profile => profile.name === name),
  isStaffAssignable: () => true,
  productiveTaskStateLabel: () => 'Working',
  openProductiveDistributionPage: key => managedDashboard.renderProductiveDistributionBoard(key),
  MoshTaskUI: {title: task => task.title}
};
managedDashboard.window = managedDashboard;
vm.runInNewContext(dashboards, managedDashboard);
for (const key of ['marketing', 'social']) {
  const {department, workspaceId} = configs[key];
  const task = (title, attributes) => ({id: title, title, department, status: 'in_progress', ...attributes});
  managedDashboard.state.salesTasks.push(
    task(key + ' manager fixture', {assigneeId: manager.id, assignee: 'Previous manager name'}),
    task(key + ' legacy manager fixture', {assignee: manager.name}),
    task(key + ' same name fixture', {assigneeId: colleague.id, assignee: manager.name}),
    task(key + ' unassigned dashboard fixture', {}),
    task(key + ' completed fixture', {assigneeId: manager.id, assignee: manager.name, department: 'Accounting', closedFromDepartment: department, status: 'completed', completedAt: Date.now()})
  );
  managedDashboard.MoshDepartmentDashboard.openDashboard(key);
  const html = elements[workspaceId].innerHTML;
  assert.ok(html.includes(key + ' manager fixture'));
  assert.ok(html.includes(key + ' legacy manager fixture'));
  assert.ok(!html.includes(key + ' same name fixture'));
  assert.ok(!html.includes(key + ' unassigned dashboard fixture'));
  assert.doesNotMatch(html, /data-field="employee"/);
  const summary = managedDashboard.MoshDepartmentDashboard.inspect(key);
  assert.equal(summary.active, 2);
  assert.equal(summary.completed, 1);
}
managedDashboard.getDepartmentManager = () => null;
assert.equal(managedDashboard.MoshDepartmentDashboard.inspect('social').active, 0);
console.log('PASS: ' + Object.keys(configs).length + ' departments; actual dashboard/assignment HTML, task filtering, redraw, refresh, return, permissions, unchanged records; IT, finance and Marketing shells. No browser/network.');
