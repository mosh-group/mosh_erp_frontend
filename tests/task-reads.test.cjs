const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const transport = fs.readFileSync(path.join(__dirname, '../js/api-client.js'), 'utf8');
const taskSpec = {tasks: {statePath:'salesTasks', mode:'array'}};
const task = (id, version = 1, parentTaskId = null) => ({
  id, _version:version, parentTaskId, title:id, status:'in_progress'
});

function fixture(tasks = []) {
  let section = 'dashboard';
  const globals = {
    URLSearchParams,
    state: {salesTasks: tasks, customers: [], services: []},
    document: {
      querySelector: () => ({id: section + 'App'}),
      dispatchEvent() {}
    },
    CustomEvent: class {},
    addEventListener() {},
    lastSavedStateRaw: '',
    customersCatalog: [],
    servicesCatalog: []
  };
  globals.window = globals;
  vm.runInNewContext(transport, globals);
  const api = globals.MoshApi;
  api.resources = taskSpec;
  api.user = {id:'U1', taskScope:'all', roleId:'R'};
  api.initialize();
  return {api, globals, navigate: value => {section = value;}};
}

function bootstrap(api, tasks = [], included = true) {
  return {
    user: api.user,
    roles: api.auth.roles,
    users: [api.user],
    state: {salesTasks: tasks, customers: [], services: []},
    loadedResources: included ? ['tasks'] : [],
    resources: taskSpec,
    settingPaths: {},
    settings: {}
  };
}

test('dashboard, all tasks, and employee-only tasks request the expected bootstrap modes', async () => {
  const {api} = fixture();
  const requested = [];
  api.request = async url => {
    requested.push(url);
    return bootstrap(api);
  };
  await api.bootstrap();
  await api.bootstrap({section:'tasks'});
  api.user.taskScope = 'inherit';
  api.auth.roles = [{id:'R', scope:'department_limited'}];
  await api.bootstrap({section:'tasks'});
  await api.bootstrap({section:'marketing'});
  assert.deepEqual(requested, [
    '/bootstrap?section=dashboard&tasks=mine',
    '/bootstrap?section=tasks&tasks=omit',
    '/bootstrap?section=tasks&tasks=mine',
    '/bootstrap?section=marketing'
  ]);
});

test('switching scopes updates task baselines and marks legacy sections for reloading', async () => {
  const {api, globals} = fixture([task('older')]);
  const shared = task('shared');
  const mine = task('mine');
  api.request = async url => {
    if (url === '/bootstrap?section=marketing') return bootstrap(api, [mine, shared]);
    if (url === '/bootstrap?section=dashboard&tasks=mine') return bootstrap(api, [mine]);
    assert.fail('Unexpected request: ' + url);
  };
  await api.refresh({section:'marketing'});
  assert.equal(api.sectionPending('marketing'), false);
  await api.refresh({section:'dashboard'});
  assert.equal(api.sectionPending('marketing'), true);
  assert.deepEqual(Array.from(globals.state.salesTasks, row => row.id), ['mine']);
  await api.save();
});

test('a bounded general tasks bootstrap drops the old full task cache without producing deletes', async () => {
  const {api, globals} = fixture();
  const mine = task('mine');
  globals.MoshEmployeeTasks41 = {isMine: row => row.id === mine.id};
  api.request = async url => {
    if (url === '/bootstrap?section=marketing') return bootstrap(api, [mine, task('other')]);
    if (url === '/bootstrap?section=tasks&tasks=omit') return bootstrap(api, [], false);
    assert.fail('Unexpected request: ' + url);
  };
  await api.refresh({section:'marketing'});
  await api.refresh({section:'tasks'});
  assert.deepEqual(Array.from(globals.state.salesTasks, row => row.id), ['mine']);
  assert.equal(api.sectionPending('marketing'), true);
  await api.save();
});

test('task number allocation uses one server request and validates the complete reserved range', async () => {
  const {api} = fixture();
  api.request = async (url, options) => {
    assert.equal(url, '/task-views/reserve');
    assert.equal(options.method, 'POST');
    assert.equal(options.body.count, 3);
    return {first:91, last:93};
  };
  assert.equal(await api.reserveTaskIds(3), 91);
  api.request = async () => ({first:94, last:95});
  await assert.rejects(api.reserveTaskIds(3), /تعذّر تخصيص/);
});

