import asyncio,json,copy,datetime,pathlib,urllib.parse,email.utils,os,traceback,re,types
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parents[2]
MAN=json.loads((ROOT/'api-map.json').read_text())
NOW=int(datetime.datetime(2026,9,27,12,0,tzinfo=datetime.timezone.utc).timestamp()*1000)

def iso(ms):return datetime.datetime.fromtimestamp(ms/1000,datetime.timezone.utc).isoformat().replace('+00:00','Z')
def setpath(x,p,v):
 ps=p.split('.')
 for k in ps[:-1]:x=x.setdefault(k,{})
 x[ps[-1]]=v

def getpath(x,p):
 for k in p.split('.'):x=x[k]
 return x

class Server:
 def __init__(self):
  self.now=NOW;self.ops=[];self.keys={};self.errors=[];self.report=True;self.failure=None;self.delay=0;self.lost=0;self.current=None;self.timeline=[];self.afterCommit=None
  self.state={}
  for r,s in MAN['resources'].items():setpath(self.state,s['statePath'],{} if s['mode']=='map' else [])
  for p in MAN['settings'].values():setpath(self.state,p,{})
  self.state.update(salesOrders=[],fieldWorkV30B={'employees':{}},fieldWorkSettingsV30B={'templates':[]})
  self.user={'id':'U1','name':'وليد حداد','username':'waleed','employeeId':'E1','department':'التصميم','roleId':'role_employee','active':True,'taskScope':'mine','moduleOverrides':{},'globalOverrides':{},'_version':1}
  self.roles=[{'id':'role_employee','name':'موظف','scope':'department_limited','taskScope':'mine','landing':'dashboard','scopeActions':{k:True for k in ['view','running','details','status']},'modules':{},'globals':{}}]
  self.state['staffProfiles']=[{'id':'E1','name':'وليد حداد','employeeNo':'EMP-00001','department':'التصميم','active':True,'jobTitle':'مصمم غرافيك','attendanceRecords':[{'id':'ATT1','date':'2026-09-27','inTime':'09:00','outTime':'','source':'fingerprint','status':'open'}], '_version':1}]
  self.state['customers']=[{'id':'C1','name':'رولانا','_version':1}]
  self.state['salesTasks']=[self.task('T1','تصميم كيس شيبس','new'),self.task('T2','تعديل البوستر','received'),self.task('T3','تصميم غلاف','paused')]
 def task(self,id,title,st):
  return {'id':id,'taskNo':'TASK/0000'+id[-1],'title':title,'customer':'رولانا','customerId':'C1','department':'التصميم','assignee':'وليد حداد','assigneeId':'E1','status':'in_progress','employeeState':st,'_version':1,'workChat':[],'history':[],'returnedForRevision':False,'workTiming':{'totalMs':0,'activeStartedAt':0,'activeWorker':'','sessions':[],'receivedAt':0,'finishedAt':0,'activity':{}},'assignmentMode':'direct'}
 def t(self,id):return next(x for x in self.state['salesTasks'] if x['id']==id)
 def p(self):return self.state['workEvidence'].get('id:E1')
 def boot(self):
  return {'state':copy.deepcopy(self.state),'user':copy.deepcopy(self.user),'users':[copy.deepcopy(self.user)],'roles':self.roles,'security':{'sessionMinutes':480,'minLength':8},'resources':MAN['resources'],'settings':{},'settingPaths':MAN['settings'],'csrfToken':'TEST_TOKEN','revision':1}
 def phase(self):
  p=self.p() or {}
  if p.get('mode')=='break':return ('break','')
  if p.get('noWork') and p.get('mode')=='active':return ('no_work','')
  working=next((t for t in self.state['salesTasks'] if t['employeeState']=='working'),None)
  return ('task',working['id']) if working else None
 def record(self,before):
  after=self.phase()
  if before==after:return
  if self.current:
   self.timeline.append({**self.current,'endAt':iso(self.now),'open':False})
  self.current={'id':'I'+str(len(self.timeline)+1),'kind':after[0],'taskId':after[1],'taskTitle':self.t(after[1])['title'] if after[1] else '', 'startAt':iso(self.now),'open':True} if after else None
 def reportdata(self,date):
  if not self.report:return {'summary':{},'rows':[]}
  return {'workday':{'employeeId':'E1','date':date,'timeZone':'UTC','asOf':iso(self.now),'live':True,'complete':True,'attendance':copy.deepcopy(self.state['staffProfiles'][0]['attendanceRecords']),'activities':copy.deepcopy(self.timeline)+([copy.deepcopy(self.current)] if self.current else []),'issues':[]}}
 async def route(self,route):
  req=route.request;u=urllib.parse.urlparse(req.url)
  if '/api/' not in u.path:
   if u.hostname in ('127.0.0.1','localhost'):return await route.continue_()
   return await route.abort()
  path=u.path.split('/api',1)[1];headers={'Content-Type':'application/json','Date':email.utils.format_datetime(datetime.datetime.fromtimestamp(self.now/1000,datetime.timezone.utc),usegmt=True),'Access-Control-Allow-Origin':'http://127.0.0.1:8765','Access-Control-Allow-Credentials':'true'}
  async def send(data,status=200,meta=None):
   body={'success':status<400,'data':data} if status<400 else {'success':False,'message':str(data)}
   if meta:body['meta']=meta
   await route.fulfill(status=status,headers=headers,body=json.dumps(body,ensure_ascii=False))
  if req.method=='OPTIONS':return await route.fulfill(status=204,headers={**headers,'Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'})
  if path=='/auth/status':return await send({'authenticated':True,'setupRequired':False,'csrfToken':'TEST_TOKEN'})
  if path=='/bootstrap':return await send(self.boot())
  if path=='/auth/me':return await send(self.user)
  if path=='/dashboard':return await send(self.reportdata(urllib.parse.parse_qs(u.query).get('from',['2026-09-27'])[0]))
  if req.method=='GET':
   resource=path.strip('/').split('/')[0]
   if resource in MAN['resources']:
    value=getpath(self.state,MAN['resources'][resource]['statePath'])
    data=list(value.values()) if isinstance(value,dict) else value
    if len(path.strip('/').split('/'))>1:
     id=urllib.parse.unquote(path.strip('/').split('/')[1]);row=next((r for r in data if str(r['id'])==id),None)
     return await send(row,200 if row else 404)
    return await send(data,meta={'page':1,'perPage':100,'total':len(data),'lastPage':1})
   return await send([],meta={'page':1,'perPage':100,'total':0,'lastPage':1})
  if path=='/transactions' and req.method=='POST':
   if self.delay:await asyncio.sleep(self.delay)
   if self.failure:
    status=self.failure
    return await send('محاكاة رفض الحفظ',status)
   key=req.headers.get('idempotency-key');body=req.post_data_json
   if key in self.keys:return await send(copy.deepcopy(self.keys[key]))
   snap=copy.deepcopy(self.state);before=self.phase();changes=[]
   try:
    for op in body['operations']:
     resource=op['resource'];id=str(op['id']);patch=copy.deepcopy(op.get('data',{}))
     if resource.startswith('settings/'):
      k=resource.split('/')[1];setpath(self.state,MAN['settings'][k],patch);changes.append({'resource':resource,'id':id,'data':{'id':id,'value':patch,'_version':1}});continue
     spec=MAN['resources'][resource];records=getpath(self.state,spec['statePath']);old=records.get(id) if spec['mode']=='map' else next((x for x in records if str(x['id'])==id),None)
     if op['action']=='update' and (not old or old.get('_version')!=op.get('version')):raise ValueError('409')
     if op['action']=='create' and old:raise ValueError('409')
     if resource=='tasks':
      if old.get('assigneeId')!='E1':raise ValueError('403')
      status_permit=self.user.get('moduleOverrides',{}).get('design',{}).get('status',True)
      if not status_permit:raise ValueError('403')
      new={**(old or {}),**patch};st=patch.get('employeeState');w=copy.deepcopy(old['workTiming'])
      if st=='working' and old['employeeState']!='working':w.update(activeStartedAt=self.now,activeWorker='وليد حداد',activeWorkerId='E1')
      elif st in ('paused','submitted') and w.get('activeStartedAt'):
       start=w['activeStartedAt'];w['sessions'].append({'id':'S'+str(len(w['sessions'])),'startAt':start,'endAt':self.now,'worker':'وليد حداد','workerId':'E1','durationMs':self.now-start});w['totalMs']+=self.now-start;w.update(activeStartedAt=0,activeWorker='')
      new['workTiming']=w
      oldids={m['id'] for m in old['workChat']}
      for msg in new['workChat']:
       if msg['id'] not in oldids:msg.update(by='وليد حداد',time=iso(self.now))
     elif resource=='work-presence':
      if id!='id:E1':raise ValueError('403')
      new={**(old or {}),**patch,'employeeId':'E1','name':'وليد حداد'}
      if new['mode']=='break':new['breakAt']=self.now
      elif new['mode']=='off':new['endedAt']=self.now
      elif new.get('noWork'):new['noWorkAt']=self.now
      else:new['startedAt']=new.get('startedAt') or self.now;new['breakAt']=0;new['noWorkAt']=0;new['endedAt']=0
     else:new={**(old or {}),**patch}
     new.update(id=id,_version=(old or {}).get('_version',0)+1,updatedAt=self.now)
     if spec['mode']=='map':records[id]=new
     elif old:records[records.index(old)]=new
     else:records.append(new)
     changes.append({'resource':resource,'id':id,'data':copy.deepcopy(new)})
    self.record(before)
   except ValueError as ex:
    self.state=snap;return await send('رفض الخادم العملية',int(str(ex)))
   result={'transactionId':'TX'+str(len(self.ops)+1),'changes':changes};self.ops.append(copy.deepcopy(body['operations']));self.keys[key]=copy.deepcopy(result)
   if self.lost:
    self.lost-=1;return await route.abort()
   return await send(result)
  return await send('مسار محاكاة غير معروف: '+path,404)

