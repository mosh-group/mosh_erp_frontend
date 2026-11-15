import asyncio,copy,json,datetime,pathlib,traceback
from browser_test import Server,launch,iso
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'tests/results';OUT.mkdir(exist_ok=True)
checks=[]
def check(name,value,detail=None):
 if not value:raise AssertionError(name+': '+str(detail))
 checks.append(name);print('PASS',len(checks),name,flush=True)
async def jump(s,p,h,m,sec=0):
 s.now=int(datetime.datetime(2026,9,27,h,m,sec,tzinfo=datetime.timezone.utc).timestamp()*1000)
 await p.clock.set_fixed_time(datetime.datetime.fromtimestamp(s.now/1000,datetime.timezone.utc))
 await p.evaluate('MoshApi.serverOffset=0;MoshWorkdesk50.render(true)')
 await p.evaluate('MoshWorkdesk50.loadReport(undefined,true)')
 await p.evaluate('MoshActivityReminder51.tick()');await p.wait_for_timeout(170)
async def act(p,kind,id=None):
 ok=await p.evaluate('([k,id])=>MoshWorkdesk50.perform(k,id)',[kind,id]);await p.wait_for_timeout(200);await p.evaluate('MoshWorkdesk50.loadReport(undefined,true)');return ok
async def close(h):await h[1].close();await h[0].stop()
async def main():
 s=Server();s.now=int(datetime.datetime(2026,9,27,9,0,1,tzinfo=datetime.timezone.utc).timestamp()*1000)
 h=await launch(s);p=h[3]
 check('Full R3 application boot has no runtime errors',not h[4],h[4])
 check('Compact home has four correctly placed blocks',await p.locator('.wd51-grid>*').count()==4)
 check('Four day buttons exist once outside old header',await p.locator('[data-wd50-day]').count()==4 and await p.locator('.es11-header-tools .es11-work-actions').count()==0)
 check('No reminder shortly after fingerprint-in',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 await jump(s,p,9,4,59);check('No reminder at 4m59s',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 await p.mouse.move(400,400);await p.keyboard.press('Shift');await jump(s,p,9,5)
 check('Reminder appears at five minutes despite mouse/keyboard activity',await p.locator('#wd51Reminder').is_visible())
 check('Reminder is nonmodal; no fullscreen blocker',await p.locator('#wd51Reminder').get_attribute('aria-modal')=='false' and await p.locator('dialog[open]').count()==0)
 check('Exactly one reminder panel',await p.locator('#wd51Reminder').count()==1)
 check('Opening reminder never writes business data',len(s.ops)==0)
 check('Shown event in own session log',len(await p.evaluate('MoshActivityReminder51.events().filter(x=>x.type==="shown")'))==1)
 await p.locator('#wd51Reminder [data-reminder-choice="dismiss"]').first.click()
 check('Dismiss does not save a task or presence state',len(s.ops)==0 and not await p.evaluate('MoshActivityReminder51.isOpen()'))
 await jump(s,p,9,9,59);check('Snooze lasts the full five minutes',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 await jump(s,p,9,10);check('Second reminder appears after snooze',await p.locator('#wd51Reminder').is_visible())
 await jump(s,p,9,11);s.delay=.6
 await p.locator('[data-reminder-choice="break"]').click();await p.wait_for_timeout(100)
 check('Choice remains pending until server confirmation',s.p() is None and await p.locator('[data-reminder-choice="no_work"]').is_disabled())
 await p.evaluate('MoshActivityReminder51.choose("no_work")');await p.wait_for_timeout(1000);s.delay=0
 check('Double clicking cannot submit two states',len(s.ops)==1 and s.p()['mode']=='break')
 check('Confirmed break closes reminder',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 check('Break begins at response time, not first unrecorded minute',s.current['startAt']==iso(s.now))
 await p.evaluate('MoshWorkdesk50.loadReport(undefined,true)');d=await p.evaluate('MoshWorkdesk50.report()')
 check('Eleven previous minutes remain unrecorded',d['totals']['waste']==11*60000,d)
 await jump(s,p,9,30);check('No reminder during recorded break',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 check('No-work can be selected without broad module-edit permission',await act(p,'no_work') and s.p()['noWork'])
 await jump(s,p,9,45);check('No reminder during no-work',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 check('Starting assigned task ends no-work',await act(p,'start','T2') and s.t('T2')['employeeState']=='working')
 await jump(s,p,10,15);check('No reminder while task runs, even no mouse movement',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 check('Pause task alone leaves unrecorded period',await act(p,'pause','T2'))
 await jump(s,p,10,19,59);check('New gap does not add previous waste periods',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 await jump(s,p,10,20);check('Pause gap reaches five minutes',await p.locator('#wd51Reminder').is_visible())
 before=len(s.ops);await p.locator('[data-reminder-choice="task"]').click()
 check('Task choice opens searchable picker and does not start anything',await p.locator('#wd50PickerList').is_visible() and len(s.ops)==before and s.t('T2')['employeeState']=='paused')
 await p.locator('#wd50Search').press_sequentially('البوستر',delay=50);await p.wait_for_timeout(1600)
 check('Picker keeps focus while timers render',await p.locator('#wd50Search').evaluate('(e)=>e===document.activeElement'))
 await p.locator('[data-wd50-pick="T2"]').click();check('Selecting a task still does not start it',len(s.ops)==before)
 await jump(s,p,10,25);check('Merely selecting a task does not permanently dismiss reminder',await p.locator('#wd51Reminder').is_visible())
 await p.locator('[data-reminder-choice="task"]').click();await p.locator('[data-wd50-pick="T2"]').click();await p.locator('[data-wd50-action="start"]').click();await p.wait_for_timeout(350)
 check('Start from workdesk records confirmed response',s.t('T2')['employeeState']=='working' and len(await p.evaluate('MoshActivityReminder51.events().filter(x=>x.type==="response_confirmed"&&x.choice==="start")'))==1)
 await p.evaluate('MoshWorkdesk50.showLog()');await p.wait_for_timeout(1500)
 check('Daily log labels reminder journal as browser-session only',await p.locator('#wd51ReminderLog').is_visible() and 'هذه الجلسة' in await p.locator('#wd51ReminderLog').inner_text())
 await p.locator('#wd50LogDialog [data-wd50-log-close]').first.click()
 check('Home attendance and report use same authoritative total',await p.locator('#wd51PresenceTotal').inner_text()==await p.evaluate('MoshWorkdayModel50.duration(MoshWorkdesk50.report().presenceMs)'))
 # Show failure handling from a verified new gap.
 await act(p,'pause','T2');await jump(s,p,10,30);check('Reminder returns for later gap',await p.locator('#wd51Reminder').is_visible())
 before=copy.deepcopy(s.state);s.failure=422
 await p.locator('[data-reminder-choice="no_work"]').click();await p.wait_for_timeout(350)
 check('Rejected save never changes presence or old timings',s.state==before)
 check('Failed save offers verification rather than blame or repeated writes',await p.locator('#wd51ReminderVerify').is_visible() and await p.locator('#wd51ReminderError').is_visible())
 s.failure=None;await p.locator('#wd51ReminderVerify').click();await p.wait_for_timeout(500)
 check('Verified retry re-enables choices',not await p.locator('[data-reminder-choice="no_work"]').is_disabled())
 await p.locator('[data-reminder-choice="no_work"]').click();await p.wait_for_timeout(350)
 check('Retry records no-work and closes reminder',s.p()['noWork'] and not await p.evaluate('MoshActivityReminder51.isOpen()'))
 # Incomplete attendance/history/outages don't trigger reminders.
 await act(p,'work_start');s.report=False;await jump(s,p,10,40)
 check('Missing backend history suppresses reminder',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 s.report=True;original=s.reportdata
 def flagged(date):
  d=original(date);d['workday']['issues']=['عطل معروف في تسجيل النشاط'];return d
 s.reportdata=flagged;await jump(s,p,10,41);check('Known outage does not trigger unrecorded-time accusation',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 s.reportdata=original;s.state['staffProfiles'][0]['attendanceRecords'][0].update(outTime='10:40',status='closed')
 await jump(s,p,10,50);check('Outside fingerprint attendance no reminder',not await p.evaluate('MoshActivityReminder51.isOpen()'))
 check('Main lifecycle has no runtime errors',not h[4],h[4])
 # UI geometry and quick inbox access.
 await p.locator('[data-wd51-home-tab="active"]').click();await p.locator('#wd51HomeSearch').press_sequentially('كيس',delay=40);await p.wait_for_timeout(1500)
 check('Compact inbox search keeps focus and filters list',await p.locator('#wd51HomeSearch').evaluate('(e)=>e===document.activeElement') and await p.locator('.wd51-home-task').count()==0)
 await p.locator('[data-wd51-home-tab="new"]').click();check('New tab still shows unreceived task',await p.locator('.wd51-home-task').count()==1)
 await p.locator('.wd51-task-title').click();await p.wait_for_timeout(500)
 check('Task title opens existing native details',await p.locator('#emp47TaskOverlay').evaluate('(e)=>e.classList.contains("show")'))
 await close(h)
 (OUT/'r3-browser-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Full real frontend with mocked API; no production backend accessed.'},ensure_ascii=False,indent=2))
 print('TOTAL',len(checks))
if __name__=='__main__':asyncio.run(main())