test('a page request forwards search and page size without storing its rows as editable tasks', async () => {
  const {api, globals} = fixture();
  api.request = async (url, options) => {
    const query = new URL(url, 'http://localhost').searchParams;
    assert.equal(query.get('view'), 'main');
    assert.equal(query.get('page'), '2');
    assert.equal(query.get('perPage'), '10');
    assert.equal(query.get('q'), 'إعلان جديد');
    assert.equal(options.envelope, true);
    return {data: [task('new')], meta: {lastPage: 2}};
  };
  const page = await api.taskPage({page:2, perPage:10, q:'إعلان جديد'});
  assert.equal(page.data[0].id, 'new');
  assert.equal(globals.state.salesTasks.length, 0);
});

test('opening a task hydrates its family into editable baseline without creating records on save', async () => {
  const {api, globals} = fixture();
  const root = task('TASK/1');
  const child = task('child', 2, root.id);
  assert.equal(api.hasTaskFamily(root.id), false);
  api.request = async url => {
    assert.equal(url, '/task-views/family/TASK%2F1');
    return [root, child];
  };
  assert.equal(await api.hydrateTaskFamily(root.id), true);
  assert.equal(api.hasTaskFamily(root.id), true);
  assert.deepEqual(Array.from(globals.state.salesTasks, row => row.id), [root.id, child.id]);
  await api.save();
});

test('a delayed task family never overwrites a local draft', async () => {
  const {api, globals} = fixture([task('root')]);
  let reply;
  api.request = () => new Promise(resolve => {reply = resolve;});
  const loading = api.hydrateTaskFamily('root');
  globals.state.salesTasks[0].title = 'Unsaved draft';
  reply([{...task('root', 2), title:'Other editor'}]);
  assert.equal(await loading, false);
  assert.equal(globals.state.salesTasks[0].title, 'Unsaved draft');
});

test('dashboard polling does not replace task state after navigating to another section', async () => {
  const {api, globals, navigate} = fixture([task('original')]);
  let reply;
  api.request = url => {
    assert.equal(url, '/task-views/mine');
    return new Promise(resolve => {reply = resolve;});
  };
  const loading = api.refreshDashboardTasks();
  navigate('marketing');
  reply([task('updated')]);
  assert.equal(await loading, false);
  assert.equal(globals.state.salesTasks[0].id, 'original');
});

test('multi-department distribution reserves all children once and preserves their hierarchy', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/37-mosh-v32-systematic-shared-distribution-js.js'), 'utf8');
  const distribute = source.slice(source.indexOf('async function createDistributed('), source.indexOf('window.MoshSharedDistribution32='));
  const departments = {marketing:['E1','E2'], social:['E3','E4']};
  const ids = [];
  let operations;
  const globals = {
    crypto: require('node:crypto').webcrypto,
    staffFor: department => departments[department].map(id => ({id, name:id})),
    makeRoot: root => {root.sharedDistributionRoot = true;},
    taskIdentity: id => ({id, taskNo:'TASK/' + id}),
    refreshMarketingTaskList() {},
    MoshApi: {
      reserveTaskIds: async count => {ids.push(count);return 20;},
      request: async (url, options) => {
        assert.equal(url, '/transactions');
        operations = options.body.operations;
        return {changes:operations.map(op => ({...op}))};
      },
      acceptCreatedTask() {}
    }
  };
  vm.runInNewContext(distribute, globals);
  const root = await globals.createDistributed(
    {id:19, department:'marketing', title:'Campaign'},
    'departments',
    Object.keys(departments),
    'owner',
    null,
    departments
  );
  assert.deepEqual(ids, [6]);
  assert.equal(root.id, 19);
  assert.deepEqual(Array.from(operations, op => op.id), [19,20,21,22,23,24,25]);
  assert.deepEqual(Array.from(operations, op => op.data.parentTaskId), [undefined,19,20,20,19,23,23]);
  assert.deepEqual(Array.from(operations.slice(2,4), op => op.data.assigneeId), ['E1','E2']);
  assert.deepEqual(Array.from(operations.slice(5), op => op.data.assigneeId), ['E3','E4']);
});
