// Offline regression checks for the actual routing functions. No browser or HTTP.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/13-mosh-department-dashboards-v9-js.js'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'js/ui09-interface.js'), 'utf8');
function between(text, start, end) {
  const first = text.indexOf(start);
  const last = text.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Missing source boundaries: ${start}`);
  return text.slice(first, last);
}

const apps = Object.fromEntries(['hr', 'admin', 'sales'].map(key => [key + 'App', {dataset: {}}]));
const crumb = {};
const calls = [];
const sandbox = {
  productiveTaskViewModes: {},
  window: {}, document: {getElementById: id => id === 'crumb' ? crumb : apps[id]},
  console, cfg: key => ({label: key, appId: key + 'App'}), E: text => text,
  $am: (key, mode) => calls.push(['mode', key, mode]),
  $bt: key => calls.push(['dashboard', key]),
  $a: {
    render: key => calls.push(['assignment', key]),
    open: key => sandbox.window.renderProductiveDistributionBoard(key),
    running: key => calls.push(['running', key])
  }
};
const context = vm.createContext(sandbox);
vm.runInContext(between(source, 'function $cj(k)', 'window.renderProductiveDistributionBoard=$cj;'), context);
vm.runInContext('window.renderProductiveDistributionBoard=$cj;', context);
vm.runInContext(between(source, 'window.openProductiveDistributionPage=function(k)', 'window.openProductiveRunningTasksPage=function(k)'), context);
vm.runInContext(between(source, 'window.openProductiveRunningTasksPage=function(k)', 'window.goApp=function(app,'), context);
vm.runInContext('window.MoshDepartmentDashboard={' + between(source, 'openAssignment(k){', ',inspect:k=>') + '};', context);
vm.runInContext(between(navigation, 'function openDepartmentTaskView(app,action)', 'function treeRows(app)'), context);
sandbox.window.MoshAdministration24 = {openTasks: mode => calls.push(['admin-mode', mode])};

for (let attempt = 0; attempt < 2; attempt++) {
  sandbox.window.openProductiveDistributionPage('hr');
  assert.deepEqual(calls.at(-1), ['dashboard', 'hr']);
  assert.equal(apps.hrApp.dataset.taskView, undefined);

  sandbox.openDepartmentTaskView('hr', 'assign');
  assert.deepEqual(calls.at(-1), ['assignment', 'hr']);
  assert.equal(apps.hrApp.dataset.taskView, 'assign');
  assert.match(crumb.innerHTML, /\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u0645\u0647\u0627\u0645/);
  sandbox.window.renderProductiveDistributionBoard('hr');
  assert.deepEqual(calls.at(-1), ['assignment', 'hr'], 'Redraw must preserve assignment view');

  sandbox.openDepartmentTaskView('hr', 'running');
  assert.deepEqual(calls.at(-1), ['running', 'hr']);
  assert.equal(apps.hrApp.dataset.taskView, undefined);
  sandbox.window.openProductiveDistributionPage('hr');
  assert.deepEqual(calls.at(-1), ['dashboard', 'hr']);
}
sandbox.openDepartmentTaskView('admin', 'assign');
assert.deepEqual(calls.at(-1), ['admin-mode', 'assign']);
sandbox.openDepartmentTaskView('sales', 'assign');
assert.deepEqual(calls.at(-1), ['assignment', 'sales']);
console.log('PASS: HR dashboard, assignment, assignment redraw, running, and dashboard return; admin routing retained and sales assignment separated.');
