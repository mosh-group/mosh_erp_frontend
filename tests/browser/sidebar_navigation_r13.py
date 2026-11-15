"""R13 sidebar navigation regression.
Verifies that sidebar links use the already-loaded in-memory state and do not trigger
an implicit /bootstrap refresh, while the explicit button labelled «تحديث» still does.
No production server is contacted.
"""
import asyncio, json, pathlib, urllib.parse
from browser_test import Server, launch, ROOT

OUT = ROOT / 'tests/results/r13-sidebar'
OUT.mkdir(parents=True, exist_ok=True)

class CountingServer(Server):
    def __init__(self):
        super().__init__()
        self.bootstrap_count = 0
    async def route(self, route):
        u = urllib.parse.urlparse(route.request.url)
        if u.path.endswith('/api/bootstrap'):
            self.bootstrap_count += 1
            # Make any accidental navigation refresh very visible in this test.
            if self.bootstrap_count > 1:
                await asyncio.sleep(1.2)
        return await super().route(route)

async def main():
    s = CountingServer()
    pw, browser, context, page, errors = await launch(s)
    page.set_default_timeout(5000)
    checks = []
    def check(name, ok, detail=None):
        if not ok:
            raise AssertionError(f'{name}: {detail}')
        checks.append(name)
        print('PASS', name, flush=True)
    try:
        initial = s.bootstrap_count
        check('boot uses one bootstrap', initial == 1, initial)

        # Sidebar link should execute its existing goApp handler immediately.
        before = page.clock
        await page.locator('.nav a[title="قسم التصميم"]').click()
        await page.wait_for_function("document.getElementById('designApp')?.classList.contains('active')")
        check('design sidebar opens', await page.locator('#designApp').evaluate("e=>e.classList.contains('active')"))
        check('design sidebar does not bootstrap', s.bootstrap_count == initial, s.bootstrap_count)

        await page.locator('.nav a[title="اللوحة الرئيسية"]').click()
        await page.wait_for_function("document.getElementById('dashboardApp')?.classList.contains('active')")
        check('dashboard sidebar opens', await page.locator('#dashboardApp').evaluate("e=>e.classList.contains('active')"))
        check('second sidebar click still does not bootstrap', s.bootstrap_count == initial, s.bootstrap_count)

        # Dashboard shortcut already used direct navigation; keep that behavior unchanged.
        await page.locator('#dashboardDepartments').evaluate("e=>e.open=true")
        await page.locator('.dashboard-section-btn[onclick="goApp(\'design\')"]').click()
        await page.wait_for_function("document.getElementById('designApp')?.classList.contains('active')")
        check('dashboard shortcut remains direct', s.bootstrap_count == initial, s.bootstrap_count)

        # Explicit refresh remains the only generic UI path intercepted by api-boot.
        await page.evaluate("""() => {
          const b=document.createElement('button');
          b.id='qaExplicitRefreshR13'; b.textContent='تحديث';
          b.addEventListener('click',()=>window.__qaRefreshReplay=(window.__qaRefreshReplay||0)+1);
          document.body.appendChild(b);
        }""")
        await page.locator('#qaExplicitRefreshR13').click()
        await page.wait_for_function("window.__qaRefreshReplay===1")
        check('explicit refresh still bootstraps', s.bootstrap_count == initial + 1, s.bootstrap_count)
        check('refresh control replays exactly once', await page.evaluate('window.__qaRefreshReplay') == 1)
        check('no JavaScript runtime errors', not errors, errors)

        result={'checks':checks,'bootstrapCount':s.bootstrap_count,'errors':errors,'environment':'real frontend + deterministic mock API; no production server'}
        (OUT/'RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print('PASS: R13 sidebar navigation is direct; explicit refresh remains server-backed.')
    finally:
        await browser.close(); await pw.stop()

if __name__=='__main__':
    asyncio.run(main())
