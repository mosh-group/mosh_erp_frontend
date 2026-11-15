import asyncio,json,os,pathlib,re,types,urllib.parse,datetime
from browser_test import Server,launch,ROOT
from playwright.async_api import async_playwright

OUT=ROOT/'tests/results/r17';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,ok,detail=None):
    if not ok: raise AssertionError(name+': '+str(detail))
    checks.append(name);print('PASS',name,flush=True)

async def appearance_permission():
    s=Server();s.user['globalOverrides']={'appearanceSettings':True}
    h=await launch(s);p=h[3]
    try:
        check('appearance permission shows settings button',await p.locator('#systemSettingsBtn').is_visible())
        await p.locator('#systemSettingsBtn').click()
        check('appearance-only settings mode',await p.locator('#systemSettingsModal').get_attribute('data-settings-mode')=='appearance')
        check('font controls visible',await p.locator('#systemSettingFontFamily').is_visible())
        check('system identity hidden',not await p.locator('#systemSettingAppName').is_visible())
        check('HR policies hidden',not await p.locator('#hrPolicyAnnualLeave').is_visible())
        check('permissions panel absent for appearance-only account',await p.locator('#auth37SettingsPanel').count()==0 or not await p.locator('#auth37SettingsPanel').is_visible())
        check('no JS errors in appearance mode',not h[4],h[4])
    finally:
        await h[1].close();await h[0].stop()

async def permission_clarity():
    s=Server();s.user['globalOverrides']={'manageUsers':True,'managePermissions':True}
    # Actor may edit permissions and receives a second employee account to inspect.
    s.roles[0]['globals']={'manageUsers':True,'managePermissions':True}
    other={'id':'U2','name':'سارة علي','username':'sara','employeeId':'E2','department':'التصميم','roleId':'role_employee','active':True,'taskScope':'mine','moduleOverrides':{},'globalOverrides':{},'_version':1}
    s.state['staffProfiles'].append({'id':'E2','name':'سارة علي','employeeNo':'EMP-00002','department':'التصميم','active':True,'jobTitle':'مصممة','_version':1})
    orig=s.boot
    def boot():
        d=orig();d['users']=[s.user,other];return d
    s.boot=boot
    h=await launch(s);p=h[3]
    try:
        await p.locator('#systemSettingsBtn').click()
        check('accounts-only mode opens without appearance rights',await p.locator('#systemSettingsModal').get_attribute('data-settings-mode')=='accounts')
        check('accounts panel visible',await p.locator('#auth37SettingsPanel').is_visible())
        check('appearance controls hidden for accounts-only',not await p.locator('#systemSettingFontFamily').is_visible())
        await p.locator('#auth37OpenAdminBtn').click()
        await p.locator('[data-user-perm="U2"]').click()
        check('clear appearance permission exists',await p.get_by_text('ضبط المظهر والخطوط',exact=True).count()==1)
        check('permission description says it does not open permissions',await p.get_by_text(re.compile('لا يفتح الحسابات أو تعديل الصلاحيات')).count()==1)
        check('view-only shortcut exists per section',await p.locator('[data-auth39-viewonly]').count()>0)
        check('ZKTeco permissions are grouped',await p.locator('.auth39-globaldetails').count()==1)
        check('real section explanation is visible',await p.locator('.auth39-reality').count()>0)
        check('no JS errors in permissions UI',not h[4],h[4])
    finally:
        await h[1].close();await h[0].stop()

class AuthFixture(Server):
    def __init__(self):
        super().__init__();self.logged=False;self.calls=[]
    async def route(self,route):
        u=urllib.parse.urlparse(route.request.url);path=u.path.split('/api',1)[1] if '/api/' in u.path else ''
        async def send(data,status=200):
            body={'success':status<400,'data':data} if status<400 else {'success':False,'message':str(data)}
            await route.fulfill(status=status,headers={'Content-Type':'application/json'},body=json.dumps(body,ensure_ascii=False))
        if path:
            self.calls.append((route.request.method,path))
        if path=='/auth/status': return await send({'authenticated':self.logged,'setupRequired':False,'csrfToken':'TEST_TOKEN'})
        if path=='/auth/login' and route.request.method=='POST':
            self.logged=True;return await send({'user':self.user,'csrfToken':'TEST_TOKEN'})
        if path=='/auth/logout' and route.request.method=='POST':
            self.logged=False;return await send({'csrfToken':'TEST_TOKEN'})
        if path=='/bootstrap' and not self.logged:return await send('يلزم تسجيل الدخول.',401)
        return await super().route(route)

