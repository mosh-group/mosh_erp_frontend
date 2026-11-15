"""R9 UI regression, deterministic mock API, fresh Chromium contexts.
Navigation is disallowed by this laboratory's browser policy. Actual HTML/CSS/JS
are loaded into an isolated about:blank document; the unchanged bootstrap loader
receives delayed script load events. This is NOT a production-backend test.
"""
import asyncio,copy,datetime,json,os,pathlib,re,sys,types,urllib.parse,zipfile
from browser_test import Server,launch,ROOT,MAN,iso
from playwright.async_api import async_playwright
OUT=pathlib.Path(os.environ.get('MOSH_QA_OUT',ROOT/'tests/results/r9'));OUT.mkdir(parents=True,exist_ok=True)
CHECKS=[]
def check(name,ok,detail=None):
 if not ok:raise AssertionError(name+': '+str(detail))
 CHECKS.append(name);print('PASS',len(CHECKS),name,flush=True)
class Fixture(Server):
 def __init__(self):super().__init__();self.created=0;self.reject_create=False;self.logged_in=True
 async def route(self,route):
  u=urllib.parse.urlparse(route.request.url)
  async def send(data,status=200):
   body={'success':True,'data':data} if status<400 else {'success':False,'message':str(data)}
   return await route.fulfill(status=status,headers={'Content-Type':'application/json'},body=json.dumps(body,ensure_ascii=False))
  if u.path.endswith('/api/auth/status') and not self.logged_in:return await send({'authenticated':False,'setupRequired':False,'csrfToken':'TEST_TOKEN'})
  if u.path.endswith('/api/workday'):
   date=urllib.parse.parse_qs(u.query).get('date',[iso(self.now)[:10]])[0];data=self.reportdata(date)
   if 'workday' in data:data['workday'].update(version='workday-r8',historyPartial=False,activityAvailable=True,trackingSince=self.now-86400000,coverage=[])
   data.update(serverNow=self.now,timeZone='UTC');return await send(data)
  if u.path.endswith('/api/tasks') and route.request.method=='POST':
   if self.reject_create:return await send('إنشاء المهمة غير مسموح في هذا الاختبار',403)
   self.created+=1;key='R9_CREATED_'+str(self.created);t=self.task(key,'اختبار مهمة جديدة','new');t.update(copy.deepcopy(route.request.post_data_json));t.update(id=key,_version=1,assigneeId='E1');self.state['salesTasks'].append(t)
   return await send(t,201)
  return await super().route(route)
async def create(p,title='اختبار مهمة جديدة'):
 await p.evaluate('MoshActivityReminder51?.dismiss();openStandaloneTaskModal()')
 await p.locator('#standaloneTaskTitle').fill(title);await p.locator('#standaloneTaskCustomer').fill('رولانا')
 await p.locator('#standaloneTaskDepartment').select_option(value='التصميم');await p.locator('#standaloneTaskAssignmentMode').select_option('direct');await p.locator('#standaloneTaskAssignee').fill('وليد حداد')
 await p.evaluate('saveStandaloneTask()')
async def workflow():
 s=Fixture();h=await launch(s);p=h[3];p.set_default_timeout(5000)
 try:
  await create(p);tid='R9_CREATED_1'
  check('Dedicated creation adds one confirmed server task',s.created==1 and await p.evaluate('(id)=>state.salesTasks.filter(t=>t.id===id).length',tid)==1)
  await p.evaluate('(id)=>MoshWorkdesk50.select(id)',tid)
  await p.locator('#wd50Task [data-wd50-action="receive"]').click()
  await p.wait_for_function('(id)=>state.salesTasks.find(t=>t.id===id)?.employeeState==="received"',arg=tid)
  check('Actual receipt button succeeds immediately after creation',s.t(tid)['employeeState']=='received')
  check('The missing-record error is absent',await p.locator('#wd50Error').is_hidden())
  check('Receipt does not start the timer',s.t(tid)['workTiming']['activeStartedAt']==0 and s.t(tid)['workTiming']['totalMs']==0)
  check('Receipt exposes start button',await p.locator('#wd50Task [data-wd50-action="start"]').count()==1)
  check('Receipt is recorded exactly once',len([m for m in s.t(tid)['workChat'] if m['id'].startswith('MR49/receive/')])==1)
  await p.locator('#wd50Task').screenshot(path=str(OUT/'receipt-confirmed.png'))
  await p.locator('#wd50Task [data-wd50-action="start"]').click();await p.wait_for_function('(id)=>state.salesTasks.find(t=>t.id===id)?.employeeState==="working"',arg=tid)
  check('Starting immediately after receipt works',s.t(tid)['workTiming']['activeStartedAt']==s.now)
  await p.evaluate('MoshWorkdesk50.perform("break")');check('Break still pauses execution',s.t(tid)['employeeState']=='paused')
  await p.evaluate('MoshApi.refresh()');check('Refresh retains the saved receipt',any(m['id'].startswith('MR49/receive/') for m in s.t(tid)['workChat']))
  check('Workflow has no JavaScript runtime errors',not h[4],h[4])
 finally:await h[1].close();await h[0].stop()
