"""Real bundled frontend / Chromium against a deterministic mock API.
Backend persistence is tested separately in WorkdayR8Test.php. No user data used.
"""
import asyncio,copy,datetime,email.utils,json,pathlib,urllib.parse
from browser_test import Server,launch,iso
OUT=pathlib.Path(__file__).resolve().parents[2]/'tests/results/r8'
OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,value,detail=None):
 if not value:raise AssertionError(name+': '+str(detail))
 checks.append(name);print('PASS',len(checks),name,flush=True)
class DailyServer(Server):
 async def route(self,route):
  u=urllib.parse.urlparse(route.request.url)
  if u.path.endswith('/api/workday'):
   date=urllib.parse.parse_qs(u.query).get('date',[iso(self.now)[:10]])[0]
   data=self.reportdata(date)
   if 'workday' in data:
    w=data['workday'];w.update(version='workday-r8',historyPartial=False,activityAvailable=True,trackingSince=self.now-86400000,coverage=[])
    for item in w['activities']:
     if item.get('open'):item['endAt']=self.now
   data.update(serverNow=self.now,timeZone='UTC')
   return await route.fulfill(status=200,headers={'Content-Type':'application/json','Date':email.utils.format_datetime(datetime.datetime.fromtimestamp(self.now/1000,datetime.timezone.utc),usegmt=True)},body=json.dumps({'success':True,'data':data},ensure_ascii=False))
  return await super().route(route)
async def refresh(p):
 await p.evaluate('MoshWorkdesk50.loadReport(undefined,true)');await p.wait_for_timeout(80)
async def advance(s,p,minutes):
 s.now+=round(minutes*60000);await p.clock.set_fixed_time(datetime.datetime.fromtimestamp(s.now/1000,datetime.timezone.utc))
 await p.evaluate('MoshApi.serverOffset=0;MoshActivityReminder51?.dismiss();MoshWorkdesk50.render(true)')
async def action(p,kind,id=None):
 ok=await p.evaluate('([kind,id])=>MoshWorkdesk50.perform(kind,id)',[kind,id]);await p.wait_for_timeout(300);return ok
async def close(h):await h[1].close();await h[0].stop()
async def main():
 s=DailyServer();s.state['staffProfiles'][0]['attendanceRecords']=[]
 h=await launch(s);p=h[3];p.set_default_timeout(10000)
 try:
  await p.evaluate('MoshActivityReminder51?.dismiss()');await refresh(p)
  check('Frontend R8 boots without runtime errors',not h[4],h[4])
  check('All three empty-day activity cards show true zero',all([await p.locator('#wd50Total_'+k).inner_text()=='00:00:00' for k in ['task','break','no_work']]))
  check('Waste waits for attendance only',await p.locator('#wd50Total_waste').inner_text()=='بانتظار الحضور')
  check('Workday start does not start task',await action(p,'work_start') and s.t('T1')['workTiming']['activeStartedAt']==0)
  check('Receipt does not start timer',await action(p,'receive','T1') and s.t('T1')['workTiming']['activeStartedAt']==0)
  check('Start confirms task on server',await action(p,'start','T1'))
  await advance(s,p,30)
  check('Live task daily card ticks without waiting for next fetch',await p.locator('#wd50Total_task').inner_text()=='00:30:00',await p.locator('#wd50Total_task').inner_text())
  check('Break stops execution',await action(p,'break') and s.t('T1')['employeeState']=='paused')
  await advance(s,p,10)
  check('Live break card ticks from saved open interval',await p.locator('#wd50Total_break').inner_text()=='00:10:00')
  check('No-work closes break',await action(p,'no_work') and s.p()['noWork'])
  await advance(s,p,5)
  check('Live no-work card ticks',await p.locator('#wd50Total_no_work').inner_text()=='00:05:00')
  check('End stops no-work without fingerprint',await action(p,'work_end') and not s.state['staffProfiles'][0]['attendanceRecords'])
  await refresh(p)
  expected={'task':'00:30:00','break':'00:10:00','no_work':'00:05:00'}
  for k,v in expected.items():check('Persisted daily '+k+' total',await p.locator('#wd50Total_'+k).inner_text()==v)
  await p.locator('[data-wd50-log]').click();await p.wait_for_timeout(300)
  check('Daily log opens with no attendance',await p.locator('#wd50LogDialog').is_visible())
  check('Daily task breakdown contains actual30minutes','00:30:00' in await p.locator('#wd50LogTasks').inner_text())
  check('Daily log contains all three recorded segments',await p.locator('#wd50LogRows tr').count()==3)
  await p.locator('#wd50LogDialog [data-wd50-log-close]').first.click()
  await p.locator('#wd51TimeSummary').screenshot(path=str(OUT/'daily_without_attendance.png'))
  check('No errors after all transitions',not h[4],h[4])
 finally:await close(h)
 # New browser context: local/session storage and in-page observed history gone.
 h=await launch(s);p=h[3];p.set_default_timeout(10000)
 try:
  await refresh(p)
  for k,v in expected.items():check('Fresh browser preserves '+k+' total',await p.locator('#wd50Total_'+k).inner_text()==v)
  await advance(s,p,30);await refresh(p)
  check('Stopped time does not accrue while browser was closed',await p.locator('#wd50Total_task').inner_text()=='00:30:00' and await p.locator('#wd50Total_no_work').inner_text()=='00:05:00')
  check('Resume old task works',await action(p,'start','T1'));await advance(s,p,2)
  check('Resume adds only new execution',await p.locator('#wd50Total_task').inner_text()=='00:32:00')
  await action(p,'pause','T1');await advance(s,p,10);await refresh(p)
  check('Pause interval excluded from task execution',await p.locator('#wd50Total_task').inner_text()=='00:32:00')
  check('No synthetic attendance rows',s.state['staffProfiles'][0]['attendanceRecords']==[])
  check('No frontend runtime errors after fresh browser',not h[4],h[4])
 finally:await close(h)
 (OUT/'browser-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'backend':'deterministic mock API; real ORM covered separately','data':'test fixture only'},ensure_ascii=False,indent=2))
asyncio.run(main())