async def login_without_reload():
    # Reuse the real document/scripts but start logged out. This local loader mirrors browser_test.launch.
    s=AuthFixture();man=json.loads((ROOT/'api-map.json').read_text());html=(ROOT/'index.html').read_text()
    html=re.sub(r'<script[^>]+src=["\']([^"\']+)["\'][^>]*>\s*</script>','',html)
    def css(m):
        path=ROOT/m.group(1).split('?')[0];return '<style>'+path.read_text()+'</style>' if path.exists() else ''
    html=re.sub(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*>',css,html)
    pw=await async_playwright().start();b=await pw.chromium.launch(executable_path=os.environ.get('MOSH_TEST_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox']);ctx=await b.new_context(viewport={'width':1440,'height':1000});p=await ctx.new_page();errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:asyncio.create_task(d.accept()))
    class R:
        def __init__(self,x):self.request=types.SimpleNamespace(url=x['url'],method=x['method'],headers=x['headers'],post_data_json=json.loads(x['body']) if x.get('body') else None);self.result=None
        async def fulfill(self,status=200,headers=None,body='',**kw):self.result={'status':status,'headers':headers or {},'body':body}
        async def abort(self):self.result={'network':True}
        async def continue_(self):self.result={'network':True}
    async def bridge(x):
        r=R(x);await s.route(r);return r.result
    try:
        await p.expose_function('__r17Transport',bridge);await p.set_content(html)
        await p.evaluate('''({man,scripts})=>{
          const storage=()=>{let d={};return {getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k],clear:()=>{d={}},key:i=>Object.keys(d)[i],get length(){return Object.keys(d).length}}};
          Object.defineProperty(window,'localStorage',{value:storage()});Object.defineProperty(window,'sessionStorage',{value:storage()});
          window.fetch=async(url,opts={})=>{if(String(url).startsWith('api-map.json'))return new Response(JSON.stringify(man),{status:200});const r=await window.__r17Transport({url:String(url),method:opts.method||'GET',headers:Object.fromEntries(new Headers(opts.headers||{})),body:opts.body||null});if(r.network)throw new TypeError('network');return new Response(r.body,{status:r.status,headers:r.headers})};
          const append=document.body.appendChild.bind(document.body);document.body.appendChild=node=>{const src=node.tagName==='SCRIPT'&&node.getAttribute('src');if(!src||!scripts[src])return append(node);node.removeAttribute('src');node.textContent=scripts[src];append(node);node.onload?.(new Event('load'));return node};
        }''',{'man':man,'scripts':{x:(ROOT/x.split('?')[0]).read_text() for x in man['scripts']}})
        await p.add_script_tag(content=(ROOT/'config.js').read_text());await p.add_script_tag(content=(ROOT/'js/api-client.js').read_text());await p.add_script_tag(content=(ROOT/'js/api-boot.js').read_text())
        await p.wait_for_function('document.getElementById("moshAuthGate") && !document.getElementById("moshAuthGate").hidden',timeout=20000)
        before_nav=await p.evaluate('performance.getEntriesByType("navigation").length')
        await p.locator('#auth37LoginUser').fill('waleed');await p.locator('#auth37LoginPass').fill('secret123');await p.locator('#auth41LoginSubmit').click()
        await p.wait_for_function('window.MoshAuth37?.current()?.id==="U1"',timeout=20000)
        check('login authenticates without full page reload',await p.evaluate('performance.getEntriesByType("navigation").length')==before_nav)
        post=[x for x in s.calls if x[1]=='/auth/login'];boots=[x for x in s.calls if x[1]=='/bootstrap'];statuses=[x for x in s.calls if x[1]=='/auth/status']
        check('login sends one login request',len(post)==1,post)
        check('login needs one bootstrap after authentication',len(boots)==1,boots)
        check('login does not repeat auth status after submit',len(statuses)==1,statuses)
        check('dashboard visible after in-place login',await p.locator('#dashboardApp').is_visible())
        check('no JS errors after in-place login',not errors,errors)
        await p.locator('#auth37LogoutBtn').click()
        await p.locator('.r14-farewell').wait_for(state='visible',timeout=1000)
        check('logout gives immediate visual feedback',await p.locator('.r14-farewell').is_visible())
        await p.wait_for_timeout(80)
        check('logout sends one server request',len([x for x in s.calls if x[1]=='/auth/logout'])==1)
    finally:
        await b.close();await pw.stop()

async def main():
    await appearance_permission();await permission_clarity();await login_without_reload()
    (OUT/'RESULTS.json').write_text(json.dumps({'checks':len(checks),'passed':checks},ensure_ascii=False,indent=2))
if __name__=='__main__':asyncio.run(main())
