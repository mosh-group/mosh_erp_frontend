// Run with Node and Playwright. All API responses are isolated fixtures.
// The real HTML, CSS, boot loader and application scripts run in Chromium.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(path.resolve(path.dirname(process.execPath), '../node_modules/playwright'));
}

const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'api-map.json'), 'utf8'));
const state = {salesOrders: []};
function setState(key, value) {
  const keys = key.split('.');
  let target = state;
  for (const name of keys.slice(0, -1)) target = target[name] ||= {};
  target[keys.at(-1)] = value;
}
for (const resource of Object.values(manifest.resources)) {
  setState(resource.statePath, resource.mode === 'map' ? {} : []);
}
for (const key of Object.values(manifest.settings)) setState(key, {});
const user = {
  id: 'TEST-ADMIN', name: 'اختبار الإدارة', username: 'test-admin',
  isRoot: true, active: true, roleId: 'role_programmer', taskScope: 'all',
  department: 'الإدارة', landing: 'dashboard', _version: 1
};
state.staffProfiles = [{
  id: 'TEST-EMP', name: 'موظف اختبار', department: 'الإدارة',
  active: true, employmentStatus: 'active', _version: 1
}];
state.salesTasks = [{
  id: 'TEST-TASK', taskNo: 'TEST/001', title: 'مهمة اختبار التنقل',
  department: 'الإدارة', status: 'in_progress', employeeState: 'new',
  customer: 'عميل اختبار', assignee: '', _version: 1, workChat: [], history: []
}];
const boot = {
  state, user, users: [user], roles: [], security: {sessionMinutes: 480},
  resources: manifest.resources, settingPaths: manifest.settings,
  settings: {}, csrfToken: 'test-token', revision: 1
};
state.salesTasks.push({
  ...state.salesTasks[0], id: 'TEST-HR-TASK', taskNo: 'TEST/002',
  title: 'HR assignment fixture',
  department: '\u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629'
});

