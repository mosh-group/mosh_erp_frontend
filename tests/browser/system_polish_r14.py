"""R14 UI/system regression: form labels, task creator, keyboard exit guard,
admin direct assignment, HR handbook ownership, and customer-first request linking.
No production server is contacted.
"""
import asyncio, json
from browser_test import Server, launch, ROOT

OUT = ROOT / 'tests/results/r14-system'
OUT.mkdir(parents=True, exist_ok=True)

async def main():
    s=Server()
    # Add another customer's task to prove customer-first filtering.
    s.state['customers'].append({'id':'C2','name':'عميل آخر','_version':1})
    other=s.task('T9','مهمة عميل آخر','new'); other['customer']='عميل آخر'; other['customerId']='C2'; s.state['salesTasks'].append(other)
    # Admin target candidate used by direct administration assignment test.
    s.state['staffProfiles'].append({'id':'E2','name':'مدير تنفيذي','employeeNo':'EMP-00002','department':'الإدارة','active':True,'employmentStatus':'active','jobTitle':'مدير تنفيذي','_version':1})
    pw,browser,context,page,errors=await launch(s)
    page.set_default_timeout(7000)
    checks=[]
    def check(name,ok,detail=None):
        if not ok: raise AssertionError(f'{name}: {detail}')
        checks.append(name); print('PASS',name,flush=True)
    try:
        check('R14 runtime loaded', await page.evaluate('!!window.MoshR14Polish'))
        check('global handbook nav hidden', await page.locator('#instructionsNavLink').evaluate("e=>getComputedStyle(e).display==='none'"))
        check('HR handbook button exists', await page.locator('#hrHandbookTab').count()==1)
        await page.evaluate("goApp('admin')")
        await page.wait_for_timeout(80)
        admin_text=' '.join(await page.locator('#m16AdminRail').all_text_contents())
        check('handbook removed from administration rail', 'تعليمات إدارية عامة' not in admin_text, admin_text)
        await page.evaluate("goApp('dashboard')")

        # Static task wording + auto creator.
        await page.evaluate("openStandaloneTaskModal()")
        check('full task details label', await page.locator('#standaloneTaskDescription').evaluate("e=>e.parentElement.querySelector('label').textContent.includes('بشكل كامل')"))
        check('mandatory-read notes label', await page.locator('#standaloneTaskNotes').evaluate("e=>e.parentElement.querySelector('label').textContent.includes('يجب الاطلاع عليها')"))
        check('creator is automatic', await page.locator('#standaloneTaskCreator').input_value()=='وليد حداد')

        # Administration must use direct senior-person assignment, not manager-of-department mode.
        await page.locator('#standaloneTaskDepartment').select_option('الإدارة')
        await page.evaluate('refreshStandaloneAssignmentUI()')
        check('administration assignment mode hidden', await page.locator('#standaloneAssignmentModeField').evaluate("e=>getComputedStyle(e).display==='none'"))
        check('administration direct assignee visible', await page.locator('#standaloneAssigneeField').evaluate("e=>getComputedStyle(e).display!=='none'"))
        check('administration list contains executive', await page.locator('#standaloneStaffList option[value="مدير تنفيذي"]').count()==1)

        # Dirty Escape guard must ask before closing.
        await page.locator('#standaloneTaskTitle').fill('تعديل غير محفوظ')
        await page.keyboard.press('Escape')
        check('Escape opens unsaved dialog', await page.locator('#r14UnsavedDialog').evaluate('e=>e.open'))
        await page.locator('#r14UnsavedDialog [data-r14="discard"]').click()
        await page.wait_for_timeout(100)
        check('discard closes task modal', not await page.locator('#standaloneTaskModal').evaluate("e=>e.classList.contains('show')"))

        # Purchase/logistics linking: customer first, task list disabled before customer,
        # then contains only the selected customer's tasks.
        await page.evaluate("openSupportRequestModal('', 'purchase')")
        check('task link initially disabled', await page.locator('#o18ReqTask').is_disabled())
        await page.locator('#o18ReqCustomer').fill('رولانا')
        await page.locator('#o18ReqCustomer').dispatch_event('input')
        await page.wait_for_timeout(50)
        check('task link enabled after customer', not await page.locator('#o18ReqTask').is_disabled())
        opts=await page.locator('#o18ReqTask option').all_text_contents()
        check('Rolana tasks present', any('تصميم كيس شيبس' in x for x in opts), opts)
        check('other customer task filtered out', not any('مهمة عميل آخر' in x for x in opts), opts)
        check('task option includes distinguishing metadata', any('|' in x for x in opts if 'تصميم كيس شيبس' in x), opts)

        check('no JavaScript runtime errors', not errors, errors)
        result={'checks':checks,'errors':errors,'environment':'real frontend + deterministic mock API; no production server'}
        (OUT/'RESULTS.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print('PASS: R14 core UI/system regression complete.')
    finally:
        await browser.close(); await pw.stop()

if __name__=='__main__': asyncio.run(main())
