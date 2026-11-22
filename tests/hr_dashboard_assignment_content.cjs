// Execute the real renderers and layered HR routers locally. No browser/network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, '../js', name), 'utf8');
const core = read('02-mosh-core-runtime-14.js');
const dashboards = read('13-mosh-department-dashboards-v9-js.js');
const hr = read('16-mosh-hr13-runtime.js');
const common = read('19-mosh-v15-runtime.js');
const sidebar = read('ui09-interface.js');
function between(source, start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Source boundary: ${start}`);
  return source.slice(first, last);
}
class Element {
  constructor(id) { this.id = id; this.style = {}; this.dataset = {}; this.innerHTML = ''; this.parentElement = null; this.classList = {contains: () => false, add() {}, remove() {}, toggle() {}}; }
  querySelector(selector) { return selector === '.db9' && this.innerHTML.includes('class="db9"') ? {} : null; }
  querySelectorAll() { return []; }
  prepend(node) { this.innerHTML = node.innerHTML + this.innerHTML; }
}
const elements = Object.fromEntries(['hrApp', 'hrAppContent', 'hrAppTasks', 'hrProContent', 'hrStaffConfigContent', 'hrStandaloneContent', 'hrProNav', 'crumb'].map(id => [id, new Element(id)]));
elements.hrAppTasks.parentElement = elements.hrAppContent;
const cfg = {appId: 'hrApp', contentId: 'hrAppContent', workspaceId: 'hrAppTasks', department: 'الموارد البشرية', label: 'الموارد البشرية'};
const sandbox = {
  console, document: {getElementById: id => elements[id], querySelectorAll: () => [], createElement: () => new Element('')},
  state: {staffProfiles: [{name: 'HR employee', active: true}], salesTasks: [
    {id: 'unassigned', taskNo: '1', title: 'HR unassigned task', department: cfg.department, status: 'in_progress'},
    {id: 'assigned', taskNo: '2', title: 'HR assigned task', department: cfg.department, status: 'in_progress', assignee: 'HR employee'},
    {id: 'other', taskNo: '3', title: 'Other department task', department: 'المبيعات', status: 'in_progress'}
  ]},
  getProductiveConfig: key => key === 'hr' ? cfg : null, cfg: key => key === 'hr' ? cfg : null,
  setProductiveTopTab() {}, productiveTaskViewModes: {},
  normalizeStaffName: name => String(name || '').trim(), productiveTaskStateKey: task => task.employeeState,
  filterAndPageAppList: (key, items) => ({items, total: items.length}), getDepartmentManager: () => null,
  esc: text => String(text), E: text => String(text),
  productiveTeamReportHtml: () => '', productiveAssigneeOptions: () => '<option>HR employee</option>',
  MoshTaskUI: {arg: JSON.stringify}, appListPagerHtml: () => '',
  $1: values => Array.isArray(values) ? values.filter(Boolean) : [], $6: value => String(value),
  $8: id => elements[id], $3: selector => selector === '#hrProNav' ? elements.hrProNav : null,
  $1v: () => [], $24: () => [], isStaffAssignable: profile => profile.active,
  $y: (heading, description) => `<h2>${heading}</h2><p>${description}</p>`,
  $q: text => `<button>${text}</button>`, $17: (heading, body) => `<h3>${heading}</h3>${body}`,
  $v: view => view === 'home' ? 'لوحة التحكم' : 'مهام القسم',
  $bt: () => { elements.hrAppTasks.innerHTML = '<div class="db9">Legacy task overview</div>'; },
  Q: id => elements[id], commonNav() {}, tabState(key, mode) { sandbox.headerMode = mode; }, salesActive() {},
  PRODUCTIVE_DEPARTMENTS: {hr: cfg},
  goApp: () => true, renderProductiveRunningTasks: () => { elements.hrAppTasks.innerHTML = '<h2>المهام الجارية</h2>'; }
};
sandbox.window = sandbox;
sandbox.MoshUI19 = {tabState: sandbox.tabState};
const context = vm.createContext(sandbox), run = source => vm.runInContext(source, context);
run(between(core, 'function renderProductiveDistributionBoard(key)', 'function setProductiveRunningFilter('));
run(between(core, 'function openProductiveDistributionPage(key)', 'function openProductiveRunningTasksPage(key)'));
// Core running navigation is immaterial to the two renderers under test.
sandbox.openProductiveRunningTasksPage = () => { elements.hrAppContent.style.display = 'block'; sandbox.renderProductiveRunningTasks(); };
run('const $a={render:renderProductiveDistributionBoard,open:openProductiveDistributionPage,running:openProductiveRunningTasksPage,go:goApp};');
run(between(dashboards, 'function $am(k,', 'function $ap(d)'));
run(between(dashboards, 'function $cj(k)', 'window.goApp=function(app,'));
run('window.MoshDepartmentDashboard={' + between(dashboards, 'openAssignment(k){', ',inspect:k=>') + '};');
run('const $0=document.getElementById("hrApp"),$c={dist:window.openProductiveDistributionPage,render:window.renderProductiveDistributionBoard,running:window.openProductiveRunningTasksPage};let $d="home",$e="",$f=null,$h=false;');
run(between(hr, 'function $1b(', 'function $1k('));
run(between(hr, 'function $2i(', 'function $2q('));
run(between(hr, 'function $4j(', 'function $4p('));
run(between(hr, 'function $4w(', 'function $4z('));
run('window.MoshHR13={go:$4w};');
run(between(hr, 'window.renderProductiveDistributionBoard=function(', 'window.goApp=function('));
run(between(common, 'const oldDist=window.openProductiveDistributionPage,', 'window.goApp=function(k)'));
run(between(common, 'function taskTab(k,mode)', 'api.taskTab=taskTab;'));
run(between(sidebar, 'function openHRDepartmentDashboard(', 'function hrMenuLabel('));
run(between(sidebar, 'function openDepartmentTaskView(', 'function treeRows('));
function visible(id) { const node = elements[id]; return node.style.display !== 'none' && (!node.parentElement || visible(node.parentElement.id)); }
for (let attempt = 0; attempt < 3; attempt++) {
  // Reproduce the former sidebar path, which opened the task overview.
  sandbox.openProductiveDistributionPage('hr');
  assert.match(elements.hrAppTasks.innerHTML, /Legacy task overview/);
  sandbox.openHRDepartmentDashboard();
  assert.equal(visible('hrProContent'), true);
  assert.equal(visible('hrAppTasks'), false);
  assert.match(elements.hrProContent.innerHTML, /طلبات بانتظارك/);
  assert.match(elements.hrProContent.innerHTML, /موظفون نشطون/);
  assert.doesNotMatch(elements.hrProContent.innerHTML, /HR unassigned task/);
  assert.equal(elements.hrApp.dataset.taskView, undefined);

  sandbox.openDepartmentTaskView('hr', 'assign');
  assert.equal(visible('hrProContent'), false);
  assert.equal(visible('hrAppTasks'), true);
  assert.match(elements.hrAppTasks.innerHTML, /<h2>توزيع مهام قسم الموارد البشرية<\/h2>/);
  assert.match(elements.hrAppTasks.innerHTML, /HR unassigned task/);
  assert.doesNotMatch(elements.hrAppTasks.innerHTML, /Legacy task overview|HR assigned task|Other department task/);
  assert.match(elements.hrAppTasks.innerHTML, /id="hrAssign_unassigned"/);
  assert.equal(elements.hrApp.dataset.taskView, 'assign');
  sandbox.renderProductiveDistributionBoard('hr');
  assert.match(elements.hrAppTasks.innerHTML, /HR unassigned task/);
  assert.doesNotMatch(elements.hrAppTasks.innerHTML, /Legacy task overview/);
  sandbox.openHRDepartmentDashboard();
  sandbox.renderProductiveDistributionBoard('hr');
  assert.equal(visible('hrProContent'), true);
  assert.equal(visible('hrAppTasks'), false);
  assert.match(elements.hrProContent.innerHTML, /موظفون نشطون/);
}
sandbox.openHRDepartmentDashboard();
const sidebarHome = elements.hrProContent.innerHTML;
sandbox.taskTab('hr', 'distribution');
assert.equal(elements.hrProContent.innerHTML, sidebarHome, 'Header and sidebar open identical HR home content');
assert.equal(visible('hrProContent'), true);
assert.equal(visible('hrAppTasks'), false);
assert.equal(sandbox.headerMode, 'distribution');
sandbox.openDepartmentTaskView('hr', 'assign');
const sidebarAssignment = elements.hrAppTasks.innerHTML;
assert.equal(sandbox.headerMode, 'assign');
sandbox.taskTab('hr', 'assign');
assert.equal(elements.hrAppTasks.innerHTML, sidebarAssignment, 'Header and sidebar open identical assignment content');
assert.equal(visible('hrProContent'), false);
assert.equal(visible('hrAppTasks'), true);
assert.equal(sandbox.headerMode, 'assign');
sandbox.MoshAuth37 = {canModule: () => false};
assert.equal(sandbox.taskTab('hr', 'distribution'), false);
assert.equal(sandbox.taskTab('hr', 'assign'), false);
assert.equal(elements.hrAppTasks.innerHTML, sidebarAssignment, 'Denied header navigation does not alter content');
console.log('PASS: distinct HR home/assignment content, repeated returns, matching header/sidebar destinations and permission denial. No HTTP or browser.');