async def launch(s,viewport={'width':1600,'height':1100}):
 pw=await async_playwright().start();browser=await pw.chromium.launch(args=['--no-sandbox'],**({'executable_path':os.environ['MOSH_TEST_CHROMIUM']} if os.environ.get('MOSH_TEST_CHROMIUM') else {}));context=await browser.new_context(viewport=viewport,locale='ar-SY',timezone_id='UTC');page=await context.new_page();errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 page.on('console',lambda m: errs.append('CONSOLE '+m.text) if m.type=='error' and not ('Failed to load resource' in m.text) else None)
 await context.route('**/*',s.route)
 page.on('dialog',lambda d:asyncio.create_task(d.accept()))
 await page.clock.set_fixed_time(datetime.datetime.fromtimestamp(s.now/1000,datetime.timezone.utc))
 # This environment's managed Chromium blocks URL navigation. Test the complete
 # real document/modules inline in an isolated about:blank frame instead. No network.
 class TestRoute:
  def __init__(self,payload):
   self.request=types.SimpleNamespace(url=payload['url'],method=payload['method'],headers=payload['headers'],post_data_json=json.loads(payload['body']) if payload.get('body') else None);self.result=None
  async def fulfill(self,status=200,headers=None,body='',**kw):self.result={'status':status,'headers':headers or {},'body':body}
  async def abort(self):self.result={'network':True}
  async def continue_(self):raise RuntimeError('No external network permitted in this test')
 async def bridge(payload):
  route=TestRoute(payload);await s.route(route);return route.result
 await page.expose_function('__qaTransport',bridge)
 html=(ROOT/'index.html').read_text()
 html=re.sub(r'<script[^>]+src=["\']([^"\']+)["\'][^>]*>\s*</script>', '',html)
 def inline_css(m):
  path=ROOT/m.group(1).split('?')[0]
  return '<style>'+path.read_text()+'</style>' if path.exists() else ''
 html=re.sub(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*>',inline_css,html)
 await page.set_content(html)
 await page.evaluate("""() => {
 const storage=()=>{let d={};return {getItem:k=>Object.prototype.hasOwnProperty.call(d,k)?d[k]:null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k],clear:()=>d={},key:i=>Object.keys(d)[i],get length(){return Object.keys(d).length}}};
 Object.defineProperty(window,'localStorage',{value:storage(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:storage(),configurable:true});
 window.fetch=async(url,opts={})=>{
  if(String(url).startsWith('api-map.json'))return new Response(JSON.stringify(window.__qaManifest),{status:200,headers:{'Content-Type':'application/json'}});
  const result=await window.__qaTransport({url:String(url),method:opts.method||'GET',headers:Object.fromEntries(new Headers(opts.headers||{})),body:opts.body||null});
  if(result.network)throw new TypeError('Simulated network loss');
  return new Response(result.body,{status:result.status,headers:result.headers});
 };
 }""")
 await page.evaluate('(m)=>window.__qaManifest=m',MAN)
 await page.evaluate('(m)=>window.__qaScripts=m',{src:(ROOT/src.split('?')[0]).read_text() for src in MAN['scripts']})
 await page.add_script_tag(content=(ROOT/'config.js').read_text())
 await page.add_script_tag(content=(ROOT/'js/api-client.js').read_text())
 boot=(ROOT/'js/api-boot.js').read_text()
 # Support both the old sequential loader and the R10 ordered-parallel loader.
 boot=boot.replace("await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=source;script.onload=resolve;script.onerror=()=>reject(new Error('تعذر تحميل '+source));document.body.appendChild(script);});", "const script=document.createElement('script');script.textContent=window.__qaScripts[source];document.body.appendChild(script);")
 old_parallel="""const scriptLoads = manifest.scripts.map(source => new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=source;
    script.async=false;
    script.onload=resolve;
    script.onerror=()=>reject(new Error('تعذر تحميل '+source));
    document.body.appendChild(script);
  }));
  await Promise.all(scriptLoads);"""
 inline_parallel="""const scriptLoads = manifest.scripts.map(source => new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.textContent=window.__qaScripts[source];
    document.body.appendChild(script);
    resolve();
  }));
  await Promise.all(scriptLoads);"""
 boot=boot.replace(old_parallel,inline_parallel)
 await page.add_script_tag(content=boot)
 await page.wait_for_function('!!window.MoshWorkdesk50 && !!document.getElementById("wd50Panel")',timeout=20000)
 await page.wait_for_timeout(1500)
 return pw,browser,context,page,errs