async def boot(original_zip=None,fail_script=False,logged_in=True):
 s=Fixture();s.logged_in=logged_in
 z=zipfile.ZipFile(original_zip) if original_zip else None
 def read(rel):return z.read('MOSH_VANILLA_FRONTEND/'+rel).decode() if z else (ROOT/rel).read_text()
 man=json.loads(read('api-map.json'));html=read('index.html');scripts={x:read(x.split('?')[0]) for x in man['scripts']}
 html=re.sub(r'<script[^>]+src=["\']([^"\']+)["\'][^>]*>\s*</script>','',html)
 html=re.sub(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*>',lambda m:'<style>'+read(m[1].split('?')[0])+'</style>',html)
 pw=await async_playwright().start();b=await pw.chromium.launch(executable_path=os.environ.get('MOSH_TEST_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox']);ctx=await b.new_context(viewport={'width':1440,'height':1000});p=await ctx.new_page();errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:asyncio.create_task(d.accept()))
 class Route:
  def __init__(self,x):self.request=types.SimpleNamespace(url=x['url'],method=x['method'],headers=x['headers'],post_data_json=json.loads(x['body']) if x.get('body') else None);self.result=None
  async def fulfill(self,status=200,headers=None,body='',**kw):self.result={'status':status,'headers':headers or {},'body':body}
  async def abort(self):self.result={'network':True}
 async def bridge(x):r=Route(x);await s.route(r);return r.result
 try:
  await p.expose_function('__transportR9',bridge);await p.clock.set_fixed_time(datetime.datetime.fromtimestamp(s.now/1000,datetime.timezone.utc));await p.set_content(html)
  await p.evaluate('''({man,scripts,fail})=>{
   const storage=()=>{let d={};return {getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k],clear:()=>{d={}},key:i=>Object.keys(d)[i],get length(){return Object.keys(d).length}}};
   Object.defineProperty(window,'localStorage',{value:storage()});Object.defineProperty(window,'sessionStorage',{value:storage()});
   window.__samplesR9=[];window.__doneR9=false;
   window.__sampleR9=phase=>{const e=document.getElementById('appShell');window.__samplesR9.push({phase,opacity:e?getComputedStyle(e).opacity:'none',visible:e?getComputedStyle(e).visibility:'none',panel:!!document.getElementById('wd50Panel')})};
   window.__sampleR9('initial-document');document.addEventListener('mosh:ui-ready',()=>{window.__doneR9=true;window.__sampleR9('ready')});
   window.fetch=async(url,opts={})=>{
    if(String(url).startsWith('api-map.json'))return new Response(JSON.stringify(man),{status:200});
    const r=await window.__transportR9({url:String(url),method:opts.method||'GET',headers:Object.fromEntries(new Headers(opts.headers||{})),body:opts.body||null});
    if(r.network)throw new TypeError('test network failure');return new Response(r.body,{status:r.status,headers:r.headers});
   };
   const append=document.body.appendChild.bind(document.body),head=document.head.appendChild.bind(document.head);
   document.head.appendChild=node=>node.tagName==='LINK'&&node.rel==='preload'?node:head(node);
   document.body.appendChild=node=>{
    const source=node.tagName==='SCRIPT'&&node.getAttribute('src');if(!source||!scripts[source])return append(node);
    node.removeAttribute('src');setTimeout(()=>{
     if(fail&&source.includes('54-mosh-task-inbox')){node.onerror?.(new Event('error'));return;}
     node.textContent=scripts[source];append(node);window.__sampleR9(source);node.onload?.(new Event('load'));
    },35);return node;
   };
  }''',{'man':man,'scripts':scripts,'fail':fail_script})
  await p.add_script_tag(content=read('config.js'));await p.add_script_tag(content=read('js/api-client.js'));await p.add_script_tag(content=read('js/api-boot.js'))
  if original_zip:await p.wait_for_function('!!window.MoshHomeNotices52',timeout=20000);await p.wait_for_timeout(200)
  elif fail_script:await p.wait_for_function('document.getElementById("moshBootRetry9")?.hidden===false',timeout=20000)
  else:await p.wait_for_function('window.__doneR9',timeout=20000);await p.wait_for_timeout(200)
  samples=await p.evaluate('window.__samplesR9');name='old' if z else 'failed' if fail_script else 'logged-out' if not logged_in else 'new';(OUT/(name+'-boot.json')).write_text(json.dumps({'samples':samples,'errors':errors},ensure_ascii=False,indent=2))
  if z:
   check('Original R8 exposes its document before scripts finish',samples[0]['opacity']=='1' and samples[0]['visible']=='visible')
   check('Original auth activation reveals a nonfinal screen',any(x['opacity']=='1' and x['visible']=='visible' and not x['panel'] and '44-mosh-v38' in x['phase'] for x in samples))
  else:
   before=[x for x in samples if x['phase']!='ready'];check(name+': no intermediate app frame is visible',all(x['opacity']=='0' for x in before),before)
   if fail_script:
    check('Failed script leaves retry screen instead of an old interface',await p.locator('#moshBootRetry9').is_visible() and await p.evaluate('document.documentElement.classList.contains("mosh-booting")'))
   else:
    check(name+': application becomes interactive only at ready',not await p.locator('#appShell').get_attribute('inert')=='')
    check(name+': first paint uses final workdesk or login',await p.locator('#wd50Panel').is_visible() if logged_in else await p.locator('#moshAuthGate').is_visible())
    check(name+': no runtime errors',not errors,errors)
    await p.screenshot(path=str(OUT/(name+'-ready.png')))
 finally:
  await b.close();await pw.stop()
  if z:z.close()
async def main():
 await workflow()
 if os.environ.get('MOSH_COMPARE_ZIP'):await boot(os.environ['MOSH_COMPARE_ZIP'])
 await boot();await boot(fail_script=True);await boot(logged_in=False)
 (OUT/'RESULTS.json').write_text(json.dumps({'checks':len(CHECKS),'passed':CHECKS,'environment':'Chromium with isolated real frontend and deterministic mock API; no production deployment'},ensure_ascii=False,indent=2))
if __name__=='__main__':asyncio.run(main())
