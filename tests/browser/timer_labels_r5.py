"""R5 targeted browser checks. Full frontend + mocked API, no live server calls."""
import asyncio,copy,datetime,json,pathlib,traceback
from browser_test import Server,launch,iso
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'tests/results';checks=[]
def check(n,v,d=None):
 if not v:raise AssertionError(n+': '+str(d))
 checks.append(n);print('PASS',len(checks),n,flush=True)
async def main():
 s=Server();s.now=int(datetime.datetime(2026,9,27,14,37,36,tzinfo=datetime.timezone.utc).timestamp()*1000)
 t=s.t('T2');t.update(employeeState='working',title='تصميم كيس شيبس');t['taskNo']='TASK/00002-8ffdbe07-030e-4d11-8384-88ee67890533';t['workTiming'].update(activeStartedAt=0,activeWorker='وليد حداد',activeWorkerId='E1',totalMs=1800000,sessions=[{'id':'OLD-KEEP','startAt':s.now-7200000,'endAt':s.now-5400000,'durationMs':1800000,'workerId':'E1','worker':'وليد حداد'}])
 before=copy.deepcopy(s.state);h=await launch(s);p=h[3];p.set_default_timeout(8000)
 try:
  check('Full application starts',not h[4],h[4])
  check('Exact reported zero-start defect fixed',await p.locator('#wd50StatusTimer').inner_text()=='—')
  check('Visible reason rather than false zero timer',await p.locator('#wd50TimeWarning').is_visible() and 'بداية' in await p.locator('#wd50TimeWarning').inner_text())
  check('Contradictory active state cannot classify empty server history as waste',await p.locator('#wd50Total_waste').inner_text()=='—' and (await p.evaluate('MoshWorkdesk50.report().totals.waste'))==0)
  check('Core task timer also unknown when start absent',await p.evaluate('formatTaskWorkDuration(taskActualWorkMs(state.salesTasks.find(t=>t.id==="T2")))')=='—')
  check('Rendering never writes repairs to API',s.state==before and not s.ops)
  check('Client preserves recorded total, sessions and zero source',await p.evaluate('JSON.stringify(state.salesTasks.find(t=>t.id==="T2").workTiming.sessions)')==json.dumps(t['workTiming']['sessions'],ensure_ascii=False,separators=(',',':')))
  start=s.now-38*60000-12000
  cases=[('milliseconds',start),('milliseconds string',str(start)),('Unix seconds',start/1000),('Unix seconds string',str(start//1000)),('ISO string',iso(start)),('ISO offset',datetime.datetime.fromtimestamp(start/1000,datetime.timezone(datetime.timedelta(hours=3))).isoformat())]
  for name,raw in cases:
   t['workTiming']['activeStartedAt']=raw;t['_version']+=1
   await p.evaluate('MoshWorkdesk50.refresh()');await p.wait_for_timeout(120)
   value=await p.locator('#wd50StatusTimer').inner_text()
   check('Correct 00:38:12 for '+name,value=='00:38:12',value)
   check('Raw start preserved '+name,await p.evaluate('state.salesTasks.find(t=>t.id==="T2").workTiming.activeStartedAt')==raw)
   check('No timing warning '+name,not await p.locator('#wd50TimeWarning').is_visible())
   check('Detail cumulative includes saved30min '+name,await p.evaluate('formatTaskWorkDuration(taskActualWorkMs(state.salesTasks.find(t=>t.id==="T2")))')=='01:08:12')
  for name,raw in [('future',s.now+60000),('1970 ISO','1970-01-01T00:00:00Z'),('invalid text','not-a-date'),('stale 25h',s.now-25*3600000),('null',None)]:
   t['workTiming']['activeStartedAt']=raw;t['_version']+=1;await p.evaluate('MoshWorkdesk50.refresh()')
   check('Bad timer flags '+name,await p.locator('#wd50StatusTimer').inner_text()=='—' and await p.locator('#wd50TimeWarning').is_visible())
  t['workTiming']['activeStartedAt']=start;t['_version']+=1;await p.evaluate('MoshWorkdesk50.refresh()');await p.locator('[data-wd51-home-tab="active"]').click()
  check('No task number on home or workdesk',t['taskNo'] not in await p.locator('#wd50Panel').inner_text() and t['taskNo'] not in await p.locator('#mr49Inbox').inner_text())
  check('Task/client text retained',t['title'] in await p.locator('#wd50Task').inner_text() and t['customer'] in await p.locator('#wd50Task').inner_text())
  sizes=await p.evaluate('''()=>({task:getComputedStyle(document.querySelector('#mr49Inbox .wd51-task-title')).fontSize,client:getComputedStyle(document.querySelector('#mr49Inbox .wd53-task-client')).fontSize,selected:getComputedStyle(document.querySelector('#wd50Task .wd50-task-head b')).fontSize})''')
  check('Enlarged20px title16px client22px selected',sizes=={'task':'20px','client':'16px','selected':'22px'},sizes)
  await p.locator('[data-wd50-picker]').click();check('Picker labels do not show references',t['taskNo'] not in await p.locator('#wd50PickerResults').inner_text());await p.locator('#wd50Search').fill('رولانا');await p.wait_for_timeout(1100)
  check('Search by customer works and holds focus',await p.locator('[data-wd50-pick="T2"]').is_visible() and await p.locator('#wd50Search').evaluate('(e)=>e===document.activeElement'))
  await p.locator('[data-wd50-pick="T2"]').click();await p.locator('#wd51HomeAll').click()
  check('All-my-tasks list hides task references',t['taskNo'] not in await p.locator('#mr49ListRows').inner_text())
  await p.locator('#mr49ListDialog [data-mr49-list-close]').first.click();await p.locator('[data-wd50-details="T2"]').click();await p.wait_for_timeout(450)
  check('Employee detail opens without code in title',await p.locator('#emp47TaskOverlay').is_visible() and await p.locator('#emp47TaskTitle').inner_text()==t['title'])
  check('Task number field hidden not deleted',await p.locator('[id="taskEditTaskNo_T2"]').count()==1 and not await p.locator('[id="taskEditTaskNo_T2"]').is_visible() and await p.locator('[id="taskEditTaskNo_T2"]').input_value()==t['taskNo'])
  check('Same execution buttons present',await p.locator('[data-emp48-action="pause"]').is_visible() and await p.locator('[data-emp48-action="finish"]').is_visible())
  await p.locator('#emp47TaskClose').click();check('UI changes never wrote task IDs or timing data',not s.ops and t['workTiming']['totalMs']==1800000 and t['workTiming']['sessions'][0]['id']=='OLD-KEEP')
  # Long names wrap rather than displacing controls. Include a large task ID.
  original=t['title'];t['title']='تصميم العبوة النهائية لكيس شيبس مع تحديث الهوية والألوان والمقاسات والطباعة';t['customer']='شركة رولانا للصناعات الغذائية والتوزيع الفني';t['_version']+=1;await p.evaluate('MoshWorkdesk50.refresh()')
  for width in [1920,1440,1024,768,390]:
   await p.set_viewport_size({'width':width,'height':1080});await p.wait_for_timeout(150)
   dims=await p.locator('#wd50Panel').evaluate('(e)=>({client:e.clientWidth,scroll:e.scrollWidth})')
   check('No workdesk overflow with long labels at'+str(width),dims['scroll']<=dims['client']+1,dims)
   dims=await p.locator('#mr49Inbox').evaluate('(e)=>({client:e.clientWidth,scroll:e.scrollWidth})')
   check('No inbox overflow at'+str(width),dims['scroll']<=dims['client']+1,dims)
  t['title']=original;t['customer']='رولانا';t['_version']+=1;await p.set_viewport_size({'width':1600,'height':1100});await p.evaluate('MoshWorkdesk50.refresh()');await p.locator('[data-wd51-home-tab="active"]').click()
  await p.locator('.wd51-grid').screenshot(path='/mnt/data/MOSH_WORKDESK_R5_NAMES_TIMER.png')
  t['workTiming']['activeStartedAt']=0;t['_version']+=1;await p.evaluate('MoshWorkdesk50.refresh()');await p.locator('#workProofBar').screenshot(path='/mnt/data/MOSH_WORKDESK_R5_MISSING_TIME.png')
  check('No uncaught errors throughout targeted suite',not h[4],h[4])
 finally:
  await h[1].close();await h[0].stop()
 (OUT/'r5-timer-labels-browser.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Real frontend, mocked API; server not modified'},ensure_ascii=False,indent=2));print('TOTAL',len(checks))
if __name__=='__main__':
 try:asyncio.run(main())
 except Exception:
  (OUT/'r5-timer-labels-partial.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'error':traceback.format_exc()},ensure_ascii=False,indent=2));raise