async function main() {
  const browser = await playwright.chromium.launch({
    channel: process.env.MOSH_TEST_BROWSER || 'chrome', headless: true, timeout: 20000,
    args: ['--disable-background-networking', '--disable-component-update', '--disable-domain-reliability', '--disable-sync', '--no-first-run', '--host-resolver-rules=MAP * ~NOTFOUND'],
    env: {...process.env, TEMP: process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Temp') : process.env.TEMP}
  });
  try {
    // No network access: every application read is fulfilled from local files or
    // synthetic fixtures. DNS and background networking are disabled as well.
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}, offline: true, serviceWorkers: 'block'});
    const errors = [];
    const writes = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.context().route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(url.pathname);
        let data = {items: [], employees: [], totals: {}, capabilities: {}};
        if (url.pathname === '/api/auth/status') data = {authenticated: true, setupRequired: false, csrfToken: 'test-token'};
        if (url.pathname === '/api/bootstrap') data = boot;
        if (url.pathname === '/api/r24/admin/overview') {
          // Keep a dashboard read in flight while switching to a task page.
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        await route.fulfill({
          json: {success: true, data},
          headers: {
            'Access-Control-Allow-Origin': 'http://localhost:5500',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-TOKEN, Idempotency-Key',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST, PATCH, DELETE, OPTIONS'
          }
        }).catch(() => {});
        return;
      }
      if (url.hostname !== 'localhost') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({status: 404, body: ''});
      const types = {'.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml'};
      await route.fulfill({body: fs.readFileSync(file), contentType: types[path.extname(file)] || 'application/octet-stream'});
    });
    await page.goto('http://localhost:5500');
    await page.waitForFunction(() => document.querySelector('#appShell') && !document.getElementById('moshEntry36'), null, {timeout: 60000});
    console.log('Loaded real application with offline fixtures.');
    await page.locator('#appSidebar .nav a[aria-controls="ui09-tree-admin"]').click();
    const menu = page.locator('#ui09-tree-admin');
    const dashboard = menu.getByRole('button', {name: 'لوحة القسم', exact: true});
    const running = menu.getByRole('button', {name: 'المهام الجارية', exact: true});
    const assignment = menu.getByRole('button', {name: 'توزيع المهام', exact: true});
    await dashboard.click();
    await page.locator('#r24AdminRoot').waitFor({state: 'visible'});
    // Reproduce the previous routing path: the radio changes but R24 still
    // hides the legacy workspace. This requires the real computed CSS.
    await page.evaluate(() => {
      window.openProductiveRunningTasksPage('admin');
      document.getElementById('adminTabRunning').checked = true;
    });
    assert.equal(await page.locator('#adminProductiveWorkspace').isVisible(), false);
    assert.equal(await page.locator('#r24AdminRoot').isVisible(), true);
    const writesBefore = writes.length;

    for (let attempt = 0; attempt < 2; attempt++) {
      await running.click();
      await page.locator('#adminProductiveWorkspace').waitFor({state: 'visible'});
      assert.equal(await page.locator('#r24AdminRoot').isVisible(), false);
      assert.equal(await page.locator('#adminTabRunning').isChecked(), true);
      await page.waitForTimeout(350);
      assert.equal(await page.locator('#adminProductiveWorkspace').isVisible(), true);

      await assignment.click();
      await page.locator('#adminProductiveWorkspace').waitFor({state: 'visible'});
      assert.equal(await page.locator('#adminTabDistribution').isChecked(), true);
      assert.equal(await page.locator('#adminProductiveWorkspace .db9').count(), 0);
      assert.match(await page.locator('#adminProductiveWorkspace').innerText(), /مهمة اختبار التنقل/);
      await page.evaluate(() => document.dispatchEvent(new CustomEvent('mosh:refreshed')));
      await page.waitForTimeout(350);
      assert.equal(await page.locator('#r24AdminRoot').isVisible(), false);
      assert.equal(await page.locator('#adminProductiveWorkspace').isVisible(), true);
      assert.equal(await page.locator('#adminProductiveWorkspace .db9').count(), 0);

      await dashboard.click();
      await page.locator('#r24AdminRoot').waitFor({state: 'visible'});
      assert.equal(await page.locator('#adminProductiveWorkspace').isVisible(), false);
    }
    const denied = await page.evaluate(() => {
      const auth = window.MoshAuth37;
      const previous = auth.canModule;
      auth.canModule = (app, action) => action === 'assign' ? false : previous(app, action);
      try { return window.MoshAdministration24.openTasks('assign'); }
      finally { auth.canModule = previous; }
    });
    assert.equal(denied, false);
    assert.equal(await page.locator('#r24AdminRoot').isVisible(), true);
    console.log('Admin navigation passed. Checking HR sidebar.');

    await page.locator('#appSidebar .nav a[aria-controls="ui09-tree-hr"]').click();
    const hrMenu = page.locator('#ui09-tree-hr');
    const hrDashboard = hrMenu.getByRole('button', {name: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645', exact: true});
    const hrAssignment = hrMenu.getByRole('button', {name: '\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u0645\u0647\u0627\u0645', exact: true});
    const hrRunning = hrMenu.getByRole('button', {name: '\u0645\u0647\u0627\u0645 \u0642\u0633\u0645 \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629', exact: true});
    for (let attempt = 0; attempt < 2; attempt++) {
      await hrDashboard.click();
      await page.locator('#hrProContent .h13-metrics').waitFor({state: 'visible'});
      assert.equal(await page.locator('#hrAppTasks').isVisible(), false);

      await hrAssignment.click();
      await page.locator('#hrAppTasks').waitFor({state: 'visible'});
      assert.equal(await page.locator('#hrProContent').isVisible(), false);
      assert.equal(await page.locator('#hrAppTasks .design-board-head h2').innerText(), '\u062a\u0648\u0632\u064a\u0639 \u0645\u0647\u0627\u0645 \u0642\u0633\u0645 \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629');
      assert.equal(await page.locator('#hrAppTasks .db9').count(), 0);
      assert.match(await page.locator('#hrAppTasks').innerText(), /HR assignment fixture/);
      assert.equal(await page.locator('#hrApp').getAttribute('data-task-view'), 'assign');
      await page.evaluate(() => window.renderProductiveDistributionBoard('hr'));
      assert.equal(await page.locator('#hrAppTasks .db9').count(), 0);
      assert.match(await page.locator('#hrAppTasks').innerText(), /HR assignment fixture/);

      await hrRunning.click();
      await page.locator('#hrAppTasks').waitFor({state: 'visible'});
      assert.equal(await page.locator('#hrAppTasks .db9').count(), 0);
      assert.equal(await page.locator('#hrApp').getAttribute('data-task-view'), null);

      await hrDashboard.click();
      await page.locator('#hrProContent .h13-metrics').waitFor({state: 'visible'});
      assert.equal(await page.locator('#hrAppTasks').isVisible(), false);
      assert.equal(await page.locator('#hrApp').getAttribute('data-task-view'), null);
    }
    assert.equal(writes.length, writesBefore, 'Navigation must not write business data');
    assert.deepEqual(errors, [], 'Application runtime errors');
    console.log('PASS: reproduced hidden legacy page; dashboard → running → assignment → refresh → dashboard, twice; permission denial; no navigation writes.');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
