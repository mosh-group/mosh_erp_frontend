"""Offline browser QA of the real notification JS/CSS; never uses production data."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os
ROOT=Path(__file__).resolve().parents[2]
css=(ROOT/'css/r19-notifications.css').read_text()
script=(ROOT/'js/r19-notifications.js').read_text()
guard=(ROOT/'js/61-mosh-r14-system-polish.js').read_text()
exit_candidate=guard[guard.index('function exitCandidate('):guard.index('function performEscape(')]
fixture=r'''
window.state={salesTasks:[],hrAnnouncements:[]};window.fixtureCalls=[];window.fixtureItems=[];
window.MoshApi={user:{id:'TEST-USER-A',employeeId:'TEST-EMP-A'},auth:{users:[]},request:async(path,options)=>{fixtureCalls.push({path,options});return {items:JSON.parse(JSON.stringify(fixtureItems)),_version:1};}};
window.MoshPreview19={user:()=>MoshApi.user,role:()=> 'employee',get:(key,fallback)=>fallback,esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),close:id=>document.getElementById(id)?.remove(),toast:()=>{},dialog:(id,title,html)=>{const old=document.getElementById(id);old?.remove();const d=document.createElement('dialog');d.id=id;d.innerHTML='<div class="r19-dialog-body">'+html+'</div>';document.body.append(d);d.showModal();return d;}};
window.fixtureNotice=(id)=>({id,type:'hr',title:'وصلت موافقة مدير القسم',body:'تمت الموافقة على طلبك. يمكنك فتح الإشعار للاطلاع على التفاصيل.',source:'الموارد البشرية',recipientIds:['TEST-EMP-A'],createdAt:'2026-11-22T12:00:00Z'});
document.getElementById('fixtureEditor').showModal();document.getElementById('fixtureDraft').focus();
'''
html='''<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><style>body{background:#0c1115;color:#eee;font:16px/1.8 Arial;padding:25px}dialog{background:#162229;color:#eee;border:1px solid #62717a;border-radius:14px;padding:24px;width:min(650px,70vw)}dialog::backdrop{background:#0007}textarea{box-sizing:border-box;width:100%;height:100px;background:#0c151a;color:#eee;border:1px solid #62717a;padding:12px;border-radius:8px}</style><style>'''+css+'''</style><h1>اختبار تنبيهات MOSH</h1><dialog id="fixtureEditor"><h2>تعديل محتوى</h2><label>نص غير محفوظ<textarea id="fixtureDraft">تبقى بيانات النموذج محفوظة أثناء ظهور التنبيه.</textarea></label></dialog><script>'''+fixture+'''</script><script src="/notifications.js"></script></html>'''
checks=[]
def check(name,condition):
 assert condition,name
 checks.append(name)
with sync_playwright() as p:
 browser_path=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
 launch={'headless':True,'args':['--no-sandbox']}
 if browser_path:launch['executable_path']=browser_path
 browser=p.chromium.launch(**launch)
 page=browser.new_page(viewport={'width':1440,'height':960})
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.route('http://mosh.test/**',lambda route:route.fulfill(status=200,content_type='text/javascript' if route.request.url.endswith('/notifications.js') else 'text/html',body=script if route.request.url.endswith('/notifications.js') else html))
 page.clock.install(time='2026-11-22T12:00:00Z');page.clock.pause_at('2026-11-22T12:00:00Z')
 page.goto('http://mosh.test/preview',wait_until='load')
 page.evaluate('MoshAlerts19.refresh(true)')
 page.evaluate("fixtureItems=[fixtureNotice('one'),fixtureNotice('two')];MoshAlerts19.refresh(true)")
 expect(page.locator('#r19IncomingPopup')).to_be_visible()
 check('Notification uses the nonblocking top layer above the editor',page.locator('#r19IncomingPopup').evaluate("el=>el.matches(':popover-open')"))
 check('Keyboard focus remains in the unsaved form',page.evaluate("document.activeElement.id==='fixtureDraft'"))
 check('Notification expiry does not affect editor contents',page.locator('#fixtureDraft').input_value().startswith('تبقى'))
 box=page.locator('#r19IncomingPopup').bounding_box()
 check('Desktop card sits at the bottom left',abs(box['x']-20)<1 and abs(960-box['y']-box['height']-20)<1)
 check('Desktop card is compact',box['width']<=380 and box['height']<350)
 screenshot_dir=os.environ.get('MOSH_QA_SCREENSHOTS')
 if screenshot_dir:
  Path(screenshot_dir).mkdir(parents=True,exist_ok=True);page.screenshot(path=str(Path(screenshot_dir)/'notification-desktop.png'))
 first=page.locator('#r19IncomingPopup').get_attribute('data-notice-id')
 page.clock.run_for(4999)
 check('Card remains visible at 4999 milliseconds',page.locator('#r19IncomingPopup').get_attribute('data-notice-id')==first)
 page.clock.run_for(1)
 check('Next card follows at 5000 milliseconds',page.locator('#r19IncomingPopup').get_attribute('data-notice-id')!=first)
 page.set_viewport_size({'width':390,'height':844})
 page.evaluate("document.documentElement.dataset.moshTheme='light'")
 box=page.locator('#r19IncomingPopup').bounding_box()
 check('Mobile card fits without horizontal overflow',box['x']>=0 and box['x']+box['width']<=390)
 if screenshot_dir:page.screenshot(path=str(Path(screenshot_dir)/'notification-mobile.png'))
 # The app's real exit classifier must not mistake the close cross for closing a dirty editor.
 page.evaluate("window.text=el=>String(el?.textContent||'').replace(/\\s+/g,' ').trim();"+exit_candidate+'window.fixtureExitCandidate=exitCandidate;')
 check('Dismiss button cannot trigger unsaved-editor exit',not page.locator('.r19-popup-close').evaluate('el=>fixtureExitCandidate(el)'))
 page.locator('.r19-popup-close').click()
 expect(page.locator('#r19IncomingPopup')).to_have_count(0)
 check('Dismissal keeps both notifications unread',page.evaluate('MoshAlerts19.unread()')==2)
 page.evaluate('MoshAlerts19.refresh(true)')
 check('Refreshing does not replay previous cards',page.locator('#r19IncomingPopup').count()==0)
 page.evaluate("fixtureItems.push(fixtureNotice('three'));MoshAlerts19.refresh(true)")
 page.get_by_role('button',name='عرض الإشعار ←').click()
 expect(page.locator('#r19Alerts')).to_be_visible()
 check('Details use the existing notification center',page.locator('#r19Alerts h3').inner_text()=='وصلت موافقة مدير القسم')
 check('Opening details leaves acknowledgement explicit',page.evaluate('MoshAlerts19.unread()')==3)
 check('No acknowledgement or business write is sent by the popup',page.evaluate("fixtureCalls.every(call=>!call.options||!call.options.method||call.options.method==='GET')"))
 check('No JavaScript errors',not errors)
 browser.close()
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2))
