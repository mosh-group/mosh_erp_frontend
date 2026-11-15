"""R4 integration tests. Full real frontend; isolated mocked API, no production access."""
import asyncio, copy, datetime, json, pathlib, urllib.parse
from browser_test import Server, launch, iso
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'tests/results';OUT.mkdir(exist_ok=True)
checks=[]
def check(name,ok,detail=None):
 if not ok: raise AssertionError(name+': '+str(detail))
 checks.append(name);print('PASS',len(checks),name,flush=True)
def note(id,title='تعميم تجريبي',**kwargs):
 d={'id':id,'title':title,'message':'يرجى تسليم النسخ النهائية اليوم قبل الساعة الرابعة.\nيجب إرفاق ملفات المصدر داخل المهمة.','type':'announcement','targetType':'all','recipientIds':['E1'],'recipientSnapshots':[{'id':'E1','name':'وليد حداد','department':'التصميم'}],'createdAt':'2026-09-27T09:30:00Z','sourceDepartment':'الإدارة','active':True,'readBy':[],'readAtBy':{},'_version':1};d.update(kwargs);return d
class NoticeServer(Server):
 def __init__(self):
  super().__init__();self.now=int(datetime.datetime(2026,9,27,9,1,tzinfo=datetime.timezone.utc).timestamp()*1000);self.noticeWrites=[];self.noticeKeys={};self.noticeFail=None;self.noticeDelay=0;self.getFail=None;self.noticeLost=0;self.malformed=False
  self.state['hrAnnouncements']=[note('N1','تحديث موعد تسليم الأعمال',urgent=True),note('N2','يرجى مراجعة ألوان الهوية',type='alert',createdAt='2026-09-27T09:45:00Z'),note('N3','التعميم السابق',readBy=['E1'],readAtBy={'E1':'2026-09-27T08:00:00Z'}),note('OTHER','رسالة موظف آخر',recipientIds=['E2'],recipientSnapshots=[{'id':'E2'}]),note('DELETED','رسالة محذوفة',deletedAt='2026-09-27'),note('INACTIVE','متوقفة',active=False),note('FUTURE','لم تنشر بعد',publishAt='2026-10-01T08:00:00Z')]
 async def route(self,route):
  req=route.request;path=urllib.parse.urlparse(req.url).path.split('/api',1)[-1]
  async def send(data,status=200):
   body={'success':True,'data':data} if status<400 else {'success':False,'message':str(data)}
   await route.fulfill(status=status,headers={'Content-Type':'application/json'},body=json.dumps(body,ensure_ascii=False))
  if path.startswith('/announcements') and req.method=='GET' and self.getFail:
   return await send('محاكاة تعذر التحديث',self.getFail)
  if path.startswith('/announcements/') and req.method=='PATCH':
   if self.noticeDelay:await asyncio.sleep(self.noticeDelay)
   if self.noticeFail:return await send('محاكاة رفض تأكيد الاطلاع',self.noticeFail)
   id=urllib.parse.unquote(path.rsplit('/',1)[-1]);n=next((n for n in self.state['hrAnnouncements'] if n['id']==id),None)
   b=req.post_data_json;key=req.headers.get('idempotency-key')
   if key in self.noticeKeys:return await send(self.noticeKeys[key])
   if not n:return await send('غير موجودة',404)
   if self.user.get('employeeId') not in n.get('recipientIds',[]):return await send('ليست موجهة إليك',403)
   if set(b)-{'_version','readBy'}:return await send('تعديل غير مسموح',403)
   if b.get('_version')!=n['_version']:return await send('تعارض إصدار',409)
   expected=set(n['readBy'])|{self.user['employeeId']}
   if set(b.get('readBy',[]))!=expected:return await send('لا يحق لك تأكيد الآخرين',403)
   n['readBy']=sorted(expected);n['readAtBy'][self.user['employeeId']]=iso(self.now);n['_version']+=1
   self.noticeWrites.append(copy.deepcopy(b));self.noticeKeys[key]=copy.deepcopy(n)
   if self.noticeLost:self.noticeLost-=1;return await route.abort()
   return await send({'id':id} if self.malformed else copy.deepcopy(n))
  return await super().route(route)
