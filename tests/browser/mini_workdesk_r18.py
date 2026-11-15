"""Repeatable R18 UI regression, using the project's isolated API fixture.
This is NOT a production Laravel test; the release QA describes separate real-SQL tests.
Run: python tests/browser/mini_workdesk_r18.py (Playwright/Chromium required).
"""
import asyncio
from browser_test import Server, launch

async def main():
    server = Server()
    pw, browser, context, page, errors = await launch(server)
    checks = []
    def check(name, passed):
        if not passed:
            raise AssertionError(name)
        checks.append(name)
        print('PASS', name, flush=True)
    try:
        await page.wait_for_function('!!window.MoshMini18')
        check('Shortcut adjacent to Logout', await page.evaluate("document.getElementById('moshMiniToggle18').nextElementSibling.id==='auth37LogoutBtn'"))
        check('Panel closed by default', not await page.locator('#moshMini18').is_visible())
        await page.locator('#moshMiniToggle18').click()
        check('Shortcut opens panel', await page.locator('#moshMini18').is_visible())
        before = len(server.ops)
        await page.locator('[data-mini18="compact"]').click()
        check('Compact bar not full panel', (await page.locator('#moshMini18').bounding_box())['height'] < 130)
        await page.locator('[data-mini18="expand"]').click()
        check('Expand restores actions', await page.locator('#mini18Switch').is_visible())
        check('Display changes never write task state', len(server.ops) == before)
        await page.locator('#mini18Switch').click()
        await page.locator('#mini18Search').fill('غلاف')
        check('Search narrows own tasks', await page.locator('[data-mini18-task]').count() == 1)
        await page.locator('#mini18Search').press('Escape')
        check('Escape closes picker only', not await page.locator('#mini18Picker').is_visible() and await page.locator('#mini18Switch').is_visible())
        await page.locator('#mini18Primary').focus()
        await page.keyboard.press('Escape')
        check('Escape compacts focused panel', (await page.locator('#moshMini18').bounding_box())['height'] < 130)
        await page.locator('#moshMiniToggle18').click()
        await page.evaluate('window.open=()=>null')
        await page.locator('#mini18Popout').click()
        check('Blocked popup has usable feedback', 'منع' in await page.locator('#mini18Message').inner_text())
        await page.set_viewport_size({'width': 390, 'height': 844})
        await page.wait_for_timeout(100)
        size=await page.locator('#moshMini18').bounding_box()
        check('Panel fits a narrow screen', size['x']>=0 and size['x']+size['width']<=391)
        check('No uncaught browser errors', not errors)
        print('ALL', len(checks), 'checks passed', flush=True)
    finally:
        await browser.close()
        await pw.stop()
if __name__ == '__main__':
    asyncio.run(main())
