"""R6: real frontend/modules, isolated mock transport. Never contacts a production API."""
import asyncio,copy,datetime,json,pathlib,traceback
from browser_test import Server,launch,iso
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'tests/results';checks=[]
def check(n,v,d=None):
 if not v:raise AssertionError(n+': '+str(d))
 checks.append(n);print('PASS',len(checks),n,flush=True)
async def advance(s,p,ms):
 s.now+=ms;await p.clock.set_fixed_time(datetime.datetime.fromtimestamp(s.now/1000,datetime.timezone.utc));await p.evaluate('MoshWorkdesk50.render(true)')
async def timer_suite():
 s=Server();s.state['staffProfiles'][0]['attendanceRecords']=[];h=await launch(s);p=h[3];p.set_default_timeout(7000)
 try:
  check('No attendance is explicit, not fabricated',await p.locator('#wd51AttendanceText').inner_text()=='لم تُسجّل بصمة')
  await p.evaluate("MoshWorkdesk50.select('T1')");await p.locator('[data-wd50-action="receive"]').click();await p.wait_for_function('!MoshWorkdesk50.isBusy()')
  check('Receipt does not start timer',s.t('T1')['employeeState']=='received' and s.t('T1')['workTiming']['activeStartedAt']==0)
  await p.locator('[data-wd50-action="start"]').click();await p.wait_for_function('!MoshWorkdesk50.isBusy()');await advance(s,p,120000)
  check('Start without fingerprint runs the actual clock',await p.locator('#wd50StatusTimer').inner_text()=='00:02:00')
  check('Native and workdesk totals agree',await p.evaluate("formatTaskWorkDuration(taskActualWorkMs(state.salesTasks.find(t=>t.id==='T1')))")=='00:02:00')
  await p.locator('[data-wd50-action="pause"]').click();await p.wait_for_function('!MoshWorkdesk50.isBusy()');await advance(s,p,600000)
  check('Pause saves 2 minutes, excludes gap',s.t('T1')['workTiming']['totalMs']==120000)
  await p.locator('[data-wd50-action="start"]').click();await p.wait_for_function('!MoshWorkdesk50.isBusy()');await advance(s,p,180000)
  check('Resume adds history instead of resetting',await p.locator('#wd50StatusTimer').inner_text()=='00:05:00')
  await p.evaluate('MoshWorkdesk50.refresh()');check('Server refresh preserves cumulative timer',await p.locator('#wd50StatusTimer').inner_text()=='00:05:00')
  await p.locator('[data-wd50-day="break"]').click();await p.wait_for_function('!MoshWorkdesk50.isBusy()');await advance(s,p,90000)
  check('Break has its own clock',await p.locator('#wd50StatusTimer').inner_text()=='00:01:30')
  await p.locator('[data-wd50-action="start"]').click();await p.wait_for_function('!MoshWorkdesk50.isBusy()');await advance(s,p,60000)
  check('Resume after break does not add rest time',await p.locator('#wd50StatusTimer').inner_text()=='00:06:00')
  await p.locator('[data-wd50-action="finish"]').click();await p.wait_for_function('!MoshWorkdesk50.isBusy()')
  check('Submit records total and keeps task awaiting review',s.t('T1')['employeeState']=='submitted' and s.t('T1')['workTiming']['totalMs']==360000)
  check('No simulated fingerprint was ever written',s.state['staffProfiles'][0]['attendanceRecords']==[] and all(op['resource'] in ['tasks','work-presence'] for ops in s.ops for op in ops))
  # Serializer compatibility, with a known saved start, never local estimates.
  t=s.t('T2');t.update(employeeState='working');t['workTiming']={'active_started_at':iso(s.now-60000),'total_ms':120000,'sessions':[]};t['_version']+=1
  await p.evaluate('MoshWorkdesk50.refresh()');check('snake_case fields read from task',await p.locator('#wd50StatusTimer').inner_text()=='00:03:00')
  t.pop('workTiming');t['work_timing']={'active_started_at':(s.now-120000)//1000,'total_seconds':180,'sessions':[]};t['_version']+=1
  await p.evaluate('MoshWorkdesk50.refresh()');check('snake_case resource and seconds duration read',await p.locator('#wd50StatusTimer').inner_text()=='00:05:00')
  t.pop('work_timing');t['workTiming']={'activeSession':{'startedAt':iso(s.now-60000)},'totalMs':240000,'sessions':[]};t['_version']+=1
  await p.evaluate('MoshWorkdesk50.refresh()');check('Explicit current server session read',await p.locator('#wd50StatusTimer').inner_text()=='00:05:00')
  t['workTiming']={'activeStartedAt':0,'totalMs':60000,'sessions':[]};t['_version']+=1
  await p.evaluate('MoshWorkdesk50.refresh()');check('Missing server start never becomes 1970 or a made-up clock',await p.locator('#wd50StatusTimer').inner_text()=='—' and await p.locator('#wd50TimeWarning').is_visible())
  check('Display does not alter missing timing',s.t('T2')['workTiming']['activeStartedAt']==0)
  check('No browser errors in time suite',not h[4],h[4])
 finally:await h[1].close();await h[0].stop()
async def label_suite():
 s=Server();s.user.update(isRoot=True,roleId='role_root',taskScope='all');ids=['01M34TP73ZPHT2BEHF2N1KY75H','01M3HN11XS7J9YVNHJRNX9EWSV','7bb952f9-8b7c-4859-b7e2-4974426cd830']
 for i,t in enumerate(s.state['salesTasks']):t.update(id=ids[i],taskNo=['TASK/00003',None,'TASK/00021'][i],number=['TASK/00003',None,'TASK/00021'][i])
 s.state['salesTasks'][0]['employeeState']='submitted';s.state['salesTasks'][1]['employeeState']='paused';before=copy.deepcopy(s.state['salesTasks'])
 h=await launch(s);p=h[3];p.set_default_timeout(8000)
 try:
  await p.evaluate("goApp('design');openProductiveDistributionPage('design')");await p.wait_for_timeout(500)
  text=await p.locator('#designApp').inner_text();check('Exact reported department dashboard hides ULID and TASK codes',all(x not in text for x in ids+['TASK/00003','TASK/00021']))
  check('Department dashboard shows title and client',all(t['title'] in text and t['customer'] in text for t in s.state['salesTasks']))
  sizes=await p.locator('#designApp .mt54-task-name').evaluate_all('(es)=>es.map(e=>getComputedStyle(e).fontSize)');check('Department task titles really compute at20px, including theme override',sizes and set(sizes)=={'20px'},sizes)
  sizes=await p.locator('#designApp .mt54-client-name').evaluate_all('(es)=>es.map(e=>getComputedStyle(e).fontSize)');check('Client names compute at17px',sizes and set(sizes)=={'17px'},sizes)
  # User clicks the task title, not a direct test-only navigation.
  await p.locator('#designApp .mt54-task-name').first.click();await p.wait_for_timeout(300)
  field=p.locator('[id="taskEditTitle_'+ids[0]+'"]');check('ULID task name opens same native detail',await field.is_visible() and await field.input_value()==s.state['salesTasks'][0]['title'])
  check('Identifier input retained but fully hidden from layout',await p.locator('[id="taskEditTaskNo_'+ids[0]+'"]').count()==1 and not await p.locator('[id="taskEditTaskNo_'+ids[0]+'"]').is_visible())
  check('Internal edit task title font20',await field.evaluate('(e)=>getComputedStyle(e).fontSize')=='20px')
  # All task table uses typed escaped IDs, not invalid bare ULID JavaScript.
  await p.evaluate("goApp('tasks');renderAllTasks()");await p.wait_for_timeout(220)
  host=p.locator('#allTasksContainer');check('All-task list hides IDs and keeps customer',all([x not in await host.inner_text() for x in ids+['TASK/00003']]))
  errs=await host.locator('[onclick]').evaluate_all('''es=>es.flatMap(e=>{try{new Function(e.getAttribute('onclick'));return []}catch(err){return [String(err)]}})''');check('All task actions compile for string IDs',not errs,errs)
  await host.locator('tbody tr').first.click();await p.wait_for_timeout(150);check('All-task row click works with string ID',await host.locator('[id="taskEditTitle_'+ids[0]+'"]').is_visible())
  await p.evaluate("goApp('design');openProductiveRunningTasksPage('design')");await p.wait_for_timeout(350)
  check('Running list hides refs',all([x not in await p.locator('#designApp').inner_text() for x in ids+['TASK/00003']]))
  # Same dashboard rendering for other operational departments using returned test data.
  for dep,key in [('التصوير','photo'),('المونتاج','editing'),('الترويج','promotion'),('المبيعات','sales'),('الإدارة','admin')]:
   for t in s.state['salesTasks']:t['department']=dep;t['_version']+=1
   await p.evaluate('MoshWorkdesk50.refresh()');await p.evaluate('(key)=>{goApp(key);openProductiveDistributionPage(key)}',key);await p.wait_for_timeout(160)
   tx=await p.locator('#'+key+'App').inner_text();check('No reference in '+key+' dashboard',all(x not in tx for x in ids+['TASK/00003']))
  # Review modal and billing/archives use the same human labels.
  for t in s.state['salesTasks']:t['department']='التصميم';t['employeeState']='submitted';t['_version']+=1
  await p.evaluate('MoshWorkdesk50.refresh()');await p.evaluate("goApp('design');MoshManagerApprovals28.open('design')");await p.wait_for_timeout(180)
  modal=p.locator('.mgr28-modal');check('Review modal opens',await modal.is_visible());check('Review modal hides identifiers',all([x not in await modal.inner_text() for x in ids+['TASK/00003']]));await p.evaluate('MoshManagerApprovals28.close()')
  s.state['salesTasks'][0]['status']='awaiting_invoice';s.state['salesTasks'][0]['_version']+=1;await p.evaluate('MoshWorkdesk50.refresh()');await p.evaluate('(id)=>openBillingTaskPreview(id)',ids[0]);await p.wait_for_timeout(150)
  check('Billing task preview hides ref',all([x not in await p.locator('#billingTaskPreviewModal').inner_text() for x in ids+['TASK/00003']]));await p.evaluate('closeBillingTaskPreview()')
  # Long Arabic names; task and client only enlarge, other controls retain their sizes.
  for t in s.state['salesTasks']:t.update(status='in_progress',department='التصميم');t['_version']+=1
  s.state['salesTasks'][0]['title']='تصميم العبوة النهائية لكيس شيبس مع تحديث الهوية والألوان والمقاسات والطباعة';s.state['salesTasks'][0]['customer']='شركة رولانا للصناعات الغذائية والتوزيع'
  await p.evaluate('MoshWorkdesk50.refresh()');await p.evaluate("goApp('design');openProductiveDistributionPage('design')")
  for width in [1600,1024,390]:
   await p.set_viewport_size({'width':width,'height':1100});await p.wait_for_timeout(120)
   bb=await p.locator('#designApp .mt54-task-name').first.evaluate('(e)=>({w:e.clientWidth,scroll:e.scrollWidth,h:e.clientHeight})');check('Long title wraps without own overflow at'+str(width),bb['scroll']<=bb['w']+2 and bb['h']>0,bb)
  await p.set_viewport_size({'width':1500,'height':1020});await p.locator('#designApp .db9-follow').screenshot(path='/mnt/data/MOSH_WORKDESK_R6_INTERNAL.png')
  check('Rendering did not submit business changes',not s.ops,s.ops)
  check('Stored identifiers unchanged',all(t['id']==ids[i] and t['taskNo']==before[i]['taskNo'] for i,t in enumerate(s.state['salesTasks'])))
  check('No uncaught errors in internal screen suite',not h[4],h[4])
 finally:await h[1].close();await h[0].stop()
async def main():
 await timer_suite();await label_suite();(OUT/'r6-browser.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Real frontend with isolated mocked API; no production changes'},ensure_ascii=False,indent=2));print('TOTAL',len(checks))
if __name__=='__main__':
 try:asyncio.run(main())
 except Exception:
  (OUT/'r6-browser-partial.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'error':traceback.format_exc()},ensure_ascii=False,indent=2));raise