async def finish(h):await h[1].close();await h[0].stop()
async def main():
 s=NoticeServer();h=await launch(s);p=h[3]
 check('R4 full application boots with no JavaScript errors',not h[4],h[4])
 check('Notice strip sits directly after employee identity header',await p.locator('#moshNoticeStrip52').evaluate('(e)=>e.previousElementSibling.classList.contains("es11-header")'))
 check('Notice strip is above the attendance bar and work panels',await p.evaluate('document.getElementById("moshNoticeStrip52").getBoundingClientRect().bottom <= document.querySelector(".wd51-attendance").getBoundingClientRect().top'))
 check('Only own relevant unread announcements counted',await p.locator('#nt52Count').inner_text()=='2 غير مقروءة')
 check('Urgent unread notice precedes newer normal notice','تحديث موعد' in await p.locator('#nt52Feature').inner_text())
 check('Archived, inactive, future and other-recipient notices excluded',await p.evaluate('MoshHomeNotices52.rows().map(n=>n.id)')==['N1','N2','N3'])
 check('No receipt written on homepage or automatic refresh',len(s.noticeWrites)==0)
 check('Old lower latest section removed',await p.locator('details[data-c19-key="employee-latest"]').count()==0)
 check('Old notice tile hidden, while three other tiles remain',not await p.locator('#employeeAnnouncementBtn').is_visible() and await p.locator('.es11-tiles > button').count()==3)
 check('Legacy binding IDs preserved once',await p.locator('#es11RecentNotices').count()==1 and not await p.locator('#es11RecentNotices').is_visible())
 check('Receipt operation does not require editing department HR',await p.evaluate('MoshAuth37.canModule("hr","edit")') is False)
 await p.locator('#nt52Feature .nt52-open').click()
 check('Notice opens in a readable dialog',await p.locator('#moshNoticeDialog52').is_visible() and 'ملفات المصدر' in await p.locator('.nt52-message').inner_text())
 check('Opening notice does not mark it as read',len(s.noticeWrites)==0 and await p.locator('#nt52Count').inner_text()=='2 غير مقروءة')
 await p.keyboard.press('Escape');check('Escape closes dialog without a receipt',not await p.locator('#moshNoticeDialog52').is_visible() and len(s.noticeWrites)==0)
 await p.locator('#moshNoticeStrip52 [data-nt52-list]').click()
 check('All-notice inbox opens with scoped history',await p.locator('.nt52-list-row').count()==3)
 await p.locator('#nt52Search').press_sequentially('ألوان',delay=35);await p.wait_for_timeout(2200)
 check('Search keeps focus across timers and filters full message list',await p.locator('#nt52Search').evaluate('(e)=>e===document.activeElement') and await p.locator('.nt52-list-row').count()==1)
 await p.locator('.nt52-list-row [data-nt52-open]').first.click()
 check('Detail shows explicit acknowledgement button',await p.locator('[data-nt52-ack="N2"]').is_visible())
 s.noticeDelay=.7
 await p.locator('[data-nt52-ack="N2"]').click();await p.wait_for_timeout(100)
 check('Read count unchanged while server response pending',await p.locator('#nt52Count').inner_text()=='2 غير مقروءة' and await p.locator('[data-nt52-ack]').is_disabled())
 await p.evaluate('MoshHomeNotices52.acknowledge("N2")');await p.wait_for_timeout(1000);s.noticeDelay=0
 check('Repeated click submits only one receipt',len(s.noticeWrites)==1)
 check('Server confirms receipt before count decreases',await p.locator('#nt52Count').inner_text()=='1 غير مقروءة' and await p.locator('.nt52-confirmed').inner_text()=='✓ تم الاطلاع')
 check('Server timestamp displayed, not fabricated locally','٢٧' in await p.locator('.nt52-ack-note').inner_text())
 check('Receipt payload is narrow and excludes user files or messages',set(s.noticeWrites[0])=={'_version','readBy'})
 await p.locator('[data-nt52-close]').click();await p.locator('#nt52Feature .nt52-open').click();s.noticeFail=403
 await p.locator('[data-nt52-ack]').click();await p.wait_for_timeout(300)
 check('Rejected acknowledgement stays unread with useful error',await p.locator('#nt52Count').inner_text()=='1 غير مقروءة' and 'لم يسمح' in await p.locator('#nt52DialogContent .nt52-error:visible').inner_text())
 s.noticeFail=None;s.noticeLost=1
 await p.locator('[data-nt52-ack]').click();await p.wait_for_timeout(450)
 check('Lost response retries same key without duplicate receipt',len(s.noticeWrites)==2 and await p.locator('#nt52Count').inner_text()=='لا يوجد جديد')
 await p.locator('[data-nt52-close]').click()
 check('Empty strip collapses to a single row',not await p.locator('#nt52Feature').is_visible() and (await p.locator('#moshNoticeStrip52').bounding_box())['height']<85)
 await p.locator('[data-wd51-attendance]').click();await p.wait_for_timeout(180)
 check('Attendance history still opens from attendance strip',await p.locator('#hrProModalRoot').is_visible() and 'سجل الدوام' in await p.locator('#hrProModalRoot').inner_text())
 await p.evaluate('hrProCloseModal()');await p.evaluate('MoshWorkdesk50.showLog()');await p.wait_for_timeout(400)
 check('Daily work-time log is separate and still opens',await p.locator('#wd50LogDialog').is_visible())
 await p.locator('#wd50LogDialog [data-wd50-log-close]').first.click()
 s.state['hrAnnouncements'].append(note('N4','تنبيه وصل الآن'))
 await p.locator('[data-nt52-refresh]').click();await p.wait_for_timeout(400)
 check('New server notice appears without full-page navigation',await p.locator('#nt52Count').inner_text()=='1 غير مقروءة' and 'وصل الآن' in await p.locator('#nt52Feature').inner_text())
 s.getFail=500;await p.locator('[data-nt52-refresh]').click();await p.wait_for_timeout(200)
 check('Failed refresh retains previous unread count and shows stale warning',await p.locator('#nt52Count').inner_text()=='1 غير مقروءة' and await p.locator('#nt52Error').is_visible())
 s.getFail=None;await p.locator('[data-nt52-refresh]').click();await p.wait_for_timeout(200)
 check('Successful refresh clears stale warning',not await p.locator('#nt52Error').is_visible())
 check('Unauthorized notice cannot be opened by direct ID',await p.evaluate('MoshHomeNotices52.open("OTHER")') is False)
 # Safe plain-text rendering.
 s.state['hrAnnouncements'].append(note('XSS','<img src=x onerror=alert(1)>',message='<script>window.bad=1</script>\nنص آمن',urgent=True))
 await p.evaluate('MoshHomeNotices52.refresh(true)');await p.evaluate('MoshHomeNotices52.open("XSS")')
 check('HTML in notice text is escaped, not executed',await p.locator('.nt52-message script').count()==0 and '<script>' in await p.locator('.nt52-message').inner_text() and await p.evaluate('window.bad||null') is None)
 await p.locator('[data-nt52-close]').click()
 # Pagination and filter.
 s.state['hrAnnouncements']=[note('P'+str(i),'تعميم رقم '+str(i)) for i in range(25)]
 await p.evaluate('MoshHomeNotices52.refresh(true)');await p.locator('#moshNoticeStrip52 [data-nt52-list]').click()
 check('Inbox paginates long lists at twenty rows',await p.locator('.nt52-list-row').count()==20)
 await p.locator('[data-nt52-next]').click();check('Next page works with remaining rows',await p.locator('.nt52-list-row').count()==5)
 await p.locator('#nt52Filter').select_option('alert');check('Filter correctly shows empty category',await p.locator('.nt52-list-row').count()==0)
 await p.locator('[data-nt52-close]').click()
 # Do not route self-service notices through a denied HR/details section.
 await p.evaluate('goApp("design")');await p.wait_for_timeout(500)
 await p.evaluate('openEmployeeAnnouncements()');await p.locator('.nt52-list-row [data-nt52-open]').first.click()
 check('Own inbox works from employee department without broad HR access',await p.locator('[data-nt52-ack]').is_visible())
 await p.locator('[data-nt52-close]').click();await p.evaluate('goApp("dashboard")')
 # Real workflow buttons keep their original implementation and save sequence.
 check('Four day-state buttons remain single instances',await p.locator('[data-wd50-day]').count()==4)
 check('Task receiving still works',await p.evaluate('MoshWorkdesk50.perform("receive","T1")'))
 check('Task start still works',await p.evaluate('MoshWorkdesk50.perform("start","T1")') and s.t('T1')['employeeState']=='working')
 check('Break pauses executing task',await p.evaluate('MoshWorkdesk50.perform("break")') and s.t('T1')['employeeState']=='paused')
 check('Task resume works after notice changes',await p.evaluate('MoshWorkdesk50.perform("start","T1")') and s.t('T1')['employeeState']=='working')
 check('No-work status still stops execution',await p.evaluate('MoshWorkdesk50.perform("no_work")') and s.p()['noWork'])
 # Screenshot controlled demo, not real staff/server data.
 s.state['hrAnnouncements']=[note('SHOT1','تحديث موعد تسليم الأعمال',urgent=True),note('SHOT2','اجتماع فريق التصميم اليوم',type='alert'),note('SHOT3','التعميم السابق',readBy=['E1'])]
 await p.evaluate('MoshHomeNotices52.refresh(true)');await p.evaluate('MoshWorkdesk50.select("T1")');await p.wait_for_timeout(250)
 await p.locator('#employeeSpaceV11').evaluate('(e)=>e.scrollIntoView({block:"start"})')
 await p.evaluate('document.querySelectorAll(".topbar").forEach(e=>e.style.position="static")')
 await p.locator('#employeeSpaceV11').screenshot(path='/mnt/data/MOSH_WORKDESK_R4_NOTICES.png')
 await p.locator('#nt52Feature .nt52-open').click();await p.locator('#moshNoticeDialog52').screenshot(path='/mnt/data/MOSH_WORKDESK_R4_ACKNOWLEDGEMENT.png')
 await p.locator('[data-nt52-close]').click()
 for width in [1920,1366,800,390]:
  await p.set_viewport_size({'width':width,'height':1000});await p.wait_for_timeout(100)
  check(f'Notification strip has no horizontal clipping at {width}px',await p.locator('#moshNoticeStrip52').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'))
  await p.locator('#nt52Feature .nt52-open').click()
  check(f'Notice dialog fits {width}px viewport',await p.locator('#moshNoticeDialog52').evaluate('(e)=>e.getBoundingClientRect().right<=innerWidth+1&&e.getBoundingClientRect().left>=0'))
  await p.locator('[data-nt52-close]').click()
 check('No duplicate DOM IDs after refresh/navigation',await p.evaluate('(()=>{const ids=[...document.querySelectorAll("[id]")].map(e=>e.id);return ids.length===new Set(ids).size})()'))
 check('No JavaScript runtime errors during notification workflow',not h[4],h[4])
 # Employee identity changes: old records and dialogs must not leak.
 await p.locator('#nt52Feature .nt52-open').click()
 await p.evaluate('MoshApi.user={...MoshApi.user,id:"U2",employeeId:"E2",name:"موظف آخر"};MoshHomeNotices52.render()')
 check('Switching account closes old notice detail and clears visibility',not await p.locator('#moshNoticeDialog52').is_visible() and await p.evaluate('MoshHomeNotices52.rows().length')==0)
 await finish(h)
 (OUT/'r4-notices-browser-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Full frontend, isolated mocked API. No production server accessed.'},ensure_ascii=False,indent=2))
 print('TOTAL',len(checks))
if __name__=='__main__':asyncio.run(main())
